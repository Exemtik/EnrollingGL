# EnrollingGL MVP — план реализации (по спеке)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Цель:** одностраничный лендинг о помощи с поступлением за границу (hero, цифры, о нас, мифы, FAQ) с анкетой, заявки из которой прилетают основателям в Telegram через Cloudflare Worker.

**Архитектура:** статический фронтенд без сборки: `js/data/content.js` (весь контент страницы), `js/core/**` (валидация и отправка — чистая логика без DOM), `js/ui/**` (рендер секций и формы), `js/app.js` (связывание, константа URL Worker'а). Отдельно `worker/worker.js` — serverless-приёмник заявок (секреты `BOT_TOKEN`/`CHAT_ID` живут в Cloudflare, не в репозитории).

**Стек:** ванильные JS (ES-модули), HTML, CSS; тесты — `node --test` (Node ≥ 20), без зависимостей; Cloudflare Worker (деплой через wrangler или веб-интерфейс).

**Спека:** `docs/superpowers/specs/2026-07-11-enrollinggl-design.md` — при любой неоднозначности плана спека главнее.

## Global Constraints

- Только ванильные JS (ES-модули), HTML, CSS. Никаких npm-зависимостей и сборщиков. Node ≥ 20 — только для тестов.
- Запуск в браузере ТОЛЬКО через локальный сервер: `py -m http.server 8000` из корня EnrollingGL → `http://localhost:8000` (ES-модули не работают с `file://`).
- Тексты интерфейса русские; идентификаторы кода — английские.
- **Светлая тема, минимализм.** CSS-переменные: фон `#ffffff`, панель `#f6f7f9`, границы `#e0e3e8`, текст `#1f2430`, приглушённый `#6b7280`, акцент `#2f5fde`, ошибка `#d64545`, успех `#2e9e5b`.
- Лимиты полей анкеты: `name` 100, `contact` 100, `destination` 200, `question` 1000 символов. `name` и `contact` обязательны, остальные нет.
- Валидные форматы контакта: Telegram `@username` (4–32 символа `[A-Za-z0-9_]`), телефон (`+?`, 7–20 цифр/пробелов/скобок/дефисов), email (простая маска `x@y.z`).
- Анти-спам: скрытое honeypot-поле `company` (заполнено → Worker молча отвечает `ok: true`, ничего не отправляя); rate-limit в памяти Worker'а — максимум 5 запросов в минуту с одного IP (best-effort).
- `BOT_TOKEN` и `CHAT_ID` — только в секретах Cloudflare Worker'а; в коде сайта и в git их нет. URL Worker'а — константа `WORKER_URL` в `js/app.js`; пустая строка = демо-режим формы.
- Заявка никогда не теряется молча: любая ошибка отправки показывает сообщение со ссылкой «напишите нам напрямую в Telegram», введённые данные сохраняются в полях.
- `js/ui/**` без бизнес-логики; `js/core/**` и `js/data/**` без DOM. Worker самодостаточен (ничего не импортирует из `js/`).
- Тексты контента (метрики, мифы, FAQ, блок «о нас») в плане — черновые: структура и тон правильные, фактуру пользователь заменит правкой `js/data/content.js` без изменения кода.
- TDD для `data`/`core`/`worker`; UI — ручной чек-лист в каждой UI-задаче.
- Git-репозиторий инициализирован (в нём docs, remote на GitHub); один коммит на задачу, сообщения `feat|test|chore|docs: ...`.

## Карта файлов

```
EnrollingGL/
├── index.html            # T1 каркас: шапка-меню, секции, разметка формы
├── package.json          # T1 type=module + npm test
├── .gitignore            # T1
├── README.md             # T8 детальный
├── css/
│   └── style.css         # T1 база; T7 адаптивность и полировка
├── js/
│   ├── app.js            # T1 заглушка → T4 секции → T5 форма + WORKER_URL
│   ├── data/
│   │   └── content.js    # T2 hero, метрики, о нас, мифы, FAQ, контакты
│   ├── core/
│   │   ├── validate.js   # T3 валидация анкеты
│   │   └── submit.js     # T5 отправка заявки (fetch с инжекцией)
│   └── ui/
│       ├── sections.js   # T4 рендер секций из content.js
│       └── form.js       # T5 поведение формы
├── worker/
│   ├── worker.js         # T6 Cloudflare Worker — приёмник заявок
│   └── wrangler.toml     # T6 конфиг деплоя
└── tests/
    ├── setup.test.js     # T1
    ├── content.test.js   # T2
    ├── validate.test.js  # T3
    ├── submit.test.js    # T5
    └── worker.test.js    # T6
```

Порядок: T1 (каркас) → T2 (контент) → T3 (валидация) → T4 (секции UI) → T5 (форма и отправка) → T6 (Worker) → T7 (адаптивность) → T8 (README, финал).

---

### Task 1: Каркас — страница, базовые стили, тест-раннер

**Files:**
- Create: `package.json`, `.gitignore`, `index.html`, `css/style.css`, `js/app.js`
- Test: `tests/setup.test.js`

**Interfaces:**
- Produces: секции `#hero`, `#facts`, `#about`, `#myths`, `#faq`, `#apply`, `#footer`; форма `#lead-form` c полями `name`, `contact`, `destination`, `question`, `company` (honeypot), элементами `.field-error[data-for]`, `.form-status`, кнопкой `button[type=submit]`; блок `#form-success`. `npm test` → `node --test tests/`. CSS-переменные из Global Constraints.

- [ ] **Step 1: Служебные файлы**

`package.json`:

```json
{
  "name": "enrollinggl",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/"
  }
}
```

`.gitignore`:

```
node_modules/
.DS_Store
Thumbs.db
.wrangler/
```

- [ ] **Step 2: Тест-проверка раннера**

`tests/setup.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";

test("тестовый раннер работает и ES-модули читаются", () => {
  assert.equal(2 + 2, 4);
});
```

Run: `npm test`
Expected: `pass 1`, `fail 0`.

- [ ] **Step 3: index.html — каркас всех секций и разметка формы**

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>EnrollingGL — поступление за границу</title>
  <meta name="description" content="Помогаем поступить в университет за границей: разбираем процесс по шагам, отвечаем на вопросы, сопровождаем до зачисления.">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header class="site-header">
    <nav class="nav">
      <a class="nav-logo" href="#hero">EnrollingGL</a>
      <div class="nav-links">
        <a href="#about">О нас</a>
        <a href="#myths">Мифы</a>
        <a href="#faq">FAQ</a>
        <a class="nav-cta" href="#apply">Оставить заявку</a>
      </div>
    </nav>
  </header>

  <main>
    <section id="hero" class="section hero"></section>
    <section id="facts" class="section facts"></section>
    <section id="about" class="section"></section>
    <section id="myths" class="section"></section>
    <section id="faq" class="section"></section>

    <section id="apply" class="section apply">
      <h2>Оставить заявку</h2>
      <p class="apply-note">Оставьте контакты — мы сами свяжемся с вами, ответим на вопросы и предложим план действий.</p>
      <form id="lead-form" novalidate>
        <label>Имя*
          <input name="name" type="text" maxlength="100" required>
          <span class="field-error" data-for="name"></span>
        </label>
        <label>Как с вами связаться* (Telegram, телефон или email)
          <input name="contact" type="text" maxlength="100" required placeholder="@username, +7… или email">
          <span class="field-error" data-for="contact"></span>
        </label>
        <label>Куда хотите поступать (необязательно)
          <input name="destination" type="text" maxlength="200">
        </label>
        <label>Ваш вопрос (необязательно)
          <textarea name="question" maxlength="1000" rows="4"></textarea>
        </label>
        <label class="hp" aria-hidden="true">Компания
          <input name="company" type="text" tabindex="-1" autocomplete="off">
        </label>
        <button type="submit">Оставить заявку</button>
        <p class="form-status" role="status"></p>
      </form>
      <p id="form-success" class="form-success" hidden>Спасибо! Мы свяжемся с вами в ближайшее время.</p>
    </section>
  </main>

  <footer id="footer" class="site-footer"></footer>

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 4: css/style.css — база светлой темы**

```css
:root {
  --bg: #ffffff;
  --panel: #f6f7f9;
  --border: #e0e3e8;
  --text: #1f2430;
  --muted: #6b7280;
  --accent: #2f5fde;
  --error: #d64545;
  --success: #2e9e5b;
}

* { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--text);
  background: var(--bg);
  line-height: 1.6;
}

.site-header {
  position: sticky;
  top: 0;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  z-index: 10;
}

.nav {
  max-width: 960px;
  margin: 0 auto;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.nav-logo { font-weight: 700; color: var(--text); text-decoration: none; }

.nav-links { display: flex; align-items: center; gap: 20px; }

.nav-links a { color: var(--muted); text-decoration: none; }
.nav-links a:hover { color: var(--text); }

.nav-cta {
  color: #ffffff !important;
  background: var(--accent);
  padding: 8px 16px;
  border-radius: 8px;
}

.section { max-width: 960px; margin: 0 auto; padding: 64px 20px; }

h1 { font-size: 2.4rem; line-height: 1.2; margin: 0 0 16px; }
h2 { font-size: 1.7rem; margin: 0 0 24px; }

.muted { color: var(--muted); }

.button {
  display: inline-block;
  background: var(--accent);
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
}

form label { display: block; margin-bottom: 16px; }

form input, form textarea {
  display: block;
  width: 100%;
  max-width: 480px;
  margin-top: 4px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font: inherit;
}

form button {
  background: var(--accent);
  color: #ffffff;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font: inherit;
  cursor: pointer;
}

form button:disabled { opacity: 0.6; cursor: wait; }

.field-error { display: block; color: var(--error); font-size: 0.9rem; min-height: 1.2em; }

.form-status { color: var(--error); }
.form-status a { color: var(--accent); }

.form-success { color: var(--success); font-weight: 600; }

/* honeypot: убрать с глаз, но оставить в DOM для ботов */
.hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }

.site-footer {
  border-top: 1px solid var(--border);
  padding: 32px 20px;
  text-align: center;
  color: var(--muted);
}
```

- [ ] **Step 5: js/app.js — заглушка**

```js
console.log("EnrollingGL: app загружен");
```

- [ ] **Step 6: Ручная проверка**

Run: `py -m http.server 8000` → открыть `http://localhost:8000`.
Чек-лист: страница открывается без ошибок в консоли; шапка прилипает при скролле; клик по «Оставить заявку» в меню плавно скроллит к форме; форма отображается со всеми полями; honeypot-поле «Компания» не видно.

- [ ] **Step 7: Commit**

```bash
git add package.json .gitignore index.html css/style.css js/app.js tests/setup.test.js
git commit -m "feat: каркас лендинга — секции, форма, светлая тема, тест-раннер"
```

---

### Task 2: Контент страницы (`js/data/content.js`)

**Files:**
- Create: `js/data/content.js`
- Test: `tests/content.test.js`

**Interfaces:**
- Produces: экспорты `HERO {title, subtitle, ctaLabel}`, `METRICS: {value, label}[]` (3–4), `ABOUT {name, role, story: string[], photo: string|null}`, `MYTHS: {fear, reality}[]` (3–6), `FAQ: {question, answer}[]` (5–8), `CONTACTS {telegram}` (`https://t.me/…`). Используются в T4/T5.

- [ ] **Step 1: Написать падающий тест**

`tests/content.test.js`:

```js
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
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm test`
Expected: FAIL — `Cannot find module .../js/data/content.js`.

- [ ] **Step 3: Реализация — js/data/content.js**

Тексты черновые (тон: сдержанно и уверенно, без панибратства); пользователь заменит их своими без изменения кода.

```js
// Весь контент страницы. Правь тексты здесь — код трогать не нужно.

export const HERO = {
  title: "Поступление за границу — реальнее, чем кажется",
  subtitle:
    "Помогаем разобраться в процессе и дойти до зачисления: без паники, " +
    "лишних трат и мифов. Расскажем, с чего начать, и проведём по всем этапам.",
  ctaLabel: "Оставить заявку",
};

export const METRICS = [
  { value: "0 €", label: "стоит семестр в государственных вузах ряда стран Европы" },
  { value: "1000+", label: "программ на английском языке в европейских университетах" },
  { value: "6–12 мес", label: "занимает путь от решения до зачисления" },
  { value: "1 анкета", label: "отделяет вас от первого разговора с нами" },
];

export const ABOUT = {
  name: "Основатель EnrollingGL",
  role: "поступил в европейский университет и прошёл весь путь сам",
  story: [
    "Несколько лет назад он был на вашем месте: не понимал, с чего начать, " +
      "боялся бюрократии и не верил, что это вообще возможно.",
    "Сегодня он учится там, куда хотел поступить, и знает процесс изнутри: " +
      "документы, дедлайны, визы и все подводные камни, о которых не пишут " +
      "на сайтах университетов.",
  ],
  photo: null,
};

export const MYTHS = [
  {
    fear: "Это стоит огромных денег",
    reality:
      "Во многих странах Европы обучение в государственных вузах бесплатное " +
      "или почти бесплатное. Главное — знать, где искать и как подать документы.",
  },
  {
    fear: "Без идеального языка не возьмут",
    reality:
      "Для многих программ достаточно уверенного среднего уровня, а языковой " +
      "сертификат реально получить за время подготовки документов.",
  },
  {
    fear: "Мои оценки слишком обычные",
    reality:
      "Приёмные комиссии смотрят на заявку в целом: мотивацию, документы, " +
      "опыт. Сильная заявка собирается, а не рождается.",
  },
  {
    fear: "Это слишком сложно и бюрократично",
    reality:
      "Сложно, если идти вслепую. С понятным планом процесс превращается в " +
      "последовательность конкретных шагов с ясными сроками.",
  },
];

export const FAQ = [
  {
    question: "Сколько времени занимает поступление?",
    answer:
      "Обычно от 6 до 12 месяцев: подготовка документов, дедлайны вузов, " +
      "ожидание ответа и виза. Чем раньше начать, тем спокойнее процесс.",
  },
  {
    question: "Куда именно вы помогаете поступать?",
    answer:
      "В основном в страны Европы. Если вас интересует Азия — напишите, " +
      "обсудим ваш вариант.",
  },
  {
    question: "Сколько стоят ваши услуги?",
    answer:
      "Первый разговор ни к чему не обязывает. Дальше стоимость зависит от " +
      "объёма помощи — обсудим лично и честно.",
  },
  {
    question: "Нужно ли знать язык страны?",
    answer:
      "Часто достаточно английского: программ на нём много. Требования " +
      "зависят от страны и конкретной программы — поможем сориентироваться.",
  },
  {
    question: "У меня уже есть диплом. Мне подходит?",
    answer:
      "Да: за границей можно получить и бакалавриат, и магистратуру, и PhD. " +
      "Подскажем, какой вариант разумен в вашей ситуации.",
  },
  {
    question: "Что будет после того, как я оставлю заявку?",
    answer:
      "Мы сами свяжемся с вами удобным способом, зададим несколько вопросов " +
      "и предложим план первых шагов.",
  },
];

export const CONTACTS = {
  telegram: "https://t.me/EnrollingGL",
};
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS (6 тестов контента + setup, fail 0).

- [ ] **Step 5: Commit**

```bash
git add js/data/content.js tests/content.test.js
git commit -m "feat: контент лендинга — hero, метрики, о нас, мифы, FAQ, контакты"
```

---

### Task 3: Валидация анкеты (`js/core/validate.js`)

**Files:**
- Create: `js/core/validate.js`
- Test: `tests/validate.test.js`

**Interfaces:**
- Produces: `LIMITS = {name: 100, contact: 100, destination: 200, question: 1000}`; `isValidContact(value: string): boolean`; `validateLead(raw) -> {ok: true, lead: {name, contact, destination, question}} | {ok: false, errors: Record<field, message>}`. Используется формой (T5) — все строки триммятся, `lead` содержит уже очищенные значения.

- [ ] **Step 1: Написать падающий тест**

`tests/validate.test.js`:

```js
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

test("validateLead: отсутствующие необязательные поля — пустые строки", () => {
  const result = validateLead({ name: "Иван", contact: "ivan@example.com" });
  assert.equal(result.ok, true);
  assert.equal(result.lead.destination, "");
  assert.equal(result.lead.question, "");
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm test`
Expected: FAIL — `Cannot find module .../js/core/validate.js`.

- [ ] **Step 3: Реализация — js/core/validate.js**

```js
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
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS, fail 0.

- [ ] **Step 5: Commit**

```bash
git add js/core/validate.js tests/validate.test.js
git commit -m "feat: валидация анкеты — имя, контакт (tg/телефон/email), лимиты"
```

---

### Task 4: Рендер секций (`js/ui/sections.js`)

**Files:**
- Create: `js/ui/sections.js`
- Modify: `js/app.js` (заглушку из T1 заменить целиком)

**Interfaces:**
- Consumes: `HERO, METRICS, ABOUT, MYTHS, FAQ, CONTACTS` из `js/data/content.js` (T2).
- Produces: `renderHero(el)`, `renderMetrics(el)`, `renderAbout(el)`, `renderMyths(el)`, `renderFaq(el)`, `renderFooter(el)` — каждая заполняет переданный контейнер. `app.js` вызывает их для секций из T1.

- [ ] **Step 1: Реализация — js/ui/sections.js**

Контент — наш собственный (из `content.js`), поэтому `innerHTML` с шаблонными строками безопасен. Пользовательский ввод сюда не попадает.

```js
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
```

- [ ] **Step 2: js/app.js — подключить рендер (заменить заглушку целиком)**

```js
import {
  renderHero,
  renderMetrics,
  renderAbout,
  renderMyths,
  renderFaq,
  renderFooter,
} from "./ui/sections.js";

renderHero(document.querySelector("#hero"));
renderMetrics(document.querySelector("#facts"));
renderAbout(document.querySelector("#about"));
renderMyths(document.querySelector("#myths"));
renderFaq(document.querySelector("#faq"));
renderFooter(document.querySelector("#footer"));
```

- [ ] **Step 3: css/style.css — стили секций (добавить в конец файла)**

```css
/* Hero */
.hero { padding-top: 96px; padding-bottom: 96px; }
.hero-subtitle { font-size: 1.15rem; max-width: 640px; margin-bottom: 28px; }

/* Метрики */
.facts { background: var(--panel); }
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}
.metric-value { font-size: 1.9rem; font-weight: 700; color: var(--accent); }
.metric-label { font-size: 0.95rem; }

/* О нас */
.about-card { display: flex; gap: 24px; align-items: flex-start; }
.about-photo {
  flex: 0 0 120px;
  height: 120px;
  border-radius: 16px;
  background: var(--panel);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  overflow: hidden;
}
.about-photo img { width: 100%; height: 100%; object-fit: cover; }

/* Мифы */
.myths-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.myth-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
}
.myth-fear { font-weight: 600; margin-top: 0; }
.myth-reality { margin-bottom: 0; }

/* FAQ */
.faq-item {
  border-bottom: 1px solid var(--border);
  padding: 12px 0;
}
.faq-item summary { cursor: pointer; font-weight: 600; }
```

- [ ] **Step 4: Проверить, что тесты не сломаны**

Run: `npm test`
Expected: PASS, fail 0.

- [ ] **Step 5: Ручной чек-лист**

Run: `py -m http.server 8000` → `http://localhost:8000`.

- Hero: заголовок, подзаголовок, кнопка ведёт к анкете.
- Метрики: 4 карточки в ряд на сером фоне.
- «Кто мы»: эмодзи-заглушка вместо фото, роль, два абзаца истории.
- «Страхи и реальность»: 4 карточки в 2 колонки, страх в кавычках жирным.
- FAQ: 6 вопросов, раскрываются/закрываются кликом (стандартный `<details>`).
- Футер: ссылка «Написать нам в Telegram».
- В консоли нет ошибок.

- [ ] **Step 6: Commit**

```bash
git add js/ui/sections.js js/app.js css/style.css
git commit -m "feat: рендер секций лендинга из content.js"
```

---

### Task 5: Отправка заявки (`js/core/submit.js`) и поведение формы (`js/ui/form.js`)

**Files:**
- Create: `js/core/submit.js`, `js/ui/form.js`
- Modify: `js/app.js` (добавить форму и `WORKER_URL`)
- Test: `tests/submit.test.js`

**Interfaces:**
- Consumes: `validateLead` из `js/core/validate.js` (T3); разметка формы из T1; `CONTACTS` из T2.
- Produces: `submitLead(lead, {workerUrl, fetchImpl}) -> Promise<{ok: true} | {ok: false, reason: "demo"|"network"|"server"}>`; `initForm(formEl, successEl, {onSubmit, telegramUrl})`. Константа `WORKER_URL` в `js/app.js` (пустая = демо-режим). Worker (T6) получает POST JSON `{name, contact, destination, question, company}`.

- [ ] **Step 1: Написать падающий тест**

`tests/submit.test.js`:

```js
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
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm test`
Expected: FAIL — `Cannot find module .../js/core/submit.js`.

- [ ] **Step 3: Реализация — js/core/submit.js**

```js
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
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS, fail 0.

- [ ] **Step 5: Реализация — js/ui/form.js**

```js
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
```

- [ ] **Step 6: js/app.js — финальная версия (заменить целиком)**

```js
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
```

- [ ] **Step 7: Ручной чек-лист**

Run: `py -m http.server 8000` → `http://localhost:8000`, секция «Оставить заявку»:

- Отправка пустой формы: под «Имя» и «Как с вами связаться» появляются подсказки, запрос не уходит.
- Контакт «просто текст» → подсказка «Укажите @username, телефон или email».
- Валидные данные (`WORKER_URL` пуст) → под формой «Не получилось отправить — напишите нам напрямую в Telegram» со ссылкой; введённые данные не стёрлись.
- Временно поставить `WORKER_URL = "https://example.com/"` → отправка валидной формы показывает то же сообщение об ошибке (сервер не наш); вернуть `WORKER_URL = ""`.
- В консоли нет ошибок.

- [ ] **Step 8: Commit**

```bash
git add js/core/submit.js js/ui/form.js js/app.js tests/submit.test.js
git commit -m "feat: анкета — валидация, отправка на Worker, демо-режим и fallback в Telegram"
```

---

### Task 6: Cloudflare Worker — приёмник заявок (`worker/worker.js`)

**Files:**
- Create: `worker/worker.js`, `worker/wrangler.toml`
- Test: `tests/worker.test.js`

**Interfaces:**
- Consumes: POST JSON `{name, contact, destination, question, company}` от `submitLead` (T5).
- Produces: `handleLead(request, env, fetchImpl?) -> Promise<Response>` (экспорт для тестов), `leadText(lead) -> string`, `export default {fetch}` для Cloudflare. Ответы: JSON `{ok: true}` / `{ok: false, error}`; CORS-заголовки из `env.ALLOWED_ORIGIN`. `env`: `BOT_TOKEN` (секрет), `CHAT_ID` (секрет), `ALLOWED_ORIGIN` (переменная).

- [ ] **Step 1: Написать падающий тест**

`tests/worker.test.js` (Node ≥ 20: `Request`/`Response` глобальны; каждый тест использует свой IP, потому что rate-limit живёт в памяти модуля):

```js
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
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npm test`
Expected: FAIL — `Cannot find module .../worker/worker.js`.

- [ ] **Step 3: Реализация — worker/worker.js**

```js
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
```

- [ ] **Step 4: worker/wrangler.toml**

```toml
name = "enrollinggl-leads"
main = "worker.js"
compatibility_date = "2026-07-01"

[vars]
ALLOWED_ORIGIN = "*"
```

После деплоя сайта на GitHub Pages значение `ALLOWED_ORIGIN` меняется на реальный origin (например `https://exemtik.github.io`) — шаг описан в README (T8).

- [ ] **Step 5: Убедиться, что тесты проходят**

Run: `npm test`
Expected: PASS, fail 0 (все наборы: setup, content, validate, submit, worker).

- [ ] **Step 6: Commit**

```bash
git add worker/worker.js worker/wrangler.toml tests/worker.test.js
git commit -m "feat: Cloudflare Worker — приём заявок, honeypot, rate-limit, отправка в Telegram"
```

---

### Task 7: Адаптивность и полировка

**Files:**
- Modify: `css/style.css` (добавить в конец файла)

**Interfaces:**
- Consumes: классы разметки из T1/T4/T5. Ничего нового не производит — только CSS.

- [ ] **Step 1: Медиа-запросы и мелкая полировка (добавить в конец css/style.css)**

```css
/* Планшет и уже */
@media (max-width: 900px) {
  .metrics-grid { grid-template-columns: 1fr 1fr; }
  .myths-grid { grid-template-columns: 1fr; }
  h1 { font-size: 1.9rem; }
}

/* Телефон */
@media (max-width: 600px) {
  .section { padding: 40px 16px; }
  .hero { padding-top: 56px; padding-bottom: 56px; }
  .metrics-grid { grid-template-columns: 1fr; }
  .about-card { flex-direction: column; }
  .nav { flex-wrap: wrap; }
  .nav-links { gap: 12px; flex-wrap: wrap; }
  form input, form textarea { max-width: none; }
}

/* Якорные секции не прячутся под липкой шапкой */
.section { scroll-margin-top: 72px; }
```

- [ ] **Step 2: Ручной чек-лист (DevTools, режим устройства)**

Run: `py -m http.server 8000` → `http://localhost:8000`, DevTools → Toggle device toolbar:

- Ширина 375px (телефон): одна колонка везде, метрики столбиком, карточка «о нас» столбиком, поля формы на всю ширину, меню переносится без горизонтального скролла.
- Ширина 768px (планшет): метрики 2×2, мифы одной колонкой.
- Десктоп ≥ 960px: как в T4/T5.
- Клик по пунктам меню: секция не прячется под шапкой.
- В консоли нет ошибок.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: адаптивная вёрстка для телефона и планшета"
```

---

### Task 8: README и финальная проверка

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: всё построенное в T1–T7.

- [ ] **Step 1: README.md**

Пользователь — новичок в веб-разработке: README подробный, витрина + учебный конспект. Структура (каждый раздел наполнить реальным содержанием по факту готового кода):

```markdown
# EnrollingGL

Лендинг о помощи с поступлением за границу. Посетитель читает о нас,
мифах и FAQ — и оставляет заявку; она мгновенно приходит нам в Telegram.

## О проекте
<!-- что это, для кого, скриншот страницы (сделать и положить в docs/screenshot.png) -->

## Как устроен код
<!-- карта папок из плана; почему контент отделён от разметки (правишь
content.js — код не трогаешь); почему core не знает про DOM.
Мини-словарик (по строке): ES-модуль, fetch, serverless, worker, CORS,
secret, honeypot, rate-limit, GitHub Pages. -->

## Запуск и тесты
<!-- py -m http.server 8000 и почему нельзя просто открыть файл (ES-модули
не работают с file://); npm test → node --test tests/, нужен Node ≥ 20. -->

## Как поменять контент
<!-- пошагово: добавить миф, вопрос FAQ, метрику; заменить тексты и фото
в блоке «о нас»; поменять ссылку на Telegram (CONTACTS.telegram). -->

## Деплой

### Сайт → GitHub Pages
<!-- Settings → Pages → Deploy from a branch → main / root. URL вида
https://<username>.github.io/EnrollingGL/ -->

### Приём заявок → Cloudflare Worker
<!-- пошагово:
1. Создать бота у @BotFather → получить BOT_TOKEN.
2. Создать приватную группу с соучредителем, добавить бота,
   узнать CHAT_ID (через https://api.telegram.org/bot<TOKEN>/getUpdates).
3. Бесплатный аккаунт Cloudflare → npx wrangler login.
4. cd worker && npx wrangler deploy.
5. npx wrangler secret put BOT_TOKEN, npx wrangler secret put CHAT_ID.
6. В wrangler.toml поставить ALLOWED_ORIGIN = origin сайта, повторить deploy.
7. Вписать URL Worker'а в WORKER_URL в js/app.js, закоммитить и запушить.
8. Сквозной тест: отправить заявку с сайта → сообщение пришло в группу. -->

## Дорожная карта
<!-- tg-бот как второй канал контакта; английская версия; хранение заявок. -->
```

Комментарии `<!-- -->` — указания себе при написании: в готовом README их быть не должно, вместо них — настоящий текст.

- [ ] **Step 2: Финальная сквозная проверка**

- `npm test` → PASS, fail 0.
- `py -m http.server 8000` → пройти страницу сверху вниз по чек-листам T4/T5/T7.
- Прочитать README глазами новичка: каждый шаг деплоя выполним без гугления.

- [ ] **Step 3: Commit и push**

```bash
git add README.md
git commit -m "docs: README — руководство, словарик, инструкция деплоя"
git push
```

---

## Что дальше (вне плана)

- Реальные тексты и фото для блока «о нас» от пользователя → правка `js/data/content.js`.
- Деплой по README: GitHub Pages + Cloudflare Worker + секреты.
- Следующий проект после MVP: диалоговый tg-бот (отдельная спека и план).
