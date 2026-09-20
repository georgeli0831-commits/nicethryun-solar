import {
  products,
  applications,
  esc,
  familyNames,
  typeNames,
  icon,
} from "./shared.js";

/** Catalogue markup retained from the approved single-file prototype. */
export function createCatalogueTemplates(_state, shared) {
  const { breadcrumb, categorySidebar, card, sourceNoteLink, matchesSearch } =
    shared;
  function renderCatalogue(q) {
    const fam = q.get("family"),
      type = q.get("type"),
      panel = q.get("panel"),
      app = q.get("application"),
      search = q.get("q") || "";
    const title =
      typeNames[type] ||
      familyNames[fam] ||
      "Solar lighting, clearly selected.";
    return `<header class="page-header"><div class="page-header-inner">${breadcrumb([["Products"]])}<p class="eyebrow blue-text">PRODUCT DIRECTORY</p><h1>${title}</h1><p>Explore product families, compare installation formats and create one quotation list. Start with what the site needs — then confirm the configuration.</p></div></header><div class="catalogue-layout"><div class="catalogue-side" id="catalogue-side">${categorySidebar(q)}<div class="filter-group"><h3>Panel arrangement</h3>${[
      ["", "All arrangements"],
      ["Integrated solar", "Integrated solar"],
      ["Split solar", "Split solar"],
    ]
      .map(
        ([id, n]) =>
          `<label><input type="radio" name="panel-filter" value="${id}" ${(!panel && !id) || panel === id ? "checked" : ""}>${n}</label>`,
      )
      .join(
        "",
      )}</div><div class="filter-group"><h3>Application</h3><label><input type="radio" name="app-filter" value="" ${!app ? "checked" : ""}>All applications</label>${Object.entries(
      applications,
    )
      .map(
        ([id, a]) =>
          `<label><input type="radio" name="app-filter" value="${id}" ${app === id ? "checked" : ""}>${a.label}</label>`,
      )
      .join(
        "",
      )}</div><div class="filter-group"><button class="text-button" data-action="reset-filters">Reset all filters</button></div></div><div class="catalogue-content"><div class="catalogue-toolbar"><span id="catalogue-count" aria-live="polite">${filterCatalogue(q).count}</span><button class="btn btn-outline btn-small mobile-filter" data-action="toggle-filters" aria-expanded="false" aria-controls="catalogue-side">${icon("sliders-horizontal")}Filters</button><label class="search-field">${icon("search")}<input type="search" id="catalogue-search" aria-label="Search product catalogue" placeholder="Search product or application…" value="${esc(search)}"></label></div><div class="active-filters">${[
      fam && ["family", familyNames[fam]],
      type && ["type", typeNames[type]],
      panel && ["panel", panel],
      app && ["application", applications[app]?.label],
    ]
      .filter(Boolean)
      .map(
        ([key, name]) =>
          `<button class="filter-chip" data-clear-filter="${key}">${esc(name)} ${icon("x")}</button>`,
      )
      .join(
        "",
      )}</div><div class="product-grid catalogue-grid" id="catalogue-results">${filterCatalogue(q).html}</div><p class="range-note">These are reference product families for range planning. Confirm model, light output, battery, runtime, certification documents, MOQ and lead time for your destination in the quotation. ${sourceNoteLink()}</p></div></div>`;
  }
  function filterCatalogue(q) {
    const list = products.filter(
      (p) =>
        (!q.get("family") || p.family === q.get("family")) &&
        (!q.get("type") || p.type === q.get("type")) &&
        (!q.get("panel") || p.panel === q.get("panel")) &&
        (!q.get("application") || p.apps.includes(q.get("application"))) &&
        matchesSearch(p, q.get("q") || ""),
    );
    const count = `${list.length} product ${list.length === 1 ? "family" : "families"} · Select to compare or request a quote`;
    const html = list.length
      ? list.map(card).join("")
      : `<div class="empty-state" style="grid-column:1/-1">${icon("search-x")}<h3>No products match these filters</h3><p>Try removing an application or panel filter to explore more of the range.</p><button class="btn btn-blue" data-action="reset-filters">Clear all filters</button></div>`;
    return { count, html };
  }
  return { renderCatalogue, filterCatalogue };
}
