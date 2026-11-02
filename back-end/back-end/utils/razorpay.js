const crypto = require("crypto");

const keyIdValue = () => process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_API_KEY || "";
const keySecretValue = () => process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET_KEY || "";

function configured() {
  return Boolean(keyIdValue() && keySecretValue());
}

function authHeader() {
  if (!configured()) {
    const error = new Error("Razorpay test keys are not configured on the server");
    error.status = 503;
    throw error;
  }
  return `Basic ${Buffer.from(`${keyIdValue()}:${keySecretValue()}`).toString("base64")}`;
}

async function api(path, options = {}) {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: { Authorization: authHeader(), "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error?.description || "Razorpay API request failed");
    error.status = 502;
    error.gatewayCode = body.error?.code || "UNKNOWN";
    throw error;
  }
  return body;
}

exports.configured = configured;
exports.keyId = keyIdValue;
exports.createOrder = (payload) => api("/orders", { method: "POST", body: JSON.stringify(payload) });
exports.getPayment = (paymentId) => api(`/payments/${encodeURIComponent(paymentId)}`);
exports.verifyCheckoutSignature = ({ orderId, paymentId, signature }) => {
  const expected = crypto.createHmac("sha256", keySecretValue()).update(`${orderId}|${paymentId}`).digest();
  let supplied;
  try { supplied = Buffer.from(signature, "hex"); } catch { return false; }
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
};
exports.verifyWebhookSignature = (rawBody, signature) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET || !Buffer.isBuffer(rawBody) || typeof signature !== "string") return false;
  const expected = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest();
  let supplied;
  try { supplied = Buffer.from(signature, "hex"); } catch { return false; }
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
};
