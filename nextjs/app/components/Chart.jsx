// Charts from a list's frontmatter. A file opts in with a `chart:` block (see industry/dollars-vs-attention.md):
//
//   chart:
//     type: scatter
//     x: hours_bn          # field for the x axis
//     y: revenue_bn        # field for the y axis
//     label: medium        # field that names each point
//     data: [{ medium: "Video games", revenue_bn: 60, hours_bn: 40, dollars_per_hour: 1.5 }, …]
//
// A scatter draws on log axes (media differ by orders of magnitude), with a sorted bar chart of
// `dollars_per_hour` beside it when the rows carry that field. One series, one color: no legend.
// The file's own table is the table view; hovering a point or bar shows its values.

const fieldNames = {
  hours_bn: "Hours of attention per year (billions)",
  revenue_bn: "Revenue per year ($ billions)",
  dollars_per_hour: "$ per hour of attention",
};

function nameOf(field) {
  return fieldNames[field] || String(field).replace(/_/g, " ");
}

function number(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function compact(value) {
  if (value >= 100) return Math.round(value).toLocaleString("en-US");
  if (value >= 10) return value.toFixed(0);
  if (value >= 1) return value.toFixed(1).replace(/\.0$/, "");
  return value.toFixed(2).replace(/0$/, "");
}

// Log ticks at 1, 2, 5 × 10^n inside the domain.
function money(value) {
  return value >= 100 ? `$${Math.round(value).toLocaleString("en-US")}` : `$${value.toFixed(2)}`;
}

function logTicks(min, max) {
  const ticks = [];
  for (let power = Math.floor(Math.log10(min)); power <= Math.ceil(Math.log10(max)); power += 1) {
    for (const step of [1, 2, 5]) {
      const tick = step * 10 ** power;
      if (tick >= min * 0.999 && tick <= max * 1.001) ticks.push(tick);
    }
  }
  return ticks;
}

// Pad the domain out to the nearest half power of ten on each side.
function logDomain(values) {
  const low = Math.floor(Math.log10(Math.min(...values)) * 2) / 2;
  const high = Math.ceil(Math.log10(Math.max(...values)) * 2) / 2;
  return [10 ** low, 10 ** (high > low ? high : low + 0.5)];
}

function Scatter({ rows, x, y, label }) {
  const width = 720;
  const height = 440;
  const pad = { top: 16, right: 24, bottom: 52, left: 64 };
  const [xMin, xMax] = logDomain(rows.map((row) => row.x));
  const [yMin, yMax] = logDomain(rows.map((row) => row.y));
  const sx = (value) => pad.left + ((Math.log10(value) - Math.log10(xMin)) / (Math.log10(xMax) - Math.log10(xMin))) * (width - pad.left - pad.right);
  const sy = (value) => height - pad.bottom - ((Math.log10(value) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin))) * (height - pad.top - pad.bottom);
  return (
    <figure className="chart">
      <figcaption className="chart-title">{nameOf(y)} against {nameOf(x).toLowerCase()}</figcaption>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Scatter plot of ${nameOf(y)} against ${nameOf(x)}, log scales, one point per ${label}.`}>
        {logTicks(xMin, xMax).map((tick) => (
          <g key={`x${tick}`}>
            <line className="chart-grid" x1={sx(tick)} x2={sx(tick)} y1={pad.top} y2={height - pad.bottom} />
            <text className="chart-tick" x={sx(tick)} y={height - pad.bottom + 18} textAnchor="middle">{compact(tick)}</text>
          </g>
        ))}
        {logTicks(yMin, yMax).map((tick) => (
          <g key={`y${tick}`}>
            <line className="chart-grid" x1={pad.left} x2={width - pad.right} y1={sy(tick)} y2={sy(tick)} />
            <text className="chart-tick" x={pad.left - 8} y={sy(tick) + 4} textAnchor="end">{compact(tick)}</text>
          </g>
        ))}
        <text className="chart-axis" x={pad.left + (width - pad.left - pad.right) / 2} y={height - 10} textAnchor="middle">{nameOf(x)} · log scale</text>
        <text className="chart-axis" transform={`translate(16 ${pad.top + (height - pad.top - pad.bottom) / 2}) rotate(-90)`} textAnchor="middle">{nameOf(y)} · log scale</text>
        {rows.map((row) => {
          const cx = sx(row.x);
          const cy = sy(row.y);
          const right = cx < width - 170;
          return (
            <g className="chart-point" key={row.label}>
              <title>{`${row.label}: ${nameOf(y)} ${compact(row.y)}; ${nameOf(x).toLowerCase()} ${compact(row.x)}${row.perHour != null ? `; ${money(row.perHour)} per hour` : ""}`}</title>
              <circle className="chart-hit" cx={cx} cy={cy} r={14} />
              <circle className="chart-dot" cx={cx} cy={cy} r={5} />
              <text className="chart-label" x={right ? cx + 10 : cx - 10} y={cy + 4} textAnchor={right ? "start" : "end"}>{row.label}</text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

function PerHourBars({ rows }) {
  const sorted = [...rows].filter((row) => row.perHour != null).sort((a, b) => b.perHour - a.perHour);
  if (sorted.length < 2) return null;
  const max = sorted[0].perHour;
  return (
    <figure className="chart">
      <figcaption className="chart-title">{nameOf("dollars_per_hour")}, highest first</figcaption>
      <div className="bar-chart" role="list">
        {sorted.map((row) => (
          <div className="bar-row" role="listitem" key={row.label} title={`${row.label}: ${money(row.perHour)} per hour`}>
            <span className="bar-label">{row.label}</span>
            <span className="bar-track"><span className="bar-fill" style={{ width: `${Math.max(1.5, (row.perHour / max) * 100)}%` }} /></span>
            <span className="bar-value">{money(row.perHour)}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}

export default function Chart({ spec }) {
  if (!spec || !Array.isArray(spec.data)) return null;
  const x = spec.x || "x";
  const y = spec.y || "y";
  const label = spec.label || "label";
  const rows = spec.data
    .map((row) => ({ label: String(row?.[label] ?? ""), x: number(row?.[x]), y: number(row?.[y]), perHour: number(row?.dollars_per_hour) }))
    .filter((row) => row.label);
  const plotted = rows.filter((row) => row.x > 0 && row.y > 0);
  if (!plotted.length) return null;
  return (
    <div className="charts">
      <PerHourBars rows={rows} />
      {spec.type === "scatter" && plotted.length >= 2 && <Scatter rows={plotted} x={x} y={y} label={label} />}
    </div>
  );
}
