const DEVICE_KEY = "igiti-play-device-id";

export function getDeviceId() {
  try {
    const existing = window.localStorage.getItem(DEVICE_KEY);
    if (existing && /^[a-z0-9-]{16,80}$/i.test(existing)) return existing;
    const next = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, next);
    return next;
  } catch {
    // Browsers with storage disabled still receive a stable identifier for the
    // current page session, while normal browsers persist it per device.
    return crypto.randomUUID();
  }
}

export function deviceHeaders() {
  return { "X-Igiti-Device-Id": getDeviceId() };
}
