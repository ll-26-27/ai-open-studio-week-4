import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import { markdownHref } from "../../lib/content.mjs";
import { embed } from "../../lib/embeds.mjs";
import Mermaid from "./Mermaid.jsx";

// One embedded player. Spans rather than divs, because Markdown puts images inside a paragraph.
function Embed({ media, caption, print }) {
  if (print) {
    return <span className="embed-print"><span className="embed-provider">{media.provider}</span> {caption && <strong>{caption}</strong>} <span className="embed-url">{media.link}</span></span>;
  }
  const fixed = typeof media.shape === "number";
  return (
    <span className={`embed embed-${fixed ? "audio" : media.shape}`}>
      <span className="embed-frame" style={fixed ? { height: media.shape } : undefined}>
        <iframe src={media.src} title={caption || `${media.provider} embed`} loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" />
      </span>
      <span className="embed-caption">
        {caption && <span>{caption}</span>}
        <a href={media.link} target="_blank" rel="noreferrer">Open on {media.provider} ↗</a>
      </span>
    </span>
  );
}

// Plain text of a hast node.
function textOf(node) {
  if (!node) return "";
  if (node.type === "text") return node.value;
  return (node.children || []).map(textOf).join("");
}

// Renders a document's Markdown with the leading H1 removed (the page supplies its own title).
// `![caption](https://www.youtube.com/watch?v=…)` becomes a player (see lib/embeds.mjs); other https images show
// as images. `print` swaps players for their caption and address.
export default function Markdown({ doc, source, print = false }) {
  // Images and players on consecutive lines (blank lines between them allowed) share one paragraph, which the
  // stylesheet lays out as a grid.
  const body = (source ?? doc.content.replace(/^\s*#\s+[^\n]+(?:\r?\n|$)/, "")).replace(/^(!\[[^\]\n]*\]\([^)\s]+\))[ \t]*\n(?:[ \t]*\n)+(?=!\[)/gm, "$1\n");
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSlug]}
      components={{
        a: ({ href, children }) => {
          const resolved = markdownHref(href, doc?.base || "/");
          if (resolved === null) return <span className="unlinked">{children}</span>;
          const external = /^https?:\/\//i.test(resolved);
          return <a href={resolved} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>{children}</a>;
        },
        // A table whose first column is "#" is a ranking: the stylesheet sets that column as quiet numbers.
        table: ({ node, children }) => {
          const firstHeader = node?.children?.find((child) => child.tagName === "thead")?.children?.find((child) => child.tagName === "tr")?.children?.find((child) => child.tagName === "th");
          return <table className={textOf(firstHeader).trim() === "#" ? "ranked" : undefined}>{children}</table>;
        },
        // ```mermaid blocks become diagrams; other code blocks stay as they are.
        pre: ({ node, children }) => {
          const code = node?.children?.[0];
          const className = code?.properties?.className || [];
          if (code?.tagName === "code" && [].concat(className).includes("language-mermaid")) {
            const text = (code.children || []).map((child) => child.value || "").join("");
            return <Mermaid chart={text.trim()} print={print} />;
          }
          return <pre>{children}</pre>;
        },
        img: ({ src, alt }) => {
          if (typeof src !== "string") return null;
          const media = embed(src);
          if (media) return <Embed media={media} caption={alt} print={print} />;
          if (!/^https:\/\//i.test(src)) return alt ? <span className="unlinked">[{alt}]</span> : null;
          return <span className="figure"><img src={src} alt={alt || ""} loading="lazy" />{alt && <span className="figure-caption">{alt}</span>}</span>;
        },
      }}
    >
      {body}
    </ReactMarkdown>
  );
}
