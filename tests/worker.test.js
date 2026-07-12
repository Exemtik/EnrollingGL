import test from "node:test";
import assert from "node:assert/strict";
import { handleLead, leadText } from "../worker/worker.js";

const ENV = { BOT_TOKEN: "TOKEN", CHAT_ID: "42", ALLOWED_ORIGIN: "*" };

function leadRequest(body, ip) {
  return new Request("https://worker.test/", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip },
    body: JSON.stringify(body),
  });
}

function tgMock(calls) {
  return async (url, options) => {
    calls.push({ url, body: JSON.parse(options.body) });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
}

test("leadText: собирает сообщение, пропуская пустые поля", () => {
  const text = leadText({ name: "Иван", contact: "@ivan_petrov", destination: "", question: "Виза?" });
  assert.match(text, /Иван/);
  assert.match(text, /@ivan_petrov/);
  assert.match(text, /Виза\?/);
  assert.doesNotMatch(text, /Куда:/);
});

test("валидная заявка уходит в Telegram, ответ ok: true", async () => {
  const calls = [];
  const res = await handleLead(
    leadRequest({ name: "Иван", contact: "@ivan_petrov", destination: "", question: "", company: "" }, "10.0.0.1"),
    ENV,
    tgMock(calls)
  );
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /api\.telegram\.org\/botTOKEN\/sendMessage/);
  assert.equal(calls[0].body.chat_id, "42");
  assert.match(calls[0].body.text, /Иван/);
});

test("honeypot заполнен — ok: true, но в Telegram ничего не уходит", async () => {
  const calls = [];
  const res = await handleLead(
    leadRequest({ name: "Бот", contact: "@spam_bot", company: "spam corp" }, "10.0.0.2"),
    ENV,
    tgMock(calls)
  );
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(calls.length, 0);
});

test("пустые имя или контакт — 400, ok: false", async () => {
  const calls = [];
  const res = await handleLead(
    leadRequest({ name: "", contact: "@ivan_petrov", company: "" }, "10.0.0.3"),
    ENV,
    tgMock(calls)
  );
  assert.equal(res.status, 400);
  assert.equal((await res.json()).ok, false);
  assert.equal(calls.length, 0);
});

test("OPTIONS — 204 с CORS-заголовками", async () => {
  const res = await handleLead(new Request("https://worker.test/", { method: "OPTIONS" }), ENV);
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), "*");
});

test("GET — 405", async () => {
  const res = await handleLead(new Request("https://worker.test/", { method: "GET" }), ENV);
  assert.equal(res.status, 405);
});

test("rate-limit: 6-й запрос в минуту с одного IP — 429", async () => {
  const calls = [];
  const body = { name: "Иван", contact: "@ivan_petrov", company: "" };
  let last;
  for (let i = 0; i < 6; i++) {
    last = await handleLead(leadRequest(body, "10.0.0.99"), ENV, tgMock(calls));
  }
  assert.equal(last.status, 429);
  assert.equal(calls.length, 5);
});
