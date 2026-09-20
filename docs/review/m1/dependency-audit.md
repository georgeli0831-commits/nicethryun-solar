# M1 dependency security review

Reviewed: 2026-09-20. Scope: the current Astro 5 static build and its local build
tools. No dependency upgrade, override, installation, or code mitigation was
applied by this review.

**The dependency audit is not clean.** The supplied official npm audit reports
three affected package entries: **1 critical, 1 high, 1 low**, covering 13
individual advisories. The critical entry is Astro 5.18.2, the high entry is
Sharp 0.34.5, and the low entry is esbuild 0.27.7. The unmodified machine-readable
report is [npm-audit.json](./npm-audit.json). These are package-level audit counts,
not a claim that three independent production attack paths were demonstrated.

The examined `dist/` deployment is static HTML, CSS, JavaScript and image files.
No request-time Astro/Sharp server is shipped. The documented attack preconditions
are absent from the current public site, based on the source and output checks
below. **That reduces current exposure; it does not patch the installed packages
or establish that the project has zero vulnerabilities.** Build-time and future
feature/input changes remain relevant.

## Evidence checked in this project

- `astro.config.mjs` explicitly uses `output: 'static'`, no adapter, and no
  non-root `base`. There is no `functions/` directory, `src/actions/`, Astro
  middleware, or GitHub Actions workflow. The current output has neither
  `dist/server` nor `dist/_worker.js`.
- Source searches found no `define:vars`, `server:defer`, `client:*`,
  `transition:*`, `astro:transitions`, `astro:assets`, `defineAction`,
  `prerender = false`, remote image domains or remote image patterns. The native
  browser JavaScript is not an Astro server island or a hydrated framework
  component. `BaseLayout.astro` contains a literal unnamed `<slot />`; no dynamic
  slot name is used.
- Astro templates do not spread externally supplied attribute-name objects.
  `StaticPage.astro`, `Header.astro`, `Footer.astro`, and `Dialogs.astro` use
  `set:html` with the migrated, repository-controlled template/data functions.
  This is an explicit trust boundary: later CMS/API or untrusted content must
  not be inserted as raw HTML. The SEO JSON-LD serializer escapes `<`.
- The image manifest records 16 original demo images (10 PNG, 6 JPEG). The
  public directory also contains 10 derived WebP delivery files. Pages reference
  public image paths through normal image markup, not an Astro image service.
  There is no image upload/optimization HTTP endpoint.
- `scripts/extract-demo.mjs` imports Sharp to process the supplied local demo's
  decoded images. It is an explicit regeneration utility, not an npm build hook;
  `npm run build` runs `astro build`. It must only be run on the trusted approved
  demo. Its extraction step also executes selected demo script text in a Node VM;
  this script is not a safe general-purpose importer for arbitrary HTML.
- The lockfile contains Astro 5.18.2, Sharp 0.34.5, and top-level esbuild 0.27.7.
  Vite's separate esbuild is 0.25.12 and is outside the reported Windows advisory
  range. Sharp appears in this `--omit=dev` audit because Astro also declares it
  as an optional dependency; merely labeling the project's direct Sharp entry
  as a dev dependency does not remove that production dependency path.

## Advisory-by-advisory applicability

The final column is an assessment from current project evidence, rather than an
upstream assertion about this particular repository. The versions are the first
patched versions recorded in the current GitHub advisory database.

