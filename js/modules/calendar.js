import { store } from "../storage.js";
import { h, ICONS, openSheet, closeSheet } from "../dom.js";
import { todayStr, toKey, fromKey, daysInMonth, dowLabel, monthLabel, longDateLabel, weekdayIndexMon0 } from "../dates.js";
import { dayScore, scoreToLevel } from "../scoring.js";

let viewDate = new Date(); // mes visible

export function renderCalendar() {
  const container = h("div");
  container.appendChild(h("h1", { class: "screen-title" }, "Calendario"));

  container.appendChild(
    h("div", { class: "card" }, [
      h("div", { class: "cal-month-nav" }, [
        h("button", { class: "icon-btn", onclick: () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1); rerenderSelf(container); } }, icon(ICONS.chevronLeft)),
        h("h2", {}, monthLabel(viewDate)),
        h("button", { class: "icon-btn", onclick: () => { viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1); rerenderSelf(container); } }, icon(ICONS.chevronRight)),
      ]),
      buildGrid(),
      h("div", { class: "cal-legend" }, [
        h("span", {}, "peor"),
        h("span", { class: "sq", style: "background:var(--red)" }),
        h("span", { class: "sq", style: "background:rgba(255,93,93,0.34)" }),
        h("span", { class: "sq", style: "background:var(--surface-2)" }),
        h("span", { class: "sq", style: "background:rgba(56,214,140,0.34)" }),
        h("span", { class: "sq", style: "background:var(--green)" }),
        h("span", {}, "mejor"),
      ]),
    ])
  );

  container.appendChild(
    h("p", { class: "text-faint", style: "font-size:12px; text-align:center; margin-top:14px; line-height:1.5; padding:0 10px" },
      "Cada día resume tus hábitos, entrenos y gasto. Toca un día para ver el detalle.")
  );

  return container;
}

function rerenderSelf(oldContainer) {
  const fresh = renderCalendar();
  oldContainer.replaceWith(fresh);
}

function buildGrid() {
  const grid = h("div", { class: "cal-grid" });
  ["L", "M", "X", "J", "V", "S", "D"].forEach((d) => grid.appendChild(h("div", { class: "cal-dow" }, d)));

  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const leadingEmpty = weekdayIndexMon0(first);
  const totalDays = daysInMonth(viewDate);
  const today = todayStr();

  for (let i = 0; i < leadingEmpty; i++) grid.appendChild(h("div", { class: "cal-cell empty" }));

  for (let day = 1; day <= totalDays; day++) {
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const key = toKey(date);
    const future = key > today;
    const score = future ? null : dayScore(key);
    const level = future ? "none" : scoreToLevel(score);
    const cell = h("button", {
      class: `cal-cell ${future ? "future" : ""} ${key === today ? "today" : ""}`,
      "data-level": level,
      onclick: future ? null : () => openDayDetail(key),
    }, String(day));
    grid.appendChild(cell);
  }

  return grid;
}

function openDayDetail(key) {
  const data = store.get();
  const date = fromKey(key);
  const score = dayScore(key);

  const habitsScheduled = data.habits.filter((hb) => {
    if (hb.archived) return false;
    if (hb.createdAt && hb.createdAt > key) return false;
    if (hb.freq === "weekly") return (hb.days || []).includes(date.getDay());
    return true;
  });
  const workouts = data.workouts.filter((w) => w.date === key);
  const txs = data.finance.transactions.filter((t) => t.date === key);
  const sleep = data.health.sleep.find((s) => s.date === key);
  const weight = data.health.weight.find((w) => w.date === key);
  const water = data.health.water[key];
  const mood = data.health.mood[key];
  const diaryEntries = data.diary.filter((e) => e.date === key).sort((a, b) => (a.time < b.time ? -1 : 1));

  const scoreLabel = score === null ? "Sin datos suficientes" : score > 0.15 ? "Buen día" : score < -0.15 ? "Día flojo" : "Día neutro";
  const scoreColor = score === null ? "var(--text-dim)" : score > 0.15 ? "var(--green)" : score < -0.15 ? "var(--red)" : "var(--amber)";

  const content = h("div", {}, [
    h("div", { class: "sheet-header" }, [h("div", {}), h("button", { class: "icon-btn", onclick: closeSheet }, icon(ICONS.close))]),
    h("div", { class: "day-detail-date", style: "text-transform:capitalize" }, longDateLabel(date)),
    h("div", { class: "day-detail-score mono", style: `color:${scoreColor}` }, scoreLabel),

    habitsScheduled.length > 0 ? h("div", { class: "day-detail-section" }, [
      h("h3", {}, "Hábitos"),
      ...habitsScheduled.map((hb) => h("div", { class: "day-detail-item" }, [
        h("span", {}, hb.logs[key] ? "✅" : "⬜️"), h("span", {}, hb.name),
      ])),
    ]) : null,

    workouts.length > 0 ? h("div", { class: "day-detail-section" }, [
      h("h3", {}, "Entrenamiento"),
      ...workouts.map((w) => h("div", { class: "day-detail-item" }, [h("span", {}, "🏋️"), h("span", {}, `${w.type} · ${w.duration} min`)])),
    ]) : null,

    (sleep || weight || water || mood) ? h("div", { class: "day-detail-section" }, [
      h("h3", {}, "Salud"),
      sleep ? h("div", { class: "day-detail-item" }, [h("span", {}, "🌙"), h("span", {}, `${sleep.hours}h de sueño, calidad ${sleep.quality}/5`)]) : null,
      weight ? h("div", { class: "day-detail-item" }, [h("span", {}, "⚖️"), h("span", {}, `${weight.kg} kg`)]) : null,
      water ? h("div", { class: "day-detail-item" }, [h("span", {}, "💧"), h("span", {}, `${(water / 1000).toFixed(2)} L de agua`)]) : null,
      mood ? h("div", { class: "day-detail-item" }, [h("span", {}, "🙂"), h("span", {}, `Ánimo: ${mood}/5`)]) : null,
    ]) : null,

    diaryEntries.length > 0 ? h("div", { class: "day-detail-section" }, [
      h("h3", {}, "Diario"),
      ...diaryEntries.map((e) => h("div", { class: "day-detail-item" }, [
        h("span", { class: "mono", style: "color:var(--text-faint); font-size:11.5px" }, e.time), h("span", {}, e.text),
      ])),
    ]) : null,

    txs.length > 0 ? h("div", { class: "day-detail-section" }, [
      h("h3", {}, "Finanzas"),
      ...txs.map((t) => h("div", { class: "day-detail-item" }, [
        h("span", {}, t.type === "income" ? "💰" : "💸"),
        h("span", {}, `${t.note || "Movimiento"} — ${t.type === "income" ? "+" : "−"}${Number(t.amount).toFixed(2)}€`),
      ])),
    ]) : null,

    (habitsScheduled.length === 0 && workouts.length === 0 && txs.length === 0 && diaryEntries.length === 0 && !sleep && !weight && !water && !mood)
      ? h("p", { class: "text-faint", style: "font-size:13px" }, "No hay registros para este día.")
      : null,
  ]);

  openSheet(content);
}

function icon(svg) {
  const span = document.createElement("span");
  span.innerHTML = svg;
  return span.firstChild;
}
