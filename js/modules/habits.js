import { store } from "../storage.js";
import { h, mount, ICONS, openSheet, closeSheet, toast, emptyState } from "../dom.js";
import { todayStr, fromKey } from "../dates.js";

const EMOJIS = ["💧", "🏃", "📚", "🧘", "🥗", "😴", "🚭", "💊", "🧹", "☀️", "🙏", "🎯", "📵", "🚴", "🪥", "✍️"];
const DOW = ["D", "L", "M", "X", "J", "V", "S"]; // índice = Date.getDay() (0=domingo)
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // para mostrar la semana empezando en lunes

function isScheduledToday(habit, dateKey) {
  if (habit.freq === "weekly") return (habit.days || []).includes(fromKey(dateKey).getDay());
  return true;
}

function streakFor(habit) {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 365; i++) {
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    if (!isScheduledToday(habit, key)) continue;
    if (habit.logs[key]) streak++;
    else if (key === todayStr()) continue;
    else break;
  }
  return streak;
}

export function renderHabits() {
  const data = store.get();
  const today = todayStr();
  const container = h("div");

  container.appendChild(
    h("div", { class: "flex-between" }, [
      h("h1", { class: "screen-title" }, "Hábitos"),
      h("button", { class: "icon-btn", onclick: () => openHabitForm() }, htmlIcon(ICONS.plus)),
    ])
  );

  const active = data.habits.filter((hb) => !hb.archived);
  const scheduledToday = active.filter((hb) => isScheduledToday(hb, today));
  const doneToday = scheduledToday.filter((hb) => hb.logs[today]).length;

  if (scheduledToday.length > 0) {
    container.appendChild(
      h("div", { class: "card" }, [
        h("div", { class: "flex-between" }, [
          h("span", { class: "text-dim", style: "font-size:13px" }, "Hoy"),
          h("span", { class: "mono", style: "font-size:13px" }, `${doneToday}/${scheduledToday.length}`),
        ]),
        h("div", { class: "progress-track", style: "margin-top:8px" }, [
          h("div", {
            class: `progress-fill ${doneToday === scheduledToday.length ? "good" : "warn"}`,
            style: `width:${(doneToday / scheduledToday.length) * 100}%`,
          }),
        ]),
      ])
    );
  }

  if (active.length === 0) {
    container.appendChild(emptyState("No tienes hábitos todavía.\nCrea el primero y empieza tu racha."));
  } else {
    container.appendChild(h("div", { class: "section-label" }, "Todos"));
    const card = h("div", { class: "card" });
    active.forEach((habit, i) => {
      const scheduled = isScheduledToday(habit, today);
      const done = !!habit.logs[today];
      const streak = streakFor(habit);
      const row = h("div", { class: "row" }, [
        h("div", { class: "row-icon" }, habit.emoji || "✅"),
        h("div", { class: "row-body", onclick: () => openHabitForm(habit) }, [
          h("div", { class: "row-title" }, habit.name),
          h("div", { class: "row-sub" }, [
            habit.freq === "weekly" ? `Semanal · ${(habit.days || []).map((d) => DOW[d]).join(" ")}` : "Diario",
            streak > 0 ? `  ·  🔥 ${streak}` : "",
          ].join("")),
        ]),
        scheduled
          ? h("button", {
              class: `check-circle ${done ? "done" : ""}`,
              onclick: () => toggleHabit(habit.id),
            }, htmlIcon(ICONS.check))
          : h("span", { class: "pill neutral", style: "font-size:10px" }, "no hoy"),
      ]);
      card.appendChild(row);
    });
    container.appendChild(card);
  }

  return container;
}

function toggleHabit(id) {
  const data = store.get();
  const habit = data.habits.find((h) => h.id === id);
  const today = todayStr();
  if (habit.logs[today]) delete habit.logs[today];
  else habit.logs[today] = true;
  store.save();
  toast(habit.logs[today] ? "Hábito marcado ✓" : "Desmarcado");
  rerender();
}

