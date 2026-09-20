import products from "../../data/products.json";
import imagePaths from "../../data/image-paths.json";
import applications from "../../data/applications.json";
import labels from "../../data/labels.json";
import faq from "../../data/faq.json";
import manufacturingProcess from "../../data/manufacturing-process.json";
import resourceCards from "../../data/resource-cards.json";
import { icon } from "../icons.js";
import { normalizeLinks } from "../links.js";
export {
  products,
  applications,
  faq,
  manufacturingProcess,
  resourceCards,
  icon,
  normalizeLinks,
};
export const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const assets = (name) => imagePaths[name] || `/images/${name}`;
export const { familyNames, typeNames } = labels;

/** Markup shared by statically rendered pages and native interactive updates. */
export function createSharedTemplates(state = {}) {
  const { cart = [], draft = {}, compare = new Set() } = state;
  function getProduct(id) {
    return products.find((p) => p.id === id);
  }
  function breadcrumb(items) {
    return `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/">Home</a>${items.map((x) => `${icon("chevron-right")}${x[1] ? `<a href="#${x[1]}">${esc(x[0])}</a>` : `<span aria-current="page">${esc(x[0])}</span>`}`).join("")}</nav>`;
  }
  function productImage(p, extra = "") {
    return p.crop
      ? `<div class="multi-crop ${extra}"><img src="${assets(p.image)}" alt="${esc(p.name)}" loading="lazy"></div>`
      : `<img class="${extra}" src="${assets(p.image)}" alt="${esc(p.name)}" loading="lazy">`;
  }
  function categorySidebar(query = new URLSearchParams()) {
    const fam = query.get("family"),
      type = query.get("type");
    return `<aside class="category-sidebar" aria-label="Product categories"><p class="eyebrow">PRODUCTS</p><div class="category-group"><a class="category-top ${!fam || fam === "sensor" ? "active" : ""}" href="#/products?family=sensor">Motion sensor lights ${icon("chevron-down")}</a><div class="category-children">${Object.entries(
      typeNames,
    )
      .map(
        ([id, name]) =>
          `<a class="${type === id ? "active" : ""}" href="#/products?type=${id}">${name}</a>`,
      )
      .join(
        "",
      )}</div></div><div class="category-group"><a class="category-top ${fam === "flood" ? "active" : ""}" href="#/products?family=flood">Solar floodlights ${icon("chevron-right")}</a></div><div class="category-group"><a class="category-top ${fam === "garden" ? "active" : ""}" href="#/products?family=garden">Garden spotlights ${icon("chevron-right")}</a></div><a class="category-top" href="#/oem">Your own product range ${icon("arrow-up-right")}</a><a class="sidebar-help" href="#/manufacturing">${icon("factory")}<span><b>From a China manufacturer</b>Built around your business</span></a></aside>`;
  }
  function card(p) {
    return `<article class="product-card"><div class="product-card-top"><label class="compare-check"><input type="checkbox" data-compare="${p.id}" ${compare.has(p.id) ? "checked" : ""} aria-label="Compare ${esc(p.name)}">Compare</label><span class="product-tag">${p.tag}</span></div><a class="product-visual" href="#/product/${p.id}" tabindex="-1" aria-hidden="true">${productImage(p)}</a><div class="product-card-info"><h3><a href="#/product/${p.id}">${p.name}</a></h3><p>${p.short}</p><div class="product-card-bottom"><a class="text-link" href="#/product/${p.id}">View details ${icon("arrow-right")}</a><button class="btn btn-outline btn-small" data-add="${p.id}" aria-label="Add ${p.name} to quote">${icon("plus")}Add to quote</button></div></div></article>`;
  }
  function applicationPanel(id) {
    const a = applications[id],
      p = getProduct(a.match);
    return `<div class="application-photo"><img src="${assets(a.image)}" alt="${esc(a.caption)}" loading="lazy"><div class="photo-caption"><h3>${a.caption}</h3><p>${a.sub}</p></div></div><div class="application-copy"><div><p class="eyebrow">START WITH THE SPACE</p><h3>${a.heading}</h3><p>Make the installation part of your product decision.</p><ul class="check-list">${a.checks.map((x) => `<li>${icon("check")}${x}</li>`).join("")}</ul></div><div class="match-row"><a class="match-thumbnail" href="#/product/${p.id}" aria-label="View ${p.name}">${productImage(p)}</a><div><p>PRODUCT FAMILY TO EXPLORE</p><b>${p.name}</b><a class="text-link" href="#/applications/${id}">Explore ${a.label.toLowerCase()} lighting ${icon("arrow-right")}</a></div></div></div>`;
  }
  function countries(value = "") {
    return `<option value="">Select destination</option>${["United Arab Emirates", "Saudi Arabia", "Australia", "Germany", "United Kingdom", "France", "Netherlands", "Other"].map((x) => `<option ${value === x ? "selected" : ""}>${x}</option>`).join("")}`;
  }
  function quickInquiry() {
    return `<section class="section rfq-strip"><div><p class="eyebrow blue-text">LET’S START WITH YOUR NEEDS</p><h2>A shorter path to<br>your next project.</h2><p>Have a product list or a space in mind? Turn it into a clear quotation brief.</p></div><form id="quick-inquiry" class="quick-form"><label class="field">Country / region<select name="country" required>${countries(draft.country)}</select></label><label class="field">I am looking for<select name="application"><option value="">A product range</option>${Object.entries(
      applications,
    )
      .map(
        ([id, a]) =>
          `<option value="${id}" ${draft.application === id ? "selected" : ""}>${a.label} lighting</option>`,
      )
      .join(
        "",
      )}</select></label><label class="field">Business email<input name="email" type="email" autocomplete="email" placeholder="you@company.com" value="${esc(draft.email || "")}" required></label><button class="btn btn-amber" type="submit">Start my quotation brief ${icon("arrow-right")}</button><p class="form-note">Next: add requirements and review your selected products.</p></form></section>`;
  }
  function sourceNoteLink() {
    return '<button class="text-button" data-action="source-note">View source notes</button>';
  }
  function matchesSearch(p, q) {
    return [p.name, p.short, p.panel, p.mount, p.family, ...p.apps]
      .join(" ")
      .toLowerCase()
      .includes(q.toLowerCase().trim());
  }
  function assetsForApplication(id) {
    return applications[id]?.image || "hero-courtyard.png";
  }
  function quantityControl(id, qty) {
    return `<div class="quantity-control"><button type="button" data-qty-step="-1" data-qty-id="${id}" aria-label="Decrease quantity">${icon("minus")}</button><input type="number" min="1" max="1000000" value="${qty}" data-qty="${id}" aria-label="${id === "detail" ? "Target quantity" : "Quantity for " + esc(getProduct(id)?.name || id)}"><button type="button" data-qty-step="1" data-qty-id="${id}" aria-label="Increase quantity">${icon("plus")}</button></div>`;
  }
  function totalQty() {
    return cart.reduce((n, x) => n + x.qty, 0);
  }
  function inquirySummary() {
    return `<aside class="inquiry-summary"><p class="eyebrow blue-text">YOUR REQUEST</p><h2>One brief. A clearer quote.</h2><p>${cart.length ? `${cart.length} selected product families` : "Start with your project or sourcing requirements"}</p>${cart
      .map((item) => {
        const p = getProduct(item.id);
        return `<div class="summary-row">${productImage(p)}<div><b>${p.name}</b><span>${p.panel}</span></div><strong>${item.qty.toLocaleString()} pcs</strong></div>`;
      })
      .join(
        "",
      )}${cart.length ? `<div class="summary-total"><span>Total requested</span><b>${totalQty().toLocaleString()} pcs</b></div>` : ""}<button class="btn btn-outline" data-action="quote">${icon("clipboard-list")}${cart.length ? "Edit product list" : "Add product families"}</button><div class="inline-info" style="margin-bottom:0">${icon("shield-check")}<span>Prices, order quantities, documents and timing depend on the confirmed model and commercial terms.</span></div></aside>`;
  }
  function briefText(b) {
    return `NICETHRYUN — B2B QUOTATION BRIEF\nPrepared: ${b.createdAt}\nStatus: LOCAL DRAFT — NOT SENT\n\nCOMPANY & CONTACT\nCompany: ${b.company}\nContact: ${b.contact}\nEmail: ${b.email}\nDestination: ${b.destination}\nBuyer type: ${b.role}\nPhone: ${b.phone || "Not supplied"}\n\nPURCHASING NEEDS\nApplication: ${b.application}\nTiming: ${b.timing || "To be discussed"}\n\nPRODUCT REQUESTS\n${b.products.length ? b.products.map((p, i) => `${i + 1}. ${p.productFamily} | ${p.quantity} pcs | ${p.panel}\n   Configuration to be confirmed`).join("\n") : "Please recommend suitable products from the requirements below."}\n\nREQUIREMENTS\n${b.requirements || "No additional requirements supplied."}\n\nATTACHMENTS TO SHARE SEPARATELY\n${b.attachmentNames.length ? b.attachmentNames.join("\n") : "None listed"}\n\n${b.note}\n`;
  }
  function renderNotFound() {
    return `<section class="section"><div class="empty-state">${icon("map")}<h1 style="font-size:36px;margin-bottom:17px">Let’s get you back to the range.</h1><p>This page could not be found.</p><a href="#/" class="btn btn-blue">Back to home ${icon("arrow-right")}</a></div></section>`;
  }
  return {
    getProduct,
    breadcrumb,
    productImage,
    categorySidebar,
    card,
    applicationPanel,
    countries,
    quickInquiry,
    sourceNoteLink,
    matchesSearch,
    assetsForApplication,
    quantityControl,
    totalQty,
    inquirySummary,
    briefText,
    renderNotFound,
  };
}
