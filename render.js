const app = document.querySelector("#app");

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function paragraphText(value = "") {
  return escapeHtml(value).replaceAll("\n", "<br />");
}

function renderFigure(item) {
  const caption = item.caption ? `<figcaption>${escapeHtml(item.caption)}</figcaption>` : "";
  return `
    <figure>
      <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt || "")}" />
      ${caption}
    </figure>
  `;
}

function renderMedia(media) {
  if (!media || !media.items?.length) return "";

  if (media.type === "single") {
    return `<div class="photo-single">${media.items.map(renderFigure).join("")}</div>`;
  }

  if (media.type === "gallery") {
    return `<div class="photo-gallery">${media.items.map(renderFigure).join("")}</div>`;
  }

  if (media.type === "pair") {
    return `<div class="photo-pair">${media.items.map(renderFigure).join("")}</div>`;
  }

  return media.items.map(renderFigure).join("");
}

function renderEntry(entry) {
  if (entry.kind === "plans") {
    return `
      <article class="plans">
        <p class="date">${escapeHtml(entry.date)}</p>
        <h2>${escapeHtml(entry.title)}</h2>
        <p>${paragraphText(entry.body)}</p>
      </article>
    `;
  }

  const classes = ["entry"];
  if (entry.layout === "wide") classes.push("entry-wide");

  return `
    <article class="${classes.join(" ")}">
      <div class="entry-text">
        <p class="date">${escapeHtml(entry.date)}</p>
        <h2>${escapeHtml(entry.title)}</h2>
        <p>${paragraphText(entry.body)}</p>
      </div>
      ${renderMedia(entry.media)}
    </article>
  `;
}

function renderLetter(data) {
  document.title = data.meta?.title || "Письмо бабушкам из Нью-Йорка";
  const description = document.querySelector("meta[name='description']");
  if (description && data.meta?.description) description.content = data.meta.description;

  app.innerHTML = `
    <section class="hero" aria-labelledby="title">
      <div class="hero-copy">
        <p class="kicker">${escapeHtml(data.hero.kicker)}</p>
        <h1 id="title">${escapeHtml(data.hero.title)}</h1>
        <p class="lead">${paragraphText(data.hero.lead)}</p>
      </div>
      <figure class="hero-photo">
        <img src="${escapeHtml(data.hero.photo.src)}" alt="${escapeHtml(data.hero.photo.alt || "")}" />
        <figcaption>${escapeHtml(data.hero.photo.caption || "")}</figcaption>
      </figure>
    </section>

    <section class="letter" aria-label="Письмо с фотографиями">
      ${data.entries.map(renderEntry).join("")}

      <section class="questions" aria-label="Вопросы бабушкам">
        <h2>${escapeHtml(data.questions.title)}</h2>
        <p>${paragraphText(data.questions.body)}</p>
      </section>
    </section>
  `;
}

fetch("letter.json", { cache: "no-cache" })
  .then((response) => {
    if (!response.ok) throw new Error(`Could not load letter.json: ${response.status}`);
    return response.json();
  })
  .then(renderLetter)
  .catch((error) => {
    app.innerHTML = `<p class="loading">Не получилось загрузить письмо. ${escapeHtml(error.message)}</p>`;
  });
