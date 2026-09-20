import { products, applications, assets, esc, icon } from "./shared.js";

/** Home markup retained from the approved single-file prototype. */
export function createHomeTemplates(state, shared) {
  const { homeFilter = "all", homeSearch = "", homeApp = "driveway" } = state;
  const {
    categorySidebar,
    card,
    applicationPanel,
    quickInquiry,
    sourceNoteLink,
    matchesSearch,
  } = shared;
  function renderHome() {
    return `<section class="hero-shell">${categorySidebar()}<div class="hero"><img class="hero-bg" src="${assets("hero-courtyard.png")}" alt="Solar sensor lights illuminating a contemporary courtyard and driveway" fetchpriority="high"><div class="hero-content"><p class="eyebrow">SOLAR SECURITY LIGHTING<br>FOR A BRIGHTER WORLD</p><h1>Light the space.<br>Build your business.</h1><p>Solar lighting, made for your market.<br>A China manufacturing partner for distributors, brands and projects.</p><div class="hero-actions"><a class="btn btn-amber" href="#/products">Explore the range ${icon("arrow-right")}</a><a class="btn btn-outline-light" href="#/applications/driveway">Find by application</a></div></div><div class="hero-location">${icon("map-pin")} COURTYARD / DRIVEWAY <span class="scene-note">Application concept</span></div></div></section><div class="value-strip"><div>${icon("factory")}<div><b>China manufacturing source</b><p>Direct conversations. Clearer requirements.</p></div></div><div>${icon("scan-line")}<div><b>From site to product selection</b><p>Choose around the space and its needs.</p></div></div><div>${icon("package-check")}<div><b>Your range. Your brand.</b><p>Explore OEM and packaging options.</p></div></div></div><section class="section selection-section" id="home-range"><div class="section-heading"><div><p class="eyebrow blue-text">EXPLORE THE RANGE</p><h2>Build your quote list.</h2><p>Find a format, compare your options and bring multiple products into one inquiry.</p></div><a class="text-link" href="#/products">View all product families ${icon("arrow-up-right")}</a></div><div class="selection-toolbar"><div class="segmented" role="group" aria-label="Filter featured products"><button data-home-filter="all" class="${homeFilter === "all" ? "active" : ""}" aria-pressed="${homeFilter === "all"}">All security lights</button><button data-home-filter="Integrated solar" class="${homeFilter === "Integrated solar" ? "active" : ""}" aria-pressed="${homeFilter === "Integrated solar"}">Integrated solar</button><button data-home-filter="Split solar" class="${homeFilter === "Split solar" ? "active" : ""}" aria-pressed="${homeFilter === "Split solar"}">Split solar</button></div><label class="search-field">${icon("search")}<input id="home-search" type="search" aria-label="Search featured products" placeholder="Search product or application…" value="${esc(homeSearch)}"></label></div><div class="product-grid" id="home-products">${renderHomeProducts()}</div><div class="selection-foot"><span>${icon("columns-3")}Compare up to 3 product families before requesting a quote.</span><span>${icon("clipboard-list")}Quantities and requirements, together.</span></div></section><section class="section application-section"><div class="section-heading"><div><p class="eyebrow">APPLICATIONS</p><h2>The right light for every space.</h2></div><p>Different spaces. Different priorities.<br>Make your next selection with the setting in mind.</p></div><div class="application-tabs" role="tablist" aria-label="Lighting applications">${Object.entries(
      applications,
    )
      .map(
        ([id, a]) =>
          `<button role="tab" id="app-tab-${id}" aria-controls="home-application-panel" aria-selected="${homeApp === id}" tabindex="${homeApp === id ? "0" : "-1"}" data-home-app="${id}">${a.label}</button>`,
      )
      .join(
        "",
      )}</div><div class="application-panel" id="home-application-panel" role="tabpanel" aria-labelledby="app-tab-${homeApp}">${applicationPanel(homeApp)}</div></section><section class="section factory-section"><div class="factory-copy"><p class="eyebrow blue-text">FROM PROCESS TO PARTNERSHIP</p><h2>Behind the light,<br>a manufacturing<br>conversation.</h2><p>Know what goes into your range. Explore assembly, product evaluation and the information that supports a confident purchasing decision.</p><a class="btn btn-blue" href="#/manufacturing">Explore manufacturing ${icon("arrow-right")}</a></div><div><div class="factory-gallery"><a class="factory-photo" href="#/manufacturing"><img src="${assets("factory-assembly.png")}" alt="Assembly workers from the supplied factory catalogue" loading="lazy"><span>Product assembly<small>From components to a complete unit</small></span></a><a class="factory-photo" href="#/manufacturing"><img src="${assets("factory-showroom.png")}" alt="Lighting product showroom from the supplied catalogue" loading="lazy"><span>Product showroom<small>See the range in context</small></span></a><a class="factory-photo" href="#/manufacturing"><img src="${assets("factory-testing.png")}" alt="Light measurement equipment from the supplied catalogue" loading="lazy"><span>Light measurement<small>Ask for selected-model test data</small></span></a></div><p class="factory-image-note">Manufacturing imagery supplied for design reference. ${sourceNoteLink()}</p></div></section>${quickInquiry()}`;
  }
  function renderHomeProducts() {
    const shown = products
      .filter(
        (p) =>
          p.family !== "garden" &&
          (homeFilter === "all" || p.panel === homeFilter) &&
          matchesSearch(p, homeSearch),
      )
      .slice(0, 3);
    return shown.length
      ? shown.map(card).join("")
      : `<div class="empty-state full-width" style="grid-column:1/-1">${icon("search")}<h3>No matching product families</h3><p>Try “wall”, “split” or “driveway”, or explore the complete range.</p><button class="btn btn-outline" data-action="clear-home-search">Reset filters</button></div>`;
  }
  return { renderHome, renderHomeProducts };
}
