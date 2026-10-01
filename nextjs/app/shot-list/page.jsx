import { readGroups } from "../../lib/content.mjs";
import { SiteFooter, SiteHeader } from "../components/Chrome.jsx";
import ShotListClient from "./ShotListClient.jsx";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shot list",
  description: "Upload the stills from a shoot and get a field producer's read on whether you have coverage.",
};

export default async function ShotListPage() {
  const groups = await readGroups();
  return (
    <>
      <SiteHeader groups={groups} />
      <main id="main" className="shotlist-main">
        <header className="shotlist-heading">
          <p className="eyebrow">Shot list</p>
          <h1>Do we have coverage?</h1>
          <p className="hero-meta">Add the stills from a shoot in the order you took them, say what you were shooting, and paste the planned shot list if you had one. A vision model reads them the way a field producer or script supervisor would: what each shot is, what the scene still needs, what won't cut together, and what to pick up before you leave.</p>
        </header>
        <ShotListClient />
      </main>
      <SiteFooter />
    </>
  );
}
