import test from "node:test";
import assert from "node:assert/strict";
import { submitLead } from "../js/core/submit.js";

const LEAD = { name: "Иван", contact: "@ivan_petrov", destination: "", question: "", company: "" };

test("без workerUrl — демо-режим, fetch не вызывается", async () => {
  let called = false;
  const result = await submitLead(LEAD, {
    workerUrl: "",
    fetchImpl: async () => {
      called = true;
    },
  });
  assert.deepEqual(result, { ok: false, reason: "demo" });
  assert.equal(called, false);
});

test("успешный ответ Worker'а — ok: true, POST JSON на workerUrl", async () => {
  let captured;
  const result = await submitLead(LEAD, {
    workerUrl: "https://leads.example.workers.dev/",
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    },
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(captured.url, "https://leads.example.workers.dev/");
  assert.equal(captured.options.method, "POST");
  assert.deepEqual(JSON.parse(captured.options.body), LEAD);
});

test("HTTP-ошибка или ok: false от Worker'а — reason: server", async () => {
  const http500 = await submitLead(LEAD, {
    workerUrl: "https://x/",
    fetchImpl: async () => new Response("oops", { status: 500 }),
  });
  assert.deepEqual(http500, { ok: false, reason: "server" });

  const notOk = await submitLead(LEAD, {
    workerUrl: "https://x/",
    fetchImpl: async () =>
      new Response(JSON.stringify({ ok: false, error: "invalid" }), { status: 200 }),
  });
  assert.deepEqual(notOk, { ok: false, reason: "server" });
});

test("сеть упала (fetch кинул исключение) — reason: network", async () => {
  const result = await submitLead(LEAD, {
    workerUrl: "https://x/",
    fetchImpl: async () => {
      throw new TypeError("failed to fetch");
    },
  });
  assert.deepEqual(result, { ok: false, reason: "network" });
});
