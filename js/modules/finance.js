import { store } from "../storage.js";
import { h, ICONS, openSheet, closeSheet, toast, emptyState, decimalInput, parseDecimal } from "../dom.js";
import { todayStr, fromKey, shortDateLabel } from "../dates.js";
import { groupedBarChart } from "../charts.js";

const SAVINGS_EMOJIS = ["🐷", "🎯", "✈️", "💻", "📱", "🚲", "👟", "🎮", "🏠", "🎸", "📷", "⌚️", "🎁", "🚗", "💍"];
const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

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

  // ---- Balance del mes ----
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

  // ---- Gráfica: evolución de los últimos 6 meses ----
  container.appendChild(h("div", { class: "section-label" }, "Evolución mensual"));
  container.appendChild(monthlyEvolutionCard(data));

  // ---- Huchas (ahorro) ----
  container.appendChild(
    h("div", { class: "section-label" }, [
      "Huchas",
      h("button", { class: "btn sm", onclick: () => openSavingsForm() }, "+ Nueva hucha"),
    ])
  );
  if (data.finance.savings.length === 0) {
    container.appendChild(emptyState("Crea una hucha para ese objetivo\nque tienes en mente — un viaje,\nun Garmin, lo que sea.", ICONS.finance));
  } else {
    data.finance.savings.forEach((jar) => container.appendChild(savingsCard(jar)));
  }

  // ---- Próximos gastos ----
  const pending = [...data.finance.upcoming].sort((a, b) => (a.dueDate || "9999") < (b.dueDate || "9999") ? -1 : 1);
  const totalPending = pending.reduce((s, u) => s + Number(u.amount || 0), 0);
  container.appendChild(
    h("div", { class: "section-label" }, [
      "Próximos gastos",
      h("button", { class: "btn sm", onclick: () => openUpcomingForm() }, "+ Añadir"),
    ])
  );
  if (pending.length === 0) {
    container.appendChild(emptyState("Apunta aquí lo que sabes que\nvas a gastar más adelante: un\ncumpleaños, algo que debes...", ICONS.calendar));
  } else {
    container.appendChild(
      h("div", { class: "card", style: "margin-bottom:10px; padding:12px 16px" }, [
        h("div", { class: "flex-between" }, [
          h("span", { class: "text-dim", style: "font-size:13px" }, "Total previsto"),
          h("span", { class: "mono", style: "font-size:16px; font-weight:700; color:var(--amber)" }, `${totalPending.toFixed(2)} €`),
        ]),
      ])
    );
    const card = h("div", { class: "card" });
    pending.forEach((u) => {
      const dateLabel = u.dueDate ? shortDateLabel(fromKey(u.dueDate)) : "Sin fecha";
      card.appendChild(
        h("div", { class: "row" }, [
          h("button", {
            class: "check-circle",
            onclick: () => markUpcomingAsPaid(u),
          }, icon(ICONS.check)),
          h("div", { class: "row-body", onclick: () => openUpcomingForm(u) }, [
            h("div", { class: "row-title" }, u.title),
            h("div", { class: "row-sub" }, u.note ? `${dateLabel} · ${u.note}` : dateLabel),
          ]),
          h("span", { class: "mono row-value", style: "color:var(--amber)" }, `${Number(u.amount).toFixed(2)}€`),
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
      card.appendChild(
        h("div", { class: "row", onclick: () => openTxForm(t) }, [
          h("div", { class: "row-icon" }, t.type === "income" ? "💰" : "💸"),
          h("div", { class: "row-body" }, [
            h("div", { class: "row-title" }, t.note || (t.type === "income" ? "Ingreso" : "Gasto")),
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

// ================= Huchas =================

function savingsCard(jar) {
  const hasTarget = jar.target && jar.target > 0;
  const pct = hasTarget ? Math.min(100, (jar.saved / jar.target) * 100) : 0;
  return h("div", { class: "card", style: "margin-bottom:10px" }, [
    h("div", { class: "card-row" }, [
      h("div", { style: "display:flex; gap:12px; align-items:center; flex:1; min-width:0", onclick: () => openSavingsForm(jar) }, [
        h("div", { class: "row-icon", style: "font-size:20px" }, jar.emoji),
        h("div", { style: "min-width:0" }, [
          h("div", { class: "row-title" }, jar.name),
          h("div", { class: "row-sub mono" }, hasTarget ? `${jar.saved.toFixed(0)}€ de ${jar.target.toFixed(0)}€` : `${jar.saved.toFixed(0)}€ ahorrados`),
        ]),
      ]),
      h("button", { class: "btn sm primary", onclick: () => openAddToSavings(jar) }, "+ Añadir"),
    ]),
    hasTarget ? h("div", { class: "progress-track", style: "margin-top:12px" }, [
      h("div", { class: `progress-fill ${pct >= 100 ? "good" : "warn"}`, style: `width:${pct}%` }),
    ]) : null,
  ]);
}

function openSavingsForm(jar) {
  const isEdit = !!jar;
  let emoji = jar?.emoji || SAVINGS_EMOJIS[0];
  const nameInput = h("input", { type: "text", placeholder: "Ej: Garmin nuevo", value: jar?.name || "" });
  const targetInput = decimalInput({ placeholder: "Ej: 350 (opcional)", value: jar?.target || "" });
  const savedInput = decimalInput({ placeholder: "0", value: jar?.saved ?? "0" });

  const emojiGrid = h("div", { class: "emoji-grid" },
    SAVINGS_EMOJIS.map((e) => h("button", {
      class: `emoji-opt ${e === emoji ? "active" : ""}`,
      onclick: (ev) => { emoji = e; emojiGrid.querySelectorAll(".emoji-opt").forEach((n) => n.classList.remove("active")); ev.currentTarget.classList.add("active"); },
    }, e))
  );

  const content = h("div", {}, [
    h("div", { class: "sheet-header" }, [h("h2", {}, isEdit ? "Editar hucha" : "Nueva hucha"), h("button", { class: "icon-btn", onclick: closeSheet }, icon(ICONS.close))]),
    h("div", { class: "field" }, [h("label", {}, "Nombre"), nameInput]),
    h("div", { class: "field" }, [h("label", {}, "Icono"), emojiGrid]),
    h("div", { class: "field-row" }, [
      h("div", { class: "field" }, [h("label", {}, "Objetivo (€, opcional)"), targetInput]),
      h("div", { class: "field" }, [h("label", {}, "Ahorrado ahora (€)"), savedInput]),
    ]),
    h("div", { style: "display:flex; gap:10px" }, [
      isEdit ? h("button", {
        class: "btn danger",
        onclick: () => {
          if (confirm(`¿Eliminar la hucha "${jar.name}"?`)) {
            const data = store.get();
            data.finance.savings = data.finance.savings.filter((j) => j.id !== jar.id);
            store.save(); closeSheet(); rerender(); toast("Hucha eliminada");
          }
        },
      }, icon(ICONS.trash)) : null,
      h("button", {
        class: "btn primary block",
        onclick: () => {
          const name = nameInput.value.trim();
          if (!name) { toast("Ponle un nombre"); return; }
          const target = targetInput.value ? parseDecimal(targetInput.value) : 0;
          const saved = savedInput.value ? parseDecimal(savedInput.value) : 0;
          const data = store.get();
          if (isEdit) {
            Object.assign(jar, { name, emoji, target: isNaN(target) ? 0 : target, saved: isNaN(saved) ? 0 : saved });
          } else {
            data.finance.savings.push({ id: store.uid(), name, emoji, target: isNaN(target) ? 0 : target, saved: isNaN(saved) ? 0 : saved, createdAt: todayStr() });
          }
          store.save(); closeSheet(); rerender(); toast(isEdit ? "Hucha actualizada" : "Hucha creada");
        },
      }, isEdit ? "Guardar cambios" : "Crear hucha"),
    ]),
  ]);
  openSheet(content);
}

function openAddToSavings(jar) {
  const amountInput = decimalInput({ placeholder: "Ej: 20", value: "" });
  const content = h("div", {}, [
    h("div", { class: "sheet-header" }, [h("h2", {}, `Añadir a "${jar.name}"`), h("button", { class: "icon-btn", onclick: closeSheet }, icon(ICONS.close))]),
    h("div", { class: "field" }, [h("label", {}, "Cantidad a añadir (€)"), amountInput]),
    h("p", { class: "text-faint", style: "font-size:12px; margin-bottom:14px" }, `Ahora mismo llevas ${jar.saved.toFixed(2)}€.`),
    h("button", {
      class: "btn primary block",
      onclick: () => {
        const add = parseDecimal(amountInput.value);
        if (!add || isNaN(add)) { toast("Indica una cantidad"); return; }
        jar.saved = (jar.saved || 0) + add;
        store.save(); closeSheet(); rerender(); toast(`+${add.toFixed(2)}€ añadidos a la hucha`);
      },
    }, "Añadir"),
  ]);
  openSheet(content);
}

// ================= Próximos gastos =================

function markUpcomingAsPaid(item) {
  if (!confirm(`¿Marcar "${item.title}" como pagado? Se añadirá como gasto de hoy.`)) return;
  const data = store.get();
  data.finance.transactions.push({
    id: store.uid(), type: "expense", amount: item.amount, date: todayStr(), note: item.title,
  });
  data.finance.upcoming = data.finance.upcoming.filter((u) => u.id !== item.id);
  store.save();
  rerender();
  toast("Marcado como pagado y añadido a movimientos");
}

function openUpcomingForm(item) {
  const isEdit = !!item;
  const titleInput = h("input", { type: "text", placeholder: "Ej: Cumpleaños de mi novia", value: item?.title || "" });
  const amountInput = decimalInput({ placeholder: "Ej: 40", value: item?.amount || "" });
  const dateInput = h("input", { type: "date", value: item?.dueDate || "" });
  const noteInput = h("input", { type: "text", placeholder: "Nota (opcional)", value: item?.note || "" });

  const content = h("div", {}, [
    h("div", { class: "sheet-header" }, [h("h2", {}, isEdit ? "Editar gasto futuro" : "Nuevo gasto futuro"), h("button", { class: "icon-btn", onclick: closeSheet }, icon(ICONS.close))]),
    h("div", { class: "field" }, [h("label", {}, "¿Qué es?"), titleInput]),
    h("div", { class: "field-row" }, [
      h("div", { class: "field" }, [h("label", {}, "Importe (€)"), amountInput]),
      h("div", { class: "field" }, [h("label", {}, "Fecha (opcional)"), dateInput]),
    ]),
    h("div", { class: "field" }, [h("label", {}, "Nota"), noteInput]),
    h("div", { style: "display:flex; gap:10px" }, [
      isEdit ? h("button", {
        class: "btn danger",
        onclick: () => {
          const data = store.get();
          data.finance.upcoming = data.finance.upcoming.filter((u) => u.id !== item.id);
          store.save(); closeSheet(); rerender(); toast("Eliminado");
        },
      }, icon(ICONS.trash)) : null,
      h("button", {
        class: "btn primary block",
        onclick: () => {
          const title = titleInput.value.trim();
          const amount = parseDecimal(amountInput.value);
          if (!title) { toast("Ponle un nombre"); return; }
          if (!amount || isNaN(amount) || amount <= 0) { toast("Indica un importe"); return; }
          const data = store.get();
          const payload = { title, amount, dueDate: dateInput.value || null, note: noteInput.value.trim() };
          if (isEdit) Object.assign(item, payload);
          else data.finance.upcoming.push({ id: store.uid(), createdAt: todayStr(), ...payload });
          store.save(); closeSheet(); rerender(); toast(isEdit ? "Actualizado" : "Añadido");
        },
      }, isEdit ? "Guardar cambios" : "Añadir"),
    ]),
  ]);
  openSheet(content);
}

// ================= Gráfica evolución mensual =================

function monthlyEvolutionCard(data) {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: MONTH_SHORT[d.getMonth()] });
  }
  const groups = months.map((m) => {
    const tx = data.finance.transactions.filter((t) => t.date.startsWith(m.key));
    const income = tx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
    const expense = tx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
    return { label: m.label, values: [income, expense] };
  });

  const hasAnyData = groups.some((g) => g.values[0] > 0 || g.values[1] > 0);
  if (!hasAnyData) {
    return h("div", { class: "card" }, [
      h("p", { class: "text-faint", style: "font-size:12.5px; text-align:center; padding:10px 0" }, "Aún no hay suficientes movimientos para dibujar la evolución."),
    ]);
  }

  const chart = groupedBarChart({ groups, colors: ["#38d68c", "#ff5d5d"], height: 150 });
  return h("div", { class: "card" }, [
    chart,
    h("div", { style: "display:flex; gap:14px; justify-content:center; margin-top:10px" }, [
      h("div", { style: "display:flex; align-items:center; gap:5px; font-size:11px; color:var(--text-dim)" }, [h("span", { style: "width:8px;height:8px;border-radius:3px;background:#38d68c" }), h("span", {}, "Ingresos")]),
      h("div", { style: "display:flex; align-items:center; gap:5px; font-size:11px; color:var(--text-dim)" }, [h("span", { style: "width:8px;height:8px;border-radius:3px;background:#ff5d5d" }), h("span", {}, "Gastos")]),
    ]),
  ]);
}

// ================= Movimientos =================

function openTxForm(tx) {
  const isEdit = !!tx;
  const data = store.get();
  let type = tx?.type || "expense";
  const amountInput = decimalInput({ placeholder: "0,00", value: tx?.amount || "" });
  const dateInput = h("input", { type: "date", value: tx?.date || todayStr(), max: todayStr() });
  const noteInput = h("input", { type: "text", placeholder: "Nota (opcional)", value: tx?.note || "" });

  const typeSeg = h("div", { class: "segment" }, [
    h("button", { class: type === "expense" ? "active" : "", onclick: (e) => { type = "expense"; setSeg(e); } }, "Gasto"),
    h("button", { class: type === "income" ? "active" : "", onclick: (e) => { type = "income"; setSeg(e); } }, "Ingreso"),
  ]);
  function setSeg(e) { typeSeg.querySelectorAll("button").forEach((b) => b.classList.remove("active")); e.currentTarget.classList.add("active"); }

  const content = h("div", {}, [
    h("div", { class: "sheet-header" }, [h("h2", {}, isEdit ? "Editar movimiento" : "Nuevo movimiento"), h("button", { class: "icon-btn", onclick: closeSheet }, icon(ICONS.close))]),
    h("div", { class: "field" }, [h("label", {}, "Tipo"), typeSeg]),
    h("div", { class: "field" }, [h("label", {}, "Importe (€)"), amountInput]),
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
          const amount = parseDecimal(amountInput.value);
          if (!amount || isNaN(amount) || amount <= 0) { toast("Indica un importe"); return; }
          const payload = { type, amount, date: dateInput.value, note: noteInput.value.trim() };
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
