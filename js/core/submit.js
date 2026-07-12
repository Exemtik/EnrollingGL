// Отправка заявки на Worker. fetch инжектируется — модуль тестируется в Node.

export async function submitLead(lead, { workerUrl, fetchImpl = fetch } = {}) {
  if (!workerUrl) return { ok: false, reason: "demo" };
  try {
    const res = await fetchImpl(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });
    if (!res.ok) return { ok: false, reason: "server" };
    const data = await res.json();
    return data.ok ? { ok: true } : { ok: false, reason: "server" };
  } catch {
    return { ok: false, reason: "network" };
  }
}
