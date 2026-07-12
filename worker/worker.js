// Cloudflare Worker: принимает анкету с сайта и шлёт её в Telegram.
// Секреты BOT_TOKEN и CHAT_ID задаются в Cloudflare (wrangler secret put ...),
// в репозитории их нет. Самодостаточен: ничего не импортирует из js/.

const LIMITS = { name: 100, contact: 100, destination: 200, question: 1000 };

// Best-effort rate-limit в памяти изолята: максимум 5 запросов в минуту с IP.
// Сбрасывается при перезапуске Worker'а — для MVP этого достаточно.
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map();

function rateLimited(ip, now = Date.now()) {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > MAX_PER_WINDOW;
}

export function leadText(lead) {
  const lines = ["Новая заявка с сайта EnrollingGL", `Имя: ${lead.name}`, `Контакт: ${lead.contact}`];
  if (lead.destination) lines.push(`Куда: ${lead.destination}`);
  if (lead.question) lines.push(`Вопрос: ${lead.question}`);
  return lines.join("\n");
}

function jsonResponse(body, status, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}

export async function handleLead(request, env, fetchImpl = fetch) {
  const headers = {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "method_not_allowed" }, 405, headers);

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  if (rateLimited(ip)) return jsonResponse({ ok: false, error: "rate_limit" }, 429, headers);

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "bad_json" }, 400, headers);
  }

  // Honeypot: люди это поле не видят. Заполнено — молча делаем вид, что всё ок.
  if (String(body.company ?? "").trim()) return jsonResponse({ ok: true }, 200, headers);

  const name = String(body.name ?? "").trim();
  const contact = String(body.contact ?? "").trim();
  if (!name || !contact || name.length > LIMITS.name || contact.length > LIMITS.contact) {
    return jsonResponse({ ok: false, error: "invalid" }, 400, headers);
  }

  const lead = {
    name,
    contact,
    destination: String(body.destination ?? "").trim().slice(0, LIMITS.destination),
    question: String(body.question ?? "").trim().slice(0, LIMITS.question),
  };

  const tgRes = await fetchImpl(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: env.CHAT_ID, text: leadText(lead) }),
  });
  if (!tgRes.ok) return jsonResponse({ ok: false, error: "telegram" }, 502, headers);

  return jsonResponse({ ok: true }, 200, headers);
}

export default {
  fetch: (request, env) => handleLead(request, env),
};
