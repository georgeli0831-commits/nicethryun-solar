import { applications, icon } from "./shared.js";

/** Dialogs markup retained from the approved single-file prototype. */
export function createDialogsTemplates(state, shared) {
  const { cart = [], compare = new Set() } = state;
  const { getProduct, productImage, quantityControl, totalQty } = shared;
  function renderQuote() {
    return `<div class="dialog-header"><div><p class="eyebrow blue-text">YOUR B2B SHORTLIST</p><h2 id="quote-heading" style="margin-top:7px">Quote list <span style="font-size:17px;color:var(--muted)">(${cart.length})</span></h2><p>Build one brief across multiple product families.</p></div><button class="icon-button" data-close="quote-dialog" aria-label="Close quote list">${icon("x")}</button></div><div class="dialog-body">${
      cart.length
        ? cart
            .map((item) => {
              const p = getProduct(item.id);
              return `<article class="quote-line"><a class="quote-img" href="#/product/${p.id}">${productImage(p)}</a><div><h3><a href="#/product/${p.id}">${p.name}</a></h3><p>${p.panel} · Target quantity</p><div class="quote-line-controls">${quantityControl(p.id, item.qty)}<button class="text-button" data-remove="${p.id}">Remove</button></div></div></article>`;
            })
            .join("")
        : `<div class="empty-state">${icon("clipboard-list")}<h3>Your next range starts here.</h3><p>Add the product families you want to discuss, then set your target quantities.</p><a class="btn btn-blue" href="#/products">Explore the range ${icon("arrow-right")}</a></div>`
    }<div class="inline-info">${icon("info")}<span>MOQ, configuration, pricing and lead time will be confirmed for the final quotation. Quantities here are planning requests.</span></div></div><div class="dialog-footer">${cart.length ? `<div class="summary-total"><span>${cart.length} product ${cart.length === 1 ? "family" : "families"}</span><b>${totalQty().toLocaleString()} pcs requested</b></div><a class="btn btn-amber" href="#/inquiry">Continue to inquiry ${icon("arrow-right")}</a><button class="text-button" data-action="download-list">Download product list (CSV)</button>` : `<a class="btn btn-amber" href="#/inquiry">Start with a project brief ${icon("arrow-right")}</a>`}<p>Saved in this browser · No payment required</p></div>`;
  }
  function renderCompare() {
    if (compare.size < 2) return;
    const list = [...compare].map(getProduct);
    return `<div class="dialog-header"><div><p class="eyebrow blue-text">SIDE-BY-SIDE SELECTION</p><h2 id="compare-heading" style="margin-top:7px">Compare product families.</h2><p>Compare format and use first. Confirm final specifications in your quotation.</p></div><button class="icon-button" data-close="compare-dialog" aria-label="Close comparison">${icon("x")}</button></div><div class="compare-scroll"><table class="compare-table"><caption class="subtle-note" style="text-align:left;padding:12px 0">Scroll horizontally on smaller screens to view all selected families.</caption><thead><tr><th scope="col">Product family</th>${list.map((p) => `<th scope="col">${productImage(p)}<b>${p.name}</b><button class="btn btn-blue" data-add="${p.id}">${icon("plus")}Add to quote</button></th>`).join("")}</tr></thead><tbody>${[
      ["Panel arrangement", (p) => p.panel],
      ["Installation", (p) => p.mount],
      [
        "Application",
        (p) => p.apps.map((id) => applications[id].label).join(", "),
      ],
      ["Visible format", (p) => p.features.join(" · ")],
      ["Selection consideration", (p) => p.consider],
      [
        "Technical data",
        () => "Confirm selected-model output, battery, runtime and documents",
      ],
      ["MOQ / lead time", () => "Confirm with quotation"],
    ]
      .map(
        ([label, fn]) =>
          `<tr><th scope="row">${label}</th>${list.map((p) => `<td>${fn(p)}</td>`).join("")}</tr>`,
      )
      .join(
        "",
      )}</tbody></table><div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:22px"><button class="btn btn-blue" data-action="add-compared">Add selected to quote ${icon("arrow-right")}</button><button class="btn btn-outline" data-action="download-compare">${icon("download")}Download comparison CSV</button></div></div>`;
  }
  return { renderQuote, renderCompare };
}
