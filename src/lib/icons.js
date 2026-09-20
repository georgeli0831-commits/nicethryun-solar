import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  ClipboardList,
  Columns3,
  Download,
  Factory,
  FileCheck2,
  FileText,
  Globe2,
  Info,
  ListChecks,
  Map,
  MapPin,
  Menu,
  Minus,
  Package,
  PackageCheck,
  Plus,
  ScanLine,
  Search,
  SearchX,
  ShieldCheck,
  SlidersHorizontal,
  Table2,
  X,
} from "lucide";
const iconNodes = {
  "arrow-right": ArrowRight,
  "arrow-up-right": ArrowUpRight,
  check: Check,
  "chevron-down": ChevronDown,
  "chevron-right": ChevronRight,
  "circle-check": CircleCheck,
  "clipboard-list": ClipboardList,
  "columns-3": Columns3,
  download: Download,
  factory: Factory,
  "file-check-2": FileCheck2,
  "file-text": FileText,
  "globe-2": Globe2,
  info: Info,
  "list-checks": ListChecks,
  map: Map,
  "map-pin": MapPin,
  menu: Menu,
  minus: Minus,
  package: Package,
  "package-check": PackageCheck,
  plus: Plus,
  "scan-line": ScanLine,
  search: Search,
  "search-x": SearchX,
  "shield-check": ShieldCheck,
  "sliders-horizontal": SlidersHorizontal,
  "table-2": Table2,
  x: X,
};
const escapeAttribute = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
const renderNode = ([tag, attributes, children]) =>
  `<${tag} ${Object.entries(attributes)
    .map(([key, value]) => `${key}="${escapeAttribute(value)}"`)
    .join(" ")}>${children ? children.map(renderNode).join("") : ""}</${tag}>`;
/** Same lucide 1.8.0 SVG nodes as the demo, emitted during static generation. */
export function icon(name) {
  const nodes = iconNodes[name];
  if (!nodes) throw new Error(`Unknown Lucide icon: ${name}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-${name}" data-lucide="${name}" aria-hidden="true">${nodes.map(renderNode).join("")}</svg>`;
}
export function iconify(html) {
  return html.replace(
    /<i data-lucide="([^"]+)"(?: aria-hidden="true")?><\/i>/g,
    (_, name) => icon(name),
  );
}
