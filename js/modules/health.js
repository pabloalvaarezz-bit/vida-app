import { store } from "../storage.js";
import { h, ICONS, openSheet, closeSheet, toast, emptyState, decimalInput, parseDecimal } from "../dom.js";
import { todayStr, fromKey, shortDateLabel } from "../dates.js";

const MOODS = [
  { v: 1, e: "😞", label: "Mal" },
  { v: 2, e: "😕", label: "Regular" },
  { v: 3, e: "😐", label: "Normal" },
  { v: 4, e: "🙂", label: "Bien" },
  { v: 5, e: "😄", label: "Genial" },
];

export function renderHealth() {
  const data = store.get();
  const today = todayStr();
  const container = h("div");

  container.appendChild(h("h1", { class: "screen-title" }, "Salud"));

  // ---- Agua ----
  const waterGoal = data.settings.waterGoal || 2000;
  const glassSize = data.settings.glassSize || 250;
  const waterToday = data.health.water[today] || 0;
  const waterPct = Math.min(100, (waterToday / waterGoal) * 100);
  container.appendChild(
    h("div", { class: "card" }, [
      h("div", { class: "card-row" }, [
        h("div", {}, [
          h("div", { class: "flex-between", style: "gap:8px" }, [icon(ICONS.droplet, "16"), h("span", { style: "font-size:13px; color:var(--text-dim)" }, "Agua")]),
          h("div", { class: "stat-value mono", style: "margin-top:6px" }, `${(waterToday / 1000).toFixed(2)} / ${(waterGoal / 1000).toFixed(1)} L`),
          h("div", { class: "text-faint", style: "font-size:11px; margin-top:2px" }, `${waterToday} ml · vaso de ${glassSize} ml`),
        ]),
        h("div", { style: "display:flex; gap:8px" }, [
          h("button", { class: "icon-btn", onclick: () => setWater(Math.max(0, waterToday - glassSize)) }, "−"),
          h("button", { class: "icon-btn", onclick: () => setWater(waterToday + glassSize) }, "+"),
        ]),
      ]),
      h("div", { class: "progress-track", style: "margin-top:10px" }, [
        h("div", { class: `progress-fill ${waterPct >= 100 ? "good" : "warn"}`, style: `width:${waterPct}%` }),
      ]),
    ])
  );

  // ---- Ánimo ----
  const moodToday = data.health.mood[today];
  container.appendChild(
    h("div", { class: "card", style: "margin-top:10px" }, [
      h("div", { style: "font-size:13px; color:var(--text-dim); margin-bottom:10px" }, "¿Cómo te sientes hoy?"),
      h("div", { style: "display:flex; justify-content:space-between" },
        MOODS.map((m) =>
          h("button", {
            class: "icon-btn",
            style: `width:44px; height:44px; font-size:20px; ${moodToday === m.v ? "background:var(--green-dim); border-color:var(--green-line)" : ""}`,
            onclick: () => { data.health.mood[today] = m.v; store.save(); rerender(); },
          }, m.e)
        )
      ),
    ])
  );

  // ---- Peso ----
  const lastWeights = [...data.health.weight].sort((a, b) => (a.date < b.date ? 1 : -1));
  container.appendChild(
    h("div", { class: "section-label" }, [
      "Peso",
      h("button", { class: "btn sm", onclick: () => openWeightForm() }, "+ Registrar"),
    ])
  );
  if (lastWeights.length === 0) {
    container.appendChild(emptyState("Sin registros de peso todavía.", ICONS.scale));
  } else {
    container.appendChild(weightChart(lastWeights.slice(0, 30).reverse()));
    const card = h("div", { class: "card", style: "margin-top:10px" });
    lastWeights.slice(0, 5).forEach((w, i) => {
      const prev = lastWeights[i + 1];
      const diff = prev ? (w.kg - prev.kg).toFixed(1) : null;
      card.appendChild(
        h("div", { class: "row" }, [
          h("div", { class: "row-body" }, [
            h("div", { class: "row-title mono" }, `${w.kg} kg`),
            h("div", { class: "row-sub" }, shortDateLabel(fromKey(w.date))),
          ]),
          diff !== null ? h("span", { class: `pill ${diff <= 0 ? "good" : "bad"}` }, `${diff > 0 ? "+" : ""}${diff} kg`) : null,
        ])
      );
    });
    container.appendChild(card);
  }

  // ---- Sueño ----
  const lastSleep = [...data.health.sleep].sort((a, b) => (a.date < b.date ? 1 : -1));
  container.appendChild(
    h("div", { class: "section-label" }, [
      "Sueño",
      h("button", { class: "btn sm", onclick: () => openSleepForm() }, "+ Registrar"),
    ])
  );
  if (lastSleep.length === 0) {
    container.appendChild(emptyState("Sin registros de sueño todavía.", ICONS.moon));
  } else {
    const card = h("div", { class: "card" });
    lastSleep.slice(0, 6).forEach((s) => {
      const good = s.hours >= (data.settings.sleepGoal || 8) - 0.5;
      card.appendChild(
        h("div", { class: "row" }, [
          h("div", { class: "row-icon" }, "🌙"),
          h("div", { class: "row-body" }, [
            h("div", { class: "row-title mono" }, `${s.hours} h`),
            h("div", { class: "row-sub" }, `${shortDateLabel(fromKey(s.date))} · calidad ${s.quality}/5`),
          ]),
          h("span", { class: `pill ${good ? "good" : "bad"}` }, good ? "descansado" : "poco"),
        ])
      );
    });
    container.appendChild(card);
  }

  return container;
}

