const state = {
  letter: null,
};

const statusEl = document.querySelector("#status");
const entriesEl = document.querySelector("#entries");
const template = document.querySelector("#entry-template");
const apiUrlEl = document.querySelector("#api-url");
const tokenEl = document.querySelector("#admin-token");

function setStatus(message, type = "") {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function getPath(object, path) {
  return path.split(".").reduce((value, key) => value?.[key], object);
}

function setPath(object, path, value) {
  const parts = path.split(".");
  const last = parts.pop();
  const target = parts.reduce((current, key) => current[key], object);
  target[last] = value;
}

function bindEditable(root, source) {
  root.querySelectorAll("[data-path]").forEach((element) => {
    const value = getPath(source, element.dataset.path);
    element.textContent = value || "";
  });
}

function makeImageRow(item = { src: "", alt: "", caption: "" }) {
  const row = document.createElement("div");
  row.className = "image-row";
  row.innerHTML = `
    <input class="image-src" aria-label="Image path" placeholder="assets/photo.jpg" />
    <input class="image-alt" aria-label="Alt text" placeholder="Alt text" />
    <input class="image-caption" aria-label="Caption" placeholder="Caption" />
    <button class="remove-image" type="button" aria-label="Remove image">Remove</button>
  `;
  row.querySelector(".image-src").value = item.src || "";
  row.querySelector(".image-alt").value = item.alt || "";
  row.querySelector(".image-caption").value = item.caption || "";
  row.querySelector(".remove-image").addEventListener("click", () => row.remove());
  return row;
}

function renderImageFields(container, items = []) {
  container.innerHTML = "";
  items.forEach((item) => container.append(makeImageRow(item)));
}

function serializeImages(container) {
  return [...container.querySelectorAll(".image-row")]
    .map((row) => ({
      src: row.querySelector(".image-src").value.trim(),
      alt: row.querySelector(".image-alt").value.trim(),
      caption: row.querySelector(".image-caption").value.trim(),
    }))
    .filter((item) => item.src);
}

function renderEditor() {
  bindEditable(document, state.letter);
  renderImageFields(document.querySelector('[data-path="hero.photo"]'), [state.letter.hero.photo]);

  entriesEl.innerHTML = "";
  state.letter.entries.forEach((entry, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    node.dataset.index = index;
    node.querySelector(".entry-index").textContent = `Block ${index + 1}`;
    node.querySelector(".kind").value = entry.kind || "entry";
    node.querySelector(".layout").value = entry.layout || "standard";
    node.querySelector(".media-type").value = entry.media?.type || "";
    node.querySelector('[data-field="date"]').textContent = entry.date || "";
    node.querySelector('[data-field="title"]').textContent = entry.title || "";
    node.querySelector('[data-field="body"]').textContent = entry.body || "";
    renderImageFields(node.querySelector(".images"), entry.media?.items || []);
    node.querySelector(".add-image").addEventListener("click", () => {
      node.querySelector(".images").append(makeImageRow());
      if (!node.querySelector(".media-type").value) node.querySelector(".media-type").value = "figure";
    });
    node.querySelector(".delete-block").addEventListener("click", () => {
      node.remove();
      [...entriesEl.querySelectorAll(".entry-index")].forEach((label, nextIndex) => {
        label.textContent = `Block ${nextIndex + 1}`;
      });
    });
    entriesEl.append(node);
  });
}

function addBlock() {
  state.letter = serializeEditor();
  state.letter.entries.push({
    kind: "entry",
    layout: "standard",
    date: "Новый блок",
    title: "Заголовок",
    body: "Текст",
    media: null,
  });
  renderEditor();
}

function serializeEditor() {
  const next = structuredClone(state.letter);

  document.querySelectorAll("[data-path]").forEach((element) => {
    if (element.classList.contains("image-fields")) return;
    setPath(next, element.dataset.path, element.textContent.trim());
  });

  const heroImages = serializeImages(document.querySelector('[data-path="hero.photo"]'));
  next.hero.photo = heroImages[0] || { src: "", alt: "", caption: "" };

  next.entries = [...entriesEl.querySelectorAll(".entry-card")].map((card) => {
    const mediaType = card.querySelector(".media-type").value;
    const entry = {
      kind: card.querySelector(".kind").value,
      layout: card.querySelector(".layout").value,
      date: card.querySelector('[data-field="date"]').textContent.trim(),
      title: card.querySelector('[data-field="title"]').textContent.trim(),
      body: card.querySelector('[data-field="body"]').textContent.trim(),
    };

    if (mediaType) {
      entry.media = {
        type: mediaType,
        items: serializeImages(card.querySelector(".images")),
      };
    } else if (entry.kind !== "plans") {
      entry.media = null;
    }

    if (entry.kind === "plans") {
      delete entry.layout;
      delete entry.media;
    }

    return entry;
  });

  return next;
}

async function loadLetter() {
  setStatus("Loading...");
  const response = await fetch("../letter.json", { cache: "no-cache" });
  if (!response.ok) throw new Error(`Could not load letter.json: ${response.status}`);
  state.letter = await response.json();
  renderEditor();
  setStatus("Loaded.", "ok");
}

async function publish() {
  state.letter = serializeEditor();
  const apiUrl = apiUrlEl.value.trim().replace(/\/$/, "");
  const token = tokenEl.value.trim();

  if (!apiUrl) {
    setStatus("Add Worker URL first.", "error");
    return;
  }

  if (!token) {
    setStatus("Add admin token first.", "error");
    return;
  }

  setStatus("Publishing...");
  const response = await fetch(`${apiUrl}/publish`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content: state.letter }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.error || `Publish failed: ${response.status}`);
  }

  setStatus(`Published ${result.commit?.slice(0, 7) || ""}.`, "ok");
}

function saveSettings() {
  localStorage.setItem("grandmasLetterApiUrl", apiUrlEl.value.trim());
  localStorage.setItem("grandmasLetterAdminToken", tokenEl.value.trim());
  setStatus("Settings saved.", "ok");
}

apiUrlEl.value = localStorage.getItem("grandmasLetterApiUrl") || "";
tokenEl.value = localStorage.getItem("grandmasLetterAdminToken") || "";

document.querySelector("#reload").addEventListener("click", () => loadLetter().catch((error) => setStatus(error.message, "error")));
document.querySelector("#publish").addEventListener("click", () => publish().catch((error) => setStatus(error.message, "error")));
document.querySelector("#save-settings").addEventListener("click", saveSettings);
document.querySelector("#add-block").addEventListener("click", addBlock);

loadLetter().catch((error) => setStatus(error.message, "error"));
