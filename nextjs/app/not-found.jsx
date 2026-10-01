import Link from "next/link";

export default function NotFound() {
  return <main id="main" className="not-found"><p className="eyebrow">404 / Not found</p><h1>Not here.</h1><p>This page may have moved, or may still be taking shape.</p><Link href="/">← Back to the studio home</Link></main>;
}
