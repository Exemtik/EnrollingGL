// Валидация анкеты. Чистые функции без DOM — используются и тестируются в Node.

export const LIMITS = { name: 100, contact: 100, destination: 200, question: 1000 };

const TG_RE = /^@[A-Za-z0-9_]{4,32}$/;
const PHONE_RE = /^\+?[\d\s\-()]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidContact(value) {
  return TG_RE.test(value) || PHONE_RE.test(value) || EMAIL_RE.test(value);
}

export function validateLead(raw) {
  const name = String(raw.name ?? "").trim();
  const contact = String(raw.contact ?? "").trim();
  const destination = String(raw.destination ?? "").trim();
  const question = String(raw.question ?? "").trim();

  const errors = {};
  if (!name) errors.name = "Укажите имя";
  else if (name.length > LIMITS.name) errors.name = "Слишком длинное имя";

  if (!contact) errors.contact = "Укажите, как с вами связаться";
  else if (contact.length > LIMITS.contact) errors.contact = "Слишком длинный контакт";
  else if (!isValidContact(contact)) {
    errors.contact = "Укажите @username, телефон или email";
  }

  if (destination.length > LIMITS.destination) errors.destination = "Слишком длинный текст";
  if (question.length > LIMITS.question) errors.question = "Слишком длинный вопрос";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, lead: { name, contact, destination, question } };
}
