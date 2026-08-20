import { store } from "../storage.js";
import { h, ICONS, openSheet, closeSheet, toast, emptyState } from "../dom.js";
import { todayStr, fromKey, shortDateLabel, daysAgoKey } from "../dates.js";

const TYPES = ["Fuerza", "Cardio", "HIIT", "Yoga", "Running", "Ciclismo", "Natación", "Movilidad", "Otro"];
const INTENSITY = [
  { key: "baja", label: "Baja", cls: "good" },
  { key: "media", label: "Media", cls: "warn" },
  { key: "alta", label: "Alta", cls: "bad" },
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

  const sorted = [...data.workouts].sort((a, b) => (a.date < b.date ? 1 : -1));

  if (sorted.length === 0) {
    container.appendChild(emptyState("Aún no has registrado entrenos.\nApunta el primero.", ICONS.workout));
  } else {
    container.appendChild(h("div", { class: "section-label" }, "Historial"));
    const card = h("div", { class: "card" });
    sorted.slice(0, 60).forEach((w) => {
      const intensity = INTENSITY.find((i) => i.key === w.intensity) || INTENSITY[1];
      card.appendChild(
        h("div", { class: "row", onclick: () => openWorkoutForm(w) }, [
          h("div", { class: "row-icon" }, typeEmoji(w.type)),
          h("div", { class: "row-body" }, [
            h("div", { class: "row-title" }, w.type),
            h("div", { class: "row-sub" }, `${shortDateLabel(fromKey(w.date))} · ${w.duration} min`),
          ]),
          h("span", { class: `pill ${intensity.cls}` }, intensity.label),
        ])
      );
    });
    container.appendChild(card);
  }

  return container;
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
  const durationInput = h("input", { type: "number", inputmode: "numeric", placeholder: "45", value: workout?.duration || "" });
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
          const duration = Number(durationInput.value);
          if (!duration || duration <= 0) { toast("Indica la duración"); return; }
          const data = store.get();
          if (isEdit) {
            Object.assign(workout, { type, date: dateInput.value, duration, intensity, notes: notesInput.value.trim() });
          } else {
            data.workouts.push({
              id: store.uid(), type, date: dateInput.value, duration, intensity, notes: notesInput.value.trim(),
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
