import { HERO, METRICS, ABOUT, MYTHS, FAQ, CONTACTS } from "../data/content.js";

export function renderHero(el) {
  el.innerHTML = `
    <h1>${HERO.title}</h1>
    <p class="hero-subtitle muted">${HERO.subtitle}</p>
    <a class="button" href="#apply">${HERO.ctaLabel}</a>
  `;
}

export function renderMetrics(el) {
  el.innerHTML = `
    <div class="metrics-grid">
      ${METRICS.map(
        (m) => `
        <div class="metric">
          <div class="metric-value">${m.value}</div>
          <div class="metric-label muted">${m.label}</div>
        </div>`
      ).join("")}
    </div>
  `;
}

export function renderAbout(el) {
  const photo = ABOUT.photo
    ? `<img src="${ABOUT.photo}" alt="${ABOUT.name}">`
    : `<span class="about-emoji" aria-hidden="true">🎓</span>`;
  el.innerHTML = `
    <h2>Кто мы</h2>
    <div class="about-card">
      <div class="about-photo">${photo}</div>
      <div>
        <h3>${ABOUT.name}</h3>
        <p class="muted">${ABOUT.role}</p>
        ${ABOUT.story.map((p) => `<p>${p}</p>`).join("")}
      </div>
    </div>
  `;
}

export function renderMyths(el) {
  el.innerHTML = `
    <h2>Страхи и реальность</h2>
    <div class="myths-grid">
      ${MYTHS.map(
        (m) => `
        <div class="myth-card">
          <p class="myth-fear">«${m.fear}»</p>
          <p class="myth-reality">${m.reality}</p>
        </div>`
      ).join("")}
    </div>
  `;
}

export function renderFaq(el) {
  el.innerHTML = `
    <h2>Частые вопросы</h2>
    ${FAQ.map(
      (f) => `
      <details class="faq-item">
        <summary>${f.question}</summary>
        <p class="muted">${f.answer}</p>
      </details>`
    ).join("")}
  `;
}

export function renderFooter(el) {
  el.innerHTML = `
    <p>EnrollingGL — помощь с поступлением за границу.</p>
    <p><a href="${CONTACTS.telegram}">Написать нам в Telegram</a></p>
  `;
}
