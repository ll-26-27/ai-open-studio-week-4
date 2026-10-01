import Link from "next/link";
import { notFound } from "next/navigation";
import { readGroups } from "../../../lib/content.mjs";
import Markdown from "../../components/Markdown.jsx";
import Chart from "../../components/Chart.jsx";
import { Confidence, ListMeta, SiteFooter, SiteHeader } from "../../components/Chrome.jsx";

// Read the Markdown on each request so edits and new files appear on refresh.
export const dynamic = "force-dynamic";

async function find(params) {
  const { group: key, slug = [] } = await params;
  const groups = await readGroups();
  const group = groups.find((entry) => entry.key === key);
  const doc = group && slug.length === 1 ? group.docs.find((entry) => entry.slug === decodeURIComponent(slug[0])) : null;
  return { groups, group, doc, slug };
}

export async function generateMetadata({ params }) {
  const { group, doc } = await find(params);
  if (!group) return {};
  return { title: doc?.title || group.title, description: doc?.description || group.description };
}

export default async function ContentPage({ params }) {
  const { groups, group, doc, slug } = await find(params);
  if (!group || slug.length > 1 || (slug.length === 1 && !doc)) notFound();

  const intro = !doc && group.readme ? group.readme.content.replace(/^\s*#\s+[^\n]+(?:\r?\n|$)/, "").trim() : "";
  const position = doc ? group.docs.indexOf(doc) : -1;
  const previous = position > 0 ? group.docs[position - 1] : null;
  const next = doc && position < group.docs.length - 1 ? group.docs[position + 1] : null;

  return (
    <>
      <SiteHeader groups={groups} current={group.key} />
      <div className="content-shell">
        <aside className="sidebar">
          <Link className="eyebrow sidebar-title" href={group.href}>{group.title}</Link>
          <nav aria-label={`${group.title} contents`}>
            {group.docs.map((entry) => <Link className="sidebar-link" key={entry.href} href={entry.href} aria-current={doc?.href === entry.href ? "page" : undefined}>{entry.title}</Link>)}
            {group.docs.length === 0 && <p className="sidebar-empty">Nothing here yet.</p>}
          </nav>
        </aside>
        <main id="main" className="content-main">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link><span>/</span><Link href={group.href}>{group.title}</Link>
            {doc && <><span>/</span><span>{doc.title}</span></>}
          </nav>
          <header className="page-heading">
            <p className="eyebrow">{doc ? group.title : "Group"}</p>
            <h1>{doc ? doc.title : group.title}</h1>
            {!doc && group.description && <p className="lede">{group.description}</p>}
          </header>

          {doc ? (
            <>
              <ListMeta doc={doc} />
              <Chart spec={doc.data.chart} />
              <article className="prose"><Markdown doc={doc} /></article>
              {doc.sources.length > 0 && (
                <section className="sources">
                  <p className="eyebrow">Sources</p>
                  <ol>{doc.sources.map((source) => <li key={source}>{/^https?:\/\//i.test(source) ? <a href={source} target="_blank" rel="noreferrer">{source}</a> : source}</li>)}</ol>
                </section>
              )}
              {(previous || next) && (
                <nav className="pager" aria-label={`More in ${group.title}`}>
                  {previous ? <Link href={previous.href}><span className="eyebrow">← Previous</span>{previous.title}</Link> : <span />}
                  {next ? <Link className="pager-next" href={next.href}><span className="eyebrow">Next →</span>{next.title}</Link> : <span />}
                </nav>
              )}
              <div className="article-end"><Link href={group.href}>← Back to {group.title}</Link><a href={`/print${doc.href}`}>Print version ↗</a></div>
            </>
          ) : (
            <>
              {intro && <div className="prose collection-intro"><Markdown doc={group.readme} source={intro} /></div>}
              {group.docs.length > 0 && <p className="collection-actions"><a href={`/print${group.href}`}>Print every page in {group.title}, one per page ↗</a></p>}
              <section className="document-group">
                {group.docs.map((entry, index) => (
                  <Link className="document-link" key={entry.href} href={entry.href}>
                    <span className="document-number">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{entry.title}</h3>
                      {entry.description && <p>{entry.description}</p>}
                      <p className="document-facts">{[entry.platform, entry.metric, entry.asOf && `as of ${entry.asOf}`].filter(Boolean).join(" · ")} {entry.confidence && <Confidence value={entry.confidence} />}</p>
                    </div>
                    <span className="document-arrow" aria-hidden="true">↗</span>
                  </Link>
                ))}
              </section>
              {group.docs.length === 0 && <p className="lede empty-note">The first pages are on their way.</p>}
            </>
          )}
        </main>
      </div>
      <SiteFooter />
    </>
  );
}
