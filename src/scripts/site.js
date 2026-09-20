import {
  products,
  applications,
  assets,
  createTemplates,
} from "../lib/templates.js";
import { icon } from "../lib/icons.js";
import { routeHref } from "../lib/links.js";
import resources from "../data/resources.json";
/* Approved prototype interactions; no network form submission. */
const storageKey = "nicethryun-prototype-v1";
let cart = [];
let draft = {};
let compare = new Set();
let homeFilter = "all";
let homeSearch = "";
let homeApp = "driveway";
let toastTimer;
let lastBrief = null;
const draftFields = [
  "company",
  "contact",
  "email",
  "country",
  "otherCountry",
  "role",
  "application",
  "timing",
  "phone",
  "message",
];
const briefFields = [
  "brand",
  "type",
  "createdAt",
  "company",
  "contact",
  "email",
  "destination",
  "role",
  "application",
  "timing",
  "phone",
  "requirements",
  "note",
];
function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function readStorage(kind, key) {
  let raw;
  try {
    raw = window[kind].getItem(key);
  } catch {
    // Keep the current in-memory state if browser storage is unavailable.
    return undefined;
  }
  try {
    const value = JSON.parse(raw || "{}");
    return isRecord(value) ? value : {};
  } catch {
    return {};
  }
}
function textFields(value, keys) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    keys
      .filter((key) => typeof value[key] === "string")
      .map((key) => [key, value[key]]),
  );
}
function attachmentNames(value) {
  return Array.isArray(value)
    ? value.filter((name) => typeof name === "string")
    : [];
}
function cleanBrief(value) {
  if (
    !isRecord(value) ||
    typeof value.createdAt !== "string" ||
    !Array.isArray(value.products) ||
    !Array.isArray(value.attachmentNames)
  )
    return null;
  return {
    ...Object.fromEntries(
      briefFields.map((key) => [
        key,
        typeof value[key] === "string" ? value[key] : "",
      ]),
    ),
    products: value.products.filter(isRecord).map((item) => ({
      ...Object.fromEntries(
        ["productFamily", "panel", "configuration"].map((key) => [
          key,
          typeof item[key] === "string" ? item[key] : "",
        ]),
      ),
      quantity: cleanQty(item.quantity),
    })),
    attachmentNames: attachmentNames(value.attachmentNames),
  };
}
function restoreStoredState() {
  const saved = readStorage("localStorage", storageKey);
  if (saved !== undefined) {
    const seen = new Set();
    cart = (Array.isArray(saved.cart) ? saved.cart : [])
      .filter((item) => {
        if (
          !isRecord(item) ||
          !products.some((product) => product.id === item.id) ||
          seen.has(item.id)
        )
          return false;
        seen.add(item.id);
        return true;
      })
      .map((item) => ({ id: item.id, qty: cleanQty(item.qty) }));
    draft = textFields(saved.draft, draftFields);
    if (isRecord(saved.draft) && Array.isArray(saved.draft.attachmentNames)) {
      draft.attachmentNames = attachmentNames(saved.draft.attachmentNames);
    }
  }
  const navigation = readStorage("sessionStorage", storageKey + "-navigation");
  if (navigation !== undefined) {
    compare = new Set(
      (Array.isArray(navigation.compare) ? navigation.compare : []).filter(
        (id) => products.some((product) => product.id === id),
      ),
    );
    compare = new Set([...compare].slice(0, 3));
    homeFilter = ["all", "Integrated solar", "Split solar"].includes(
      navigation.homeFilter,
    )
      ? navigation.homeFilter
      : "all";
    homeSearch =
      typeof navigation.homeSearch === "string" ? navigation.homeSearch : "";
    homeApp =
      typeof navigation.homeApp === "string" &&
      Object.hasOwn(applications, navigation.homeApp)
        ? navigation.homeApp
        : "driveway";
    lastBrief = cleanBrief(navigation.lastBrief);
  }
}
restoreStoredState();
function persistNavigation() {
  try {
    sessionStorage.setItem(
      storageKey + "-navigation",
      JSON.stringify({
        compare: [...compare],
        homeFilter,
        homeSearch,
        homeApp,
        lastBrief,
      }),
    );
  } catch {}
}
const main = document.getElementById("main-content");
const quoteDialog = document.getElementById("quote-dialog");
const compareDialog = document.getElementById("compare-dialog");
const infoDialog = document.getElementById("info-dialog");
function cleanQty(n) {
  return Math.max(1, Math.min(1000000, Math.floor(Number(n) || 1)));
}
function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ cart, draft }));
    return true;
  } catch {
    return false;
  }
}
function refreshIcons() {} // Shared templates already emit Lucide SVG markup.
function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.toggle("with-compare", compare.size > 0);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3300);
}
function getProduct(id) {
  return products.find((p) => p.id === id);
}
function currentRoute() {
  return {
    path: location.pathname.replace(/\/$/, "") || "/",
    query: new URLSearchParams(location.search),
  };
}
function go(path) {
  persistNavigation();
  const href = routeHref(path),
    next = new URL(href, location.origin);
  if (
    next.pathname === location.pathname &&
    currentRoute().path === "/products"
  ) {
    history.pushState(null, "", href);
    renderCatalogue(next.searchParams);
    window.scrollTo({ top: 0, behavior: "instant" });
    return;
  }
  if (currentRoute().path === "/inquiry" && next.pathname === "/inquiry/") {
    history.pushState(null, "", href);
    next.searchParams.has("ready") ? renderSuccess() : renderInquiry();
    window.scrollTo({ top: 0, behavior: "instant" });
    return;
  }
  location.assign(href);
}
function templates() {
  return createTemplates({
    cart,
    draft,
    compare,
    homeFilter,
    homeSearch,
    homeApp,
    lastBrief,
  });
}
const productImage = (...args) => templates().productImage(...args);
const applicationPanel = (...args) => templates().applicationPanel(...args);
const inquirySummary = (...args) => templates().inquirySummary(...args);
const briefText = (...args) => templates().briefText(...args);
function renderHomeProducts() {
  document.getElementById("home-products").innerHTML =
    templates().renderHomeProducts();
  refreshIcons();
}
function renderHomeApplication() {
  document.querySelectorAll("[data-home-app]").forEach((button) => {
    const active = button.dataset.homeApp === homeApp;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
  });
  const panel = document.getElementById("home-application-panel");
  panel.innerHTML = applicationPanel(homeApp);
  panel.setAttribute("aria-labelledby", "app-tab-" + homeApp);
  refreshIcons();
}
function updatePageTitle() {
  const heading = main
    .querySelector("h1")
    ?.innerText.replace(/\s+/g, " ")
    .trim();
  if (heading) document.title = `NICETHRYUN — ${heading}`;
}
function renderCatalogue(q) {
  main.innerHTML = templates().renderCatalogue(q);
  updatePageTitle();
  refreshIcons();
}
function filterCatalogue(q) {
  const result = templates().filterCatalogue(q);
  document.getElementById("catalogue-count").textContent = result.count;
  document.getElementById("catalogue-results").innerHTML = result.html;
  refreshIcons();
}
function renderInquiry() {
  main.innerHTML = templates().renderInquiry();
  updatePageTitle();
  refreshIcons();
}
function renderSuccess() {
  main.innerHTML = templates().renderSuccess();
  updatePageTitle();
  refreshIcons();
}
function renderQuote() {
  document.getElementById("quote-content").innerHTML =
    templates().renderQuote();
  refreshIcons();
}
function renderCompare() {
  if (compare.size < 2) return;
  document.getElementById("compare-content").innerHTML =
    templates().renderCompare();
  refreshIcons();
  compareDialog.showModal();
}
function setFilter(key, value) {
  const { query } = currentRoute();
  if (value) query.set(key, value);
  else query.delete(key);
  go(`/products${query.size ? "?" + query.toString() : ""}`);
}
function totalQty() {
  return cart.reduce((n, x) => n + x.qty, 0);
}
function updateCartUI() {
  document
    .querySelectorAll(".quote-count")
    .forEach((el) => (el.textContent = cart.length));
  document
    .querySelectorAll(".quote-toggle")
    .forEach((el) =>
      el.setAttribute(
        "aria-label",
        `Open quote list, ${cart.length} product families`,
      ),
    );
}
function addToCart(id, qty = 100) {
  const p = getProduct(id);
  if (!p) return;
  const entry = cart.find((x) => x.id === id);
  if (entry) entry.qty = cleanQty(entry.qty + qty);
  else cart.push({ id, qty: cleanQty(qty) });
  persist();
  updateCartUI();
  toast(`${p.name} added to quote list`);
  if (quoteDialog.open) renderQuote();
}
function openQuote() {
  renderQuote();
  quoteDialog.showModal();
}
function renderCompareTray() {
  const tray = document.getElementById("compare-tray");
  tray.hidden = !compare.size;
  tray.innerHTML = `${icon("columns-3")}<b>${compare.size} / 3 products selected</b><button data-action="clear-compare">Clear selection</button><button class="btn btn-amber" data-action="compare" ${compare.size < 2 ? "disabled" : ""}>Compare products ${icon("arrow-right")}</button><button class="icon-button" data-action="clear-compare" aria-label="Clear comparison">${icon("x")}</button>`;
  document
    .querySelectorAll("[data-compare]")
    .forEach((el) => (el.checked = compare.has(el.dataset.compare)));
  refreshIcons();
}
function formValues(form) {
  const data = Object.fromEntries(new FormData(form));
  delete data.attachments;
  delete data.consent;
  return data;
}
function saveInquiryForm() {
  const form = document.getElementById("inquiry-form");
  if (form) draft = { ...draft, ...formValues(form) };
  return persist();
}
function composeBrief() {
  return {
    brand: "NICETHRYUN",
    type: "B2B quotation request — local preview",
    createdAt: new Date().toISOString(),
    company: draft.company,
    contact: draft.contact,
    email: draft.email,
    destination: draft.country === "Other" ? draft.otherCountry : draft.country,
    role: draft.role,
    application:
      applications[draft.application]?.label ||
      "Product range / multiple applications",
    timing: draft.timing || "",
    phone: draft.phone || "",
    products: cart.map((item) => ({
      productFamily: getProduct(item.id).name,
      quantity: item.qty,
      panel: getProduct(item.id).panel,
      configuration: "To be confirmed",
    })),
    requirements: draft.message || "",
    attachmentNames: draft.attachmentNames || [],
    note: "This brief has not been sent. Share it with your supplier and attach the original files. Pricing, MOQ, specifications, documents and delivery terms require confirmation.",
  };
}
function download(name, content, type = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`${name} prepared for download`);
}
function csv(rows) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => '"' + String(value ?? "").replace(/"/g, '""') + '"')
          .join(","),
      )
      .join("\r\n")
  );
}
function downloadList(list = cart) {
  download(
    "NICETHRYUN-product-request.csv",
    csv([
      [
        "Product family",
        "Requested quantity (pcs)",
        "Panel arrangement",
        "Configuration",
      ],
      ...list.map((item) => {
        const p = getProduct(item.id);
        return [p.name, item.qty, p.panel, "To be confirmed"];
      }),
    ]),
    "text/csv;charset=utf-8",
  );
}
function downloadComparison() {
  const list = [...compare].map(getProduct);
  download(
    "NICETHRYUN-product-comparison.csv",
    csv([
      [
        "Product family",
        "Panel arrangement",
        "Installation format",
        "Applications",
        "Visible format",
        "Technical information",
      ],
      ...list.map((p) => [
        p.name,
        p.panel,
        p.mount,
        p.apps.map((a) => applications[a].label).join("; "),
        p.features.join("; "),
        "Final specification to be confirmed",
      ]),
    ]),
    "text/csv;charset=utf-8",
  );
}
function productDownload(id) {
  const p = getProduct(id);
  download(
    `NICETHRYUN-${id}-overview.txt`,
    `NICETHRYUN — PRODUCT FAMILY OVERVIEW\n\n${p.name}\n${p.desc}\n\nFORMAT\n${p.features.join("\n")}\nPanel: ${p.panel}\nMounting: ${p.mount}\nApplications: ${p.apps.map((a) => applications[a].label).join(", ")}\n\nSELECTION NOTES\n${p.consider}\n\nCONFIRM WITH YOUR QUOTATION\n${p.questions.join("\n")}\nMOQ, lead time, destination documents and commercial terms.\n\nSource: ${p.source}. Supplied reference material; model and specifications require confirmation. This overview is a planning aid, not a technical datasheet.\n`,
  );
}
function requestDocs(message, id) {
  if (id && !cart.some((x) => x.id === id)) cart.push({ id, qty: 100 });
  draft.message = [draft.message, message].filter(Boolean).join("\n");
  persist();
  updateCartUI();
  go("/inquiry");
}
function sourceNotes() {
  document.getElementById("info-content").innerHTML =
    `<div class="dialog-header"><h2 id="info-heading">Image & information notes</h2><button class="icon-button" data-close="info-dialog" aria-label="Close image notes">${icon("x")}</button></div><div class="dialog-body"><h3>Product & manufacturing photography</h3><p>Product images, the assembly photograph, measurement equipment and showroom photographs come from the two supplied SHINGEL reference catalogues. Their use here demonstrates the proposed NICETHRYUN website. Factory identity, rights and any brand relationship must be verified before public launch.</p><h3>Application scenes</h3><p>The driveway hero is an AI-generated application illustration based on the supplied product shape. Other application images are taken from the reference catalogue. These are not presented as completed NICETHRYUN customer projects or performance evidence.</p><h3>Specifications & inquiries</h3><p>No factory capacity, certification, price, MOQ or measured performance is asserted in this preview. Product families are reference selections. The quotation flow saves a local draft and exports files; it does not submit data or upload attachments.</p></div>`;
  refreshIcons();
  infoDialog.showModal();
}
function resourceDownload(id) {
  if (!Object.hasOwn(resources, id)) {
    toast("This resource is unavailable. Please request it in your inquiry.");
    return;
  }
  const name = `NICETHRYUN-${id}.${id === "range-overview" ? "csv" : "txt"}`;
  const a = document.createElement("a");
  a.href = `/downloads/${id}.${id === "range-overview" ? "csv" : "txt"}`;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast(`${name} prepared for download`);
}
document.addEventListener("click", (e) => {
  const target = e.target.closest("button,a");
  if (!target) return;
  if (target.matches('a[href^="/"]')) {
    if (currentRoute().path === "/inquiry") saveInquiryForm();
    [quoteDialog, compareDialog, infoDialog].forEach((d) => {
      if (d.open) d.close();
    });
  }
  if (target.dataset.add) {
    const qty = target.dataset.detailQty
      ? cleanQty(document.querySelector('[data-qty="detail"]').value)
      : 100;
    addToCart(target.dataset.add, qty);
    return;
  }
  if (target.dataset.close) {
    document.getElementById(target.dataset.close).close();
    return;
  }
  if (target.dataset.homeFilter) {
    homeFilter = target.dataset.homeFilter;
    persistNavigation();
    document.querySelectorAll("[data-home-filter]").forEach((b) => {
      b.classList.toggle("active", b.dataset.homeFilter === homeFilter);
      b.setAttribute(
        "aria-pressed",
        String(b.dataset.homeFilter === homeFilter),
      );
    });
    renderHomeProducts();
    return;
  }
  if (target.dataset.homeApp) {
    homeApp = target.dataset.homeApp;
    persistNavigation();
    renderHomeApplication();
    return;
  }
  if (target.dataset.clearFilter) {
    setFilter(target.dataset.clearFilter, "");
    return;
  }
  if (target.dataset.gallery) {
    const p = getProduct(target.dataset.product);
    document.getElementById("detail-image").innerHTML =
      target.dataset.gallery === p.image
        ? productImage(p)
        : `<img src="${assets(target.dataset.gallery)}" alt="${target.getAttribute("aria-label")}">`;
    document
      .querySelectorAll("[data-gallery]")
      .forEach((b) => b.setAttribute("aria-pressed", String(b === target)));
    return;
  }
  if (target.dataset.qtyStep) {
    const id = target.dataset.qtyId,
      input = document.querySelector(`[data-qty="${id}"]`);
    const value = cleanQty(
      Number(input.value) + Number(target.dataset.qtyStep),
    );
    input.value = value;
    if (id !== "detail") {
      cart.find((x) => x.id === id).qty = value;
      persist();
      renderQuote();
      refreshInquirySummary(true);
    }
    return;
  }
  if (target.dataset.remove) {
    cart = cart.filter((x) => x.id !== target.dataset.remove);
    persist();
    updateCartUI();
    renderQuote();
    refreshInquirySummary(true);
    return;
  }
  if (target.dataset.productDownload) {
    productDownload(target.dataset.productDownload);
    return;
  }
  if (target.dataset.resource) {
    resourceDownload(target.dataset.resource);
    return;
  }
  if (target.dataset.requestDocs) {
    requestDocs(
      `Please provide the model-specific technical file, dimensions and applicable destination documents for ${getProduct(target.dataset.requestDocs).name}.`,
      target.dataset.requestDocs,
    );
    return;
  }
  if (target.dataset.factoryRequest) {
    requestDocs(target.dataset.factoryRequest);
    return;
  }
  if (target.dataset.projectBrief) {
    draft.application = target.dataset.projectBrief;
    persist();
    go("/inquiry");
    return;
  }
  const action = target.dataset.action;
  if (action === "quote") openQuote();
  if (action === "source-note") sourceNotes();
  if (action === "clear-home-search") {
    homeFilter = "all";
    homeSearch = "";
    persistNavigation();
    document.getElementById("home-search").value = "";
    document.querySelectorAll("[data-home-filter]").forEach((b) => {
      b.classList.toggle("active", b.dataset.homeFilter === "all");
      b.setAttribute("aria-pressed", String(b.dataset.homeFilter === "all"));
    });
    renderHomeProducts();
  }
  if (action === "reset-filters") go("/products");
  if (action === "toggle-filters") {
    const side = document.getElementById("catalogue-side");
    side.classList.toggle("mobile-open");
    target.setAttribute(
      "aria-expanded",
      String(side.classList.contains("mobile-open")),
    );
  }
  if (action === "clear-compare") {
    compare.clear();
    persistNavigation();
    renderCompareTray();
  }
  if (action === "compare") renderCompare();
  if (action === "add-compared") {
    [...compare].forEach((id) => addToCart(id));
    compareDialog.close();
    openQuote();
  }
  if (action === "download-list") downloadList();
  if (action === "download-compare") downloadComparison();
  if (action === "clear-draft") {
    draft = {};
    persist();
    renderInquiry();
    refreshIcons();
    toast("Saved contact details and requirements cleared.");
  }
  if (action === "save-draft")
    toast(
      saveInquiryForm()
        ? "Draft saved in this browser"
        : "Browser storage unavailable; keep this page open and export your brief",
    );
  if (action === "download-brief" && lastBrief)
    download("NICETHRYUN-inquiry-brief.txt", briefText(lastBrief));
  if (action === "download-json" && lastBrief)
    download(
      "NICETHRYUN-inquiry-brief.json",
      JSON.stringify(lastBrief, null, 2),
      "application/json",
    );
  if (action === "edit-brief") go("/inquiry");
});
document.addEventListener("input", (e) => {
  const el = e.target;
  if (el.dataset.qty && el.dataset.qty !== "detail" && Number(el.value) >= 1) {
    const item = cart.find((x) => x.id === el.dataset.qty);
    if (item) {
      item.qty = cleanQty(el.value);
      persist();
      const total = document.querySelector("#quote-dialog .summary-total b");
      if (total)
        total.textContent = totalQty().toLocaleString() + " pcs requested";
      refreshInquirySummary();
    }
  }
  if (e.target.id === "home-search") {
    homeSearch = e.target.value;
    persistNavigation();
    renderHomeProducts();
  }
  if (e.target.id === "catalogue-search") {
    const q = currentRoute().query;
    if (e.target.value) q.set("q", e.target.value);
    else q.delete("q");
    history.replaceState(
      null,
      "",
      `/products/${q.size ? "?" + q.toString() : ""}`,
    );
    filterCatalogue(q);
  }
  if (
    e.target.closest("#inquiry-form") &&
    e.target.name !== "attachments" &&
    e.target.name !== "consent"
  )
    saveInquiryForm();
});
document.addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset.compare) {
    if (el.checked && compare.size >= 3) {
      el.checked = false;
      toast("Compare up to 3 product families. Remove one to add another.");
      return;
    }
    el.checked
      ? compare.add(el.dataset.compare)
      : compare.delete(el.dataset.compare);
    persistNavigation();
    renderCompareTray();
  }
  if (el.name === "panel-filter") setFilter("panel", el.value);
  if (el.name === "app-filter") setFilter("application", el.value);
  if (el.dataset.qty) {
    el.value = cleanQty(el.value);
    if (el.dataset.qty !== "detail") {
      cart.find((x) => x.id === el.dataset.qty).qty = Number(el.value);
      persist();
      renderQuote();
      refreshInquirySummary(true);
    }
  }
  if (el.matches('#inquiry-form [name="country"]')) {
    const field = document.getElementById("other-country-field");
    field.hidden = el.value !== "Other";
    field.querySelector("input").required = el.value === "Other";
    saveInquiryForm();
  }
  if (el.matches('#inquiry-form [name="attachments"]')) {
    draft.attachmentNames = Array.from(el.files).map((f) => f.name);
    persist();
  }
});
// TODO: form endpoint — quick inquiry, OEM and RFQ keep the demo's local-only flow.
document.addEventListener("submit", (e) => {
  if (e.target.id === "quick-inquiry") {
    e.preventDefault();
    draft = { ...draft, ...formValues(e.target) };
    persist();
    go("/inquiry");
  }
  if (e.target.id === "oem-form") {
    e.preventDefault();
    const data = formValues(e.target);
    draft.country = data.country;
    draft.role = "Private-label brand";
    draft.message = `OEM / ODM request\nScope: ${data.scope}\nBase family: ${data.family}\nTarget quantity: ${data.quantity} pcs\nPackaging: ${data.packaging}\n${data.message || ""}`;
    const p = products.find((x) => x.name === data.family);
    if (p) {
      const entry = cart.find((x) => x.id === p.id);
      if (entry) entry.qty = cleanQty(data.quantity);
      else cart.push({ id: p.id, qty: cleanQty(data.quantity) });
    }
    persist();
    updateCartUI();
    go("/inquiry");
  }
  if (e.target.id === "inquiry-form") {
    e.preventDefault();
    saveInquiryForm();
    const attached = Array.from(
      e.target.querySelector('[name="attachments"]').files,
    ).map((f) => f.name);
    if (attached.length) draft.attachmentNames = attached;
    persist();
    lastBrief = composeBrief();
    go("/inquiry/ready");
  }
});
document
  .getElementById("product-menu-toggle")
  .addEventListener("click", (e) => {
    const menu = document.getElementById("product-menu");
    menu.hidden = !menu.hidden;
    e.currentTarget.setAttribute("aria-expanded", String(!menu.hidden));
  });
