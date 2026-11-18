/** Search metadata uses the same product data as the visible, static pages. */
const pageDefinitions = {
  '/': {
    title: 'Solar outdoor lighting for distributors and brands | NICETHRYUN Solar',
    description: 'Explore solar motion-sensor wall lights and separate-panel formats for outdoor spaces. Compare supplier specifications and prepare a B2B quotation with NICETHRYUN.',
  },
  '/products/': {
    title: 'Solar sensor lights and patio lights | NICETHRYUN Solar',
    heading: 'Solar lighting, clearly selected.',
    description: 'Compare six solar lighting formats, including compact wall lights, adjustable-head sensor lights and a separate-panel pendant. Review dimensions and build your quote list.',
    type: 'CollectionPage', breadcrumb: 'Products',
  },
  '/applications/': {
    title: 'Solar lighting for entrances, driveways and gardens | NICETHRYUN Solar',
    description: 'Explore outdoor solar lighting by application: entrances, driveways, boundaries and garden patios. Plan sunlight exposure, mounting and motion response before selecting a light.',
    type: 'CollectionPage', breadcrumb: 'Applications',
  },
  '/manufacturing/': {
    title: 'Inside the solar lighting factory | NICETHRYUN Solar',
    heading: 'Inside the factory. Behind every light.',
    description: 'View supplied factory photographs of production spaces and assembly work. Discuss your selected solar-light model, sampling needs and factory information with NICETHRYUN.',
    type: 'AboutPage', breadcrumb: 'Factory',
  },
  '/oem/': {
    title: 'Solar lighting OEM and private-label enquiries | NICETHRYUN Solar',
    heading: 'Build the range your market needs.',
    description: 'Prepare an OEM brief for solar lighting: product format, branding, packaging, destination and quantity. Confirm feasibility, sample costs, MOQ and lead time for the agreed scope.',
    breadcrumb: 'OEM / ODM',
  },
  '/resources/': {
    title: 'Solar lighting buying guides and product resources | NICETHRYUN Solar',
    heading: 'Clear information. Better buying decisions.',
    description: 'Read the solar lighting selection guide, download product-range and quotation-planning resources, and request model-specific specifications or destination documents.',
    type: 'CollectionPage', breadcrumb: 'Resources',
  },
  '/guides/solar-lighting-selection/': {
    title: 'How to select solar outdoor lights for a B2B order | NICETHRYUN Solar',
    description: 'Plan a solar lighting order around panel exposure, installation, battery and light-output evidence, motion settings, samples and destination requirements.',
    breadcrumb: 'Solar lighting selection', parent: ['Resources', '/resources/'],
  },
  '/inquiry/': {
    title: 'Request a solar lighting quotation | NICETHRYUN Solar',
    heading: 'Your next range starts here.',
    description: 'Send NICETHRYUN your selected solar lights, target quantities, destination and requirements. Build one quotation brief for your distribution, brand or installation business.',
    type: 'ContactPage', breadcrumb: 'Quotation brief',
  },
  '/inquiry/thanks/': {
    title: 'Thank you for your inquiry | NICETHRYUN Solar',
    description: 'Your inquiry has been received. Continue exploring the NICETHRYUN solar lighting range while our team reviews your requirements.',
  },
  '/404.html': {
    title: 'Page not found | NICETHRYUN Solar',
    heading: 'Let’s get you back to the range.',
    description: 'This page could not be found. Explore NICETHRYUN solar lighting products, applications and purchasing resources.',
  },
};

export function normalizePath(value = '/') {
  const path = new URL(value, 'https://path.invalid').pathname.replace(/\/{2,}/g, '/');
  if (path === '/404/' || path === '/404') return '/404.html';
  return path === '/' || /\.[a-z\d]+$/i.test(path) ? path : `${path.replace(/\/$/, '')}/`;
}

export function canonicalPathFor(path) {
  const normalized = normalizePath(path);
  return normalized === '/applications/patio/' ? '/applications/garden/' : normalized;
}

export function isSearchIndexable(value) {
  const path = normalizePath(value);
  return !['/inquiry/thanks/', '/404.html', '/applications/patio/'].includes(path);
}

export function robotsText(domain) {
  // Search and model-training preferences are separate. The existing wildcard
  // policy is preserved; this change does not opt the owner out of training.
  return `User-agent: OAI-SearchBot\nAllow: /\n\nUser-agent: *\nAllow: /\n\nSitemap: ${domain.replace(/\/$/, '')}/sitemap-index.xml\n`;
}

