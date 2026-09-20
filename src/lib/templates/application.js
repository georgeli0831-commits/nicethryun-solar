import { products, applications, assets, icon } from "./shared.js";

/** Application markup retained from the approved single-file prototype. */
export function createApplicationTemplates(_state, shared) {
  const { breadcrumb, card, quickInquiry, renderNotFound } = shared;
  function renderApplication(id) {
    const a = applications[id];
    if (!a) return renderNotFound();
    return `<section class="application-page-hero"><div class="application-page-copy">${breadcrumb([["Applications", "/applications/driveway"], [a.label]])}<p class="eyebrow">${a.label.toUpperCase()} LIGHTING</p><h1>${a.title}</h1><p>${a.intro}</p><a class="btn btn-amber" href="#/products?application=${id}">Explore suitable formats ${icon("arrow-right")}</a></div><div class="application-page-photo"><img src="${assets(a.image)}" alt="${a.caption}"><small>${a.note}</small></div></section><nav class="route-tabs" aria-label="Application navigation">${Object.entries(
      applications,
    )
      .map(
        ([key, item]) =>
          `<a class="${id === key ? "active" : ""}" href="#/applications/${key}" ${id === key ? 'aria-current="page"' : ""}>${item.label}</a>`,
      )
      .join(
        "",
      )}</nav><section class="section"><div class="section-heading"><div><p class="eyebrow blue-text">A BETTER PROJECT BRIEF</p><h2>Three decisions before the product.</h2></div></div><div class="buyer-questions">${a.questions.map(([title, body], i) => `<article><span class="number">0${i + 1} / SELECTION NOTES</span><h3>${title}</h3><p>${body}</p></article>`).join("")}</div><div class="market-strip">${icon("globe-2")}<div><b>Different destinations need different questions.</b><p>For Gulf projects, discuss site heat and dust exposure. For Australia, describe summer exposure, shading and location. For Germany and northern Europe, discuss winter daylight and required nightly operation. Final suitability needs the selected model’s technical evidence.</p></div></div></section><section class="section selection-section"><div class="section-heading"><div><p class="eyebrow blue-text">YOUR STARTING POINT</p><h2>Formats to consider.</h2><p>Explore the family, then confirm your site and operating requirements.</p></div><button class="btn btn-blue" data-project-brief="${id}">Start a project brief ${icon("arrow-right")}</button></div><div class="product-grid">${products
      .filter((p) => p.apps.includes(id))
      .slice(0, 3)
      .map(card)
      .join("")}</div></section>${quickInquiry()}`;
  }
  return { renderApplication };
}