document.getElementById("mobile-menu-toggle").addEventListener("click", (e) => {
  const menu = document.getElementById("mobile-menu");
  menu.hidden = !menu.hidden;
  e.currentTarget.setAttribute("aria-expanded", String(!menu.hidden));
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".nav-dropdown")) {
    document.getElementById("product-menu").hidden = true;
    document
      .getElementById("product-menu-toggle")
      .setAttribute("aria-expanded", "false");
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.getElementById("product-menu").hidden = true;
    document
      .getElementById("product-menu-toggle")
      .setAttribute("aria-expanded", "false");
    document.getElementById("mobile-menu").hidden = true;
    document
      .getElementById("mobile-menu-toggle")
      .setAttribute("aria-expanded", "false");
  }
  if (
    e.target.matches("[data-home-app]") &&
    ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
  ) {
    e.preventDefault();
    const buttons = [...document.querySelectorAll("[data-home-app]")];
    let i = buttons.indexOf(e.target);
    i =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? buttons.length - 1
          : (i + (e.key === "ArrowRight" ? 1 : -1) + buttons.length) %
            buttons.length;
    buttons[i].click();
    buttons[i].focus();
  }
});
[quoteDialog, compareDialog, infoDialog].forEach((d) => {
  d.addEventListener("click", (e) => {
    if (e.target === d) {
      const r = d.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        d.close();
    }
  });
});