function assetPath(image, imagePaths) {
  if (imagePaths[image]) return imagePaths[image];
  const sourceName = image.replace(/^\/images\//, '');
  if (imagePaths[sourceName]) return imagePaths[sourceName];
  // Application data and the static assets use the same source names, with WebP output.
  if (/^scenes\/.+\.png$/.test(image)) return `/images/${image.replace(/\.png$/, '.webp')}`;
  return /^(https?:\/\/|\/)/.test(image) ? image : `/images/${image}`;
}

/** No guessed commercial terms, ownership, certifications or product identifiers. */
export function createPageSeo(path, data, overrides = {}) {
  const { site, products = [], applications = {}, imagePaths = {}, familyNames = {} } = data;
  const canonicalPath = canonicalPathFor(overrides.canonicalPath || path);
  const url = new URL(canonicalPath, site.domain).href;
  const home = new URL('/', site.domain).href;
  const orgId = `${home}#organization`;
  const websiteId = `${home}#website`;
  const product = products.find((item) => canonicalPath === `/products/${item.id}/`);
  const applicationEntry = Object.entries(applications).find(([id]) => canonicalPath === `/applications/${id === 'entryway' ? 'entry' : id}/`);
  const application = applicationEntry?.[1];
  let definition = { ...pageDefinitions[canonicalPath] };
  let crumbs = definition.breadcrumb ? [['Home', '/'], ...(definition.parent ? [definition.parent] : []), [definition.breadcrumb, canonicalPath]] : [];
  if (product) {
    definition = {
      title: `${product.name} | NICETHRYUN Solar`,
      heading: product.name,
      description: product.desc,
      image: product.image,
    };
    crumbs = [['Home', '/'], ['Products', '/products/'], [familyNames[product.family] || product.family, `/products/?family=${encodeURIComponent(product.family)}`], [product.name, canonicalPath]];
  } else if (application) {
    definition = {
      title: `${application.label} solar lighting | NICETHRYUN Solar`,
      heading: application.title,
      description: application.intro,
      image: application.image,
    };
    crumbs = [['Home', '/'], ['Applications', '/applications/'], [application.label, canonicalPath]];
  }
  // StaticPage synthesizes titles from decorative H1 copy. Use descriptive route
  // titles for those defaults while preserving an intentionally supplied title.
  const automaticTitles = [site.title, definition.heading && `NICETHRYUN — ${definition.heading}`];
  const title = overrides.title && !automaticTitles.includes(overrides.title)
    ? overrides.title : (definition.title || site.title);
  const description = overrides.description && overrides.description !== site.description
    ? overrides.description : (definition.description || site.description);
  const image = new URL(assetPath(overrides.image || definition.image || site.defaultImage, imagePaths), site.domain).href;
  const organization = {
    '@type': 'Organization', '@id': orgId, name: site.brand, url: home,
    ...(site.contact?.email ? { email: site.contact.email } : {}),
    ...(site.contact?.phone ? { telephone: site.contact.phone } : {}),
  };
  const webpage = {
    '@type': definition.type || 'WebPage', '@id': `${url}#webpage`, url,
    name: title, description, inLanguage: 'en',
    isPartOf: { '@id': websiteId }, publisher: { '@id': orgId },
    ...(crumbs.length ? { breadcrumb: { '@id': `${url}#breadcrumb` } } : {}),
    ...(product ? { mainEntity: { '@id': `${url}#product` } } : {}),
  };
  const graph = [
    organization,
    { '@type': 'WebSite', '@id': websiteId, name: site.brand, url: home, inLanguage: 'en', publisher: { '@id': orgId } },
    webpage,
  ];
  if (crumbs.length) graph.push({
    '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
    itemListElement: crumbs.map(([name, item], index) => ({
      '@type': 'ListItem', position: index + 1, name, item: new URL(item, site.domain).href,
    })),
  });
  if (product) graph.push({
    '@type': 'Product', '@id': `${url}#product`, url, name: product.name,
    description: `${product.desc} ${product.specNote || product.source || ''}`.trim(),
    image: [new URL(assetPath(product.image, imagePaths), site.domain).href],
    ...(product.model ? { model: product.model } : {}),
    additionalProperty: [
      ['Panel arrangement', product.panel], ['Installation format', product.mount],
      ...(product.specs || []).filter(([, value]) => value && !/^confirm with sample$/i.test(value.trim())),
    ].filter(([, value]) => value).map(([name, value]) => ({ '@type': 'PropertyValue', name, value })),
  });
  return { title, description, image, canonical: url, canonicalPath, graph: { '@context': 'https://schema.org', '@graph': graph } };
}

export function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
