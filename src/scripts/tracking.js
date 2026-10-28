/**
 * Ads tracking: dataLayer events, inquiry attribution and the Web3Forms send.
 * Events are pushed even before GTM is configured; they take effect once a
 * container (and/or Meta Pixel) is set in src/config/site.mjs.
 *
 * Event names are shared with GA4, Google Ads and Meta — do not rename:
 *   whatsapp_click  any wa.me link (footer, floating button, content)
 *   contact_click   tel: / mailto: links, contact_method = phone | email
 *   generate_lead   once, on /inquiry/thanks/ right after a successful send
 */
import { site } from "../config/site.mjs";

window.dataLayer = window.dataLayer || [];
// The Meta Pixel is loaded directly in BaseLayout, so each event goes to both.
const pixelEvent = {
  generate_lead: "Lead",
  whatsapp_click: "Contact",
  contact_click: "Contact",
};
function push(event, data = {}, eventId) {
  window.dataLayer.push({ event, page_path: location.pathname, ...data });
  const name = pixelEvent[event];
  if (!name || typeof window.fbq !== "function") return;
  const params = {
    content_name: event,
    ...(data.contact_method ? { contact_method: data.contact_method } : {}),
  };
  if (eventId) window.fbq("track", name, params, { eventID: eventId });
  else window.fbq("track", name, params);
}

const ATTR_KEY = "nicethryun-attribution";
const LEAD_KEY = "nicethryun-lead-pending";
const CLICK_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
];
const MAX_AGE = 30 * 24 * 3600 * 1000;
const store = {
  get(kind, key) {
    try {
      return window[kind].getItem(key);
    } catch {
      return null;
    }
  },
  set(kind, key, value) {
    try {
      window[kind].setItem(key, value);
    } catch {
      // Private mode: degrade silently.
    }
  },
  del(kind, key) {
    try {
      window[kind].removeItem(key);
    } catch {
      // noop
    }
  },
};

// Attribution: an ad click overwrites (last ad click), otherwise keep 30 days.
function readAttribution() {
  try {
    const value = JSON.parse(store.get("localStorage", ATTR_KEY) || "null");
    return value && Date.now() - value.ts < MAX_AGE ? value : null;
  } catch {
    return null;
  }
}
const params = new URLSearchParams(location.search);
let attribution = readAttribution();
if (CLICK_PARAMS.some((key) => params.get(key)) || !attribution) {
  attribution = {
    landing_page: location.href,
    first_referrer: document.referrer,
    ts: Date.now(),
  };
  for (const key of CLICK_PARAMS) {
    const value = params.get(key);
    if (value) attribution[key] = value;
  }
  store.set("localStorage", ATTR_KEY, JSON.stringify(attribution));
}

document.addEventListener(
  "click",
  (event) => {
    const target = event.target?.closest?.("a");
    if (!target) return;
    const href = target.getAttribute("href") || "";
    const area = target.hasAttribute("data-wa-fab")
      ? "floating"
      : target.closest("header")
        ? "header"
        : target.closest("footer")
          ? "footer"
          : "content";
    if (/wa\.me\/|api\.whatsapp\.com/.test(href))
      push("whatsapp_click", { link_area: area });
    else if (href.startsWith("tel:"))
      push("contact_click", { contact_method: "phone", link_area: area });
    else if (href.startsWith("mailto:"))
      push("contact_click", { contact_method: "email", link_area: area });
  },
  { capture: true },
);

/**
 * Send a composed brief to Web3Forms. Resolves on success and marks one
 * pending generate_lead for the thanks page; rejects on any failure so the
 * caller can keep the form and show an error.
 */
export async function sendInquiry(brief, { botcheck = false, formName = "inquiry" } = {}) {
  if (!site.web3formsKey) throw new Error("Inquiry endpoint not configured");
  const current = readAttribution() ?? attribution;
  const products = brief.products.length
    ? brief.products
        .map((p, i) => `${i + 1}. ${p.productFamily} | ${p.quantity} pcs | ${p.panel}`)
        .join("\n")
    : "Please recommend suitable products.";
  const payload = {
    access_key: site.web3formsKey,
    subject: `NICETHRYUN inquiry — ${brief.company} (${brief.destination})`,
    from_name: "NICETHRYUN website",
    replyto: brief.email,
    botcheck,
    company: brief.company,
    name: brief.contact,
    email: brief.email,
    destination: brief.destination,
    buyer_type: brief.role,
    application: brief.application,
    timing: brief.timing || "",
    phone: brief.phone || "",
    products,
    message: brief.requirements || "",
    attachments_to_follow: brief.attachmentNames.join(", "),
    form_name: formName,
    landing_page: current.landing_page,
    source_page: location.href,
    referrer: current.first_referrer || "",
  };
  for (const key of CLICK_PARAMS) if (current[key]) payload[key] = current[key];
  const response = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success)
    throw new Error(result.message || String(response.status));
  const eventId =
    crypto.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  store.set(
    "sessionStorage",
    LEAD_KEY,
    JSON.stringify({ ts: Date.now(), form: formName, eventId }),
  );
}

// Thanks page: push generate_lead only right after a real send, never on reload.
if (document.body.hasAttribute("data-thanks")) {
  const pending = store.get("sessionStorage", LEAD_KEY);
  if (pending) {
    store.del("sessionStorage", LEAD_KEY);
    try {
      const { ts, form, eventId } = JSON.parse(pending);
      if (Date.now() - ts < 30 * 60 * 1000) {
        const clickData = Object.fromEntries(
          CLICK_PARAMS.filter((k) => attribution[k]).map((k) => [k, attribution[k]]),
        );
        push("generate_lead", { form_name: form, ...clickData }, eventId);
      }
    } catch {
      // A corrupted marker is dropped rather than counted.
    }
  }
}
