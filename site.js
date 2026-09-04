const SESSION_KEY = "plukkefun_editor_session";
const USERNAME = "student";
const PASSWORD_HASH =
  "110388d85feddf74649fe7f2583f9aca76a659448384d99b21804175ab47a5a7";
const ALLOWED_PAGES = new Set([
  "oppgavebeskrivelse.html",
  "prosjektdagbok.html",
  "om-meg.html",
  "praksisstedet.html",
  "status-1.html",
  "status-2.html",
  "avsluttende-refleksjon.html",
]);

const isSignedIn = () => sessionStorage.getItem(SESSION_KEY) === "active";

const hashPassword = async (password) => {
  const bytes = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const safeReturnPage = () => {
  const requested = new URLSearchParams(window.location.search).get("return");
  return requested && ALLOWED_PAGES.has(requested) ? requested : "index.html";
};

const renderParagraphs = (container, text) => {
  container.replaceChildren();
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  paragraphs.forEach((paragraph) => {
    const element = document.createElement("p");
    element.textContent = paragraph;
    container.append(element);
  });
};

const setupAuthLinks = () => {
  document.querySelectorAll("[data-auth-link]").forEach((link) => {
    const page = document.body.dataset.page;
    if (isSignedIn()) {
      link.textContent = "Logg ut";
      link.setAttribute("href", "#");
      link.addEventListener("click", (event) => {
        event.preventDefault();
        sessionStorage.removeItem(SESSION_KEY);
        window.location.reload();
      });
      return;
    }

    link.textContent = "Logg inn for å redigere";
    link.setAttribute(
      "href",
      `login.html?return=${encodeURIComponent(`${page}.html`)}`,
    );
  });
};

const setupLogin = () => {
  const form = document.querySelector("[data-login-form]");
  if (!form) return;

  const username = form.querySelector("#username");
  const password = form.querySelector("#password");
  const message = form.querySelector("[data-form-message]");

  if (isSignedIn()) {
    window.location.replace(safeReturnPage());
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    message.classList.remove("is-error");

    const normalizedUsername = username.value.trim().toLowerCase();
    if (normalizedUsername.length < 3) {
      message.textContent = "Brukernavnet må inneholde minst tre tegn.";
      message.classList.add("is-error");
      username.focus();
      return;
    }

    if (password.value.length < 8) {
      message.textContent = "Passordet må inneholde minst åtte tegn.";
      message.classList.add("is-error");
      password.focus();
      return;
    }

    const passwordHash = await hashPassword(password.value);
    if (normalizedUsername !== USERNAME || passwordHash !== PASSWORD_HASH) {
      message.textContent = "Feil brukernavn eller passord.";
      message.classList.add("is-error");
      password.select();
      return;
    }

    sessionStorage.setItem(SESSION_KEY, "active");
    window.location.replace(safeReturnPage());
  });
};

const setupEditor = () => {
  const page = document.body.dataset.page;
  const form = document.querySelector("[data-editor-form]");
  if (!page || !form) return;

  const editor = document.querySelector("[data-editor]");
  const viewTitle = document.querySelector("[data-view-title]");
  const viewBody = document.querySelector("[data-view-body]");
  const titleInput = form.querySelector("#editor-title");
  const bodyInput = form.querySelector("#editor-body");
  const message = form.querySelector("[data-editor-message]");
  const resetButton = form.querySelector("[data-reset]");
  const storageKey = `plukkefun_content_${page}`;
  const defaultTitle = viewTitle.textContent.trim();
  const defaultBody = [...viewBody.querySelectorAll("h3, p")]
    .map((paragraph) => paragraph.textContent.trim())
    .join("\n\n");

  const readSavedContent = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (saved?.title && saved?.body) return saved;
    } catch {
      localStorage.removeItem(storageKey);
    }
    return null;
  };

  const updateView = ({ title, body }) => {
    viewTitle.textContent = title;
    renderParagraphs(viewBody, body);
  };

  const savedContent = readSavedContent();
  const current = savedContent ?? { title: defaultTitle, body: defaultBody };
  if (savedContent) updateView(savedContent);
  titleInput.value = current.title;
  bodyInput.value = current.body;

  if (isSignedIn()) editor.hidden = false;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();

    if (title.length < 2 || body.length < 10) {
      message.textContent = "Legg inn en tittel og minst ti tegn med innhold.";
      message.classList.add("is-error");
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify({ title, body }));
    updateView({ title, body });
    message.textContent = "Kladden er lagret i denne nettleseren.";
    message.classList.remove("is-error");
  });

  resetButton.addEventListener("click", () => {
    const shouldReset = window.confirm(
      "Vil du slette den lokale kladden og tilbakestille siden?",
    );
    if (!shouldReset) return;

    localStorage.removeItem(storageKey);
    titleInput.value = defaultTitle;
    bodyInput.value = defaultBody;
    updateView({ title: defaultTitle, body: defaultBody });
    message.textContent = "Den lokale kladden er fjernet.";
    message.classList.remove("is-error");
  });
};

setupAuthLinks();
setupLogin();
setupEditor();
