const environments = {
  sandbox: "https://cybqa.pesapal.com/pesapalv3/api",
  live: "https://pay.pesapal.com/v3/api",
};

let cachedToken = null;

function environment() {
  return String(process.env.PESAPAL_ENVIRONMENT || "sandbox").trim().toLowerCase();
}

export function pesapalConfiguration() {
  const selectedEnvironment = environment();
  const configured = Boolean(
    environments[selectedEnvironment]
    && process.env.PESAPAL_CONSUMER_KEY
    && process.env.PESAPAL_CONSUMER_SECRET
    && process.env.PESAPAL_IPN_ID
    && process.env.PESAPAL_CALLBACK_URL,
  );
  return { configured, environment: selectedEnvironment, provider: "PESAPAL" };
}

function requireConfiguration() {
  const config = pesapalConfiguration();
  if (!config.configured) {
    const error = new Error("Pesapal checkout is not configured yet.");
    error.code = "PESAPAL_NOT_CONFIGURED";
    throw error;
  }
  return { ...config, baseUrl: environments[config.environment] };
}

async function request(url, options) {
  const response = await fetch(url, {
    ...options,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...(options.headers || {}) },
    signal: AbortSignal.timeout(12_000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || String(body.status || "").startsWith("4") || String(body.status || "").startsWith("5")) {
    const error = new Error(body.message || "Pesapal did not accept the request.");
    error.code = "PESAPAL_UPSTREAM_ERROR";
    error.details = body;
    throw error;
  }
  return body;
}

async function token() {
  const config = requireConfiguration();
  if (cachedToken?.expiresAt > Date.now() + 30_000 && cachedToken.environment === config.environment) return { accessToken: cachedToken.value, config };
  const body = await request(`${config.baseUrl}/Auth/RequestToken`, {
    method: "POST",
    body: JSON.stringify({ consumer_key: process.env.PESAPAL_CONSUMER_KEY, consumer_secret: process.env.PESAPAL_CONSUMER_SECRET }),
  });
  if (!body.token) throw new Error("Pesapal did not return an access token.");
  cachedToken = { value: body.token, environment: config.environment, expiresAt: Date.now() + 4 * 60_000 };
  return { accessToken: body.token, config };
}

export async function createPesapalOrder({ merchantReference, amountMinor, currency, description, billingAddress }) {
  const { accessToken, config } = await token();
  const body = await request(`${config.baseUrl}/Transactions/SubmitOrderRequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({
      id: merchantReference,
      currency,
      amount: Number((amountMinor / 100).toFixed(2)),
      description: description.slice(0, 100),
      callback_url: process.env.PESAPAL_CALLBACK_URL,
      cancellation_url: process.env.PESAPAL_CANCELLATION_URL || undefined,
      redirect_mode: "TOP_WINDOW",
      notification_id: process.env.PESAPAL_IPN_ID,
      billing_address: { ...billingAddress, country_code: billingAddress.country_code || "RW" },
    }),
  });
  if (!body.order_tracking_id || !body.redirect_url) {
    const error = new Error(body.message || "Pesapal did not create a checkout session.");
    error.code = "PESAPAL_ORDER_REJECTED";
    error.details = body;
    throw error;
  }
  return body;
}

export async function getPesapalTransaction(orderTrackingId) {
  const { accessToken, config } = await token();
  return request(`${config.baseUrl}/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`, {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}` },
  });
}
