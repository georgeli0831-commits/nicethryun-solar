import { createSharedTemplates, normalizeLinks } from "./templates/shared.js";
export { products, applications, assets, esc } from "./templates/shared.js";
import { createHomeTemplates } from "./templates/home.js";
import { createCatalogueTemplates } from "./templates/catalogue.js";
import { createProductTemplates } from "./templates/product.js";
import { createApplicationTemplates } from "./templates/application.js";
import { createManufacturingTemplates } from "./templates/manufacturing.js";
import { createResourcesTemplates } from "./templates/resources.js";
import { createOemTemplates } from "./templates/oem.js";
import { createInquiryTemplates } from "./templates/inquiry.js";
import { createDialogsTemplates } from "./templates/dialogs.js";

/**
 * The same pure renderers generate every static route at build time and update
 * the small interactive regions in the browser. There is no client-only page shell.
 */
export function createTemplates(state = {}) {
  const shared = createSharedTemplates(state);
  const renderers = {
    ...shared,
    ...createHomeTemplates(state, shared),
    ...createCatalogueTemplates(state, shared),
    ...createProductTemplates(state, shared),
    ...createApplicationTemplates(state, shared),
    ...createManufacturingTemplates(state, shared),
    ...createResourcesTemplates(state, shared),
    ...createOemTemplates(state, shared),
    ...createInquiryTemplates(state, shared),
    ...createDialogsTemplates(state, shared),
  };
  return Object.fromEntries(
    Object.entries(renderers).map(([name, render]) => [
      name,
      (...args) => {
        const result = render(...args);
        if (typeof result === "string") return normalizeLinks(result);
        // Catalogue search returns count + markup; its inserted card links use
        // the same static route contract as full pages and dialog fragments.
        if (result && typeof result.html === "string") {
          return { ...result, html: normalizeLinks(result.html) };
        }
        return result;
      },
    ]),
  );
}
