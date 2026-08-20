import { store } from "../storage.js";
import { h, ICONS, openSheet, closeSheet, toast, emptyState, decimalInput, parseDecimal, integerInput } from "../dom.js";
import { todayStr, fromKey, shortDateLabel, daysAgoKey, toKey, addDays } from "../dates.js";
import { stackedBarChart } from "../charts.js";

const TYPES = ["Fuerza", "Cardio", "HIIT", "Yoga", "Running", "Ciclismo", "Natación", "Movilidad", "Otro"];
const INTENSITY = [
  { key: "baja", label: "Baja", cls: "good", color: "#38d68c" },
  { key: "media", label: "Media", cls: "warn", color: "#ffb648" },
  { key: "alta", label: "Alta", cls: "bad", color: "#ff5d5d" },
];

export function renderWorkouts() {
  const data = store.get();
  const container = h("div");

  container.appendChild(
    h("div", { class: "flex-between" }, [
      h("h1", { class: "screen-title" }, "Entrenamientos"),
      h("button", { class: "icon-btn", onclick: () => openWorkoutForm() }, icon(ICONS.plus)),
    ])
  );

  // Stats últimos 7 días
  const last7 = daysAgoKey(6);
  const recent = data.workouts.filter((w) => w.date >= last7);
  const totalMin = recent.reduce((s, w) => s + Number(w.duration || 0), 0);

  container.appendChild(
    h("div", { class: "card-grid" }, [
      h("div", { class: "card stat-card" }, [
        h("div", { class: "stat-label" }, "Esta semana"),
        h("div", { class: "stat-value" }, `${recent.length}`),
        h("div", { class: "stat-sub" }, "sesiones"),
      ]),
      h("div", { class: "card stat-card" }, [
        h("div", { class: "stat-label" }, "Minutos"),
        h("div", { class: "stat-value" }, `${totalMin}`),
        h("div", { class: "stat-sub" }, "últimos 7 días"),
      ]),
    ])
  );

  // ---- Gráfica de intensidad (estilo "tiempo de uso" pero con esfuerzo) ----
  if (data.workouts.length > 0) {
    container.appendChild(h("div", { class: "section-label" }, "Intensidad · últimos 14 días"));
    container.appendChild(intensityChartCard(data));
  }

  const sorted = [...data.workouts].sort((a, b) => (a.date < b.date ? 1 : -1));

  if (sorted.length === 0) {
    container.appendChild(emptyState("Aún no has registrado entrenos.\nApunta el primero.", ICONS.workout));
  } else {
    container.appendChild(h("div", { class: "section-label" }, "Historial"));
    const card = h("div", { class: "card" });
    sorted.slice(0, 60).forEach((w) => {
      const intensity = INTENSITY.find((i) => i.key === w.intensity) || INTENSITY[1];
      const extras = [];
      if (w.avgHr) extras.push(`❤️ ${w.avgHr} lpm`);
      if (w.distance) extras.push(`📍 ${w.distance} km`);
      card.appendChild(
        h("div", { class: "row", onclick: () => openWorkoutForm(w) }, [
          h("div", { class: "row-icon" }, typeEmoji(w.type)),
          h("div", { class: "row-body" }, [
            h("div", { class: "row-title" }, w.type),
            h("div", { class: "row-sub" }, [`${shortDateLabel(fromKey(w.date))} · ${w.duration} min`, ...extras].join(" · ")),
          ]),
          h("span", { class: `pill ${intensity.cls}` }, intensity.label),
        ])
      );
    });
    container.appendChild(card);
  }

  return container;
}

function intensityChartCard(data) {
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = addDays(new Date(), -i);
    days.push(toKey(d));
  }
  const dowLetters = ["D", "L", "M", "X", "J", "V", "S"];
  const groups = days.map((key) => {
    const workoutsThatDay = data.workouts.filter((w) => w.date === key);
    const values = INTENSITY.map((i) => workoutsThatDay.filter((w) => w.intensity === i.key).reduce((s, w) => s + Number(w.duration || 0), 0));
    return { label: dowLetters[fromKey(key).getDay()], values };
  });
  const chart = stackedBarChart({ groups, colors: INTENSITY.map((i) => i.color), height: 140 });
  return h("div", { class: "card" }, [
    chart,
    h("div", { style: "display:flex; gap:14px; justify-content:center; margin-top:10px" },
      INTENSITY.map((i) => h("div", { style: "display:flex; align-items:center; gap:5px; font-size:11px; color:var(--text-dim)" }, [
        h("span", { style: `width:8px;height:8px;border-radius:3px;background:${i.color}` }),
        h("span", {}, i.label),
      ]))
    ),
  ]);
}

