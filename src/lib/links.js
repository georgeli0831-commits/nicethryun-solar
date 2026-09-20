/** Translate the approved prototype routes to the static Astro route map. */
export function routeHref(path) {
  const [pathname, query] = path.replace(/^#/, "").split("?");
  let route = pathname
    .replace(/^\/product\//, "/products/")
    .replace(/^\/applications\/entryway(?=\/|$)/, "/applications/entry");
  if (route === "/inquiry/ready") return "/inquiry/?ready=1";
  route = route.replace(/\/$/, "") + "/";
  return route + (query ? "?" + query : "");
}
export function normalizeLinks(html) {
  return html.replace(/href="#([^" ]+)"/g, (match, path) =>
    path.startsWith("/") ? `href="${routeHref(path)}"` : match,
  );
}
