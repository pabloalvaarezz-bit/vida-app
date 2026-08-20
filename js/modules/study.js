import { store } from "../storage.js";
import { h, ICONS, openSheet, closeSheet, toast, emptyState } from "../dom.js";
import { todayStr, fromKey, shortDateLabel, isFuture } from "../dates.js";

const SUBJ_EMOJIS = ["📘", "📗", "📙", "📕", "🧮", "🧪", "💻", "🎨", "🌍", "🎵"];
let pomodoroState = { running: false, subjectId: null, seconds: 25 * 60, total: 25 * 60, interval: null };

export function renderStudy() {
  const data = store.get();
  const container = h("div");

  container.appendChild(
    h("div", { class: "flex-between" }, [
      h("h1", { class: "screen-title" }, "Estudios"),
      h("button", { class: "icon-btn", onclick: () => openSubjectForm() }, icon(ICONS.plus)),
    ])
  );

  if (data.study.subjects.length === 0) {
    container.appendChild(emptyState("Crea una asignatura o proyecto\npara empezar a organizar tu estudio.", ICONS.study));
    return container;
  }

  // ---- Pomodoro ----
  container.appendChild(pomodoroCard(data));

  // ---- Tareas pendientes ----
  container.appendChild(
    h("div", { class: "section-label" }, [
      "Tareas",
      h("button", { class: "btn sm", onclick: () => openTaskForm() }, "+ Añadir"),
    ])
  );
  const pending = data.study.tasks
    .filter((t) => !t.done)
    .sort((a, b) => (a.dueDate || "9999") < (b.dueDate || "9999") ? -1 : 1);

  if (pending.length === 0) {
    container.appendChild(emptyState("Sin tareas pendientes. 🎉"));
  } else {
    const card = h("div", { class: "card" });
    pending.forEach((t) => {
      const subject = data.study.subjects.find((s) => s.id === t.subjectId);
      const overdue = t.dueDate && !isFuture(t.dueDate) && t.dueDate !== todayStr();
      const dueSoon = t.dueDate === todayStr();
      card.appendChild(
        h("div", { class: "row" }, [
          h("button", { class: "check-circle", onclick: () => { t.done = true; store.save(); rerender(); toast("Tarea completada ✓"); } }),
          h("div", { class: "row-body", onclick: () => openTaskForm(t) }, [
            h("div", { class: "row-title" }, t.title),
            h("div", { class: "row-sub" }, `${subject ? subject.emoji + " " + subject.name : ""}${t.dueDate ? " · " + shortDateLabel(fromKey(t.dueDate)) : ""}`),
          ]),
          t.dueDate ? h("span", { class: `pill ${overdue ? "bad" : dueSoon ? "warn" : "neutral"}` }, overdue ? "vencida" : dueSoon ? "hoy" : "") : null,
        ])
      );
    });
    container.appendChild(card);
  }

  // ---- Asignaturas y horas acumuladas ----
  container.appendChild(h("div", { class: "section-label" }, "Asignaturas"));
  const subjCard = h("div", { class: "card" });
  data.study.subjects.forEach((s) => {
    const minutes = data.study.sessions.filter((ses) => ses.subjectId === s.id).reduce((sum, ses) => sum + ses.minutes, 0);
    subjCard.appendChild(
      h("div", { class: "row" }, [
        h("div", { class: "row-icon" }, s.emoji),
        h("div", { class: "row-body" }, [
          h("div", { class: "row-title" }, s.name),
          h("div", { class: "row-sub" }, `${Math.floor(minutes / 60)}h ${minutes % 60}m acumuladas`),
        ]),
        h("button", { class: "icon-btn", onclick: () => { if (confirm(`¿Eliminar "${s.name}" y sus tareas/sesiones?`)) { removeSubject(s.id); } } }, icon(ICONS.trash)),
      ])
    );
  });
  container.appendChild(subjCard);

  return container;
}

function removeSubject(id) {
  const data = store.get();
  data.study.subjects = data.study.subjects.filter((s) => s.id !== id);
  data.study.tasks = data.study.tasks.filter((t) => t.subjectId !== id);
  data.study.sessions = data.study.sessions.filter((s) => s.subjectId !== id);
  store.save();
  rerender();
}

function pomodoroCard(data) {
  const mins = String(Math.floor(pomodoroState.seconds / 60)).padStart(2, "0");
  const secs = String(pomodoroState.seconds % 60).padStart(2, "0");
  const pct = ((pomodoroState.total - pomodoroState.seconds) / pomodoroState.total) * 100;

  const subjSelect = h("select", {}, [
    h("option", { value: "" }, "Sesión libre"),
    ...data.study.subjects.map((s) => h("option", { value: s.id, selected: pomodoroState.subjectId === s.id }, `${s.emoji} ${s.name}`)),
  ]);
  subjSelect.addEventListener("change", () => { pomodoroState.subjectId = subjSelect.value || null; });

  const card = h("div", { class: "card" }, [
    h("div", { class: "flex-between" }, [
      h("span", { style: "font-size:13px; color:var(--text-dim)" }, "Sesión de estudio"),
      pomodoroState.running ? null : subjSelect,
    ]),
    h("div", { class: "mono", style: "font-size:44px; text-align:center; margin:14px 0; font-weight:700" }, `${mins}:${secs}`),
    h("div", { class: "progress-track", style: "margin-bottom:16px" }, [
      h("div", { class: "progress-fill good", style: `width:${pct}%` }),
    ]),
    h("div", { style: "display:flex; gap:10px" }, [
      h("button", {
        class: "btn primary block",
        onclick: () => togglePomodoro(),
      }, pomodoroState.running ? "Pausar" : pomodoroState.seconds < pomodoroState.total ? "Reanudar" : "Empezar (25 min)"),
      pomodoroState.seconds !== pomodoroState.total ? h("button", { class: "btn", onclick: () => resetPomodoro() }, "Reset") : null,
    ]),
  ]);
  return card;
}

