import { notFound } from "next/navigation";
import { course, readGroups, readHome } from "../../../lib/content.mjs";
import Markdown from "../../components/Markdown.jsx";
import Chart from "../../components/Chart.jsx";
import { ListMeta } from "../../components/Chrome.jsx";

export const dynamic = "force-dynamic";

function PrintBar({ hint }) {
  return (
    <header className="print-bar">
      <span>{course.code} · {course.week}: {course.theme} · {course.date}</span>
      <span>{hint || "⌘P to print · Letter"}</span>
    </header>
  );
}

// One list on one sheet: title, the facts, the table, sources in small type. Players print as their address.
function ListSheet({ doc, groupTitle, pageBreak }) {
  return (
    <article className={pageBreak ? "print-card page-break" : "print-card"}>
      <p className="eyebrow">{groupTitle}</p>
      <h1>{doc.title}</h1>
      <ListMeta doc={doc} compact />
      <Chart spec={doc.data.chart} />
      <div className="prose"><Markdown doc={doc} print /></div>
      {doc.sources.length > 0 && <p className="print-sources"><strong>Sources:</strong> {doc.sources.join(" · ")}</p>}
    </article>
  );
}

export async function generateMetadata({ params }) {
  const { slug = [] } = await params;
  return { title: slug.length ? slug.join(" / ") : "Printables" };
}

export default async function PrintPage({ params }) {
  const { slug = [] } = await params;
  const [groups, home] = await Promise.all([readGroups(), readHome()]);
  // content/README.md may name a print set in frontmatter: `print_set: [screens/platforms-by-hours, …]`.
  const docsByPath = new Map(groups.flatMap((group) => group.docs.map((doc) => [`${group.key}/${doc.slug}`, { doc, groupTitle: group.title }])));
  const printSet = (Array.isArray(home?.data?.print_set) ? home.data.print_set : []).map((key) => docsByPath.get(String(key))).filter(Boolean);

  if (slug.length === 1 && slug[0] === "set") {
    return (
      <main className="print-main">
        <PrintBar hint={`The print set · ${printSet.length} sheets · ⌘P to print`} />
        {printSet.map(({ doc, groupTitle }, index) => <ListSheet doc={doc} groupTitle={groupTitle} key={doc.href} pageBreak={index > 0} />)}
        {printSet.length === 0 && <p>No print set yet: add <code>print_set:</code> to the frontmatter of content/README.md.</p>}
      </main>
    );
  }

  if (slug.length === 0) {
    return (
      <main className="print-main">
        <PrintBar hint="index" />
        <h1>Printables</h1>
        <p className="lede">Every page prints on its own sheet. Put <code>/print</code> in front of any page's address, or use the links below.</p>
        <ul className="print-index">
          {printSet.length > 0 && <li><a href="/print/set">The print set</a>: {printSet.length} pages picked for the session, one per page ({printSet.map(({ doc }) => doc.title).join(" · ")})</li>}
          <li><a href="/print/all">Everything</a>: every page, one per sheet ({groups.reduce((sum, group) => sum + group.docs.length, 0)} sheets)</li>
          {groups.map((group) => <li key={group.key}><a href={`/print/${group.key}`}>{group.title}</a> ({group.docs.length}): {group.docs.map((doc, index) => <span key={doc.href}>{index > 0 && " · "}<a href={`/print${doc.href}`}>{doc.title}</a></span>)}</li>)}
        </ul>
      </main>
    );
  }

  if (slug.length === 1) {
    const chosen = slug[0] === "all" ? groups : groups.filter((group) => group.key === slug[0]);
    if (!chosen.length) notFound();
    const sheets = chosen.flatMap((group) => group.docs.map((doc) => ({ doc, groupTitle: group.title })));
    return (
      <main className="print-main">
        <PrintBar hint={`${sheets.length} sheets · ⌘P to print`} />
        {sheets.map(({ doc, groupTitle }, index) => <ListSheet doc={doc} groupTitle={groupTitle} key={doc.href} pageBreak={index > 0} />)}
        {sheets.length === 0 && <p>Nothing to print yet.</p>}
      </main>
    );
  }

  if (slug.length !== 2) notFound();
  const group = groups.find((entry) => entry.key === slug[0]);
  const doc = group?.docs.find((entry) => entry.slug === decodeURIComponent(slug[1]));
  if (!doc) notFound();
  return <main className="print-main"><PrintBar /><ListSheet doc={doc} groupTitle={group.title} /></main>;
}
