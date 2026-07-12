import {
  renderHero,
  renderMetrics,
  renderAbout,
  renderMyths,
  renderFaq,
  renderFooter,
} from "./ui/sections.js";
import { initForm } from "./ui/form.js";
import { submitLead } from "./core/submit.js";
import { CONTACTS } from "./data/content.js";

// URL Cloudflare Worker'а (см. README, раздел «Деплой»).
// Пустая строка = демо-режим: форма показывает ссылку на Telegram.
const WORKER_URL = "";

renderHero(document.querySelector("#hero"));
renderMetrics(document.querySelector("#facts"));
renderAbout(document.querySelector("#about"));
renderMyths(document.querySelector("#myths"));
renderFaq(document.querySelector("#faq"));
renderFooter(document.querySelector("#footer"));

initForm(document.querySelector("#lead-form"), document.querySelector("#form-success"), {
  telegramUrl: CONTACTS.telegram,
  onSubmit: (lead) => submitLead(lead, { workerUrl: WORKER_URL }),
});