function setWater(val) {
  const data = store.get();
  data.health.water[todayStr()] = val;
  store.save();
  rerender();
}

function weightChart(entries) {
  const w = 520, hgt = 120, pad = 10;
  const kgs = entries.map((e) => e.kg);
  const min = Math.min(...kgs) - 0.5, max = Math.max(...kgs) + 0.5;
  const range = max - min || 1;
  const stepX = entries.length > 1 ? (w - pad * 2) / (entries.length - 1) : 0;
  const points = entries.map((e, i) => {
    const x = pad + stepX * i;
    const y = hgt - pad - ((e.kg - min) / range) * (hgt - pad * 2);
    return `${x},${y}`;
  });
  const svgNs = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNs, "svg");
  svg.setAttribute("viewBox", `0 0 ${w} ${hgt}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", hgt);
  svg.style.display = "block";

  const polyline = document.createElementNS(svgNs, "polyline");
  polyline.setAttribute("points", points.join(" "));
  polyline.setAttribute("fill", "none");
  polyline.setAttribute("stroke", "#38d68c");
  polyline.setAttribute("stroke-width", "2.5");
  polyline.setAttribute("stroke-linecap", "round");
  polyline.setAttribute("stroke-linejoin", "round");
  svg.appendChild(polyline);

  if (points.length > 0) {
    const last = points[points.length - 1].split(",");
    const dot = document.createElementNS(svgNs, "circle");
    dot.setAttribute("cx", last[0]);
    dot.setAttribute("cy", last[1]);
    dot.setAttribute("r", "4");
    dot.setAttribute("fill", "#38d68c");
    svg.appendChild(dot);
  }

  return h("div", { class: "card" }, [svg]);
}

function openWeightForm() {
  const dateInput = h("input", { type: "date", value: todayStr(), max: todayStr() });
  const kgInput = decimalInput({ placeholder: "72,5" });
  const content = h("div", {}, [
    h("div", { class: "sheet-header" }, [h("h2", {}, "Registrar peso"), h("button", { class: "icon-btn", onclick: closeSheet }, icon(ICONS.close))]),
    h("div", { class: "field-row" }, [
      h("div", { class: "field" }, [h("label", {}, "Fecha"), dateInput]),
      h("div", { class: "field" }, [h("label", {}, "Peso (kg)"), kgInput]),
    ]),
    h("button", {
      class: "btn primary block",
      onclick: () => {
        const kg = parseDecimal(kgInput.value);
        if (!kg || isNaN(kg)) { toast("Indica el peso"); return; }
        const data = store.get();
        data.health.weight = data.health.weight.filter((e) => e.date !== dateInput.value);
        data.health.weight.push({ id: store.uid(), date: dateInput.value, kg });
        store.save(); closeSheet(); rerender(); toast("Peso registrado");
      },
    }, "Guardar"),
  ]);
  openSheet(content);
}

function openSleepForm() {
  const dateInput = h("input", { type: "date", value: todayStr(), max: todayStr() });
  const hoursInput = decimalInput({ placeholder: "7,5" });
  let quality = 3;
  const qualityChips = h("div", { class: "chip-select" },
    [1, 2, 3, 4, 5].map((q) =>
      h("button", {
        class: `chip-opt on-green ${q === quality ? "active" : ""}`,
        onclick: (e) => { quality = q; qualityChips.querySelectorAll(".chip-opt").forEach((n) => n.classList.remove("active")); e.currentTarget.classList.add("active"); },
      }, String(q))
    )
  );
  const content = h("div", {}, [
    h("div", { class: "sheet-header" }, [h("h2", {}, "Registrar sueño"), h("button", { class: "icon-btn", onclick: closeSheet }, icon(ICONS.close))]),
    h("div", { class: "field-row" }, [
      h("div", { class: "field" }, [h("label", {}, "Fecha"), dateInput]),
      h("div", { class: "field" }, [h("label", {}, "Horas"), hoursInput]),
    ]),
    h("div", { class: "field" }, [h("label", {}, "Calidad (1-5)"), qualityChips]),
    h("button", {
      class: "btn primary block",
      onclick: () => {
        const hours = parseDecimal(hoursInput.value);
        if (!hours || isNaN(hours)) { toast("Indica las horas"); return; }
        const data = store.get();
        data.health.sleep = data.health.sleep.filter((e) => e.date !== dateInput.value);
        data.health.sleep.push({ id: store.uid(), date: dateInput.value, hours, quality });
        store.save(); closeSheet(); rerender(); toast("Sueño registrado");
      },
    }, "Guardar"),
  ]);
  openSheet(content);
}

function icon(svg, size) {
  const span = document.createElement("span");
  span.innerHTML = svg;
  const el = span.firstChild;
  if (size) { el.style.width = size + "px"; el.style.height = size + "px"; }
  return el;
}

function rerender() {
  window.dispatchEvent(new CustomEvent("vida:rerender"));
}
