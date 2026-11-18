import type { APIRoute } from 'astro';
import { SITE_URL } from '../config/site.mjs';
import { robotsText } from '../lib/seo.mjs';

export const prerender = true;

export const GET: APIRoute = () => new Response(
  robotsText(SITE_URL),
  { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
);
