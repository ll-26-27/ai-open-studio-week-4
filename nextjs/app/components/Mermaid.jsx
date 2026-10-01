"use client";

import { useEffect, useId, useRef, useState } from "react";

// A ```mermaid block drawn as a diagram in the browser. Mermaid loads only on pages that have one.
// Dark on screen (the site is always dark); a light theme on the /print pages.
export default function Mermaid({ chart, print = false }) {
  const ref = useRef(null);
  const id = "mermaid-" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({ startOnLoad: false, theme: print ? "neutral" : "dark", fontFamily: "Inter Variable, Inter, system-ui, sans-serif", securityLevel: "strict" });
        const { svg } = await mermaid.render(id, chart);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [chart, id, print]);

  if (failed) return <pre className="mermaid-fallback"><code>{chart}</code></pre>;
  return <div className="mermaid-diagram" ref={ref} role="img" aria-label="Diagram" />;
}
