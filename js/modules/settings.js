import { store } from "../storage.js";
import { h, ICONS, toast, decimalInput, parseDecimal, integerInput } from "../dom.js";

export function renderSettings() {
  const data = store.get();
  const container = h("div");
  container.appendChild(h("h1", { class: "screen-title" }, "Ajustes"));

  // ---- Objetivos ----
  container.appendChild(h("div", { class: "section-label" }, "Objetivos diarios"));
  const waterGoalInput = decimalInput({ value: ((data.settings.waterGoal || 2000) / 1000).toString(), style: "width:60px; text-align:center" });
  const glassInput = integerInput({ value: data.settings.glassSize || 250, style: "width:60px; text-align:center" });
  const sleepInput = decimalInput({ value: (data.settings.sleepGoal || 8).toString(), style: "width:60px; text-align:center" });
  container.appendChild(
    h("div", { class: "card" }, [
      h("div", { class: "row" }, [
        h("div", { class: "row-icon" }, "💧"),
        h("div", { class: "row-body" }, [h("div", { class: "row-title" }, "Objetivo de agua (litros)")]),
        waterGoalInput,
      ]),
      h("div", { class: "row" }, [
        h("div", { class: "row-icon" }, "🥤"),
        h("div", { class: "row-body" }, [h("div", { class: "row-title" }, "mL por vaso")]),
        glassInput,
      ]),
      h("div", { class: "row" }, [
        h("div", { class: "row-icon" }, "🌙"),
        h("div", { class: "row-body" }, [h("div", { class: "row-title" }, "Horas de sueño objetivo")]),
        sleepInput,
      ]),
      h("button", {
        class: "btn primary block", style: "margin-top:12px",
        onclick: () => {
          const liters = parseDecimal(waterGoalInput.value);
          const glass = parseInt(glassInput.value, 10);
          const sleep = parseDecimal(sleepInput.value);
          data.settings.waterGoal = liters && !isNaN(liters) ? Math.round(liters * 1000) : 2000;
          data.settings.glassSize = glass || 250;
          data.settings.sleepGoal = sleep && !isNaN(sleep) ? sleep : 8;
          store.save();
          toast("Objetivos guardados");
        },
      }, "Guardar objetivos"),
    ])
  );

  // ---- Backup ----
  container.appendChild(h("div", { class: "section-label" }, "Copia de seguridad"));
  container.appendChild(
    h("div", { class: "card" }, [
      h("p", { class: "text-dim", style: "font-size:13px; line-height:1.5; margin-bottom:14px" },
        "Tus datos viven solo en este iPhone. Exporta un backup de vez en cuando o antes de cambiar de dispositivo."),
      h("div", { style: "display:flex; gap:10px" }, [
        h("button", { class: "btn block", onclick: exportData }, [icon(ICONS.download, 16), " Exportar"]),
        h("button", { class: "btn block", onclick: () => document.getElementById("import-file-input").click() }, [icon(ICONS.upload, 16), " Importar"]),
      ]),
      h("input", { type: "file", id: "import-file-input", accept: "application/json", style: "display:none", onchange: importData }),
    ])
  );

  // ---- Datos ----
  container.appendChild(h("div", { class: "section-label" }, "Datos"));
  container.appendChild(
    h("div", { class: "card" }, [
      h("button", {
        class: "btn danger block",
        onclick: () => {
          if (confirm("¿Seguro que quieres borrar TODOS los datos de la app? Esta acción no se puede deshacer.")) {
            store.resetAll();
            toast("Datos borrados");
            rerender();
          }
        },
      }, "Borrar todos los datos"),
    ])
  );

  container.appendChild(
    h("p", { class: "text-faint", style: "font-size:11px; text-align:center; margin-top:24px" }, "VIDA/OS · hecho a medida · datos 100% locales")
  );

  return container;
}

function exportData() {
  const json = store.exportJSON();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `vidaos-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("Backup descargado");
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      store.importJSON(reader.result);
      toast("Datos importados");
      rerender();
    } catch (err) {
      toast("El archivo no es válido");
    }
  };
  reader.readAsText(file);
  e.target.value = "";
}

function icon(svg, size) {
  const span = document.createElement("span");
  span.innerHTML = svg;
  const el = span.firstChild;
  if (size) { el.style.width = size + "px"; el.style.height = size + "px"; }
  return el;
}

function rerender() {
  window.dispatchEvent(new CustomEvent("vida:rerender"));
}