| Advisory | First patched | Required attack path | Current M1 assessment |
| --- | --- | --- | --- |
| [Astro AVIF RCE — GHSA-26w7-cxv4-gfx2](https://github.com/withastro/astro/security/advisories/GHSA-26w7-cxv4-gfx2) | Astro 7.2.8, requiring Sharp 0.35.4 | An attacker causes the Sharp image service to process an untrusted AVIF image. | No runtime optimizer and no AVIF input in the approved asset set. No corresponding public request path found. A future untrusted image import could reintroduce the condition on the build machine. |
| [Sharp/libheif — GHSA-rgj7-g3m4-5g8c](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c) | Sharp 0.35.4 | Vulnerable decoding of untrusted input; the advisory describes possible RCE on glibc Linux under specified conditions. | No public decoder. The local extraction utility remains an input-sensitive build tool. Do not infer Linux build safety from the current macOS development environment. |
| [Sharp/libvips — GHSA-f88m-g3jw-g9cj](https://github.com/lovell/sharp/security/advisories/GHSA-f88m-g3jw-g9cj) | Sharp 0.35.0 | Processing untrusted input through affected upstream decoders. | Approved source images are PNG/JPEG; the advisory's decoder workarounds concern GIF, TIFF and VIPS. No affected input found, but installed Sharp remains in the vulnerable version range. |
| [define:vars XSS — GHSA-j687-52p2-xcff](https://github.com/withastro/astro/security/advisories/GHSA-j687-52p2-xcff) | Astro 6.1.6 | Untrusted values flow into a script's `define:vars`. | Directive absent. JSON-LD is independently serialized with `<` escaping; there is no request-derived server rendering. |
| [Server island replay — GHSA-xr5h-phrj-8vxv](https://github.com/withastro/astro/security/advisories/GHSA-xr5h-phrj-8vxv) | Astro 6.1.10 | Server islands with overlapping prop/slot names and an attacker-controlled prop on a dynamic page. | No server islands, dynamic server pages, or server endpoint. |
| [Spread attribute names — GHSA-jrpj-wcv7-9fh9](https://github.com/withastro/astro/security/advisories/GHSA-jrpj-wcv7-9fh9) | Astro 6.4.6 | Untrusted object keys are spread onto HTML attributes; this can also affect SSG if build-time data is compromised. | No external attribute-key spreads found. Static generation alone is not the mitigation; the current data flow lacks the vulnerable sink. |
| [HTMLElement spread follow-up — GHSA-f48w-9m4c-m7f5](https://github.com/withastro/astro/security/advisories/GHSA-f48w-9m4c-m7f5) | Astro 7.0.6 | A runtime with global `HTMLElement`, an HTMLElement-subclass Astro component, and untrusted spread keys. | No such component or runtime setup found. |
| [Hydrated island transition values — GHSA-7pw4-f3q4-r2p2](https://github.com/withastro/astro/security/advisories/GHSA-7pw4-f3q4-r2p2) | Astro 7.0.4 | Attacker-controlled transition directive values on a `client:*` component. | Neither framework hydration nor transition directives are used. |
| [View Transition animation XSS — GHSA-4g3v-8h47-v7g6](https://github.com/withastro/astro/security/advisories/GHSA-4g3v-8h47-v7g6) | Astro 7.1.0 | Untrusted values enter Astro View Transition animation properties. | No Astro View Transition API/directive. CSS transitions in the demo are separate and do not create this Astro API path. |
| [Error-page Host SSRF — GHSA-2pvr-wf23-7pc7](https://github.com/withastro/astro/security/advisories/GHSA-2pvr-wf23-7pc7) | Astro 6.4.6 | A qualifying SSR/custom-server setup fetches prerendered error pages at request time using a Host-derived origin. | No SSR adapter or request-time `app.render()` server. A static 404 file does not establish the SSR preconditions. |
| [Hydrated slot-name XSS — GHSA-8hv8-536x-4wqp](https://github.com/withastro/astro/security/advisories/GHSA-8hv8-536x-4wqp) | Astro 6.3.3 | An attacker controls a named slot rendered inside a `client:*` component. | No `client:*` component and no dynamic slot names. |
| [Base-path authorization bypass — GHSA-376h-93r7-7g6f](https://github.com/withastro/astro/security/advisories/GHSA-376h-93r7-7g6f) | Astro 7.2.4 | A non-root `base` plus pathname-dependent middleware authorization. | Root base, no authentication middleware, and no private server routes. |
| [esbuild Windows dev-server traversal — GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr) | esbuild 0.28.1 | esbuild's `servedir` development server running on Windows. | Current build host is macOS; site delivery is static, and project scripts do not run esbuild's serve API. A future Windows esbuild-servedir workflow would need reassessment. |

## Astro 5 fixes and override options

Official npm registry metadata was read directly on the review date. The newest
stable Astro 5 release listed is **5.18.2**; no newer Astro 5 patch or security
backport was available in that registry response. Astro's current latest tag is
7.3.3. The npm audit's suggested Astro 7.3.3 replacement conflicts with this
milestone's explicit Astro 5 requirement and was not applied. Sources:
[Astro registry metadata](https://registry.npmjs.org/astro),
[Astro 5.18.2 metadata](https://registry.npmjs.org/astro/5.18.2).

There is **no verified safe override for all reported issues**. Several are in
Astro's own rendering/routing code and cannot be fixed by replacing Sharp or
esbuild. Targeted dependency changes are possible follow-up candidates:

| Candidate | Verified facts | Compatibility / review limit |
| --- | --- | --- |
| Sharp 0.35.4 throughout the tree | Fixes the two listed Sharp advisories; supplies the libheif fix underlying Astro's AVIF advisory. npm declares Node `>=20.9.0`, compatible with this project's Node `>=22.12.0`. | Outside Astro 5's declared optional range `^0.34.0` and the project's direct `^0.34.5` range. Requires updating the direct spec, overriding/deduplicating the Astro path deliberately, a new lockfile, extraction/visual checks, and build verification. It does not remove the remaining Astro code advisories; version-based audit may still flag Astro. |
| esbuild 0.28.1 or later patched release | The Windows advisory is fixed from 0.28.1; npm declares Node `>=18`. | Outside Astro 5's declared `^0.27.3` range. A narrow Astro override is preferable to blindly replacing every esbuild instance. It needs build and development-tool compatibility verification, which this read-only review did not perform. |

Version/engine sources: [Sharp 0.35.4 npm metadata](https://registry.npmjs.org/sharp/0.35.4),
[esbuild 0.28.1 npm metadata](https://registry.npmjs.org/esbuild/0.28.1).
Node compatibility is necessary but does not prove API compatibility.

The Sharp advisories also document `sharp.block()` workarounds for their affected
decoders. These would be defense-in-depth candidates for a future importer. A
block added only to the extraction utility would not automatically protect
every other Sharp invocation. No decoder block was implemented or counted as
an existing mitigation here.

## Residual risk and follow-up

- Retaining Astro 5.18.2 retains the recorded npm findings. This report documents
  current applicability; it is not a security waiver or a clean-audit result.
- Serve only the static output in the planned deployment. Reassess before
  enabling an adapter, server islands, Actions, authentication middleware,
  framework hydration, dynamic slot/transition values, CMS-supplied HTML or
  attribute keys, or remote/user-supplied image processing.
- Treat source-demo regeneration and image ingestion as trusted local build
  operations. Do not run the extractor on arbitrary downloaded/uploaded HTML
  or expose development tooling as a public service.
- Resolve the framework-version requirement in a future dependency-maintenance
  change, or evaluate narrowly scoped patched dependencies with the complete
  migration regression suite. Re-run audit afterward and preserve the remaining
  findings rather than suppressing them to claim zero vulnerabilities.

This report covers the supplied production-dependency audit only. It is not a
full application penetration test, a full dev-dependency audit, or a Cloudflare
deployment verification.
