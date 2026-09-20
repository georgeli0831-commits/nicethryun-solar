import en from './en.json';

// The source site's dictionary and path helpers are retained; M1 enables only en.
// English is served at / without a locale prefix.
export type Region = 'en';
export const publicRegions: Region[] = ['en'];
export const langTag: Record<Region, string> = { en: 'en' };
export const regionLabel: Record<Region, string> = { en: 'EN' };
export const localePrefix: Record<Region, string> = { en: '' };

const dict: Record<Region, Record<string, string>> = { en };

export function t(region: Region, key: string): string {
  return dict[region][key] ?? dict.en[key] ?? key;
}

export const paths = {
  en: {
    products: 'products',
    applications: 'applications',
    manufacturing: 'manufacturing',
    oem: 'oem',
    resources: 'resources',
    inquiry: 'inquiry',
  },
} satisfies Record<Region, Record<string, string>>;

/** Translate registered path segments while retaining product/application slugs. */
export function translatePath(path: string, from: Region, to: Region): string {
  const segments = path.split('/').filter(Boolean);
  const fromPrefix = localePrefix[from];
  if (fromPrefix && segments[0] === fromPrefix) segments.shift();
  if (segments.length) {
    const keys = Object.keys(paths[from]) as (keyof typeof paths.en)[];
    const match = keys.find((key) => paths[from][key] === segments[0]);
    if (match) segments[0] = paths[to][match];
  }
  const translated = [localePrefix[to], ...segments].filter(Boolean).join('/');
  return translated ? `/${translated}/` : '/';
}
