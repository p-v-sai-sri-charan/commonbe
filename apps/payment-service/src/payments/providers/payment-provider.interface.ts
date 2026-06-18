export enum PaymentProviderId {
  RAZORPAY = 'razorpay',
  PAYU = 'payu',
  PHONEPE = 'phonepe',
  GPAY = 'gpay',
}

export interface CreateOrderResult {
  providerOrderId: string;
  /** Whatever the provider's checkout step needs on the client (e.g. a
   * Razorpay order id + key, a PhonePe redirect URL, a UPI intent string). */
  clientPayload: Record<string, unknown>;
}

export interface VerifyPaymentResult {
  success: boolean;
  providerPaymentId?: string;
  raw: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  isEnabled(): boolean;
  createOrder(amount: number, currency: string, receiptId: string): Promise<CreateOrderResult>;
  verifyPayment(payload: Record<string, unknown>): Promise<VerifyPaymentResult>;
}
