import { products, applications, assets, familyNames, icon } from "./shared.js";

/** Product markup retained from the approved single-file prototype. */
export function createProductTemplates(state, shared) {
  const { compare = new Set() } = state;
  const {
    getProduct,
    breadcrumb,
    productImage,
    card,
    assetsForApplication,
    quantityControl,
    renderNotFound,
  } = shared;
  function renderProduct(id) {
    const p = getProduct(id);
    if (!p) return renderNotFound();
    return `<div class="product-detail">${breadcrumb([["Products", "/products"], [familyNames[p.family], "/products?family=" + p.family], [p.name]])}<div class="detail-main"><div class="detail-gallery"><div class="detail-image" id="detail-image">${productImage(p)}</div><div class="detail-thumbnails"><button class="thumbnail" data-gallery="${p.image}" data-product="${p.id}" aria-pressed="true" aria-label="Main product image">${productImage(p)}</button>${p.detail ? `<button class="thumbnail" data-gallery="${p.detail}" data-product="${p.id}" aria-pressed="false" aria-label="Reference drawing"><img src="${assets(p.detail)}" alt="Reference drawing"></button>` : ""}<button class="thumbnail" data-gallery="${assetsForApplication(p.apps[0])}" data-product="${p.id}" aria-pressed="false" aria-label="Application scene"><img src="${assets(assetsForApplication(p.apps[0]))}" alt="Application scene"></button></div><p class="subtle-note">Catalogue reference image. Final configuration and dimensions require confirmation.</p></div><div class="detail-copy"><p class="eyebrow">${familyNames[p.family]} / REFERENCE RANGE</p><h1>${p.name}</h1><p>${p.desc}</p><div class="detail-tags">${p.features
      .slice(0, 3)
      .map((x) => `<span>${x}</span>`)
      .join(
        "",
      )}</div><dl class="detail-facts"><dt>Panel arrangement</dt><dd>${p.panel}</dd><dt>Installation format</dt><dd>${p.mount}</dd><dt>Applications</dt><dd>${p.apps.map((id) => applications[id].label).join(" · ")}</dd><dt>Configuration & MOQ</dt><dd>Confirm with your quotation</dd></dl><label class="field" style="margin-bottom:8px">Target quantity (pcs)</label><div class="detail-order">${quantityControl("detail", 100)}<button class="btn btn-blue" data-add="${p.id}" data-detail-qty="true">${icon("plus")}Add to quote list</button></div><p class="subtle-note">Planning quantity only. This is not a minimum order commitment.</p><div class="detail-secondary"><label class="compare-check"><input type="checkbox" data-compare="${p.id}" ${compare.has(p.id) ? "checked" : ""}>Compare product</label><button class="text-button" data-product-download="${p.id}">Download family overview (TXT)</button></div></div></div><div class="detail-bottom"><div><p class="eyebrow blue-text">INSTALLATION THINKING</p><h2 style="margin-top:10px">Start with the right position.</h2><p>${p.consider}</p><ul class="check-list">${p.features.map((x) => `<li>${icon("check")}${x}</li>`).join("")}</ul></div><div><p class="eyebrow blue-text">BEFORE YOUR ORDER</p><h2 style="margin-top:10px">What to confirm in your quote.</h2><ul>${p.questions.map((x) => `<li>${x}</li>`).join("")}<li>Destination-specific documents, packaging, MOQ and lead time</li></ul><div class="document-row">${icon("file-text")}<div><b>Need a model-specific technical file?</b><span>Include your destination and requested configuration.</span></div><button class="btn btn-outline btn-small" data-request-docs="${p.id}">Request ${icon("arrow-right")}</button></div></div></div><section class="related-section"><div class="section-heading"><h2>Explore another format.</h2><a class="text-link" href="#/products">All product families ${icon("arrow-right")}</a></div><div class="product-grid">${products
      .filter((x) => x.id !== p.id && x.apps.some((a) => p.apps.includes(a)))
      .slice(0, 3)
      .map(card)
      .join("")}</div></section></div>`;
  }
  return { renderProduct };
}
