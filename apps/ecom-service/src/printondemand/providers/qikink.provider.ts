import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PodOrderInput,
  PodOrderResult,
  PodOrderStatus,
  PodProvider,
} from '../pod-provider.interface';

/**
 * Qikink print-on-demand API (docs: Postman collection "Qikink API 08-23").
 *
 * Auth: POST /api/token with form-encoded ClientId + client_secret →
 * { ClientId, Accesstoken, expires_in }. Each token request overwrites the
 * previous token, so a single cached token per process is the correct model.
 *
 * Point QIKINK_BASE_URL at https://api.qikink.com for live; defaults to sandbox.
 */
@Injectable()
export class QikinkProvider implements PodProvider {
  readonly name = 'qikink';
  private readonly logger = new Logger(QikinkProvider.name);
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    return this.config.get<string>('QIKINK_BASE_URL', 'https://sandbox.qikink.com');
  }

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('QIKINK_CLIENT_ID') &&
        this.config.get<string>('QIKINK_CLIENT_SECRET'),
    );
  }

  private async getToken(): Promise<{ clientId: string; token: string }> {
    const clientId = this.config.get<string>('QIKINK_CLIENT_ID', '');
    const clientSecret = this.config.get<string>('QIKINK_CLIENT_SECRET', '');
    if (!clientId || !clientSecret) {
      throw new BadRequestException('Qikink is not configured (QIKINK_CLIENT_ID / QIKINK_CLIENT_SECRET)');
    }

    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return { clientId, token: this.cachedToken };
    }

    const res = await fetch(`${this.baseUrl}/api/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ ClientId: clientId, client_secret: clientSecret }),
    });
    const data = (await res.json()) as { Accesstoken?: string; expires_in?: number };
    if (!data.Accesstoken) {
      this.logger.error(`Qikink token request failed: ${JSON.stringify(data)}`);
      throw new BadRequestException('Qikink authentication failed — check credentials');
    }

    this.cachedToken = data.Accesstoken;
    // Refresh 60s before expiry (expires_in is seconds, default 3600).
    this.tokenExpiresAt = Date.now() + ((data.expires_in ?? 3600) - 60) * 1000;
    return { clientId, token: this.cachedToken };
  }

  async createOrder(input: PodOrderInput): Promise<PodOrderResult> {
    const { clientId, token } = await this.getToken();

    const body = {
      order_number: input.orderNumber,
      qikink_shipping: '1', // Qikink handles shipping for POD orders
      gateway: 'Prepaid', // inkwear orders are Razorpay-paid before categorization
      total_order_value: input.totalValueRupees.toString(),
      line_items: input.lineItems.map((item) => ({
        search_from_my_products: 0,
        quantity: item.quantity.toString(),
        print_type_id: item.printTypeId,
        price: item.priceRupees.toString(),
        sku: item.sku,
        designs: [
          {
            design_code: item.designCode,
            width_inches: '',
            height_inches: '',
            placement_sku: 'fr',
            design_link: item.designUrl,
            mockup_link: item.mockupUrl,
          },
          // Back print — Qikink 'bk' placement; separate design_code so both faces persist
          ...(item.backDesignUrl
            ? [
                {
                  design_code: `${item.designCode}-bk`,
                  width_inches: '',
                  height_inches: '',
                  placement_sku: 'bk',
                  design_link: item.backDesignUrl,
                  mockup_link: item.backMockupUrl ?? item.backDesignUrl,
                },
              ]
            : []),
        ],
      })),
      shipping_address: {
        first_name: input.shippingAddress.firstName,
        last_name: input.shippingAddress.lastName,
        address1: input.shippingAddress.address1,
        address2: input.shippingAddress.address2,
        phone: input.shippingAddress.phone,
        email: input.shippingAddress.email,
        city: input.shippingAddress.city,
        zip: input.shippingAddress.zip,
        province: input.shippingAddress.province,
        country_code: input.shippingAddress.countryCode,
      },
    };

    const res = await fetch(`${this.baseUrl}/api/order/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ClientId: clientId, Accesstoken: token },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      message?: string;
      order_id?: number | string;
      status_code?: string;
    };

    if (!data.order_id) {
      this.logger.error(`Qikink order creation failed: ${JSON.stringify(data)}`);
      throw new BadRequestException(`Qikink rejected the order: ${data.message ?? 'unknown error'}`);
    }

    this.logger.log(`Qikink order ${data.order_id} created for ${input.orderNumber}`);
    return { podOrderId: String(data.order_id) };
  }

  async getOrder(podOrderId: string): Promise<PodOrderStatus | null> {
    const { clientId, token } = await this.getToken();

    try {
      const res = await fetch(`${this.baseUrl}/api/order?id=${encodeURIComponent(podOrderId)}`, {
        headers: { ClientId: clientId, Accesstoken: token },
      });
      const data = (await res.json()) as unknown;
      // Docs show a single object for ?id=, the list endpoint returns an array — accept both.
      const order = (Array.isArray(data) ? data[0] : data) as
        | { status?: string; shipping?: { awb?: string | number; tracking_link?: string } }
        | undefined;
      if (!order) return null;

      return {
        status: order.status ?? null,
        awb: order.shipping?.awb != null ? String(order.shipping.awb) : null,
        trackingLink: order.shipping?.tracking_link ?? null,
      };
    } catch (err: any) {
      this.logger.warn(`Qikink order fetch failed for ${podOrderId}: ${err.message}`);
      return null;
    }
  }
}
