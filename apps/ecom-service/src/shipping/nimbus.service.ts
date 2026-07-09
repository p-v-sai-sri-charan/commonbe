import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const NIMBUS_BASE = 'https://ship.nimbuspost.com/api';

// Default parcel dimensions for a folded t-shirt poly-mailer (cm / grams)
const BOX_L = 30;
const BOX_B = 25;
const BOX_H = 3;
const BOX_WEIGHT_G = 250;
const PRODUCT_HSN = '6109'; // T-shirts, singlets and other vests

export interface ShipmentResult {
  nimbusOrderId: string;
  shipmentId: string;
  awbNumber: string;
  courierId: string;
  courierName: string;
  status: string;
  labelUrl: string | null;
}

@Injectable()
export class NimbusService {
  private readonly logger = new Logger(NimbusService.name);
  private cachedToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(private readonly config: ConfigService) {}

  private async getToken(): Promise<string | null> {
    const email = this.config.get<string>('NIMBUSPOST_EMAIL');
    const password = this.config.get<string>('NIMBUSPOST_PASSWORD');
    if (!email || !password) return null;

    if (this.cachedToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedToken;
    }

    try {
      const res = await fetch(`${NIMBUS_BASE}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { status: boolean; data?: string };
      if (!data.status || !data.data) return null;

      const token = data.data;
      let expiresAt = Date.now() + 2.5 * 60 * 60 * 1000;
      try {
        const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        if (payload.exp) expiresAt = payload.exp * 1000 - 5 * 60 * 1000;
      } catch {
        // use default expiry
      }

      this.cachedToken = token;
      this.tokenExpiresAt = expiresAt;
      return token;
    } catch (err: any) {
      this.logger.error(`NimbusPost login failed: ${err.message}`);
      return null;
    }
  }

  async checkServiceability(
    originPincode: string,
    destinationPincode: string,
  ): Promise<{ serviceable: boolean; courierId: string | null; courierName: string | null }> {
    const token = await this.getToken();
    if (!token) return { serviceable: true, courierId: null, courierName: null };

    const preferredCourierId = this.config.get<string>('NIMBUSPOST_COURIER_ID', '');

    try {
      const res = await fetch(`${NIMBUS_BASE}/courier/b2b_serviceability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          origin: originPincode,
          destination: destinationPincode,
          payment_type: 'prepaid',
          details: [{ qty: 1, weight: BOX_WEIGHT_G, length: BOX_L, breadth: BOX_B, height: BOX_H }],
          order_value: '1000',
        }),
      });
      const data = (await res.json()) as {
        status: boolean;
        data?: Array<{ courier_id: string; name: string }>;
      };

      if (!data.status || !data.data?.length) {
        return { serviceable: false, courierId: null, courierName: null };
      }

      const preferred = preferredCourierId
        ? data.data.find((c) => c.courier_id === preferredCourierId)
        : null;
      const courier = preferred ?? data.data[0];
      return { serviceable: true, courierId: courier.courier_id, courierName: courier.name };
    } catch (err: any) {
      this.logger.warn(`Serviceability check failed: ${err.message}`);
      return { serviceable: true, courierId: null, courierName: null };
    }
  }

  async createShipment(params: {
    orderId: string;
    shippingAddress: {
      name: string;
      phone: string;
      line1: string;
      line2?: string;
      city: string;
      state: string;
      pincode: string;
    };
    items: Array<{ name: string; quantity: number; unitPrice: number }>;
    invoiceValue: number;
  }): Promise<ShipmentResult | null> {
    const token = await this.getToken();
    if (!token) return null;

    const courierId = this.config.get<string>('NIMBUSPOST_COURIER_ID', '110');
    const wName = this.config.get<string>('NIMBUSPOST_WAREHOUSE_NAME', 'inkwear');
    const wPerson = this.config.get<string>('NIMBUSPOST_WAREHOUSE_PERSON', 'inkwear');
    const wAddress = this.config.get<string>('NIMBUSPOST_WAREHOUSE_ADDRESS', '');
    const wAddress2 = this.config.get<string>('NIMBUSPOST_WAREHOUSE_ADDRESS2', '');
    const wCity = this.config.get<string>('NIMBUSPOST_WAREHOUSE_CITY', '');
    const wState = this.config.get<string>('NIMBUSPOST_WAREHOUSE_STATE', '');
    const wPincode = this.config.get<string>('NIMBUSPOST_WAREHOUSE_PINCODE', '');
    const wPhone = this.config.get<string>('NIMBUSPOST_WAREHOUSE_PHONE', '');

    const totalBoxes = params.items.reduce((s, i) => s + i.quantity, 0);
    const now = new Date();
    const invoiceDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;

    const body = {
      order_id: params.orderId,
      payment_method: 'prepaid',
      consignee_name: params.shippingAddress.name,
      consignee_company_name: params.shippingAddress.name,
      consignee_phone: params.shippingAddress.phone.replace(/\D/g, '').slice(-10),
      consignee_email: '',
      consignee_gst_number: '',
      consignee_address: [params.shippingAddress.line1, params.shippingAddress.line2]
        .filter(Boolean)
        .join(', '),
      consignee_pincode: params.shippingAddress.pincode,
      consignee_city: params.shippingAddress.city,
      consignee_state: params.shippingAddress.state,
      no_of_invoices: 1,
      no_of_boxes: totalBoxes,
      courier_id: courierId,
      request_auto_pickup: 'Yes',
      invoice: [
        {
          invoice_number: `INKW-${params.orderId.slice(-8).toUpperCase()}`,
          invoice_date: invoiceDate,
          invoice_value: params.invoiceValue.toString(),
        },
      ],
      pickup: {
        warehouse_name: wName,
        name: wPerson,
        address: wAddress,
        ...(wAddress2 && { address_2: wAddress2 }),
        city: wCity,
        state: wState,
        pincode: wPincode,
        phone: wPhone,
      },
      products: params.items.map((item) => ({
        product_name: item.name.slice(0, 200),
        product_hsn_code: PRODUCT_HSN,
        product_tax_rate: 5,
        product_lbh_unit: 'cm',
        no_of_box: item.quantity,
        product_price: item.unitPrice.toString(),
        product_weight_unit: 'gram',
        product_length: BOX_L,
        product_breadth: BOX_B,
        product_height: BOX_H,
        product_weight: BOX_WEIGHT_G * item.quantity,
      })),
    };

    try {
      const res = await fetch(`${NIMBUS_BASE}/shipmentcargo/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        status: boolean;
        data?: {
          order_id: number;
          shipment_id: number;
          awb_number: string;
          courier_id: string;
          courier_name: string;
          status: string;
          label?: string;
        };
        message?: string;
      };

      if (!data.status || !data.data) {
        this.logger.error(`NimbusPost shipment creation failed: ${data.message}`);
        return null;
      }

      return {
        nimbusOrderId: String(data.data.order_id),
        shipmentId: String(data.data.shipment_id),
        awbNumber: data.data.awb_number,
        courierId: data.data.courier_id,
        courierName: data.data.courier_name,
        status: data.data.status,
        labelUrl: data.data.label ?? null,
      };
    } catch (err: any) {
      this.logger.error(`NimbusPost shipment creation error: ${err.message}`);
      return null;
    }
  }

  async cancelShipment(awbNumber: string): Promise<boolean> {
    const token = await this.getToken();
    if (!token) return false;

    try {
      const res = await fetch(`${NIMBUS_BASE}/shipmentcargo/Cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ awb: awbNumber }),
      });
      const data = (await res.json()) as { status: boolean };
      return data.status === true;
    } catch (err: any) {
      this.logger.error(`NimbusPost cancel failed: ${err.message}`);
      return false;
    }
  }
}
