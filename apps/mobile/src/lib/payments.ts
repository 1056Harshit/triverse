/**
 * Seat payment. The server creates a Razorpay order with manual capture
 * (money is held, not taken, until the trip completes).
 *
 * Production: install `react-native-razorpay` (needs a development build) and
 * open checkout with { key: keyId, order_id: orderId, amount, name: "PvtFrnd" };
 * it resolves with razorpay_payment_id + razorpay_signature for /confirm-payment.
 */
export async function authorisePayment(order: { orderId: string; keyId?: string }, _amount: number) {
  if (order.orderId.startsWith("dev_order_")) return { paymentId: `pay_dev_${Date.now()}`, signature: "dev" };
  throw new Error("Payments are not configured in this build yet.");
}
