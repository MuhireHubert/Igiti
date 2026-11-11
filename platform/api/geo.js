import crypto from "node:crypto";

function countryFrom(headers) {
  const country = String(headers["x-vercel-ip-country"] || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(country) ? country : "";
}

export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  const secret = process.env.GEO_LOCATION_SIGNING_SECRET;
  const country = countryFrom(req.headers);
  if (!secret || !country) return res.status(503).json({ error: "Secure location pricing is unavailable right now." });

  const issuedAt = Date.now();
  const signature = crypto.createHmac("sha256", secret).update(`${country}.${issuedAt}`).digest("hex");
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  return res.status(200).json({ country, issuedAt, signature });
}
