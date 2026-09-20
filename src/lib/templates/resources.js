import { faq, resourceCards, icon } from "./shared.js";

/** Resources markup retained from the approved single-file prototype. */
export function createResourcesTemplates(_state, shared) {
  const { breadcrumb } = shared;
  function renderResources() {
    return `<header class="page-header"><div class="page-header-inner">${breadcrumb([["Resources"]])}<p class="eyebrow blue-text">THE BUYER’S DESK</p><h1>Clear information.<br>Better buying decisions.</h1><p>Bring the right questions to your selection, sampling and quotation process. Download planning resources or ask for documents for your selected model.</p></div></header><section class="section"><div class="resource-grid">${resourceCards.map(([ico, tag, title, body, id]) => `<article class="resource-card">${icon(ico)}<p class="eyebrow">${tag}</p><h2>${title}</h2><p>${body}</p><button class="btn btn-outline" data-resource="${id}">${icon("download")}Download ${id === "range-overview" ? "CSV" : "TXT"}</button></article>`).join("")}</div><div class="market-strip">${icon("file-check-2")}<div><b>Looking for a specification, drawing or compliance document?</b><p>Tell us the selected product family and destination. Model-specific files should match the quoted configuration; these planning resources are not certification documents.</p><button class="text-link text-button" style="margin-top:12px" data-factory-request="Please provide the selected-model datasheet, dimensions and documents appropriate to our destination.">Request model documents ${icon("arrow-right")}</button></div></div></section><section class="section selection-section"><div class="section-heading"><div><p class="eyebrow blue-text">FREQUENT PURCHASING QUESTIONS</p><h2>Before you ask for a quote.</h2></div></div><div class="faq-list">${faq.map((item) => `<details><summary>${item.question}</summary><p>${item.answer}</p></details>`).join("")}</div></section>`;
  }
  return { renderResources };
}
