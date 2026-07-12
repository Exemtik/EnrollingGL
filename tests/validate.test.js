import test from "node:test";
import assert from "node:assert/strict";
import { validateLead, isValidContact, LIMITS } from "../js/core/validate.js";

test("isValidContact: принимает @username, телефон и email", () => {
  assert.ok(isValidContact("@ivan_petrov"));
  assert.ok(isValidContact("+7 (900) 123-45-67"));
  assert.ok(isValidContact("89001234567"));
  assert.ok(isValidContact("ivan@example.com"));
});

test("isValidContact: отклоняет мусор", () => {
  assert.equal(isValidContact("привет"), false);
  assert.equal(isValidContact("@ab"), false); // короче 4 символов
  assert.equal(isValidContact("12"), false); // слишком короткий телефон
  assert.equal(isValidContact("ivan@"), false);
  assert.equal(isValidContact("-------"), false); // нет ни одной цифры
  assert.equal(isValidContact("() - () -"), false);
});

test("validateLead: валидная заявка проходит, поля триммятся", () => {
  const result = validateLead({
    name: "  Иван  ",
    contact: " @ivan_petrov ",
    destination: " Германия ",
    question: "",
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.lead, {
    name: "Иван",
    contact: "@ivan_petrov",
    destination: "Германия",
    question: "",
  });
});

test("validateLead: пустые имя и контакт — ошибки по обоим полям", () => {
  const result = validateLead({ name: "  ", contact: "" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.name);
  assert.ok(result.errors.contact);
});

test("validateLead: неверный формат контакта — ошибка", () => {
  const result = validateLead({ name: "Иван", contact: "просто текст" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.contact);
});

test("validateLead: превышение лимитов — ошибка", () => {
  const result = validateLead({
    name: "а".repeat(LIMITS.name + 1),
    contact: "@ivan_petrov",
    question: "б".repeat(LIMITS.question + 1),
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.name);
  assert.ok(result.errors.question);
});

test("validateLead: имя ровно в лимит проходит", () => {
  const result = validateLead({ name: "а".repeat(LIMITS.name), contact: "@ivan_petrov" });
  assert.equal(result.ok, true);
});

test("validateLead: превышение лимита destination — ошибка", () => {
  const result = validateLead({
    name: "Иван",
    contact: "@ivan_petrov",
    destination: "в".repeat(LIMITS.destination + 1),
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.destination);
});

test("validateLead: отсутствующие необязательные поля — пустые строки", () => {
  const result = validateLead({ name: "Иван", contact: "ivan@example.com" });
  assert.equal(result.ok, true);
  assert.equal(result.lead.destination, "");
  assert.equal(result.lead.question, "");
});
