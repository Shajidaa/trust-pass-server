export interface IBkashTokenResponse {
  statusCode: string;
  statusMessage: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface IBkashCreatePaymentResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  bkashURL: string;
  customerMsisdn?: string;
  amount: string;
  intent: string;
  currency: string;
  paymentCreateTime?: string;
  transactionStatus?: string;
  merchantInvoiceNumber?: string;
}

export interface IBkashExecuteResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  payerReference?: string;
  customerMsisdn?: string;
  trxID?: string;
  amount?: string;
  transactionStatus?: string;
  paymentExecuteTime?: string;
  currency?: string;
  intent?: string;
  merchantInvoiceNumber?: string;
}

export interface IBkashQueryResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  payerReference?: string;
  customerMsisdn?: string;
  trxID?: string;
  amount?: string;
  transactionStatus?: string;
  paymentExecuteTime?: string;
  currency?: string;
  intent?: string;
  merchantInvoiceNumber?: string;
}

export interface IInitiatePaymentPayload {
  businessId: string;
  quantity?: number;
}

export interface IExecutePaymentPayload {
  paymentID: string;
}

export interface IBkashCallbackQuery {
  paymentID?: string;
  status?: "success" | "failure" | "cancel";
  apiVersion?: string;
  [key: string]: any;
}

export interface IProductListingQuota {
  freeLimit: number;
  currentProductCount: number;
  freeSlotsRemaining: number;
  paidSlotsAvailable: number;
  canAddProduct: boolean;
  requiresPayment: boolean;
  listingFeePerProduct: number;
  currency: string;
}

export interface IPaymentFilter {
  page?: number;
  limit?: number;
  status?: string;
  businessId?: string;
  userId?: string;
}
