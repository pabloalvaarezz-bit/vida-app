import { store } from "../storage.js";
import { h, ICONS, emptyState, toast } from "../dom.js";
import { todayStr, fromKey } from "../dates.js";
import { dayScore, currentStreak } from "../scoring.js";

function isScheduledToday(habit, dateKey) {
  if (habit.archived) return false;
  if (habit.freq === "weekly") return (habit.days || []).includes(fromKey(dateKey).getDay());
  return true;
}

export function renderDashboard(goTo) {
  const data = store.get();
  const today = todayStr();
  const container = h("div");

  const scheduledHabits = data.habits.filter((hb) => isScheduledToday(hb, today));
  const doneHabits = scheduledHabits.filter((hb) => hb.logs[today]).length;
  const workoutToday = data.workouts.some((w) => w.date === today);
  const score = dayScore(today);
  const streak = currentStreak();

  // ---- Hero: puntuación del día ----
  container.appendChild(
    h("div", { class: "card", style: "text-align:center; padding:24px 16px" }, [
      h("div", { class: "text-faint", style: "font-size:11px; text-transform:uppercase; letter-spacing:0.1em" }, "Estado de hoy"),
      h("div", {
        class: "mono",
        style: `font-size:40px; font-weight:700; margin:10px 0 4px; color:${scoreColor(score)}`,
      }, scoreEmoji(score)),
      h("div", { style: `font-size:14px; color:${scoreColor(score)}` }, scoreText(score)),
      streak > 0 ? h("div", { class: "streak-chip", style: "margin:14px auto 0; width:fit-content" }, [icon(ICONS.flame, 15), h("span", {}, `${streak} días seguidos`)]) : null,
    ])
  );

  // ---- Tareas rápidas ----
  container.appendChild(todoSection(data));

  // ---- Resumen módulos ----
  container.appendChild(h("div", { class: "section-label" }, "Resumen"));

  const cards = h("div", { class: "card-grid" });

  cards.appendChild(summaryCard({
    icon: ICONS.habits,
    label: "Hábitos",
    value: scheduledHabits.length > 0 ? `${doneHabits}/${scheduledHabits.length}` : "—",
    sub: scheduledHabits.length > 0 ? "hoy" : "sin programar",
    status: scheduledHabits.length === 0 ? "neutral" : doneHabits === scheduledHabits.length ? "good" : doneHabits === 0 ? "bad" : "warn",
    onclick: () => goTo("habits"),
  }));

  cards.appendChild(summaryCard({
    icon: ICONS.workout,
    label: "Entreno",
    value: workoutToday ? "Hecho" : "Pendiente",
    sub: "hoy",
    status: workoutToday ? "good" : "neutral",
    onclick: () => goTo("workouts"),
  }));

  const waterToday = data.health.water[today] || 0;
  const waterGoal = data.settings.waterGoal || 2000;
  cards.appendChild(summaryCard({
    icon: ICONS.health,
    label: "Agua",
    value: `${(waterToday / 1000).toFixed(1)}L`,
    sub: `de ${(waterGoal / 1000).toFixed(1)}L`,
    status: waterToday >= waterGoal ? "good" : waterToday === 0 ? "bad" : "warn",
    onclick: () => goTo("health"),
  }));

  const pendingTasks = data.study.tasks.filter((t) => !t.done && t.dueDate === today).length;
  cards.appendChild(summaryCard({
    icon: ICONS.study,
    label: "Estudio",
    value: pendingTasks > 0 ? `${pendingTasks}` : "0",
    sub: pendingTasks > 0 ? "tareas hoy" : "sin tareas hoy",
    status: pendingTasks > 0 ? "warn" : "neutral",
    onclick: () => goTo("study"),
  }));

  container.appendChild(cards);

  // ---- Finanzas del mes ----
  const thisMonth = today.slice(0, 7);
  const txMonth = data.finance.transactions.filter((t) => t.date.startsWith(thisMonth));
  if (txMonth.length > 0) {
    const income = txMonth.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expense = txMonth.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    const balance = income - expense;
    container.appendChild(
      h("div", { class: "card", style: "margin-top:10px", onclick: () => goTo("finance") }, [
        h("div", { class: "card-row" }, [
          h("span", { class: "text-dim", style: "font-size:13px" }, "Balance del mes"),
          h("span", { class: "mono", style: `font-size:17px; font-weight:700; color:${balance >= 0 ? "var(--green)" : "var(--red)"}` }, `${balance >= 0 ? "+" : ""}${balance.toFixed(2)} €`),
        ]),
      ])
    );
  }

  if (data.habits.length === 0 && data.workouts.length === 0 && data.study.subjects.length === 0 && data.finance.transactions.length === 0 && data.finance.savings.length === 0) {
    container.appendChild(
      h("div", { class: "card", style: "margin-top:16px; text-align:center; padding:28px 20px" }, [
        h("div", { style: "font-size:28px; margin-bottom:8px" }, "👋"),
        h("h2", { style: "font-size:16px; margin-bottom:6px" }, "Bienvenido a tu VIDA/OS"),
        h("p", { class: "text-dim", style: "font-size:13px; line-height:1.5" }, "Explora las pestañas de abajo para crear tus primeros hábitos, entrenos, asignaturas y huchas de ahorro. Todo se guarda solo en este iPhone."),
      ])
    );
  }

  return container;
}

