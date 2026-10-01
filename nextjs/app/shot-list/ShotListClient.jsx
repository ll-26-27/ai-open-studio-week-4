"use client";

import { useEffect, useRef, useState } from "react";

// Stills are shrunk in the browser before upload: a model reads coverage fine at this size, and a dozen full-size
// phone photos would be too much to send in one request.
const longEdge = 1280;
const quality = 0.85;
const maxStills = 30;

const statusLabel = { covered: "Covered", partial: "Partial", missing: "Missing" };
const verdictLabel = { covered: "Covered", nearly: "Nearly", "not yet": "Not yet" };

async function decode(file) {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Some formats only decode through an <img>.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

async function shrink(file) {
  const source = await decode(file);
  const width = source.width || source.naturalWidth;
  const height = source.height || source.naturalHeight;
  const scale = Math.min(1, longEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
  source.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("couldn't re-encode");
  return blob;
}

const byName = (a, b) => a.name.localeCompare(b.name, undefined, { numeric: true });

function toMarkdown(result, stills, brief) {
  const name = (n) => stills[n - 1]?.name || `shot ${n}`;
  const refs = (list) => (list?.length ? ` (${list.map((n) => `#${n}`).join(", ")})` : "");
  const lines = [`# Coverage: ${verdictLabel[result.verdict] || result.verdict}`, ""];
  if (brief) lines.push(`**Shooting:** ${brief}`, "");
  lines.push(result.summary, "", "## Coverage", "");
  for (const item of result.coverage || []) lines.push(`- **${statusLabel[item.status] || item.status}**: ${item.need}${item.planned ? " (planned)" : ""}${refs(item.shots)}${item.note ? `. ${item.note}` : ""}`);
  lines.push("", "## Shots", "");
  for (const shot of result.shots || []) lines.push(`${shot.n}. **${shot.type}**, ${shot.angle}: ${shot.subject}${shot.usable ? "" : " (unusable)"}${shot.notes ? `. ${shot.notes}` : ""} \`${name(shot.n)}\``);
  if (result.continuity?.length) {
    lines.push("", "## Continuity", "");
    for (const flag of result.continuity) lines.push(`- ${flag.issue}${refs(flag.shots)}`);
  }
  if (result.pickups?.length) {
    lines.push("", "## Pick up before you leave", "");
    result.pickups.forEach((pickup, index) => lines.push(`${index + 1}. **${pickup.shot}**: ${pickup.why}`));
  }
  if (result.cut?.order?.length) lines.push("", "## Rough cut", "", `${result.cut.order.map((n) => `#${n}`).join(" → ")}${result.cut.note ? `. ${result.cut.note}` : ""}`);
  lines.push("", `_Checked by ${result.model}._`);
  return lines.join("\n") + "\n";
}

export default function ShotListClient() {
  const inputRef = useRef(null);
  const [config, setConfig] = useState({ ready: true, model: "", models: [] });
  const [model, setModel] = useState("");
  const [stills, setStills] = useState([]);
  const [brief, setBrief] = useState("");
  const [planned, setPlanned] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState({ tone: "muted", text: "" });
  const [result, setResult] = useState(null);
  const [checked, setChecked] = useState([]);

  useEffect(() => {
    fetch("/api/shot-list").then((response) => response.json()).then((data) => { setConfig(data); setModel(data.model); }).catch(() => {});
  }, []);

  async function add(fileList) {
    const files = [...fileList].filter((file) => file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name)).sort(byName);
    if (files.length === 0) return;
    setStatus({ tone: "muted", text: `Preparing ${files.length} still${files.length === 1 ? "" : "s"}…` });
    const added = [];
    const failed = [];
    for (const file of files) {
      try {
        const blob = await shrink(file);
        added.push({ id: `${file.name}-${file.lastModified}-${Math.random()}`, name: file.name, blob, url: URL.createObjectURL(blob) });
      } catch {
        failed.push(file.name);
      }
    }
    setStills((current) => [...current, ...added].slice(0, maxStills));
    setStatus(failed.length
      ? { tone: "warn", text: `Couldn't read ${failed.join(", ")}. If they're HEIC, export them as JPEG (or open this page in Safari).` }
      : { tone: "muted", text: "" });
  }

  function move(index, step) {
    setStills((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(Math.max(0, Math.min(next.length, index + step)), 0, item);
      return next;
    });
  }

  function remove(index) {
    // The URL stays alive: the last report may still show this still.
    setStills((current) => current.filter((_, position) => position !== index));
  }

  function clear() {
    stills.forEach((still) => URL.revokeObjectURL(still.url));
    setStills([]);
    setResult(null);
  }

  async function check() {
    if (stills.length === 0 || busy) return;
    setBusy(true);
    setResult(null);
    setStatus({ tone: "muted", text: `Sending ${stills.length} stills to ${model || "the model"}… this can take a minute.` });
    try {
      const form = new FormData();
      stills.forEach((still) => form.append("images", still.blob, still.name.replace(/\.[^.]+$/, "") + ".jpg"));
      form.append("brief", brief);
      form.append("planned", planned);
      form.append("model", model);
      const response = await fetch("/api/shot-list", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      setResult(data);
      setChecked(stills);
      setStatus({ tone: "ok", text: `Checked by ${data.model}.` });
    } catch (error) {
      setStatus({ tone: "error", text: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(toMarkdown(result, checked, brief.trim()));
      setStatus({ tone: "ok", text: "Copied the report as Markdown." });
    } catch {
      setStatus({ tone: "error", text: "Couldn't copy." });
    }
  }

  const thumb = (n) => checked[n - 1];

  return (
    <div className="shotlist">
      {!config.ready && <p className="shotlist-status shotlist-status-error">Add an <code>OPENROUTER_API_KEY</code> to <code>nextjs/.env.local</code> and restart <code>pnpm dev</code>.</p>}

      <section className="shotlist-inputs" aria-label="The shoot">
        <div
          className={dragging ? "shotlist-drop shotlist-drop-active" : "shotlist-drop"}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); add(event.dataTransfer.files); }}
        >
          <p><strong>Drop stills here</strong> or <button type="button" className="shotlist-link" onClick={() => inputRef.current?.click()}>choose files</button></p>
          <p className="shotlist-hint">Sorted by filename, so camera numbering keeps the shooting order. Use the arrows to reorder. Up to {maxStills}.</p>
          <input ref={inputRef} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(event) => { add(event.target.files); event.target.value = ""; }} />
        </div>

        {stills.length > 0 && (
          <ol className="shotlist-strip">
            {stills.map((still, index) => (
              <li key={still.id}>
                <img src={still.url} alt={still.name} />
                <span className="shotlist-number">{index + 1}</span>
                <span className="shotlist-name" title={still.name}>{still.name}</span>
                <span className="shotlist-tools">
                  <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${still.name} earlier`}>←</button>
                  <button type="button" onClick={() => move(index, 1)} disabled={index === stills.length - 1} aria-label={`Move ${still.name} later`}>→</button>
                  <button type="button" onClick={() => remove(index)} aria-label={`Remove ${still.name}`}>×</button>
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className="shotlist-fields">
          <label>
            <span className="eyebrow">What you're shooting</span>
            <textarea rows={4} value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="e.g. A 90-second news package on the loom workshop: a student threading a warp, the instructor explaining, the finished cloth." />
          </label>
          <label>
            <span className="eyebrow">Planned shot list (optional, one per line)</span>
            <textarea rows={4} value={planned} onChange={(event) => setPlanned(event.target.value)} placeholder={"Wide of the room\nCU hands on the shuttle\nMCU instructor talking"} />
          </label>
        </div>

        <div className="shotlist-actions">
          <button type="button" className="shotlist-button" onClick={check} disabled={busy || stills.length === 0 || !config.ready}>{busy ? "Checking…" : "Check coverage"}</button>
          {config.models.length > 0 && (
            <label className="shotlist-model">
              <span className="eyebrow">Model</span>
              <select value={model} onChange={(event) => setModel(event.target.value)}>
                {config.models.map((choice) => <option key={choice.id} value={choice.id}>{choice.label}</option>)}
              </select>
            </label>
          )}
          {stills.length > 0 && <button type="button" className="shotlist-link" onClick={clear} disabled={busy}>Start over</button>}
        </div>
        {status.text && <p className={`shotlist-status shotlist-status-${status.tone}`} role="status">{status.text}</p>}
      </section>

      {result && (
        <section className="shotlist-report" aria-labelledby="report-title">
          <header className="shotlist-report-head">
            <h2 id="report-title"><span className={`shotlist-verdict shotlist-verdict-${result.verdict.replace(" ", "-")}`}>{verdictLabel[result.verdict] || result.verdict}</span></h2>
            <p className="shotlist-summary">{result.summary}</p>
            <button type="button" className="shotlist-link" onClick={copy}>Copy as Markdown</button>
          </header>

          <h3>Coverage</h3>
          <ul className="shotlist-coverage">
            {result.coverage.map((item, index) => (
              <li key={index}>
                <span className={`shotlist-chip shotlist-chip-${item.status}`}>{statusLabel[item.status] || item.status}</span>
                <span className="shotlist-need">{item.need}{item.planned && <span className="shotlist-planned">planned</span>}</span>
                <span className="shotlist-refs">{item.shots.map((n) => thumb(n) && <img key={n} src={thumb(n).url} alt={`Shot ${n}`} title={`Shot ${n}`} />)}</span>
                {item.note && <span className="shotlist-note">{item.note}</span>}
              </li>
            ))}
          </ul>

          {result.pickups.length > 0 && (
            <>
              <h3>Pick up before you leave</h3>
              <ol className="shotlist-pickups">
                {result.pickups.map((pickup, index) => <li key={index}><strong>{pickup.shot}</strong> {pickup.why}</li>)}
              </ol>
            </>
          )}

          {result.continuity.length > 0 && (
            <>
              <h3>Continuity and technical flags</h3>
              <ul className="shotlist-flags">
                {result.continuity.map((flag, index) => <li key={index}><span className="shotlist-refs-text">{flag.shots.map((n) => `#${n}`).join(", ")}</span> {flag.issue}</li>)}
              </ul>
            </>
          )}

          <h3>The shots</h3>
          <ol className="shotlist-shots">
            {result.shots.map((shot) => (
              <li key={shot.n} className={shot.usable ? "" : "shotlist-unusable"}>
                {thumb(shot.n) && <img src={thumb(shot.n).url} alt={`Shot ${shot.n}`} />}
                <div>
                  <p className="eyebrow">#{shot.n} · {shot.type} · {shot.angle}{shot.usable ? "" : " · unusable"}</p>
                  <p>{shot.subject}</p>
                  {shot.notes && <p className="shotlist-note">{shot.notes}</p>}
                </div>
              </li>
            ))}
          </ol>

          {result.cut.order.length > 0 && (
            <>
              <h3>A rough cut from what you have</h3>
              <ol className="shotlist-cut">
                {result.cut.order.map((n, index) => thumb(n) && <li key={`${n}-${index}`}><img src={thumb(n).url} alt={`Shot ${n}`} /><span>#{n}</span></li>)}
              </ol>
              {result.cut.note && <p className="shotlist-note">{result.cut.note}</p>}
            </>
          )}
        </section>
      )}
    </div>
  );
}
