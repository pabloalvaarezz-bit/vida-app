// ============================================
// VIDA/OS — Utilidades de fecha (formato YYYY-MM-DD como clave universal)
// ============================================

export function todayStr() {
  return toKey(new Date());
}

export function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

const DOW_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function dowLabel(i) {
  return DOW_ES[i];
}

export function monthLabel(date) {
  return `${MONTHS_ES[date.getMonth()]} ${date.getFullYear()}`;
}

export function longDateLabel(date) {
  const dow = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][date.getDay()];
  return `${dow}, ${date.getDate()} de ${MONTHS_ES[date.getMonth()]}`;
}

export function shortDateLabel(date) {
  return `${date.getDate()} ${MONTHS_ES[date.getMonth()].slice(0, 3)}`;
}

export function isSameDay(a, b) {
  return toKey(a) === toKey(b);
}

export function isFuture(key) {
  return key > todayStr();
}

export function weekdayIndexMon0(date) {
  // convierte domingo=0..sabado=6 en lunes=0..domingo=6
  const d = date.getDay();
  return d === 0 ? 6 : d - 1;
}

export function daysAgoKey(n) {
  return toKey(addDays(new Date(), -n));
}
