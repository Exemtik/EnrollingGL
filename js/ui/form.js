import { validateLead } from "../core/validate.js";

export function initForm(formEl, successEl, { onSubmit, telegramUrl }) {
  const statusEl = formEl.querySelector(".form-status");
  const button = formEl.querySelector("button[type=submit]");

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    statusEl.textContent = "";
    formEl.querySelectorAll(".field-error").forEach((el) => (el.textContent = ""));

    const result = validateLead({
      name: formEl.elements.name.value,
      contact: formEl.elements.contact.value,
      destination: formEl.elements.destination.value,
      question: formEl.elements.question.value,
    });

    if (!result.ok) {
      for (const [field, message] of Object.entries(result.errors)) {
        const el = formEl.querySelector(`.field-error[data-for="${field}"]`);
        if (el) el.textContent = message;
        else statusEl.textContent = message;
      }
      return;
    }

    button.disabled = true;
    const sent = await onSubmit({
      ...result.lead,
      company: formEl.elements.company.value, // honeypot уходит как есть
    });
    button.disabled = false;

    if (sent.ok) {
      formEl.hidden = true;
      successEl.hidden = false;
    } else {
      // Заявка не должна теряться молча: данные остаются в полях,
      // человеку показываем прямой путь в Telegram.
      statusEl.innerHTML =
        `Не получилось отправить — <a href="${telegramUrl}">напишите нам напрямую в Telegram</a>.`;
    }
  });
}