function refreshInquirySummary(saveForm = false) {
  // The ready state shares /inquiry/ but no longer contains the inquiry form.
  const form = document.getElementById("inquiry-form");
  if (!form) return;
  if (saveForm) saveInquiryForm();
  const summary = document.querySelector(".inquiry-summary");
  if (summary) summary.outerHTML = inquirySummary();
  const message = form.elements.namedItem("message");
  if (message) message.required = !cart.length;
  refreshIcons();
}
function syncSavedForm({ resetMissing = false } = {}) {
  const form = document.getElementById("inquiry-form");
  if (form) {
    for (const [key, value] of Object.entries(draft)) {
      const control = form.elements.namedItem(key);
      if (control && control.type !== "file" && control.type !== "checkbox")
        control.value = value;
    }
    const field = document.getElementById("other-country-field");
    field.hidden = draft.country !== "Other";
    field.querySelector("input").required = draft.country === "Other";
    refreshInquirySummary();
  }
  for (const formId of ["quick-inquiry", "oem-form"]) {
    const quick = document.getElementById(formId);
    if (!quick) continue;
    for (const name of ["country", "application", "email"]) {
      const input = quick.elements.namedItem(name);
      if (input && (resetMissing || draft[name]))
        input.value = draft[name] || "";
    }
  }
}
function initializePage({ restored = false } = {}) {
  const { path, query } = currentRoute();
  if (path === "/products" && (restored || query.size)) renderCatalogue(query);
  if (path === "/inquiry" && query.has("ready") && lastBrief) renderSuccess();
  else if (path === "/inquiry" && restored) renderInquiry();
  else syncSavedForm({ resetMissing: restored });
  if (
    path === "/" &&
    (restored || homeFilter !== "all" || homeSearch || homeApp !== "driveway")
  ) {
    document.getElementById("home-search").value = homeSearch;
    document.querySelectorAll("[data-home-filter]").forEach((b) => {
      const active = b.dataset.homeFilter === homeFilter;
      b.classList.toggle("active", active);
      b.setAttribute("aria-pressed", String(active));
    });
    renderHomeProducts();
    renderHomeApplication();
  }
  document.querySelectorAll(".desktop-nav>.nav-link").forEach((a) => {
    const section = new URL(a.href).pathname.split("/")[1];
    const active = path.startsWith("/" + section);
    a.classList.toggle("active", active);
    if (active) a.setAttribute("aria-current", "page");
  });
  document
    .getElementById("product-menu-toggle")
    .classList.toggle("active", path.startsWith("/products"));
  updateCartUI();
  renderCompareTray();
  refreshIcons();
}
window.addEventListener("popstate", () => {
  const { path, query } = currentRoute();
  if (path === "/products") renderCatalogue(query);
  if (path === "/inquiry")
    query.has("ready") ? renderSuccess() : renderInquiry();
});
function closeTransientUI() {
  [quoteDialog, compareDialog, infoDialog].forEach((dialog) => {
    if (dialog.open) dialog.close();
  });
  for (const id of ["product-menu", "mobile-menu"]) {
    document.getElementById(id).hidden = true;
    document
      .getElementById(id + "-toggle")
      .setAttribute("aria-expanded", "false");
  }
  clearTimeout(toastTimer);
  document.getElementById("toast").hidden = true;
}
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  // A BFCache entry retains its old JS heap. Read the state saved by the newer
  // page before any interaction or pagehide can write that old heap back.
  restoreStoredState();
  closeTransientUI();
  initializePage({ restored: true });
});
window.addEventListener("pagehide", () => {
  persist();
  persistNavigation();
});
initializePage();
