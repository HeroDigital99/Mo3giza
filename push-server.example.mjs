/* Demo Web Push server for Maajiza.
 * Run outside GitHub Pages (Render, Railway, Fly.io, Cloud Run, or a VPS).
 * Install: npm i web-push
 * Required env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 */
import http from "node:http";
import webpush from "web-push";

const port = Number(process.env.PORT || 8787);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "https://YOUR-DOMAIN.example";
const subscriptions = new Map();
webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": allowedOrigin, "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key", "Access-Control-Allow-Methods": "POST, OPTIONS" });
  res.end(JSON.stringify(body));
}
function readBody(req) { return new Promise((resolve, reject) => { let data = ""; req.on("data", chunk => { data += chunk; if (data.length > 1_000_000) reject(new Error("payload too large")); }); req.on("end", () => { try { resolve(JSON.parse(data || "{}")); } catch (error) { reject(error); } }); }); }
async function broadcast(payload) {
  const results = await Promise.allSettled([...subscriptions].map(async ([id, subscription]) => {
    try { await webpush.sendNotification(subscription, JSON.stringify(payload)); return true; }
    catch (error) { if ([404, 410].includes(error.statusCode)) subscriptions.delete(id); return false; }
  }));
  return results.filter(result => result.status === "fulfilled" && result.value).length;
}
const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") return sendJson(res, 204, {});
  try {
    if (req.method === "POST" && req.url === "/api/push/subscribe") {
      const subscription = await readBody(req); const id = subscription.endpoint;
      if (!id || !subscription.keys) return sendJson(res, 400, { error: "invalid subscription" });
      subscriptions.set(id, subscription); return sendJson(res, 201, { ok: true });
    }
    if (req.method === "POST" && req.url === "/api/push/unsubscribe") {
      const subscription = await readBody(req); subscriptions.delete(subscription.endpoint); return sendJson(res, 200, { ok: true });
    }
    if (req.method === "POST" && req.url === "/api/push/send") {
      if (req.headers["x-admin-key"] !== process.env.ADMIN_KEY) return sendJson(res, 401, { error: "unauthorized" });
      const payload = await readBody(req); const sent = await broadcast(payload); return sendJson(res, 200, { ok: true, sent });
    }
    sendJson(res, 404, { error: "not found" });
  } catch (error) { sendJson(res, 500, { error: error.message }); }
});
server.listen(port, () => console.log(`Web Push server listening on ${port}`));
