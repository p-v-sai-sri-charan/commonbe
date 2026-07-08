/**
 * Print-on-demand provider contract. Qikink is the first implementation;
 * future providers (Printrove, etc.) implement this same interface and get
 * registered in PodService — mirrors the payment/SMS provider-strategy shape.
 *
 * All money values are in RUPEES (providers bill in rupees) — callers convert
 * from ecom's paise storage before building a PodOrderInput.
 */

export interface PodLineItem {
  /** Provider catalog SKU for the exact product+color+size, e.g. "MVnHs-Wh-S". */
  sku: string;
  quantity: number;
  priceRupees: number;
  /** Provider print technique id (Qikink: 1=DTG, 17=DTF, …). */
  printTypeId: number;
  /** Stable design identifier — reused on repeat orders so the provider keeps one design record. */
  designCode: string;
  designUrl: string;
  mockupUrl: string;
}

export interface PodShippingAddress {
  firstName: string;
  lastName: string;
  address1: string;
  address2: string;
  phone: string;
  email: string;
  city: string;
  zip: string;
  province: string;
  countryCode: string;
}

export interface PodOrderInput {
  /** Must be unique per provider account — we use the ustyld order _id. */
  orderNumber: string;
  totalValueRupees: number;
  lineItems: PodLineItem[];
  shippingAddress: PodShippingAddress;
}

export interface PodOrderResult {
  podOrderId: string;
}

export interface PodOrderStatus {
  status: string | null;
  awb: string | null;
  trackingLink: string | null;
}

export interface PodProvider {
  readonly name: string;
  isConfigured(): boolean;
  createOrder(input: PodOrderInput): Promise<PodOrderResult>;
  getOrder(podOrderId: string): Promise<PodOrderStatus | null>;
}
