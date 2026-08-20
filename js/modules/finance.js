import { store } from "../storage.js";
import { h, ICONS, openSheet, closeSheet, toast, emptyState } from "../dom.js";
import { todayStr, fromKey, shortDateLabel } from "../dates.js";

const CAT_EMOJIS = ["🍔", "🚗", "🏠", "🎬", "🛒", "💊", "👕", "✈️", "📱", "🎓", "🐶", "🎁", "💰", "💼", "📈"];

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function renderFinance() {
  const data = store.get();
  const container = h("div");
  const thisMonth = monthKey();

  container.appendChild(
    h("div", { class: "flex-between" }, [
      h("h1", { class: "screen-title" }, "Finanzas"),
      h("button", { class: "icon-btn", onclick: () => openTxForm() }, icon(ICONS.plus)),
    ])
  );

  const txThisMonth = data.finance.transactions.filter((t) => t.date.startsWith(thisMonth));
  const income = txThisMonth.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = txThisMonth.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const balance = income - expense;

  container.appendChild(
    h("div", { class: "card" }, [
      h("div", { class: "stat-label" }, "Balance de este mes"),
      h("div", { class: "mono", style: `font-size:32px; font-weight:700; margin-top:6px; color:${balance >= 0 ? "var(--green)" : "var(--red)"}` }, `${balance >= 0 ? "+" : ""}${balance.toFixed(2)} €`),
      h("div", { class: "card-grid", style: "margin-top:14px" }, [
        h("div", {}, [h("div", { class: "text-faint", style: "font-size:11px; text-transform:uppercase" }, "Ingresos"), h("div", { class: "mono", style: "color:var(--green); font-size:16px" }, `+${income.toFixed(2)} €`)]),
        h("div", {}, [h("div", { class: "text-faint", style: "font-size:11px; text-transform:uppercase" }, "Gastos"), h("div", { class: "mono", style: "color:var(--red); font-size:16px" }, `−${expense.toFixed(2)} €`)]),
      ]),
    ])
  );

  // ---- Presupuestos por categoría ----
  const budgetCats = data.finance.categories.filter((c) => c.type === "expense" && c.budget > 0);
  if (budgetCats.length > 0) {
    container.appendChild(h("div", { class: "section-label" }, "Presupuestos del mes"));
    const card = h("div", { class: "card" });
    budgetCats.forEach((c) => {
      const spent = txThisMonth.filter((t) => t.categoryId === c.id && t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
      const pct = Math.min(100, (spent / c.budget) * 100);
      const over = spent > c.budget;
      card.appendChild(
        h("div", { style: "padding:10px 0" }, [
          h("div", { class: "flex-between", style: "margin-bottom:6px" }, [
            h("span", { style: "font-size:13.5px" }, `${c.emoji} ${c.name}`),
            h("span", { class: "mono", style: `font-size:12.5px; color:${over ? "var(--red)" : "var(--text-dim)"}` }, `${spent.toFixed(0)} / ${c.budget}€`),
          ]),
          h("div", { class: "progress-track" }, [
            h("div", { class: `progress-fill ${over ? "bad" : pct > 80 ? "warn" : "good"}`, style: `width:${pct}%` }),
          ]),
        ])
      );
    });
    container.appendChild(card);
  }

  // ---- Categorías (gestión) ----
  container.appendChild(
    h("div", { class: "section-label" }, [
      "Categorías",
      h("button", { class: "btn sm", onclick: () => openCategoryForm() }, "+ Añadir"),
    ])
  );
  if (data.finance.categories.length === 0) {
    container.appendChild(emptyState("Crea categorías para organizar\ntus gastos e ingresos.", ICONS.finance));
  } else {
    const card = h("div", { class: "card" });
    data.finance.categories.forEach((c) => {
      card.appendChild(
        h("div", { class: "row" }, [
          h("div", { class: "row-icon" }, c.emoji),
          h("div", { class: "row-body" }, [
            h("div", { class: "row-title" }, c.name),
            h("div", { class: "row-sub" }, c.type === "expense" ? (c.budget ? `Presupuesto: ${c.budget}€/mes` : "Sin presupuesto") : "Ingreso"),
          ]),
          h("button", { class: "icon-btn", onclick: () => { if (confirm(`¿Eliminar categoría "${c.name}"?`)) removeCategory(c.id); } }, icon(ICONS.trash)),
        ])
      );
    });
    container.appendChild(card);
  }

  // ---- Movimientos recientes ----
  const sorted = [...data.finance.transactions].sort((a, b) => (a.date < b.date ? 1 : -1));
  container.appendChild(h("div", { class: "section-label" }, "Movimientos"));
  if (sorted.length === 0) {
    container.appendChild(emptyState("Sin movimientos todavía."));
  } else {
    const card = h("div", { class: "card" });
    sorted.slice(0, 40).forEach((t) => {
      const cat = data.finance.categories.find((c) => c.id === t.categoryId);
      card.appendChild(
        h("div", { class: "row", onclick: () => openTxForm(t) }, [
          h("div", { class: "row-icon" }, cat?.emoji || "💸"),
          h("div", { class: "row-body" }, [
            h("div", { class: "row-title" }, t.note || cat?.name || (t.type === "income" ? "Ingreso" : "Gasto")),
            h("div", { class: "row-sub" }, shortDateLabel(fromKey(t.date))),
          ]),
          h("span", { class: "mono row-value", style: `color:${t.type === "income" ? "var(--green)" : "var(--red)"}` }, `${t.type === "income" ? "+" : "−"}${Number(t.amount).toFixed(2)}€`),
        ])
      );
    });
    container.appendChild(card);
  }

  return container;
}

function removeCategory(id) {
  const data = store.get();
  data.finance.categories = data.finance.categories.filter((c) => c.id !== id);
  store.save();
  rerender();
}

function openCategoryForm() {
  let emoji = CAT_EMOJIS[0];
  let type = "expense";
  const nameInput = h("input", { type: "text", placeholder: "Ej: Comida" });
  const budgetInput = h("input", { type: "number", inputmode: "numeric", placeholder: "300 (opcional)" });
  const emojiGrid = h("div", { class: "emoji-grid" },
    CAT_EMOJIS.map((e) => h("button", {
      class: `emoji-opt ${e === emoji ? "active" : ""}`,
      onclick: (ev) => { emoji = e; emojiGrid.querySelectorAll(".emoji-opt").forEach((n) => n.classList.remove("active")); ev.currentTarget.classList.add("active"); },
    }, e))
  );
  const typeSeg = h("div", { class: "segment" }, [
    h("button", { class: "active", onclick: (e) => { type = "expense"; setSeg(e); budgetField.style.display = ""; } }, "Gasto"),
    h("button", { onclick: (e) => { type = "income"; setSeg(e); budgetField.style.display = "none"; } }, "Ingreso"),
  ]);
  function setSeg(e) { typeSeg.querySelectorAll("button").forEach((b) => b.classList.remove("active")); e.currentTarget.classList.add("active"); }
  const budgetField = h("div", { class: "field" }, [h("label", {}, "Presupuesto mensual (€)"), budgetInput]);

  const content = h("div", {}, [
    h("div", { class: "sheet-header" }, [h("h2", {}, "Nueva categoría"), h("button", { class: "icon-btn", onclick: closeSheet }, icon(ICONS.close))]),
    h("div", { class: "field" }, [h("label", {}, "Tipo"), typeSeg]),
    h("div", { class: "field" }, [h("label", {}, "Nombre"), nameInput]),
    h("div", { class: "field" }, [h("label", {}, "Icono"), emojiGrid]),
    budgetField,
    h("button", {
      class: "btn primary block",
      onclick: () => {
        const name = nameInput.value.trim();
        if (!name) { toast("Ponle un nombre"); return; }
        const data = store.get();
        data.finance.categories.push({ id: store.uid(), name, emoji, type, budget: type === "expense" ? Number(budgetInput.value) || 0 : 0 });
        store.save(); closeSheet(); rerender(); toast("Categoría creada");
      },
    }, "Crear"),
  ]);
  openSheet(content);
}

function openTxForm(tx) {
  const isEdit = !!tx;
  const data = store.get();
  let type = tx?.type || "expense";
  const amountInput = h("input", { type: "number", inputmode: "decimal", placeholder: "0.00", step: "0.01", value: tx?.amount || "" });
  const dateInput = h("input", { type: "date", value: tx?.date || todayStr(), max: todayStr() });
  const noteInput = h("input", { type: "text", placeholder: "Nota (opcional)", value: tx?.note || "" });

  function catOptions() {
    return data.finance.categories.filter((c) => c.type === type).map((c) =>
      h("option", { value: c.id, selected: tx?.categoryId === c.id }, `${c.emoji} ${c.name}`)
    );
  }
  const catSelect = h("select", {}, catOptions());

  const typeSeg = h("div", { class: "segment" }, [
    h("button", { class: type === "expense" ? "active" : "", onclick: (e) => { type = "expense"; setSeg(e); refreshCats(); } }, "Gasto"),
    h("button", { class: type === "income" ? "active" : "", onclick: (e) => { type = "income"; setSeg(e); refreshCats(); } }, "Ingreso"),
  ]);
  function setSeg(e) { typeSeg.querySelectorAll("button").forEach((b) => b.classList.remove("active")); e.currentTarget.classList.add("active"); }
  function refreshCats() {
    catSelect.innerHTML = "";
    catOptions().forEach((o) => catSelect.appendChild(o));
  }

  const hasCategories = data.finance.categories.length > 0;

  const content = h("div", {}, [
    h("div", { class: "sheet-header" }, [h("h2", {}, isEdit ? "Editar movimiento" : "Nuevo movimiento"), h("button", { class: "icon-btn", onclick: closeSheet }, icon(ICONS.close))]),
    h("div", { class: "field" }, [h("label", {}, "Tipo"), typeSeg]),
    h("div", { class: "field" }, [h("label", {}, "Importe (€)"), amountInput]),
    hasCategories ? h("div", { class: "field" }, [h("label", {}, "Categoría"), catSelect]) : h("p", { class: "text-faint", style: "font-size:12px; margin-bottom:14px" }, "Crea antes una categoría para clasificar tus movimientos."),
    h("div", { class: "field" }, [h("label", {}, "Fecha"), dateInput]),
    h("div", { class: "field" }, [h("label", {}, "Nota"), noteInput]),
    h("div", { style: "display:flex; gap:10px" }, [
      isEdit ? h("button", {
        class: "btn danger",
        onclick: () => { data.finance.transactions = data.finance.transactions.filter((x) => x.id !== tx.id); store.save(); closeSheet(); rerender(); toast("Movimiento eliminado"); },
      }, icon(ICONS.trash)) : null,
      h("button", {
        class: "btn primary block",
        onclick: () => {
          const amount = Number(amountInput.value);
          if (!amount || amount <= 0) { toast("Indica un importe"); return; }
          const payload = { type, amount, date: dateInput.value, note: noteInput.value.trim(), categoryId: hasCategories ? catSelect.value : null };
          if (isEdit) Object.assign(tx, payload);
          else data.finance.transactions.push({ id: store.uid(), ...payload });
          store.save(); closeSheet(); rerender(); toast(isEdit ? "Movimiento actualizado" : "Movimiento guardado");
        },
      }, isEdit ? "Guardar cambios" : "Guardar"),
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
