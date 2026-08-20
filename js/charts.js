// ============================================
// VIDA/OS — Gráficas reutilizables, SVG puro (sin librerías).
// ============================================

const NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}

/**
 * Barras apiladas por grupo (ej: minutos de entreno por día, coloreados por intensidad).
 * groups: [{ label: 'L', values: [n1, n2, n3] }]
 * colors: [c1, c2, c3] — uno por cada posición en "values"
 */
export function stackedBarChart({ groups, colors, height = 150, valueSuffix = "" }) {
  const width = 520;
  const padBottom = 22;
  const padTop = 10;
  const chartH = height - padBottom - padTop;
  const maxTotal = Math.max(1, ...groups.map((g) => g.values.reduce((a, b) => a + b, 0)));
  const barSlot = width / groups.length;
  const barWidth = Math.min(28, barSlot * 0.55);

  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width: "100%", height, style: "display:block;overflow:visible" });

  groups.forEach((g, i) => {
    const cx = barSlot * i + barSlot / 2;
    let yCursor = height - padBottom;
    const total = g.values.reduce((a, b) => a + b, 0);

    g.values.forEach((v, si) => {
      if (v <= 0) return;
      const h = (v / maxTotal) * chartH;
      const y = yCursor - h;
      const rect = svgEl("rect", {
        x: cx - barWidth / 2,
        y,
        width: barWidth,
        height: Math.max(h, v > 0 ? 2 : 0),
        fill: colors[si],
        rx: 4,
      });
      svg.appendChild(rect);
      yCursor = y;
    });

    if (total === 0) {
      const rect = svgEl("rect", { x: cx - barWidth / 2, y: height - padBottom - 3, width: barWidth, height: 3, fill: "var(--surface-3)", rx: 2 });
      svg.appendChild(rect);
    }

    const label = svgEl("text", {
      x: cx, y: height - 6, "text-anchor": "middle",
      fill: "var(--text-faint)", "font-size": "9.5", "font-family": "var(--f-mono)",
    });
    label.textContent = g.label;
    svg.appendChild(label);
  });

  return svg;
}

/**
 * Barras agrupadas (2 series lado a lado por grupo, ej: ingresos vs gastos por mes).
 * groups: [{ label: 'Ene', values: [income, expense] }]
 */
export function groupedBarChart({ groups, colors, height = 160 }) {
  const width = 520;
  const padBottom = 22;
  const padTop = 10;
  const chartH = height - padBottom - padTop;
  const maxVal = Math.max(1, ...groups.flatMap((g) => g.values));
  const slot = width / groups.length;
  const barWidth = Math.min(16, slot * 0.24);
  const gap = 4;

  const svg = svgEl("svg", { viewBox: `0 0 ${width} ${height}`, width: "100%", height, style: "display:block;overflow:visible" });

  groups.forEach((g, i) => {
    const cx = slot * i + slot / 2;
    g.values.forEach((v, si) => {
      const h = (Math.abs(v) / maxVal) * chartH;
      const x = cx - barWidth - gap / 2 + si * (barWidth + gap);
      const y = height - padBottom - h;
      const rect = svgEl("rect", {
        x, y, width: barWidth, height: Math.max(h, 1.5),
        fill: colors[si], rx: 3,
      });
      svg.appendChild(rect);
    });
    const label = svgEl("text", {
      x: cx, y: height - 6, "text-anchor": "middle",
      fill: "var(--text-faint)", "font-size": "9.5", "font-family": "var(--f-mono)",
    });
    label.textContent = g.label;
    svg.appendChild(label);
  });

  return svg;
}