function togglePomodoro() {
  if (pomodoroState.running) {
    clearInterval(pomodoroState.interval);
    pomodoroState.running = false;
  } else {
    pomodoroState.running = true;
    pomodoroState.interval = setInterval(() => {
      pomodoroState.seconds--;
      if (pomodoroState.seconds <= 0) {
        clearInterval(pomodoroState.interval);
        pomodoroState.running = false;
        logPomodoroSession();
        toast("¡Sesión completada! 25 min añadidos 🎉");
        pomodoroState.seconds = pomodoroState.total;
      }
      rerender();
    }, 1000);
  }
  rerender();
}

function resetPomodoro() {
  clearInterval(pomodoroState.interval);
  pomodoroState.running = false;
  pomodoroState.seconds = pomodoroState.total;
  rerender();
}

function logPomodoroSession() {
  const data = store.get();
  data.study.sessions.push({
    id: store.uid(),
    subjectId: pomodoroState.subjectId,
    date: todayStr(),
    minutes: 25,
  });
  store.save();
}

function openSubjectForm() {
  let emoji = SUBJ_EMOJIS[0];
  const nameInput = h("input", { type: "text", placeholder: "Ej: Matemáticas" });
  const emojiGrid = h("div", { class: "emoji-grid" },
    SUBJ_EMOJIS.map((e) => h("button", {
      class: `emoji-opt ${e === emoji ? "active" : ""}`,
      onclick: (ev) => { emoji = e; emojiGrid.querySelectorAll(".emoji-opt").forEach((n) => n.classList.remove("active")); ev.currentTarget.classList.add("active"); },
    }, e))
  );
  const content = h("div", {}, [
    h("div", { class: "sheet-header" }, [h("h2", {}, "Nueva asignatura"), h("button", { class: "icon-btn", onclick: closeSheet }, icon(ICONS.close))]),
    h("div", { class: "field" }, [h("label", {}, "Nombre"), nameInput]),
    h("div", { class: "field" }, [h("label", {}, "Icono"), emojiGrid]),
    h("button", {
      class: "btn primary block",
      onclick: () => {
        const name = nameInput.value.trim();
        if (!name) { toast("Ponle un nombre"); return; }
        const data = store.get();
        data.study.subjects.push({ id: store.uid(), name, emoji });
        store.save(); closeSheet(); rerender(); toast("Asignatura creada");
      },
    }, "Crear"),
  ]);
  openSheet(content);
}

function openTaskForm(task) {
  const isEdit = !!task;
  const data = store.get();
  const titleInput = h("input", { type: "text", placeholder: "Ej: Entregar ensayo", value: task?.title || "" });
  const dateInput = h("input", { type: "date", value: task?.dueDate || "" });
  const subjSelect = h("select", {}, data.study.subjects.map((s) =>
    h("option", { value: s.id, selected: (task?.subjectId || data.study.subjects[0]?.id) === s.id }, `${s.emoji} ${s.name}`)
  ));
  const content = h("div", {}, [
    h("div", { class: "sheet-header" }, [h("h2", {}, isEdit ? "Editar tarea" : "Nueva tarea"), h("button", { class: "icon-btn", onclick: closeSheet }, icon(ICONS.close))]),
    h("div", { class: "field" }, [h("label", {}, "Título"), titleInput]),
    h("div", { class: "field" }, [h("label", {}, "Asignatura"), subjSelect]),
    h("div", { class: "field" }, [h("label", {}, "Fecha límite (opcional)"), dateInput]),
    h("div", { style: "display:flex; gap:10px" }, [
      isEdit ? h("button", {
        class: "btn danger",
        onclick: () => { data.study.tasks = data.study.tasks.filter((t) => t.id !== task.id); store.save(); closeSheet(); rerender(); toast("Tarea eliminada"); },
      }, icon(ICONS.trash)) : null,
      h("button", {
        class: "btn primary block",
        onclick: () => {
          const title = titleInput.value.trim();
          if (!title) { toast("Ponle un título"); return; }
          if (isEdit) {
            Object.assign(task, { title, subjectId: subjSelect.value, dueDate: dateInput.value || null });
          } else {
            data.study.tasks.push({ id: store.uid(), title, subjectId: subjSelect.value, dueDate: dateInput.value || null, done: false });
          }
          store.save(); closeSheet(); rerender(); toast(isEdit ? "Tarea actualizada" : "Tarea añadida");
        },
      }, isEdit ? "Guardar cambios" : "Añadir tarea"),
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
