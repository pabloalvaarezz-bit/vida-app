import { store } from "./storage.js";
import { h, mount, ICONS } from "./dom.js";
import { longDateLabel } from "./dates.js";
import { currentStreak } from "./scoring.js";
import { renderDashboard } from "./modules/dashboard.js";
import { renderHabits } from "./modules/habits.js";
import { renderWorkouts } from "./modules/workouts.js";
import { renderHealth } from "./modules/health.js";
import { renderStudy } from "./modules/study.js";
import { renderFinance } from "./modules/finance.js";
import { renderCalendar } from "./modules/calendar.js";
import { renderSettings } from "./modules/settings.js";

const TABS = [
  { id: "home", label: "Hoy", icon: ICONS.home, render: (goTo) => renderDashboard(goTo) },
  { id: "habits", label: "Hábitos", icon: ICONS.habits, render: renderHabits },
  { id: "workouts", label: "Entreno", icon: ICONS.workout, render: renderWorkouts },
  { id: "health", label: "Salud", icon: ICONS.health, render: renderHealth },
  { id: "study", label: "Estudio", icon: ICONS.study, render: renderStudy },
  { id: "finance", label: "Finanzas", icon: ICONS.finance, render: renderFinance },
  { id: "calendar", label: "Calendario", icon: ICONS.calendar, render: renderCalendar },
  { id: "settings", label: "Ajustes", icon: ICONS.settings, render: renderSettings },
];

let activeTab = "home";

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return "Buenas noches";
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

function renderHeader() {
  const header = document.getElementById("app-header");
  const data = store.get();
  const streak = currentStreak();
  if (activeTab === "home") {
    mount(header,
      h("div", {}, [
        h("div", { class: "greeting-eyebrow" }, greeting()),
        h("h1", {}, data.settings.name ? `Hola, ${data.settings.name}` : "Tu vida, en un vistazo"),
        h("div", { class: "date-line" }, longDateLabel(new Date())),
      ]),
      streak > 0 ? h("div", { class: "streak-chip" }, [icon(ICONS.flame, 15), h("span", {}, `${streak}`)]) : null
    );
  } else {
    const tab = TABS.find((t) => t.id === activeTab);
    mount(header,
      h("div", {}, [
        h("div", { class: "greeting-eyebrow" }, "VIDA/OS"),
        h("h1", {}, tab.label),
      ])
    );
  }
}

function renderTabBar() {
  const bar = document.getElementById("tabbar");
  mount(bar, ...TABS.map((tab) => {
    const btn = h("button", {
      class: `tab-btn ${activeTab === tab.id ? "active" : ""}`,
      onclick: () => switchTab(tab.id),
    }, [icon(tab.icon), h("span", {}, tab.label)]);
    return btn;
  }));
}

function renderView() {
  const view = document.getElementById("view");
  const tab = TABS.find((t) => t.id === activeTab);
  mount(view, tab.render(switchTab));
  view.scrollTop = 0;
}

function switchTab(id) {
  activeTab = id;
  renderHeader();
  renderTabBar();
  renderView();
}

function fullRerender() {
  renderHeader();
  renderTabBar();
  renderView();
}

function icon(svg) {
  const span = document.createElement("span");
  span.innerHTML = svg;
  return span.firstChild;
}

window.addEventListener("vida:rerender", () => {
  renderHeader();
  renderTabBar();
  renderView();
});
window.addEventListener("vida:data-changed", () => {
  // el header (racha) puede cambiar aunque la vista activa no dependa de ello
  renderHeader();
});

function init() {
  store.get(); // asegura que existan datos por defecto
  fullRerender();

  // registra service worker para uso offline / instalación como PWA
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }
}

init();
