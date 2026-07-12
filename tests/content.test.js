import test from "node:test";
import assert from "node:assert/strict";
import { HERO, METRICS, ABOUT, MYTHS, FAQ, CONTACTS } from "../js/data/content.js";

const nonEmpty = (s) => typeof s === "string" && s.trim().length > 0;

test("HERO: заголовок, подзаголовок и подпись кнопки заполнены", () => {
  assert.ok(nonEmpty(HERO.title));
  assert.ok(nonEmpty(HERO.subtitle));
  assert.ok(nonEmpty(HERO.ctaLabel));
});

test("METRICS: 3–4 метрики, у каждой значение и подпись", () => {
  assert.ok(METRICS.length >= 3 && METRICS.length <= 4);
  for (const m of METRICS) {
    assert.ok(nonEmpty(m.value));
    assert.ok(nonEmpty(m.label));
  }
});

test("ABOUT: имя, роль, история; photo — строка или null", () => {
  assert.ok(nonEmpty(ABOUT.name));
  assert.ok(nonEmpty(ABOUT.role));
  assert.ok(Array.isArray(ABOUT.story) && ABOUT.story.length >= 1);
  ABOUT.story.forEach((p) => assert.ok(nonEmpty(p)));
  assert.ok(ABOUT.photo === null || nonEmpty(ABOUT.photo));
});

test("MYTHS: 3–6 карточек «страх → реальность»", () => {
  assert.ok(MYTHS.length >= 3 && MYTHS.length <= 6);
  for (const m of MYTHS) {
    assert.ok(nonEmpty(m.fear));
    assert.ok(nonEmpty(m.reality));
  }
});

test("FAQ: 5–8 вопросов с ответами", () => {
  assert.ok(FAQ.length >= 5 && FAQ.length <= 8);
  for (const f of FAQ) {
    assert.ok(nonEmpty(f.question));
    assert.ok(nonEmpty(f.answer));
  }
});

test("CONTACTS: ссылка на Telegram", () => {
  assert.ok(CONTACTS.telegram.startsWith("https://t.me/"));
});
