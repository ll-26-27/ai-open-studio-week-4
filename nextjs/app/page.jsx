import Link from "next/link";
import { course, readGroups, readHome } from "../lib/content.mjs";
import Markdown from "./components/Markdown.jsx";
import { SiteFooter } from "./components/Chrome.jsx";

// Read the Markdown on each request so new pages appear on refresh.
export const dynamic = "force-dynamic";

// The studio home: the intro from content/README.md, any featured pages (`features:` in its frontmatter), then every
// group and every page in it, one line each.
export default async function Home() {
  const [home, groups] = await Promise.all([readHome(), readGroups()]);
  const features = (Array.isArray(home?.data?.features) ? home.data.features : []).flatMap((entry) => {
    const [groupKey, slug] = String(entry?.page || "").split("/");
    const doc = groups.find((group) => group.key === groupKey)?.docs.find((doc) => doc.slug === slug);
    return doc ? [{ doc, label: entry.label, description: entry.description || doc.description, big: entry.big === true }] : [];
  });
  const intro = home?.content.replace(/^\s*#\s+[^\n]+(?:\r?\n|$)/, "").trim();
  const title = home?.title && home.title !== "README" ? home.title : course.theme;
  return (
    <>
      <main id="main">
        <section className="hero" aria-labelledby="week-title">
          <p className="eyebrow">{course.code} · {course.title} · {course.week}</p>
          <h1 id="week-title">{title}</h1>
          <p className="hero-meta">{course.date}</p>
          {intro && <div className="prose hero-intro"><Markdown doc={home} source={intro} /></div>}
        </section>
        {features.length > 0 && (
          <section className="activities" id="start" aria-labelledby="start-here">
            <header className="section-head">
              <h2 id="start-here">Start here</h2>
            </header>
            <div className="activity-cards">
              {features.map(({ doc, label, description, big }, index) => (
                <Link className={big ? "activity-card activity-card-big" : "activity-card"} href={doc.href} key={doc.href}>
                  <span className="activity-number" aria-hidden="true">{index + 1}</span>
                  {label && <span className="eyebrow">{label}</span>}
                  <span className="activity-title">{doc.title} <span aria-hidden="true">→</span></span>
                  {description && <span className="activity-description">{description}</span>}
                </Link>
              ))}
            </div>
          </section>
        )}
        <section className="lists-section" id="pages" aria-label="Every page">
          <section className="lists-index">
            {groups.map((group) => (
              <section className="index-group" key={group.key} id={group.key}>
                <h2><Link href={group.href}>{group.title}</Link></h2>
                {group.docs.map((doc) => (
                  <Link className="index-row" href={doc.href} key={doc.href}>
                    <span className="index-title">{doc.title}</span>
                    <span className="index-metric">{doc.description}</span>
                    <span />
                  </Link>
                ))}
                {group.docs.length === 0 && <p className="index-empty">Nothing here yet.</p>}
              </section>
            ))}
            {groups.length === 0 && <p className="index-empty">The first pages are on their way.</p>}
          </section>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