function openHabitForm(habit) {
  const isEdit = !!habit;
  let selectedEmoji = habit?.emoji || EMOJIS[0];
  let freq = habit?.freq || "daily";
  let days = new Set(habit?.days || [1, 2, 3, 4, 5]);

  const nameInput = h("input", { type: "text", placeholder: "Ej: Beber 2L de agua", value: habit?.name || "" });

  const emojiGrid = h("div", { class: "emoji-grid" },
    EMOJIS.map((e) =>
      h("button", {
        class: `emoji-opt ${e === selectedEmoji ? "active" : ""}`,
        onclick: (ev) => {
          selectedEmoji = e;
          emojiGrid.querySelectorAll(".emoji-opt").forEach((n) => n.classList.remove("active"));
          ev.currentTarget.classList.add("active");
        },
      }, e)
    )
  );

  const freqSeg = h("div", { class: "segment" }, [
    h("button", { class: freq === "daily" ? "active" : "", onclick: (e) => { freq = "daily"; setFreqUI(e); } }, "Diario"),
    h("button", { class: freq === "weekly" ? "active" : "", onclick: (e) => { freq = "weekly"; setFreqUI(e); } }, "Días concretos"),
  ]);

  const daysRow = h("div", { class: "chip-select", style: freq === "weekly" ? "" : "display:none" },
    WEEK_ORDER.map((dow) =>
      h("button", {
        class: `chip-opt on-green ${days.has(dow) ? "active" : ""}`,
        onclick: (ev) => {
          if (days.has(dow)) days.delete(dow); else days.add(dow);
          ev.currentTarget.classList.toggle("active");
        },
      }, DOW[dow])
    )
  );

  function setFreqUI(ev) {
    freqSeg.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
    ev.currentTarget.classList.add("active");
    daysRow.style.display = freq === "weekly" ? "flex" : "none";
  }

  const content = h("div", {}, [
    h("div", { class: "sheet-header" }, [
      h("h2", {}, isEdit ? "Editar hábito" : "Nuevo hábito"),
      h("button", { class: "icon-btn", onclick: closeSheet }, htmlIcon(ICONS.close)),
    ]),
    h("div", { class: "field" }, [h("label", {}, "Nombre"), nameInput]),
    h("div", { class: "field" }, [h("label", {}, "Icono"), emojiGrid]),
    h("div", { class: "field" }, [h("label", {}, "Frecuencia"), freqSeg]),
    h("div", { class: "field" }, [daysRow]),
    h("div", { style: "display:flex; gap:10px; margin-top:8px" }, [
      isEdit ? h("button", {
        class: "btn danger",
        onclick: () => {
          if (confirm("¿Eliminar este hábito y su historial?")) {
            const data = store.get();
            data.habits = data.habits.filter((x) => x.id !== habit.id);
            store.save();
            closeSheet();
            rerender();
            toast("Hábito eliminado");
          }
        },
      }, htmlIcon(ICONS.trash)) : null,
      h("button", {
        class: "btn primary block",
        onclick: () => {
          const name = nameInput.value.trim();
          if (!name) { toast("Ponle un nombre"); return; }
          const data = store.get();
          if (isEdit) {
            Object.assign(habit, { name, emoji: selectedEmoji, freq, days: [...days] });
          } else {
            data.habits.push({
              id: store.uid(),
              name,
              emoji: selectedEmoji,
              freq,
              days: [...days],
              createdAt: todayStr(),
              archived: false,
              logs: {},
            });
          }
          store.save();
          closeSheet();
          rerender();
          toast(isEdit ? "Hábito actualizado" : "Hábito creado");
        },
      }, isEdit ? "Guardar cambios" : "Crear hábito"),
    ]),
  ]);

  openSheet(content);
}

function htmlIcon(svg) {
  const span = document.createElement("span");
  span.innerHTML = svg;
  return span.firstChild;
}
function rerender() {
  window.dispatchEvent(new CustomEvent("vida:rerender"));
}