// ================= Tareas rápidas =================

function todoSection(data) {
  const pending = [...data.todos].filter((t) => !t.done).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  const completed = data.todos.filter((t) => t.done);

  const input = h("input", {
    type: "text",
    placeholder: "Añadir una tarea…",
    onkeydown: (e) => { if (e.key === "Enter") { addTodo(input.value); input.value = ""; } },
  });
  const addBtn = h("button", { class: "icon-btn", onclick: () => { addTodo(input.value); input.value = ""; } }, icon(ICONS.plus, 17));

  const card = h("div", { class: "card" }, [
    h("div", { style: "display:flex; gap:8px" }, [input, addBtn]),
  ]);

  if (pending.length === 0 && completed.length === 0) {
    card.appendChild(h("p", { class: "text-faint", style: "font-size:12.5px; text-align:center; padding:14px 0 2px" }, "Sin tareas pendientes. Añade la primera arriba."));
  }

  pending.forEach((t) => card.appendChild(todoRow(t)));

  if (completed.length > 0) {
    const details = h("div", { style: "margin-top:6px" });
    completed.slice(0, 8).forEach((t) => details.appendChild(todoRow(t)));
    card.appendChild(details);
    card.appendChild(
      h("button", { class: "btn ghost sm", style: "margin-top:6px; color:var(--text-faint)", onclick: clearCompletedTodos }, `Limpiar ${completed.length} completada${completed.length > 1 ? "s" : ""}`)
    );
  }

  return h("div", {}, [
    h("div", { class: "section-label" }, "Tareas rápidas"),
    card,
  ]);
}

function todoRow(t) {
  return h("div", { class: "row" }, [
    h("button", { class: `check-circle ${t.done ? "done" : ""}`, onclick: () => toggleTodo(t.id) }, icon(ICONS.check)),
    h("div", { class: "row-body", style: t.done ? "opacity:0.45" : "" }, [
      h("div", { class: "row-title", style: t.done ? "text-decoration:line-through" : "" }, t.title),
    ]),
    h("button", { class: "icon-btn", onclick: () => deleteTodo(t.id) }, icon(ICONS.trash, 15)),
  ]);
}

function addTodo(title) {
  const t = (title || "").trim();
  if (!t) return;
  const data = store.get();
  data.todos.push({ id: store.uid(), title: t, done: false, createdAt: new Date().toISOString() });
  store.save();
  rerender();
}

function toggleTodo(id) {
  const data = store.get();
  const t = data.todos.find((x) => x.id === id);
  if (!t) return;
  t.done = !t.done;
  store.save();
  rerender();
}

function deleteTodo(id) {
  const data = store.get();
  data.todos = data.todos.filter((x) => x.id !== id);
  store.save();
  rerender();
}

function clearCompletedTodos() {
  const data = store.get();
  data.todos = data.todos.filter((x) => !x.done);
  store.save();
  toast("Completadas eliminadas");
  rerender();
}

function rerender() {
  window.dispatchEvent(new CustomEvent("vida:rerender"));
}

function summaryCard({ icon: ic, label, value, sub, status, onclick }) {
  const colorMap = { good: "var(--green)", bad: "var(--red)", warn: "var(--amber)", neutral: "var(--text-dim)" };
  return h("div", { class: "card stat-card", onclick }, [
    h("div", { class: "flex-between" }, [
      h("span", { class: "stat-label" }, label),
      icon(ic, 15, colorMap[status]),
    ]),
    h("div", { class: "stat-value", style: `color:${colorMap[status]}` }, value),
    h("div", { class: "stat-sub" }, sub),
  ]);
}

function scoreColor(score) {
  if (score === null) return "var(--text-dim)";
  if (score > 0.15) return "var(--green)";
  if (score < -0.15) return "var(--red)";
  return "var(--amber)";
}
function scoreEmoji(score) {
  if (score === null) return "—";
  if (score > 0.6) return "🔥";
  if (score > 0.15) return "🙂";
  if (score < -0.6) return "😞";
  if (score < -0.15) return "😕";
  return "😐";
}
function scoreText(score) {
  if (score === null) return "Aún sin actividad registrada hoy";
  if (score > 0.6) return "Día excelente, sigue así";
  if (score > 0.15) return "Buen ritmo hoy";
  if (score < -0.6) return "Día difícil, mañana toca reset";
  if (score < -0.15) return "Puedes darle la vuelta todavía";
  return "Día neutro";
}

function icon(svg, size, color) {
  const span = document.createElement("span");
  span.innerHTML = svg;
  const el = span.firstChild;
  if (size) { el.style.width = size + "px"; el.style.height = size + "px"; }
  if (color) el.style.color = color;
  return el;
}