function typeEmoji(type) {
  const map = {
    Fuerza: "🏋️", Cardio: "❤️", HIIT: "⚡️", Yoga: "🧘", Running: "🏃",
    Ciclismo: "🚴", Natación: "🏊", Movilidad: "🤸", Otro: "💪",
  };
  return map[type] || "💪";
}

function openWorkoutForm(workout) {
  const isEdit = !!workout;
  let type = workout?.type || TYPES[0];
  let intensity = workout?.intensity || "media";

  const dateInput = h("input", { type: "date", value: workout?.date || todayStr(), max: todayStr() });
  const durationInput = integerInput({ placeholder: "45", value: workout?.duration || "" });
  const hrInput = integerInput({ placeholder: "Ej: 142 (opcional)", value: workout?.avgHr || "" });
  const distanceInput = decimalInput({ placeholder: "Ej: 12,5 (opcional)", value: workout?.distance || "" });
  const notesInput = h("textarea", { placeholder: "Notas (opcional)" }, workout?.notes || "");

  const typeChips = h("div", { class: "chip-select" },
    TYPES.map((t) =>
      h("button", {
        class: `chip-opt ${t === type ? "active" : ""}`,
        onclick: (e) => { type = t; typeChips.querySelectorAll(".chip-opt").forEach((n) => n.classList.remove("active")); e.currentTarget.classList.add("active"); },
      }, t)
    )
  );

  const intensityChips = h("div", { class: "chip-select" },
    INTENSITY.map((i) =>
      h("button", {
        class: `chip-opt on-green ${i.key === intensity ? "active" : ""}`,
        onclick: (e) => { intensity = i.key; intensityChips.querySelectorAll(".chip-opt").forEach((n) => n.classList.remove("active")); e.currentTarget.classList.add("active"); },
      }, i.label)
    )
  );

  const content = h("div", {}, [
    h("div", { class: "sheet-header" }, [
      h("h2", {}, isEdit ? "Editar entreno" : "Nuevo entreno"),
      h("button", { class: "icon-btn", onclick: closeSheet }, icon(ICONS.close)),
    ]),
    h("div", { class: "field" }, [h("label", {}, "Tipo"), typeChips]),
    h("div", { class: "field-row" }, [
      h("div", { class: "field" }, [h("label", {}, "Fecha"), dateInput]),
      h("div", { class: "field" }, [h("label", {}, "Duración (min)"), durationInput]),
    ]),
    h("div", { class: "field" }, [h("label", {}, "Intensidad"), intensityChips]),
    h("div", { class: "field-row" }, [
      h("div", { class: "field" }, [h("label", {}, "FC media (lpm)"), hrInput]),
      h("div", { class: "field" }, [h("label", {}, "Distancia (km)"), distanceInput]),
    ]),
    h("div", { class: "field" }, [h("label", {}, "Notas"), notesInput]),
    h("div", { style: "display:flex; gap:10px" }, [
      isEdit ? h("button", {
        class: "btn danger",
        onclick: () => {
          const data = store.get();
          data.workouts = data.workouts.filter((x) => x.id !== workout.id);
          store.save();
          closeSheet(); rerender(); toast("Entreno eliminado");
        },
      }, icon(ICONS.trash)) : null,
      h("button", {
        class: "btn primary block",
        onclick: () => {
          const duration = parseInt(durationInput.value, 10);
          if (!duration || duration <= 0) { toast("Indica la duración"); return; }
          const avgHrRaw = hrInput.value ? parseInt(hrInput.value, 10) : null;
          const avgHr = avgHrRaw && !isNaN(avgHrRaw) ? avgHrRaw : null;
          const distance = distanceInput.value ? parseDecimal(distanceInput.value) : null;
          const data = store.get();
          if (isEdit) {
            Object.assign(workout, { type, date: dateInput.value, duration, intensity, notes: notesInput.value.trim(), avgHr, distance: isNaN(distance) ? null : distance });
          } else {
            data.workouts.push({
              id: store.uid(), type, date: dateInput.value, duration, intensity, notes: notesInput.value.trim(),
              avgHr, distance: isNaN(distance) ? null : distance,
            });
          }
          store.save(); closeSheet(); rerender();
          toast(isEdit ? "Entreno actualizado" : "Entreno guardado");
        },
      }, isEdit ? "Guardar cambios" : "Guardar entreno"),
    ]),
  ]);

  openSheet(content);
}

function icon(svg) {
  const span = document.createElement("span");
  span.innerHTML = svg;
  return span.firstChild;
}

function rerender() {
  window.dispatchEvent(new CustomEvent("vida:rerender"));
}
