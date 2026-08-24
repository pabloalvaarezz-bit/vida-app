// ============================================
// VIDA/OS — Cálculo del "día" para el mapa de calor
// Combina hábitos, entrenos y finanzas en una puntuación -1..1.
// null = sin datos ese día (celda gris).
// ============================================
import { store } from "./storage.js";
import { fromKey } from "./dates.js";

function isHabitScheduled(habit, dateKey) {
  if (habit.archived) return false;
  if (habit.createdAt && habit.createdAt > dateKey) return false;
  if (habit.freq === "weekly") {
    const dow = fromKey(dateKey).getDay();
    return (habit.days || []).includes(dow);
  }
  return true; // diario
}

export function dayScore(dateKey) {
  const d = store.get();
  const signals = [];

  // --- Hábitos: % completados de los programados ese día
  const scheduled = d.habits.filter((h) => isHabitScheduled(h, dateKey));
  if (scheduled.length > 0) {
    const done = scheduled.filter((h) => h.logs[dateKey]).length;
    signals.push((done / scheduled.length) * 2 - 1);
  }

  // --- Entreno: bonus si hay alguno registrado ese día
  const workoutsToday = d.workouts.filter((w) => w.date === dateKey);
  if (workoutsToday.length > 0) {
    signals.push(1);
  }

  if (signals.length === 0) return null;
  const avg = signals.reduce((a, b) => a + b, 0) / signals.length;
  return Math.max(-1, Math.min(1, avg));
}

export function scoreToLevel(score) {
  if (score === null) return "none";
  if (score >= 0.15) {
    if (score > 0.75) return "g4";
    if (score > 0.45) return "g3";
    if (score > 0.15) return "g2";
  }
  if (score <= -0.15) {
    if (score < -0.75) return "r4";
    if (score < -0.45) return "r3";
    return "r2";
  }
  return score > 0 ? "g1" : "r1";
}

export function currentStreak() {
  // días consecutivos (hasta hoy) con score >= 0
  const d = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const key = new Date(d.getFullYear(), d.getMonth(), d.getDate() - i);
    const k = `${key.getFullYear()}-${String(key.getMonth() + 1).padStart(2, "0")}-${String(key.getDate()).padStart(2, "0")}`;
    const s = dayScore(k);
    if (s === null) {
      if (i === 0) continue; // hoy sin datos aún no rompe la racha
      break;
    }
    if (s >= 0) streak++;
    else break;
  }
  return streak;
}
