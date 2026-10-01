import Link from "next/link";
import { course } from "../../lib/content.mjs";

export function SiteHeader({ groups, current }) {
  return (
    <header className="site-header">
      <Link className="wordmark" href="/">{course.code} <span>{course.week} · {course.theme}</span></Link>
      <nav aria-label="Main navigation">
        {groups.map((group) => <Link key={group.key} href={group.href} aria-current={group.key === current ? "true" : undefined}>{group.title}</Link>)}
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return <footer className="site-footer"><Link href="/">{course.code} · {course.week}: {course.theme}</Link><span>{course.date} · <a href="/print">Printables</a></span></footer>;
}

// The facts every list carries in its frontmatter: what's counted, as of when, how sure we are.
export function ListMeta({ doc, compact = false }) {
  const facts = [
    doc.platform && ["Platform", doc.platform],
    doc.metric && ["Metric", doc.metric],
    doc.asOf && ["As of", doc.asOf],
  ].filter(Boolean);
  if (!facts.length && !doc.confidence) return null;
  return (
    <dl className={compact ? "list-meta list-meta-compact" : "list-meta"}>
      {facts.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}
      {doc.confidence && <div><dt>Confidence</dt><dd><Confidence value={doc.confidence} /></dd></div>}
    </dl>
  );
}

export function Confidence({ value }) {
  const key = String(value).toLowerCase();
  return <span className={`confidence confidence-${["verified", "partial", "unverified"].includes(key) ? key : "other"}`}>{value}</span>;
}
