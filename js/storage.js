// ============================================
// VIDA/OS — Capa de almacenamiento
// Todo vive en localStorage, en el propio iPhone. Sin servidor.
// ============================================

const KEY = "vidaos:data:v1";

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function defaultData() {
  return {
    meta: { version: 1, createdAt: new Date().toISOString(), name: "" },
    habits: [
      // { id, name, emoji, freq: 'daily' | 'weekly', days: [0..6] (weekly), createdAt, archived, logs: { 'YYYY-MM-DD': true } }
    ],
    workouts: [
      // { id, date, type, duration, intensity, notes }
    ],
    health: {
      weight: [],   // { id, date, kg }
      sleep: [],    // { id, date, hours, quality }
      water: {},    // { 'YYYY-MM-DD': vasos(int) }
      mood: {},     // { 'YYYY-MM-DD': 1..5 }
    },
    study: {
      subjects: [], // { id, name, emoji }
      tasks: [],    // { id, subjectId, title, dueDate, done }
      sessions: [], // { id, subjectId, date, minutes }
    },
    finance: {
      categories: [], // { id, name, emoji, budget, type: 'expense'|'income' }
      transactions: [], // { id, date, amount, type, categoryId, note }
    },
    settings: {
      waterGoal: 2000,   // en mL (2 litros)
      glassSize: 250,    // mL por vaso
      sleepGoal: 8,
      onboarded: false,
    },
  };
}

let _cache = null;

function load() {
  if (_cache) return _cache;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      _cache = defaultData();
      save();
      return _cache;
    }
    const parsed = JSON.parse(raw);
    // merge con default para tolerar campos nuevos en futuras versiones
    _cache = deepMerge(defaultData(), parsed);
    migrateWaterToML(_cache);
    return _cache;
  } catch (e) {
    console.error("Error leyendo datos, se crea set nuevo", e);
    _cache = defaultData();
    return _cache;
  }
}

// v1 guardaba el agua en "vasos" (enteros pequeños, típicamente 0-15).
// v2 la guarda en mL. Si detectamos valores claramente antiguos, los migramos
// una sola vez multiplicando por el tamaño de vaso configurado.
function migrateWaterToML(data) {
  if (data.settings.waterMigratedV2) return;
  const glass = data.settings.glassSize || 250;
  for (const key in data.health.water) {
    const v = data.health.water[key];
    if (v > 0 && v <= 30) data.health.water[key] = v * glass;
  }
  if (data.settings.waterGoal && data.settings.waterGoal <= 30) {
    data.settings.waterGoal = data.settings.waterGoal * glass;
  }
  data.settings.waterMigratedV2 = true;
  save();
}

function deepMerge(base, incoming) {
  if (Array.isArray(base)) return Array.isArray(incoming) ? incoming : base;
  if (typeof base === "object" && base !== null) {
    const out = { ...base };
    for (const k in incoming || {}) {
      out[k] = k in base && typeof base[k] === "object" && base[k] !== null
        ? deepMerge(base[k], incoming[k])
        : incoming[k];
    }
    return out;
  }
  return incoming !== undefined ? incoming : base;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(_cache));
    window.dispatchEvent(new CustomEvent("vida:data-changed"));
    return true;
  } catch (e) {
    console.error("Error guardando datos", e);
    return false;
  }
}

export const store = {
  get: load,
  save,
  uid,

  exportJSON() {
    return JSON.stringify(load(), null, 2);
  },

  importJSON(jsonString) {
    const parsed = JSON.parse(jsonString);
    _cache = deepMerge(defaultData(), parsed);
    save();
  },

  resetAll() {
    _cache = defaultData();
    save();
  },
};
