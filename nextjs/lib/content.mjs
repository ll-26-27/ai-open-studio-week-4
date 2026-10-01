import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";

// The site's Markdown lives in content/, inside this app. Each subfolder is a group and shows up on the site as soon
// as it exists; nothing needs registering. Planning context sits one level up, in the repo's _context/, and is not rendered.
const contentRoot = path.join(/*turbopackIgnore: true*/ process.cwd(), "content");

export const course = {
  code: "AI Open Studio",
  title: "Learning Lab, Bok Center",
  week: "Week 4",
  theme: "Lists",
  date: "Thursday, October 1, 2026",
};

export function label(slug) {
  return String(slug).replace(/^\d+[-_]/, "").replace(/[-_]/g, " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

function stringList(value) {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim()) : [];
}

// A YAML date (as_of: 2026-09-30) arrives as a Date; show it as written.
function plain(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

// The first plain paragraph after the H1: the list docs open with one line on what's measured.
function firstLine(content) {
  const lines = content.replace(/^\s*#\s+[^\n]+(?:\r?\n|$)/, "").split(/\r?\n/);
  const kept = [];
  for (const line of lines) {
    if (!line.trim()) { if (kept.length) break; continue; }
    if (/^\s*(?:#|\||[-*+]\s|\d+[.)]\s|>|```|~~~|<|!\[)/.test(line)) break;
    kept.push(line.trim());
  }
  return kept.join(" ");
}

async function readMarkdown(file) {
  try {
    return matter(await readFile(/*turbopackIgnore: true*/ file, "utf8"));
  } catch {
    // A missing or half-written file (bad frontmatter, mid-save) should not take the whole site down.
    return null;
  }
}

function toDoc(group, slug, parsed) {
  const { data, content } = parsed;
  const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return {
    group,
    slug,
    title: plain(data.title) || heading || label(slug),
    description: plain(data.description) || firstLine(content),
    platform: plain(data.platform),
    medium: plain(data.medium),
    metric: plain(data.metric),
    asOf: plain(data.as_of),
    confidence: plain(data.confidence),
    sources: stringList(data.sources),
    content,
    data,
    href: slug === "README" ? `/${group}` : `/${group}/${encodeURIComponent(slug)}`,
    base: group ? `/${group}/${encodeURIComponent(slug)}` : `/${slug}`,
  };
}

// content/README.md: the home page's intro, and (in frontmatter) `groups:`, the order groups appear in.
export async function readHome() {
  const parsed = await readMarkdown(path.join(contentRoot, "README.md"));
  return parsed ? toDoc("", "README", parsed) : null;
}

// Every group folder, in the order content/README.md gives, then alphabetically. A group's README.md frontmatter
// may give it a title and description.
export async function readGroups() {
  let entries = [];
  try {
    entries = await readdir(/*turbopackIgnore: true*/ contentRoot, { withFileTypes: true });
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const home = await readHome();
  const order = stringList(home?.data?.groups);
  const groups = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || entry.name.startsWith("_")) continue;
    const { readme, docs } = await readGroup(entry.name);
    groups.push({
      key: entry.name,
      title: readme?.data?.title ? plain(readme.data.title) : label(entry.name),
      description: readme?.data?.description ? plain(readme.data.description) : "",
      readme,
      docs,
      href: `/${entry.name}`,
    });
  }
  const rank = (group) => (order.includes(group.key) ? order.indexOf(group.key) : Number.MAX_SAFE_INTEGER);
  return groups.sort((a, b) => rank(a) - rank(b) || a.key.localeCompare(b.key));
}

// One group folder, flat: only .md files, no dotfiles, no subfolders. Returns { readme, docs } sorted by filename.
export async function readGroup(group) {
  if (!/^[\w-]+$/.test(group) || group.startsWith("_")) return { readme: null, docs: [] };
  const root = path.join(contentRoot, group);
  let entries;
  try {
    entries = await readdir(/*turbopackIgnore: true*/ root, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return { readme: null, docs: [] };
    throw error;
  }
  let readme = null;
  const docs = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || !entry.isFile() || !entry.name.endsWith(".md")) continue;
    const parsed = await readMarkdown(path.join(root, entry.name));
    if (!parsed) continue;
    const doc = toDoc(group, entry.name.slice(0, -3), parsed);
    if (doc.slug === "README") readme = doc;
    else docs.push(doc);
  }
  docs.sort((a, b) => a.slug.localeCompare(b.slug));
  // A group's README may fix the order (`order: [setup, desktop-vs-cli, …]`); unlisted files follow by filename.
  const order = stringList(readme?.data?.order);
  if (order.length) {
    const rank = (doc) => (order.includes(doc.slug) ? order.indexOf(doc.slug) : Number.MAX_SAFE_INTEGER);
    docs.sort((a, b) => rank(a) - rank(b));
  }
  return { readme, docs };
}

// Resolve a Markdown link against the page it sits on: sibling and ../ links between .md files become site routes
// (../guides/setup.md → /guides/setup). External links pass through.
export function markdownHref(href, documentHref) {
  if (!href) return null;
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(href)) return href;
  const url = new URL(href, `https://content.local${documentHref}`);
  let pathname = url.pathname.replace(/\.md$/i, "").replace(/^\/content\//, "/").replace(/\/README$/i, "");
  return (pathname || "/") + url.search + url.hash;
}
