import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as nodemailer from 'nodemailer';
import { Model } from 'mongoose';
import { NotificationChannel, NotificationLog, NotificationLogDocument } from './schemas/notification-log.schema';

export interface UserEventPayload {
  id: string;
  mobileNumber?: string;
  email?: string;
  via: 'mobile' | 'google';
  occurredAt: string;
}

export interface OrderPaidPayload {
  orderId: string;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  awbNumber: string | null;
  courierName: string | null;
  estimatedDelivery: string | null;
  total: number;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
  } | null;
  items: Array<{
    size: string;
    fulfillmentType: 'physical' | 'digital';
    quantity: number;
    unitPrice: number;
  }>;
  occurredAt: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    @InjectModel(NotificationLog.name) private readonly notificationLogModel: Model<NotificationLogDocument>,
    private readonly config: ConfigService,
  ) {
    this.initTransporter();
  }

  private initTransporter() {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (!host || !user || !pass) return;

    this.transporter = nodemailer.createTransport({
      host,
      port: parseInt(this.config.get<string>('SMTP_PORT', '587')),
      secure: this.config.get<string>('SMTP_PORT', '587') === '465',
      auth: { user, pass },
    });
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.log(`[email skipped — SMTP not configured] To: ${to} | Subject: ${subject}`);
      return;
    }
    const from = this.config.get<string>('SMTP_FROM', this.config.get<string>('SMTP_USER', ''));
    await this.transporter.sendMail({ from, to, subject, html });
  }

  private async log(event: string, payload: Record<string, unknown>, channel: NotificationChannel) {
    await this.notificationLogModel.create({ authUserId: (payload as any).id ?? 'system', event, channel, payload });
  }

  async handleUserCreated(payload: UserEventPayload): Promise<void> {
    this.logger.log(`[notification] Welcome notification for user ${payload.id}`);
    await this.log('user.created', payload as unknown as Record<string, unknown>, NotificationChannel.EMAIL);
  }

  async handleUserLogin(payload: UserEventPayload): Promise<void> {
    this.logger.log(`[notification] Login alert for user ${payload.id}`);
    await this.log('user.login', payload as unknown as Record<string, unknown>, NotificationChannel.PUSH);
  }

  async handleOrderPaid(payload: OrderPaidPayload): Promise<void> {
    const shortId = payload.orderId.slice(-6).toUpperCase();
    this.logger.log(`[notification] Order paid: #${shortId}, email: ${payload.customerEmail ?? 'none'}`);

    await this.log('temptatto.order.paid', payload as unknown as Record<string, unknown>, NotificationChannel.EMAIL);

    if (!payload.customerEmail) return;

    const eddFormatted = payload.estimatedDelivery
      ? new Date(payload.estimatedDelivery).toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : null;

    const itemsHtml = payload.items
      .map(
        (i) =>
          `<tr>
            <td style="padding:8px 12px;border-bottom:1px solid #f4f4f5">
              ${i.fulfillmentType === 'digital' ? 'Digital download' : `${i.size} tattoo`} × ${i.quantity}
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid #f4f4f5;text-align:right">
              ₹${(i.unitPrice * i.quantity).toLocaleString('en-IN')}
            </td>
          </tr>`,
      )
      .join('');

    const addressHtml = payload.shippingAddress
      ? `<p style="margin:0;color:#52525b;font-size:14px;line-height:1.6">
          ${payload.shippingAddress.name}<br>
          ${payload.shippingAddress.line1}${payload.shippingAddress.line2 ? ', ' + payload.shippingAddress.line2 : ''}<br>
          ${payload.shippingAddress.city}, ${payload.shippingAddress.state} – ${payload.shippingAddress.pincode}
        </p>`
      : '';

    const trackingHtml =
      payload.awbNumber && payload.courierName
        ? `<div style="margin-top:24px;padding:16px;background:#f0fdf4;border-radius:8px;border:1px solid #bbf7d0">
            <p style="margin:0 0 8px;font-weight:600;color:#15803d;font-size:14px">Shipment Created</p>
            <p style="margin:0;color:#166534;font-size:13px">
              Courier: <strong>${payload.courierName}</strong><br>
              AWB / Tracking: <strong style="font-family:monospace">${payload.awbNumber}</strong><br>
              ${eddFormatted ? `Estimated Delivery: <strong>${eddFormatted}</strong>` : ''}
            </p>
          </div>`
        : eddFormatted
          ? `<div style="margin-top:24px;padding:16px;background:#fafafa;border-radius:8px;border:1px solid #e4e4e7">
              <p style="margin:0;color:#3f3f46;font-size:14px">
                Estimated Delivery: <strong>${eddFormatted}</strong>
                <span style="font-size:12px;color:#71717a"> (includes 1 day production + transit)</span>
              </p>
             </div>`
          : '';

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fafafa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
    <!-- Header -->
    <div style="background:#18181b;padding:28px 32px">
      <p style="margin:0;color:#a1a1aa;font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase">Temptatto</p>
      <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:700">Order Confirmed</h1>
    </div>

    <!-- Body -->
    <div style="padding:32px">
      <p style="margin:0 0 4px;color:#71717a;font-size:13px">Order ID</p>
      <p style="margin:0 0 24px;color:#18181b;font-size:20px;font-weight:700;font-family:monospace">#${shortId}</p>

      ${payload.customerName ? `<p style="margin:0 0 24px;color:#3f3f46;font-size:15px">Hi ${payload.customerName},<br><span style="color:#71717a;font-size:14px">Your order has been placed and we're getting it ready!</span></p>` : ''}

      <!-- Items -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <thead>
          <tr style="background:#f4f4f5">
            <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#71717a">Item</th>
            <th style="padding:8px 12px;text-align:right;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#71717a">Amount</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot>
          <tr>
            <td style="padding:12px;font-weight:700;color:#18181b">Total</td>
            <td style="padding:12px;font-weight:700;color:#18181b;text-align:right">₹${payload.total.toLocaleString('en-IN')}</td>
          </tr>
        </tfoot>
      </table>

      ${payload.shippingAddress ? `<div style="margin-bottom:16px"><p style="margin:0 0 6px;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.08em;color:#71717a">Shipping to</p>${addressHtml}</div>` : ''}

      ${trackingHtml}

      <p style="margin-top:32px;color:#a1a1aa;font-size:12px;text-align:center">
        Questions? Reply to this email or reach us at temptatto.in<br>
        Thank you for your order!
      </p>
    </div>
  </div>
</body>
</html>`;

    try {
      await this.sendEmail(payload.customerEmail, `Your Temptatto order #${shortId} is confirmed`, html);
      this.logger.log(`Order confirmation email sent to ${payload.customerEmail}`);
    } catch (err: any) {
      this.logger.error(`Failed to send order confirmation email: ${err.message}`);
    }
  }
}
