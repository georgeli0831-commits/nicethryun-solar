// Shared by Astro, canonical/OG links, JSON-LD, robots.txt and the browser scripts.
export const SITE_URL = 'https://nicethryun-solar.com';

export const site = {
  brand: 'NICETHRYUN Solar',
  domain: SITE_URL,
  title: 'NICETHRYUN — Solar security lighting for your business',
  description: 'Explore NICETHRYUN solar security lighting for distributors, OEM brands and project buyers. Compare product families and build a quotation brief.',
  defaultImage: '/images/hero-courtyard.png',
  // Contact channels: null hides the channel everywhere (footer, floating button).
  // whatsapp: digits only with country code, e.g. '8613500000000'.
  contact: {
    whatsapp: null,
    phone: null,
    email: null,
  },
  // Web3Forms access key (public by design). null keeps the inquiry in
  // local preview mode: brief saved in the browser and downloadable, nothing sent.
  web3formsKey: null,
  // Google Tag Manager container (GTM-XXXXXXX) and Meta Pixel ID. null = not loaded.
  // Do not add Meta tags inside GTM as well, or events are counted twice.
  gtmId: null,
  metaPixelId: null,
};

export const inquiryLive = Boolean(site.web3formsKey);
