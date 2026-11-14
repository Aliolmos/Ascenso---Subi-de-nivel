/* ---------- utilidades ---------- */
const $ = (s) => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 10);
const pad = (n) => String(n).padStart(2, "0");
const dk = (d = new Date()) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const fromKey = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const money = (n) => (n < 0 ? "-" : "") + "$" + Math.abs(Math.round(n)).toLocaleString("es-AR");
const fmt = (n) => Math.round(n).toLocaleString("es-AR");
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MESES_L = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const monday = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

/* ---------- estado y guardado ---------- */
const DEF = () => ({
  v: 1,
  ts: 0,
  name: "",
  xp: 0,
  budget: 0,
  habits: [
    { id: uid(), name: "Entrenar", icon: "💪" },
    { id: uid(), name: "Leer 10 páginas", icon: "📚" },
    { id: uid(), name: "Meditar 5 min", icon: "🧘" },
    { id: uid(), name: "Tomar 2L de agua", icon: "💧" },
  ],
  hlog: {},
  perfect: {},
  tx: [],
  sets: [],
  goals: [],
  tasks: [],
  notes: [],
  pomos: [],
  badges: {},
  cards: [
    { id: "mp", name: "Mercado Pago", color: "#00b1ea", due: 10 },
    { id: "nx", name: "Naranja X", color: "#ff6200", due: 10 },
  ],
  cc: [],
  ccpay: [],
});

let user = null,
  saving = false,
  again = false,
  tmr = null;
const KEY = () => "ascenso-v1" + (user ? "-" + user.uid : "");
const loadLocal = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY()));
  } catch (e) {
    return null;
  }
};
let S = { ...DEF(), ...(FB_ON ? {} : loadLocal() || {}) };
function save() {
  S.ts = Date.now();
  try {
    localStorage.setItem(KEY(), JSON.stringify(S));
  } catch (e) {}
  clearTimeout(tmr);
  tmr = setTimeout(flush, 900);
}
async function flush() {
  if (!user || !window.fbSave) return;
  if (saving) {
    again = true;
    return;
  }
  saving = true;
  try {
    await window.fbSave(JSON.parse(JSON.stringify(S)));
  } catch (e) {
    toast("No se pudo guardar en la nube. Reintentando…", "err");
    again = true;
    await new Promise((r) => setTimeout(r, 4000));
  }
  saving = false;
  if (again) {
    again = false;
    flush();
  }
}
function appLogin(u, data) {
  user = u;
  const local = loadLocal();
  const best = [data, local].filter(Boolean).sort((a, b) => (b.ts || 0) - (a.ts || 0))[0];
  S = { ...DEF(), ...(best || { name: (u.name || "").split(" ")[0] }) };
  if (!data || (local && (local.ts || 0) > (data.ts || 0))) flush();
  $("#auth").style.display = "none";
  view = "inicio";
  render();
}
function appLogout() {
  user = null;
  S = DEF();
  $("#auth").style.display = "grid";
  $("#authLoad").style.display = "none";
  $("#authBox").style.display = "block";
}

/* ---------- XP, niveles, rangos ---------- */
const PER = 500;
const RANKS = [
  [1, "Novato", "🌱"],
  [5, "Aprendiz", "⚡"],
  [10, "Constante", "🔥"],
  [20, "Disciplinado", "🛡️"],
  [35, "Imparable", "🚀"],
  [50, "Leyenda", "👑"],
];
const lvl = (x) => Math.floor(Math.max(0, x) / PER) + 1;
const rankOf = (l) => RANKS.filter((r) => l >= r[0]).pop();
const nextRank = (l) => RANKS.find((r) => r[0] > l);
function gain(n, why) {
  const b = lvl(S.xp);
  S.xp = Math.max(0, S.xp + n);
  if (n) toast((n > 0 ? "+" : "") + n + " XP · " + why, n > 0 ? "xp" : "");
  const a = lvl(S.xp);
  if (a > b) levelUp(a);
}
function levelUp(l) {
  const r = rankOf(l),
    newRank = RANKS.some((x) => x[0] === l);
  $("#modal").innerHTML =
    `<div class="modal" data-a="close"><div class="card lvup"><div class="e">${r[2]}</div>
  <p class="lbl" style="margin-top:10px">${newRank ? "Nuevo rango" : "Subiste de nivel"}</p>
  <h2 style="font-size:34px;margin:4px 0">${newRank ? r[1] : "Nivel " + l}</h2>
  <p class="mu">${newRank ? "Llegaste al nivel " + l + ". Pocos llegan hasta acá." : "Seguí así, cada día suma."}</p>
  <button class="btn" style="margin-top:18px" data-a="close">¡Vamos!</button></div></div>`;
  beep(880, 0.15);
  setTimeout(() => beep(1320, 0.2), 160);
}

/* ---------- hábitos ---------- */
const isDone = (k, id) => !!(S.hlog[k] && S.hlog[k][id]);
function streak(id) {
  let d = new Date();
  if (!isDone(dk(d), id)) d = addDays(d, -1);
  let n = 0;
  while (isDone(dk(d), id)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
const ratio = (k) => (S.habits.length ? S.habits.filter((h) => isDone(k, h.id)).length / S.habits.length : 0);
function gStreak() {
  let d = new Date();
  if (!ratio(dk(d))) d = addDays(d, -1);
  let n = 0;
  while (ratio(dk(d)) > 0) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
function bestStreak() {
  let best = 0;
  const t = new Date();
  S.habits.forEach((h) => {
    let run = 0;
    for (let i = 400; i >= 0; i--) {
      if (isDone(dk(addDays(t, -i)), h.id)) {
        run++;
        if (run > best) best = run;
      } else run = 0;
    }
  });
  return best;
}
function toggleHabit(id, k) {
  S.hlog[k] = S.hlog[k] || {};
  const on = !S.hlog[k][id];
  if (on) S.hlog[k][id] = 1;
  else delete S.hlog[k][id];
  gain(on ? 50 : -50, on ? "Hábito cumplido" : "Hábito desmarcado");
  if (on && ratio(k) === 1 && !S.perfect[k]) {
    S.perfect[k] = 1;
    gain(150, "¡Día perfecto! 💎");
  }
  if (on) beep(660, 0.08);
  commit();
}

/* ---------- finanzas ---------- */
const CATS = {
  Comida: ["🛒", /super|mercado|almac|verdu|carne|carnic|panad|chino|fiambr|dietet/],
  Restaurante: [
    "🍔",
    /resto|restaur|\bbar\b|caf[eé]|delivery|pedidos|rappi|pizza|birra|helad|comida|burger|sushi/,
  ],
  Transporte: ["🚗", /uber|nafta|colectivo|bondi|sube|taxi|cabify|didi|tren|peaje|estacion|auto|moto/],
  Servicios: ["💡", /\bluz\b|\bgas\b|agua|internet|celu|alquiler|expensa|factura|wifi|abono/],
  Tarjetas: ["💳", /tarjeta|resumen|naranja|visa|master/],
  Ocio: ["🎮", /cine|netflix|spotify|salida|juego|steam|disney|boliche|recital|entrada|youtube/],
  Salud: ["💊", /farmacia|m[eé]dic|gym|gimnasio|dentista|obra social|prepaga|remedio/],
  Compras: ["🛍️", /ropa|zapa|mercadolibre|meli|compr[eé]|shein|regalo|amazon/],
  Educación: ["📚", /curso|libro|facu|apunte|cuota|udemy|clase|fotocop/],
  Otros: ["📦", null],
};
const INC_RE =
  /cobr|sueldo|ingres|gan[eé]|me pagaron|recib|venta|vend[ií]|freelance|aguinaldo|cliente|transferencia de/i;
const catIcon = (c) => (c === "Ingreso" ? "💰" : (CATS[c] || CATS.Otros)[0]);
function parseTx(t, cat) {
  const m = t.replace(/\$/g, "").match(/\d[\d.,]*/);
  if (!m) return null;
  let s = m[0];
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/[.,](?=\d{3}(\D|$))/g, "").replace(",", ".");
  let amt = parseFloat(s);
  if (!amt) return null;
  if (/\b(k|lucas?|mil)\b/i.test(t.slice(m.index + m[0].length, m.index + m[0].length + 6))) amt *= 1000;
  const low = t.toLowerCase();
  let type = INC_RE.test(low) ? "in" : "out";
  let c = cat && cat !== "auto" ? cat : null;
  if (c === "Ingreso") type = "in";
  if (!c)
    c =
      type === "in"
        ? "Ingreso"
        : Object.keys(CATS).find((k) => CATS[k][1] && CATS[k][1].test(low)) || "Otros";
  let desc = t
    .replace(/\$?\s*\d[\d.,]*\s*(k|lucas?|mil)?/i, " ")
    .replace(/^\s*(gast[eé]|pagu[eé]|cobr[eé]|compr[eé]|me gast[eé]|puse)\s*/i, "")
    .replace(/^\s*((en|de|por|el|la|los|las|un|una)\s+)+/i, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!desc) desc = c;
  desc = desc[0].toUpperCase() + desc.slice(1);
  return { id: uid(), d: dk(), desc, amt, cat: c, type };
}
const monthTx = (ym) => S.tx.filter((t) => t.d.startsWith(ym));
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);

/* ---------- tarjetas de crédito ---------- */
const CC_COLORS = ["#8a7cff", "#4be3ac", "#ffc145", "#ff3d7f", "#3dc2ff"];
const ymNow = () => dk().slice(0, 7);
const ymAdd = (ym, n) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return d.getFullYear() + "-" + pad(d.getMonth() + 1);
};
const ymName = (ym) =>
  MESES_L[+ym.slice(5) - 1] + (ym.slice(0, 4) === ymNow().slice(0, 4) ? "" : " " + ym.slice(0, 4));
const cuotaEn = (p, ym) => {
  for (let k = 0; k < p.n; k++) if (ymAdd(p.m, k) === ym) return p.amt / p.n;
  return 0;
};
// cuántas cuotas de una compra ya vencieron (incluida la de este mes)
const cuotasVencidas = (p) => {
  let x = 0;
  for (let k = 0; k < p.n; k++) if (ymAdd(p.m, k) <= ymNow()) x++;
  return x;
};
function cardInfo(c) {
  const ym = ymNow(),
    ps = S.cc.filter((p) => p.card === c.id),
    pays = S.ccpay.filter((x) => x.card === c.id),
    pagado = sum(pays, (x) => x.amt),
    hasta = sum(ps, (p) => (p.amt / p.n) * cuotasVencidas(p)),
    total = Math.max(0, sum(ps, (p) => p.amt) - pagado),
    mes = Math.max(0, hasta - pagado),
    adelanto = Math.max(0, pagado - hasta),
    prox = Math.max(0, sum(ps, (p) => cuotaEn(p, ymAdd(ym, 1))) - adelanto),
    days = c.due - new Date().getDate();
  return { ps, pays, total, mes, prox, days, late: mes > 0 && days < 0 };
}
function cardAlert() {
  for (const c of S.cards) {
    const i = cardInfo(c);
    if (i.mes > 0 && i.days <= 3)
      return `Tu tarjeta ${esc(c.name)} ${i.late ? "está vencida" : i.days === 0 ? "vence hoy" : "vence en " + i.days + (i.days === 1 ? " día" : " días")}: ${money(i.mes)} 💳`;
  }
  return null;
}
function cardsHTML() {
  const ym = ymNow(),
    infos = S.cards.map((c) => [c, cardInfo(c)]),
    all = sum(infos, ([, i]) => i.total),
    mesAll = sum(infos, ([, i]) => i.mes);
  return `<div class="card" style="margin-top:16px">
  <h3 class="cch">Tarjetas de crédito <span class="row wrap" style="gap:6px"><span class="pill">Este mes ${money(mesAll)}</span><span class="pill a">Debés ${money(all)}</span></span></h3>
  <div class="grid g2">${infos
    .map(([c, i]) => {
      const activas = i.ps.filter(
        (p) => ymAdd(p.m, p.n - 1) > ym || (ymAdd(p.m, p.n - 1) === ym && i.mes > 0),
      );
      const last = i.pays[i.pays.length - 1];
      return `<div class="cc" style="--cc:${c.color}">
      <div class="row between"><div class="row" style="gap:8px"><span class="ccdot"></span><b>${esc(c.name)}</b></div>
      <div class="row" style="gap:4px"><label class="sm mu">vence el</label><input class="ccdue" data-id="${c.id}" type="number" min="1" max="31" value="${c.due}"><button class="x" data-a="delcard" data-id="${c.id}" title="Eliminar tarjeta">×</button></div></div>
      <div class="row between" style="margin-top:12px;align-items:flex-end">
        <div><div class="lbl">A pagar en ${ymName(ym)}</div><div class="big">${money(i.mes)}</div>
        <div class="sm ${i.late ? "bad" : i.mes && i.days <= 3 ? "acc" : "mu"}">${i.mes ? (i.late ? "Vencida desde el " + c.due : i.days === 0 ? "Vence hoy" : "Vence en " + i.days + (i.days === 1 ? " día" : " días")) : "✓ Al día"}</div></div>
        <div style="text-align:right"><div class="lbl">Deuda total</div><div class="num" style="font-size:18px">${money(i.total)}</div><div class="sm mu">En ${ymName(ymAdd(ym, 1))}: ${money(i.prox)}</div></div>
      </div>
      ${i.mes ? `<form class="row" data-f="ccpay" data-id="${c.id}" style="margin-top:12px"><input name="v" type="number" min="1" step="any" value="${Math.round(i.mes)}"><button class="btn sm">Registrar pago</button></form>` : ""}
      ${last ? `<div class="row between sm mu" style="margin-top:10px"><span>Último pago: ${money(last.amt)} el ${fromKey(last.d).getDate()} ${MESES[fromKey(last.d).getMonth()]}</span><button class="x" style="font-size:13px" data-a="delpay" data-id="${last.id}">deshacer</button></div>` : ""}
      ${
        activas.length
          ? `<div class="list" style="margin-top:12px">${activas
              .map((p) => {
                const v = cuotasVencidas(p);
                return `<div class="ccrow"><div style="flex:1;min-width:0"><b>${esc(p.desc)}</b><div class="sm mu">${p.n > 1 ? (v ? "Cuota " + Math.min(v, p.n) + " de " + p.n : p.n + " cuotas, arranca en " + ymName(p.m)) + " · termina en " + ymName(ymAdd(p.m, p.n - 1)) : v ? "Un pago" : "Un pago en " + ymName(p.m)}</div></div><b class="num">${money(p.amt / p.n)}${p.n > 1 ? '<span class="sm mu">/mes</span>' : ""}</b><button class="x" data-a="delcc" data-id="${p.id}">×</button></div>`;
              })
              .join("")}</div>`
          : `<p class="sm mu" style="margin-top:12px">Sin compras pendientes.</p>`
      }
    </div>`;
    })
    .join("")}</div>
  ${
    S.cards.length
      ? `<form class="row wrap" data-f="ccbuy" style="margin-top:16px">
    <select name="card" style="flex:1;min-width:140px">${S.cards.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select>
    <input name="desc" placeholder="Qué compraste" required style="flex:2;min-width:160px">
    <input name="amt" type="number" min="1" step="any" placeholder="Monto total $" required style="flex:1;min-width:120px">
    <select name="n" style="flex:0 0 120px">${[1, 2, 3, 6, 9, 12, 18, 24].map((n) => `<option value="${n}">${n === 1 ? "1 pago" : n + " cuotas"}</option>`).join("")}</select>
    <select name="w" style="flex:1;min-width:150px"><option value="0">1ª cuota: este mes</option><option value="1" selected>1ª cuota: ${ymName(ymAdd(ym, 1))}</option><option value="2">1ª cuota: ${ymName(ymAdd(ym, 2))}</option></select>
    <button class="btn">Cargar</button></form>
  <p class="sm mu" style="margin-top:10px">¿Ya venías pagando cuotas? Cargá solo lo que te falta: el monto restante, las cuotas que quedan y que la primera vence este mes.</p>`
      : ""
  }
  <details style="margin-top:12px"><summary class="sm mu">Agregar otra tarjeta</summary>
    <form class="row wrap" data-f="card" style="margin-top:10px"><input name="name" placeholder="Nombre (ej: Visa Galicia)" required style="flex:2;min-width:160px"><input name="due" type="number" min="1" max="31" placeholder="Día de vencimiento" required style="flex:1;min-width:140px"><button class="btn g">Agregar</button></form>
  </details>
</div>`;
}

/* ---------- entrenamiento ---------- */
const EXS = [
  "Press de banca",
  "Sentadilla",
  "Peso muerto",
  "Press militar",
  "Remo con barra",
  "Dominadas",
  "Fondos",
  "Curl de bíceps",
  "Tríceps en polea",
  "Prensa",
  "Hip thrust",
  "Zancadas",
  "Press inclinado",
  "Jalón al pecho",
  "Elevaciones laterales",
];
const vol = (a) => sum(a, (s) => s.kg * s.reps);
function weekVol(off) {
  const st = monday(addDays(new Date(), -7 * off)),
    en = addDays(st, 7);
  return vol(
    S.sets.filter((s) => {
      const d = fromKey(s.d);
      return d >= st && d < en;
    }),
  );
}

/* ---------- insignias ---------- */
const BADGES = [
  [
    "h1",
    "🌱",
    "Primer paso",
    "Completá tu primer hábito",
    () => Object.values(S.hlog).some((o) => Object.keys(o).length),
  ],
  ["pf", "💎", "Día perfecto", "Todos los hábitos en un día", () => Object.keys(S.perfect).length > 0],
  ["s7", "🔥", "Semana de fuego", "Racha de 7 días en un hábito", () => bestStreak() >= 7],
  ["s30", "🌋", "Mes imparable", "Racha de 30 días en un hábito", () => bestStreak() >= 30],
  ["w1", "🏋️", "A los fierros", "Registrá tu primer entreno", () => S.sets.length > 0],
  [
    "w10",
    "🦾",
    "Hierro constante",
    "Entrená 10 días distintos",
    () => new Set(S.sets.map((s) => s.d)).size >= 10,
  ],
  ["f1", "💸", "Ojo al peso", "Registrá tu primer movimiento", () => S.tx.length > 0],
  ["f30", "📊", "Control total", "30 movimientos registrados", () => S.tx.length >= 30],
  ["g1", "🎯", "Meta cumplida", "Completá una meta", () => S.goals.some((g) => g.done)],
  ["p10", "⏱️", "Modo foco", "10 sesiones de foco", () => S.pomos.length >= 10],
  ["t10", "✅", "Ejecutor", "10 tareas finalizadas", () => S.tasks.filter((t) => t.col === 2).length >= 10],
  ["n10", "🧠", "Segundo cerebro", "10 notas guardadas", () => S.notes.length >= 10],
  ["l10", "⚡", "Nivel 10", "Llegá al nivel 10", () => lvl(S.xp) >= 10],
  ["l50", "👑", "Leyenda", "Llegá al nivel 50", () => lvl(S.xp) >= 50],
];
function checkBadges() {
  BADGES.forEach((b) => {
    if (!S.badges[b[0]] && b[4]()) {
      S.badges[b[0]] = dk();
      setTimeout(() => {
        gain(200, "Insignia: " + b[2] + " " + b[1]);
        commit();
      }, 500);
    }
  });
}
function commit() {
  checkBadges();
  save();
  render();
}

/* ---------- toasts, sonido, modal ---------- */
function toast(t, c = "") {
  const el = document.createElement("div");
  el.className = "toast " + c;
  el.textContent = t;
  $("#toasts").appendChild(el);
  setTimeout(() => el.remove(), 2600);
}
let AC;
function beep(f = 880, d = 0.12) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(),
      g = AC.createGain();
    o.frequency.value = f;
    o.type = "sine";
    g.gain.setValueAtTime(0.18, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + d);
    o.connect(g).connect(AC.destination);
    o.start();
    o.stop(AC.currentTime + d);
  } catch (e) {}
}
let pendingConfirm = null;
function ask(text, fn, ok = "Eliminar") {
  pendingConfirm = fn;
  $("#modal").innerHTML =
    `<div class="modal" data-a="close"><div class="card"><h3 style="justify-content:center">${esc(text)}</h3><div class="row" style="justify-content:center;margin-top:16px"><button class="btn g" data-a="close">Cancelar</button><button class="btn" style="background:var(--bad);color:#fff" data-a="confirm">${ok}</button></div></div></div>`;
}

/* ---------- navegación ---------- */
const IC = {
  inicio: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  habitos: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M8.5 14l2.5 2.5 4.5-5"/>',
  finanzas: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M15.5 15h2"/>',
  entreno: '<path d="M6.5 7v10M17.5 7v10M3.5 10v4M20.5 10v4M6.5 12h11"/>',
  metas: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r=".8"/>',
  proyectos:
    '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
  foco: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2.5h6"/>',
  notas: '<path d="M6 3h9l4 4v14H6z"/><path d="M9.5 11h6M9.5 15h6M9.5 7h3"/>',
  logros:
    '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5.5a2.5 2.5 0 0 0 2.8 3.8M16 6h2.5a2.5 2.5 0 0 1-2.8 3.8M12 13v3.5M8.5 20.5h7l-1-4h-5z"/>',
  ajustes:
    '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  mas: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
};
const ic = (k) => '<svg class="i" viewBox="0 0 24 24">' + IC[k] + "</svg>";
const NAV = [
  ["inicio", "🏠", "Inicio"],
  ["habitos", "🗓️", "Hábitos"],
  ["finanzas", "💸", "Finanzas"],
  ["entreno", "💪", "Entreno"],
  ["metas", "🎯", "Metas"],
  ["proyectos", "🧩", "Proyectos"],
  ["foco", "⏱️", "Foco"],
  ["notas", "🧠", "Notas"],
  ["logros", "🏆", "Logros"],
  ["ajustes", "⚙️", "Ajustes"],
];
const MAIN = ["inicio", "habitos", "finanzas", "entreno"];
let view = (location.hash || "").slice(1);
if (!NAV.some((n) => n[0] === view)) view = "inicio";
window.addEventListener("hashchange", () => {
  const v = location.hash.slice(1);
  if (NAV.some((n) => n[0] === v) && v !== view) {
    view = v;
    render();
    scrollTo(0, 0);
  }
});
function go(v) {
  view = v;
  try {
    location.hash = v;
  } catch (e) {}
  $("#sheet").classList.remove("open");
  render();
  scrollTo(0, 0);
}

/* ---------- vistas ---------- */
let weekOff = 0,
  finCat = "auto",
  noteQ = "";
const V = {};

function levelCard() {
  const l = lvl(S.xp),
    r = rankOf(l),
    nr = nextRank(l),
    cur = S.xp % PER,
    C = 2 * Math.PI * 50;
  return `<div class="player"><div class="lv"><svg viewBox="0 0 118 118"><defs><linearGradient id="gx" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9a3d"/><stop offset="1" stop-color="#ff3d7f"/></linearGradient></defs><circle cx="59" cy="59" r="50" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="9"/><circle cx="59" cy="59" r="50" fill="none" stroke="url(#gx)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - cur / PER)}" style="transition:stroke-dashoffset .6s"/></svg><div class="n"><div><small>Nivel</small><b>${l}</b></div></div></div>
  <div class="pinfo"><span class="rank">${r[2]} ${r[1]}</span><h2>Te faltan ${fmt(PER - cur)} XP para el nivel ${l + 1}</h2>
  <p class="sm mu">${nr ? "Próximo rango: " + nr[2] + " " + nr[1] + ", en el nivel " + nr[0] : "Llegaste al rango máximo"} · ${fmt(S.xp)} XP en total</p></div></div>`;
}
function habitList(k = dk()) {
  if (!S.habits.length)
    return `<div class="empty">Todavía no tenés hábitos. <a href="#habitos">Creá el primero</a>.</div>`;
  return `<div class="quests">${S.habits
    .map((h) => {
      const on = isDone(k, h.id),
        st = streak(h.id);
      return `<button class="quest ${on ? "on" : ""}" data-a="hab" data-id="${h.id}" data-k="${k}"><span class="ck">${on ? "✓" : ""}</span><span class="em">${esc(h.icon)}</span><span class="nm">${esc(h.name)}</span><span class="st">${st ? "🔥 " + st + (st === 1 ? " día" : " días") : "+50 XP"}</span></button>`;
    })
    .join("")}</div>`;
}

V.inicio = () => {
  const k = dk(),
    now = new Date(),
    ym = k.slice(0, 7);
  const hd = S.habits.filter((h) => isDone(k, h.id)).length,
    ht = S.habits.length;
  const mt = monthTx(ym),
    out = sum(
      mt.filter((t) => t.type === "out"),
      (t) => t.amt,
    );
  const trained = S.sets.some((s) => s.d === k);
  const mis = [
    ["Completar todos tus hábitos", ht > 0 && hd === ht],
    ["Registrar un movimiento de plata", S.tx.some((t) => t.d === k)],
    ["Hacer una sesión de foco", S.pomos.some((p) => p.d === k)],
    ["Registrar un entreno", trained],
    ["Anotar una idea", S.notes.some((n) => n.d === k)],
  ];
  const md = mis.filter((m) => m[1]).length;
  let nudge = cardAlert();
  if (nudge);
  else if (ht && hd === ht) nudge = "Día perfecto. Así se construye una racha 💎";
  else if (now.getHours() >= 19 && !trained && hd < ht)
    nudge = "Hoy no terminaste tus hábitos y todavía no entrenaste. ¿Qué pasó? 👀";
  else if (ht)
    nudge = `Te ${ht - hd === 1 ? "queda 1 hábito" : "quedan " + (ht - hd) + " hábitos"} para el día perfecto (+150 XP).`;
  else nudge = "Arrancá creando tus primeros hábitos.";
  const days = [...Array(7)].map((_, i) => addDays(now, i - 6));
  return `<div class="top"><div><p>${DIAS[now.getDay()]} ${now.getDate()} de ${MESES_L[now.getMonth()]}</p><h1>Hola${S.name ? ", " + esc(S.name) : ""} 👋</h1></div>
  </div>
  <div class="grid" style="grid-template-columns:1.5fr 1fr;align-items:stretch" id="homeTop">
    ${levelCard()}
    <div class="card nudge"><div class="lbl">Cómo vas hoy</div><p class="say">${nudge}</p>
    <div class="row" style="gap:6px;margin-top:14px">${days
      .map((d) => {
        const r = ratio(dk(d));
        return `<div style="flex:1;text-align:center"><div style="height:40px;border-radius:10px;background:var(--s2)" class="${r === 0 ? "" : r < 0.5 ? "l1" : r < 0.75 ? "l2" : r < 1 ? "l3" : "l4"}" title="${dk(d)}"></div><small class="mu" style="font-size:11px">${DIAS[d.getDay()][0]}</small></div>`;
      })
      .join("")}</div></div>
  </div>
  <div class="grid g2" style="margin-top:16px;align-items:start">
    <div class="card"><h3>Hábitos de hoy <span class="pill">${hd} de ${ht}</span></h3>${habitList(k)}</div>
    <div class="card"><h3>Misiones diarias <span class="pill">${md}/5</span></h3>
      ${mis.map((m) => `<div class="mis ${m[1] ? "on" : ""}"><span class="ck">${m[1] ? "✓" : ""}</span><span>${m[0]}</span></div>`).join("")}
      <div class="bar v" style="margin-top:10px"><b style="width:${(md / 5) * 100}%"></b></div>
    </div>
  </div>
  <div class="grid g4" style="margin-top:16px">
    <div class="card"><div class="lbl">Hábitos hoy</div><div class="big">${hd}<span class="mu" style="font-size:18px">/${ht}</span></div><div class="bar" style="margin-top:10px"><b style="width:${ht ? (hd / ht) * 100 : 0}%"></b></div></div>
    <div class="card"><div class="lbl">Racha</div><div class="big">🔥 ${gStreak()}</div><div class="sm mu">días seguidos</div></div>
    <div class="card"><div class="lbl">Gastos del mes</div><div class="big">${money(out)}</div><div class="sm mu">${S.budget ? Math.round((out / S.budget) * 100) + "% del presupuesto" : "en " + MESES_L[now.getMonth()]}</div></div>
    <div class="card"><div class="lbl">Volumen semanal</div><div class="big">${fmt(weekVol(0))}<span class="mu" style="font-size:16px"> kg</span></div><div class="sm mu">${S.sets.filter((s) => fromKey(s.d) >= monday(now)).length} series</div></div>
  </div>
</div>`;
};

V.habitos = () => {
  const st = addDays(monday(new Date()), weekOff * 7),
    k = dk(),
    today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = [...Array(7)].map((_, i) => addDays(st, i));
  const hd = S.habits.filter((h) => isDone(k, h.id)).length,
    ht = S.habits.length;
  let tot = 0;
  for (let i = 0; i < 30; i++) tot += ratio(dk(addDays(new Date(), -i)));
  const heat = [...Array(84)]
    .map((_, i) => {
      const d = addDays(monday(new Date()), i - 77),
        r = d > today ? -1 : ratio(dk(d));
      return `<i class="${r <= 0 ? "" : r < 0.5 ? "l1" : r < 0.75 ? "l2" : r < 1 ? "l3" : "l4"}" title="${dk(d)}" style="${r < 0 ? "opacity:.25" : ""}"></i>`;
    })
    .join("");
  return `<div class="top"><div><p>Construí hábitos que realmente duren</p><h1>Hábitos</h1></div></div>
  <div class="grid g4">
    <div class="card"><div class="lbl">Progreso de hoy</div><div class="big">${ht ? Math.round((hd / ht) * 100) : 0}%</div><div class="sm mu">${hd} de ${ht} listos</div></div>
    <div class="card"><div class="lbl">Mejor racha</div><div class="big">${bestStreak()} 🔥</div><div class="sm mu">días seguidos</div></div>
    <div class="card"><div class="lbl">Tasa 30 días</div><div class="big">${Math.round((tot / 30) * 100)}%</div><div class="sm mu">de cumplimiento</div></div>
    <div class="card"><div class="lbl">Días perfectos</div><div class="big">${Object.keys(S.perfect).length} 💎</div><div class="sm mu">todos los hábitos</div></div>
  </div>
  <div class="card" style="margin-top:16px">
    <h3>Semana del ${st.getDate()} ${MESES[st.getMonth()]}<span class="row" style="gap:6px"><button class="btn g sm" data-a="wk" data-d="-1">‹</button><button class="btn g sm" data-a="wk" data-d="0">Hoy</button><button class="btn g sm" data-a="wk" data-d="1">›</button></span></h3>
    ${
      S.habits.length
        ? `<div class="wk"><div></div>${days.map((d) => `<div class="h ${dk(d) === k ? "td" : ""}">${DIAS[d.getDay()]}<b>${d.getDate()}</b></div>`).join("")}
    ${S.habits
      .map(
        (h) =>
          `<div class="row" style="gap:8px;min-width:0"><span>${esc(h.icon)}</span><span class="sm" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(h.name)}</span></div>${days
            .map((d) => {
              const kk = dk(d),
                on = isDone(kk, h.id);
              return `<button class="cell ${on ? "on" : ""}" data-a="hab" data-id="${h.id}" data-k="${kk}" ${d > today ? "disabled" : ""}>${on ? "✓" : ""}</button>`;
            })
            .join("")}`,
      )
      .join("")}</div>`
        : '<div class="empty">Sumá tu primer hábito abajo.</div>'
    }
  </div>
  <div class="grid g2" style="margin-top:16px;align-items:start">
    <div class="card"><h3>Últimos 84 días</h3><div class="heat">${heat}</div>
      <div class="row sm mu" style="margin-top:10px;gap:6px;justify-content:flex-end">menos <i style="width:12px;height:12px;border-radius:3px;background:var(--s2)"></i><i class="l1" style="width:12px;height:12px;border-radius:3px"></i><i class="l2" style="width:12px;height:12px;border-radius:3px"></i><i class="l3" style="width:12px;height:12px;border-radius:3px"></i><i class="l4" style="width:12px;height:12px;border-radius:3px"></i> más</div></div>
    <div class="card"><h3>Tus hábitos</h3>
      <form class="row" data-f="habit" style="margin-bottom:12px"><input name="icon" placeholder="⭐" maxlength="4" style="flex:0 0 58px;text-align:center"><input name="name" placeholder="Nuevo hábito (ej: Ducha fría)" required><button class="btn">Sumar</button></form>
      <div class="list">${S.habits.map((h) => `<div class="hab" style="cursor:default"><span class="em">${esc(h.icon)}</span><span style="flex:1">${esc(h.name)}</span><span class="pill">🔥 ${streak(h.id)}</span><button class="x" data-a="delhab" data-id="${h.id}" title="Eliminar">×</button></div>`).join("")}</div>
    </div>
  </div>`;
};

V.finanzas = () => {
  const now = new Date(),
    ym = dk().slice(0, 7),
    mt = monthTx(ym);
  const inc = sum(
      mt.filter((t) => t.type === "in"),
      (t) => t.amt,
    ),
    out = sum(
      mt.filter((t) => t.type === "out"),
      (t) => t.amt,
    );
  const bal = sum(S.tx, (t) => (t.type === "in" ? t.amt : -t.amt));
  const pm = new Date(now.getFullYear(), now.getMonth() - 1, 1),
    pym = pm.getFullYear() + "-" + pad(pm.getMonth() + 1);
  const pout = sum(
    monthTx(pym).filter((t) => t.type === "out"),
    (t) => t.amt,
  );
  const months = [...Array(6)].map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1),
      y = d.getFullYear() + "-" + pad(d.getMonth() + 1),
      m = monthTx(y);
    return {
      l: MESES[d.getMonth()],
      i: sum(
        m.filter((t) => t.type === "in"),
        (t) => t.amt,
      ),
      o: sum(
        m.filter((t) => t.type === "out"),
        (t) => t.amt,
      ),
    };
  });
  const mx = Math.max(1, ...months.map((m) => Math.max(m.i, m.o)));
  const cats = {};
  mt.filter((t) => t.type === "out").forEach((t) => (cats[t.cat] = (cats[t.cat] || 0) + t.amt));
  const cl = Object.entries(cats).sort((a, b) => b[1] - a[1]);
  const recent = [...S.tx].sort((a, b) => b.d.localeCompare(a.d) || 0).slice(0, 25);
  return `<div class="top"><div><p>Control financiero a la velocidad del pensamiento</p><h1>Finanzas</h1></div></div>
  <div class="card"><form class="row wrap" data-f="tx"><input name="t" placeholder='Escribí "gasté 8500 en el super" o "cobré 450000 de sueldo"' required style="flex:3;min-width:220px">
  <select name="cat" style="flex:1;min-width:140px"><option value="auto">Categoría automática</option><option>Ingreso</option>${Object.keys(
    CATS,
  )
    .map((c) => `<option ${finCat === c ? "selected" : ""}>${c}</option>`)
    .join("")}</select>
  <button class="btn">Registrar · +10 XP</button></form></div>
  <div class="grid g4" style="margin-top:16px">
    <div class="card"><div class="lbl">Saldo total</div><div class="big ${bal < 0 ? "bad" : ""}">${money(bal)}</div><div class="sm mu">todo lo registrado</div></div>
    <div class="card"><div class="lbl">Ingresos del mes</div><div class="big ok">${money(inc)}</div><div class="sm mu">${MESES_L[now.getMonth()]}</div></div>
    <div class="card"><div class="lbl">Gastos del mes</div><div class="big">${money(out)}</div><div class="sm ${pout && out > pout ? "bad" : "mu"}">${pout ? (out > pout ? "+" : "") + Math.round(((out - pout) / pout) * 100) + "% vs mes anterior" : "sin datos del mes anterior"}</div></div>
    <div class="card"><div class="lbl">Presupuesto</div>${S.budget ? `<div class="big">${Math.round((out / S.budget) * 100)}%</div><div class="bar ${out > S.budget ? "" : ""}" style="margin-top:8px"><b style="width:${Math.min(100, (out / S.budget) * 100)}%;${out > S.budget ? "background:var(--bad)" : ""}"></b></div><div class="sm mu" style="margin-top:6px">de ${money(S.budget)}</div>` : `<p class="sm mu" style="margin-top:8px">Definí un tope mensual en <a href="#ajustes" style="color:var(--ac)">Ajustes</a>.</p>`}</div>
  </div>
  ${cardsHTML()}
  <div class="grid g2" style="margin-top:16px;align-items:start">
    <div class="card"><h3>Últimos 6 meses <span class="row sm mu" style="gap:10px;font-weight:400"><span><i style="display:inline-block;width:9px;height:9px;border-radius:3px;background:var(--ok)"></i> Ingresos</span><span><i style="display:inline-block;width:9px;height:9px;border-radius:3px;background:var(--ac2)"></i> Gastos</span></span></h3>
      <div class="chart">${months.map((m) => `<div class="c"><div class="bs"><i style="height:${(m.i / mx) * 100}%" title="${money(m.i)}"></i><i class="o" style="height:${(m.o / mx) * 100}%" title="${money(m.o)}"></i></div><small>${m.l}</small></div>`).join("")}</div></div>
    <div class="card"><h3>Gastos por categoría</h3>${cl.length ? cl.map(([c, v]) => `<div style="margin-bottom:12px"><div class="row between sm"><span>${catIcon(c)} ${c}</span><span class="mu">${money(v)} · ${Math.round((v / out) * 100)}%</span></div><div class="bar v" style="margin-top:6px"><b style="width:${(v / out) * 100}%"></b></div></div>`).join("") : '<div class="empty">Todavía no hay gastos este mes.</div>'}</div>
  </div>
  <div class="card" style="margin-top:16px"><h3>Movimientos recientes</h3>${recent.length ? recent.map((t) => `<div class="tx"><div class="ic">${catIcon(t.cat)}</div><div class="t"><b>${esc(t.desc)}</b><span class="sm mu">${t.cat} · ${fromKey(t.d).getDate()} ${MESES[fromKey(t.d).getMonth()]}</span></div><b class="num ${t.type === "in" ? "ok" : ""}">${t.type === "in" ? "+" : "-"}${money(t.amt)}</b><button class="x" data-a="deltx" data-id="${t.id}">×</button></div>`).join("") : '<div class="empty">Registrá tu primer movimiento arriba. Escribilo como te salga: "uber 3500", "pagué la luz 18000".</div>'}</div>`;
};

let rest = { left: 0, int: null };
V.entreno = () => {
  const k = dk(),
    today = S.sets.filter((s) => s.d === k);
  const w0 = weekVol(0),
    w1 = weekVol(1);
  const weeks = [...Array(6)].map((_, i) => ({ o: 5 - i, v: weekVol(5 - i) }));
  const mx = Math.max(1, ...weeks.map((w) => w.v));
  const exs = [...new Set([...S.sets.map((s) => s.ex), ...EXS])];
  const best = {};
  S.sets.forEach((s) => {
    const rm = s.kg * (1 + s.reps / 30);
    if (!best[s.ex] || rm > best[s.ex].rm) best[s.ex] = { ...s, rm };
  });
  const prs = Object.values(best)
    .sort((a, b) => b.d.localeCompare(a.d))
    .slice(0, 8);
  const g = {};
  today.forEach((s) => (g[s.ex] = g[s.ex] || []).push(s));
  const last = S.sets[S.sets.length - 1];
  return `<div class="top"><div><p>Tu evolución física, calculada en tiempo real</p><h1>Entreno</h1></div></div>
  <div class="card"><form class="row wrap" data-f="set">
    <input name="ex" list="exl" placeholder="Ejercicio" required style="flex:2;min-width:180px" value="${last ? esc(last.ex) : ""}"><datalist id="exl">${exs.map((e) => `<option value="${esc(e)}">`).join("")}</datalist>
    <input name="kg" type="number" step="0.5" min="0" placeholder="Kg" required style="flex:1;min-width:80px" value="${last ? last.kg : ""}">
    <input name="reps" type="number" min="1" placeholder="Reps" required style="flex:1;min-width:80px" value="${last ? last.reps : ""}">
    <input name="n" type="number" min="1" max="10" placeholder="Series" value="1" style="flex:1;min-width:80px">
    <button class="btn">Registrar</button></form>
    <p class="sm mu" style="margin-top:10px">Primer registro del día: +120 XP · cada serie extra: +10 XP</p></div>
  <div class="grid g3" style="margin-top:16px">
    <div class="card"><div class="lbl">Volumen semanal</div><div class="big">${fmt(w0)} <span class="mu" style="font-size:16px">kg</span></div><div class="sm ${w1 && w0 >= w1 ? "ok" : "mu"}">${w1 ? (w0 >= w1 ? "+" : "") + Math.round(((w0 - w1) / w1) * 100) + "% vs semana pasada" : "primera semana registrada"}</div></div>
    <div class="card"><div class="lbl">Días entrenados</div><div class="big">${new Set(S.sets.map((s) => s.d)).size}</div><div class="sm mu">en total · ${S.sets.length} series</div></div>
    <div class="card"><div class="lbl">Descanso</div><div class="row between"><div class="big" id="restT">${rest.left ? Math.floor(rest.left / 60) + ":" + pad(rest.left % 60) : "0:00"}</div>
      <div class="row" style="gap:4px">${[60, 90, 120, 180].map((s) => `<button class="btn g sm" data-a="rest" data-s="${s}">${s < 120 ? s + "s" : s / 60 + "m"}</button>`).join("")}</div></div></div>
  </div>
  <div class="grid g2" style="margin-top:16px;align-items:start">
    <div class="card"><h3>Hoy</h3>${
      today.length
        ? Object.entries(g)
            .map(
              ([ex, ss]) =>
                `<div style="margin-bottom:12px"><div class="row between"><b>${esc(ex)}</b><span class="sm mu">${fmt(vol(ss))} kg</span></div><div class="row wrap" style="gap:6px;margin-top:6px">${ss.map((s) => `<span class="pill">${s.kg} kg × ${s.reps}<button class="x" style="font-size:14px;padding:0 2px" data-a="delset" data-id="${s.id}">×</button></span>`).join("")}</div></div>`,
            )
            .join("")
        : '<div class="empty">Todavía no registraste nada hoy. 💪</div>'
    }</div>
    <div class="card"><h3>Volumen por semana</h3><div class="chart">${weeks.map((w) => `<div class="c"><div class="bs"><i class="${w.o === 0 ? "e" : "p"}" style="height:${(w.v / mx) * 100}%" title="${fmt(w.v)} kg"></i></div><small>${w.o === 0 ? "Esta" : w.o === 1 ? "Pasada" : "Hace " + w.o}</small></div>`).join("")}</div></div>
  </div>
  <div class="card" style="margin-top:16px"><h3>Récords personales <span class="sm mu" style="font-weight:400">1RM estimado</span></h3>${prs.length ? `<div class="grid g4">${prs.map((p) => `<div style="background:var(--s2);border-radius:12px;padding:12px"><div class="sm mu">${esc(p.ex)}</div><div class="num" style="font-size:22px;font-weight:700">${Math.round(p.rm)} kg</div><div class="sm mu">${p.kg} kg × ${p.reps}</div></div>`).join("")}</div>` : '<div class="empty">Tus récords aparecen acá cuando registres series.</div>'}</div>`;
};

V.metas = () => `<div class="top"><div><p>Tus sueños, bajo control matemático</p><h1>Metas</h1></div></div>
  <div class="card"><form class="row wrap" data-f="goal"><input name="icon" placeholder="🎯" maxlength="4" style="flex:0 0 58px;text-align:center"><input name="name" placeholder="Meta (ej: Viaje a Bariloche)" required style="flex:3;min-width:180px"><input name="target" type="number" min="1" placeholder="Objetivo $" required style="flex:1;min-width:120px"><button class="btn">Crear meta</button></form><p class="sm mu" style="margin-top:10px">Completar una meta: +1000 XP</p></div>
  <div class="grid g3" style="margin-top:16px">${
    S.goals.length
      ? S.goals
          .map((g) => {
            const p = Math.min(100, (g.saved / g.target) * 100);
            return `<div class="card" style="${g.done ? "border-color:rgba(198,244,50,.4)" : ""}"><div class="row between"><span style="font-size:30px">${esc(g.icon)}</span><button class="x" data-a="delgoal" data-id="${g.id}">×</button></div>
  <h3 style="margin:8px 0 2px">${esc(g.name)}</h3><div class="sm mu">Objetivo: ${money(g.target)}</div>
  <div class="row between" style="margin-top:14px"><span class="lbl">Progreso</span><b class="num acc">${Math.round(p)}%</b></div><div class="bar" style="margin-top:6px"><b style="width:${p}%"></b></div>
  <p class="sm" style="margin-top:8px">${g.done ? "✅ ¡Meta cumplida!" : "Faltan <b>" + money(g.target - g.saved) + "</b>"}</p>
  ${g.done ? "" : `<form class="row" data-f="addgoal" data-id="${g.id}" style="margin-top:12px"><input name="v" type="number" placeholder="Sumar $" required><button class="btn sm">+</button></form>`}</div>`;
          })
          .join("")
      : '<div class="card empty" style="grid-column:1/-1">Creá tu primera meta: un viaje, un ahorro, algo que quieras comprar.</div>'
  }</div>`;

V.proyectos = () => {
  const cols = ["Pendiente", "En progreso", "Hecho"];
  return `<div class="top"><div><p>Dividí lo grande en pasos accionables</p><h1>Proyectos</h1></div></div>
  <div class="card"><form class="row wrap" data-f="task"><input name="t" placeholder="Nueva tarea" required style="flex:3;min-width:200px"><input name="tag" placeholder="Etiqueta (ej: Facu)" style="flex:1;min-width:120px"><button class="btn">Agregar</button></form><p class="sm mu" style="margin-top:10px">Cada tarea terminada: +30 XP</p></div>
  <div class="kan" style="margin-top:16px">${cols
    .map((c, i) => {
      const ts = S.tasks.filter((t) => t.col === i);
      return `<div class="col"><div class="row between"><span class="lbl">${c}</span><span class="pill">${ts.length}</span></div>
  ${
    ts
      .map(
        (
          t,
        ) => `<div class="task">${t.tag ? `<div class="tag">${esc(t.tag)}</div>` : ""}<div style="margin:4px 0 8px;${i === 2 ? "color:var(--mu);text-decoration:line-through" : ""}">${esc(t.t)}</div>
  <div class="row between"><span class="row" style="gap:4px">${i > 0 ? `<button class="btn g sm" data-a="mv" data-id="${t.id}" data-d="-1">←</button>` : ""}${i < 2 ? `<button class="btn g sm" data-a="mv" data-id="${t.id}" data-d="1">${i === 1 ? "✓ Terminar" : "→"}</button>` : ""}</span><button class="x" data-a="deltask" data-id="${t.id}">×</button></div></div>`,
      )
      .join("") || '<div class="empty">—</div>'
  }</div>`;
    })
    .join("")}</div>`;
};

let F = { len: 25 * 60, left: 25 * 60, run: false, int: null, focus: true };
V.foco = () => {
  const k = dk(),
    tm = sum(
      S.pomos.filter((p) => p.d === k),
      (p) => p.min,
    ),
    C = 2 * Math.PI * 104;
  return `<div class="top"><div><p>Concentración sin distracciones</p><h1>Foco</h1></div></div>
  <div class="grid" style="grid-template-columns:1.3fr 1fr;align-items:start" id="focoG">
  <div class="card" style="text-align:center;padding:26px">
    <div class="seg">${[
      [25, "Foco 25", 1],
      [50, "Foco 50", 1],
      [5, "Descanso 5", 0],
      [15, "Descanso 15", 0],
    ]
      .map(
        (p) =>
          `<button class="${F.len === p[0] * 60 ? "on" : ""}" data-a="preset" data-m="${p[0]}" data-f="${p[2]}">${p[1]}</button>`,
      )
      .join("")}</div>
    <div class="ring"><svg width="250" height="250" viewBox="0 0 240 240"><defs><linearGradient id="gf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9a3d"/><stop offset="1" stop-color="#ff3d7f"/></linearGradient></defs><circle cx="120" cy="120" r="104" fill="none" stroke="#2a2560" stroke-width="12"/><circle id="arc" cx="120" cy="120" r="104" fill="none" stroke="${F.focus ? "url(#gf)" : "#8a7cff"}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - F.left / F.len)}" style="transition:stroke-dashoffset .9s linear"/></svg>
    <div class="in"><div><div class="tm" id="ftm">${Math.floor(F.left / 60)}:${pad(F.left % 60)}</div><div class="mu sm" style="margin-top:4px">${F.focus ? "Enfoque profundo" : "Descanso"}</div></div></div></div>
    <div class="row" style="justify-content:center"><button class="btn" data-a="fplay" id="fbtn" style="min-width:130px">${F.run ? "Pausar" : "Empezar"}</button><button class="btn g" data-a="freset">Reiniciar</button></div>
    <p class="sm mu" style="margin-top:14px">Sesión de 25 min: +40 XP · sesión de 50 min: +80 XP</p></div>
  <div class="grid">
    <div class="card"><div class="lbl">Foco hoy</div><div class="big">${tm} <span class="mu" style="font-size:16px">min</span></div></div>
    <div class="card"><div class="lbl">Sesiones totales</div><div class="big">${S.pomos.length}</div><div class="sm mu">${fmt(sum(S.pomos, (p) => p.min) / 60)} horas de foco</div></div>
    <div class="card"><h3>Consejos</h3><p class="sm mu">Celular boca abajo, una sola pestaña abierta y una tarea concreta antes de arrancar. Al terminar, levantate y estirá.</p></div>
  </div></div>`;
};
function ftick() {
  if (F.left > 0) {
    F.left--;
  }
  if (F.left <= 0) {
    clearInterval(F.int);
    F.run = false;
    beep(988, 0.25);
    setTimeout(() => beep(1318, 0.35), 280);
    if (F.focus) {
      const m = F.len / 60;
      S.pomos.push({ d: dk(), min: m });
      gain(m >= 50 ? 80 : 40, "Sesión de foco");
      toast("Sesión completa. Tomate un descanso ☕");
      F.len = 5 * 60;
      F.focus = false;
    } else {
      toast("Descanso terminado. ¡A darle!");
      F.len = 25 * 60;
      F.focus = true;
    }
    F.left = F.len;
    commit();
    return;
  }
  const t = $("#ftm"),
    a = $("#arc");
  if (t) t.textContent = Math.floor(F.left / 60) + ":" + pad(F.left % 60);
  if (a) a.setAttribute("stroke-dashoffset", 2 * Math.PI * 104 * (1 - F.left / F.len));
  document.title = (F.run ? Math.floor(F.left / 60) + ":" + pad(F.left % 60) + " · " : "") + "Ascenso";
}

V.notas = () => `<div class="top"><div><p>Capturá ideas antes de que se escapen</p><h1>Notas</h1></div></div>
  <div class="card"><form data-f="note"><textarea name="t" placeholder="Tuve una idea..." required></textarea><div class="row between" style="margin-top:10px"><span class="sm mu">+5 XP por nota</span><button class="btn">Guardar nota</button></div></form></div>
  <div class="row" style="margin:16px 0 12px"><input id="nq" placeholder="Buscar en tus notas..." value="${esc(noteQ)}"></div>
  <div class="grid g3" id="notesL">${notesHTML()}</div>`;
function notesHTML() {
  const q = noteQ.toLowerCase(),
    ns = [...S.notes].reverse().filter((n) => n.t.toLowerCase().includes(q));
  return ns.length
    ? ns
        .map(
          (n) =>
            `<div class="note"><div class="row between" style="margin-bottom:6px"><span class="sm mu">${fromKey(n.d).getDate()} ${MESES[fromKey(n.d).getMonth()]}</span><button class="x" data-a="delnote" data-id="${n.id}">×</button></div>${esc(n.t)}</div>`,
        )
        .join("")
    : `<div class="empty" style="grid-column:1/-1">${S.notes.length ? "Nada coincide con la búsqueda." : "Tu segundo cerebro está vacío. Anotá la primera idea."}</div>`;
}

V.logros = () => {
  const l = lvl(S.xp),
    r = rankOf(l),
    got = BADGES.filter((b) => S.badges[b[0]]).length;
  const earn = [
    ["Completar un hábito", "+50"],
    ["Día perfecto (todos los hábitos)", "+150"],
    ["Registrar entreno (primer del día)", "+120"],
    ["Sesión de foco 50 min", "+80"],
    ["Sesión de foco 25 min", "+40"],
    ["Terminar una tarea", "+30"],
    ["Registrar un movimiento", "+10"],
    ["Guardar una nota", "+5"],
    ["Desbloquear una insignia", "+200"],
    ["Completar una meta", "+1000"],
  ];
  return `<div class="top"><div><p>Cada acción suma. Mirá cuánto avanzaste.</p><h1>Logros</h1></div></div>
  ${levelCard()}
  <div class="card" style="margin-top:16px"><h3>Rangos</h3><div class="ladder">${RANKS.map((x) => `<div class="${l >= x[0] ? "on" : ""} ${x === r ? "cur" : ""}"><div style="font-size:24px">${x[2]}</div><b>${x[1]}</b><div class="sm mu">Nivel ${x[0]}+</div></div>`).join("")}</div></div>
  <div class="card" style="margin-top:16px"><h3>Insignias <span class="pill a">${got}/${BADGES.length}</span></h3><div class="grid g4">${BADGES.map((b) => `<div class="badge ${S.badges[b[0]] ? "on" : ""}"><div class="e">${b[1]}</div><b>${b[2]}</b><div class="sm mu">${b[3]}</div></div>`).join("")}</div></div>
  <div class="card" style="margin-top:16px"><h3>Cómo ganar XP</h3>${earn.map((e) => `<div class="tx"><span class="t">${e[0]}</span><b class="acc num">${e[1]} XP</b></div>`).join("")}</div>
  <p class="sm mu" style="text-align:center;margin-top:20px">¿Estabas probando? <button class="link" data-a="fresh">Empezá de cero</button> y arrancá desde el nivel 1.</p>`;
};

let showExport = false;

/* ---------- instalar como app (PWA) ---------- */
let installEv = null;
const isStandalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installEv = e;
  if (view === "ajustes") render();
});
window.addEventListener("appinstalled", () => {
  installEv = null;
  toast("App instalada ✓");
  render();
});
if ("serviceWorker" in navigator && location.protocol !== "file:")
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
function installHTML() {
  if (isStandalone()) return `<p class="sm mu">✓ Ya la estás usando como app instalada.</p>`;
  if (installEv)
    return `<p class="sm mu">Agregala a tu pantalla de inicio y abrila como cualquier app, sin barra del navegador.</p><button class="btn" style="margin-top:12px" data-a="install">Instalar Ascenso</button>`;
  if (isIOS())
    return `<p class="sm mu">En iPhone: abrila en Safari, tocá el botón Compartir (el cuadrado con la flecha) y elegí <b style="color:var(--tx)">Agregar a inicio</b>.</p>`;
  return `<p class="sm mu">En Android: abrí el menú de Chrome (⋮) y tocá <b style="color:var(--tx)">Instalar app</b> o <b style="color:var(--tx)">Agregar a pantalla principal</b>.</p>`;
}
V.ajustes = () => `<div class="top"><div><p>Personalizá tu app</p><h1>Ajustes</h1></div></div>
  <div class="grid g2" style="align-items:start">
  <div class="card"><h3>Perfil</h3><form data-f="prefs" class="list"><label class="sm mu">Tu nombre</label><input name="name" value="${esc(S.name)}" placeholder="¿Cómo te llamo?"><label class="sm mu" style="margin-top:6px">Presupuesto mensual de gastos ($)</label><input name="budget" type="number" min="0" value="${S.budget || ""}" placeholder="Ej: 600000"><button class="btn" style="margin-top:8px;align-self:flex-start">Guardar</button></form></div>
  <div class="card"><h3>Instalar en el celu</h3>${installHTML()}</div>
  <div class="card"><h3>Tus datos</h3><p class="sm mu">${user ? '☁️ Sesión iniciada como <b style="color:var(--tx)">' + esc(user.email) + "</b>. Tus datos se sincronizan entre todos tus dispositivos." : "💾 Modo local: se guardan solo en este navegador. Configurá Firebase para tener cuentas y sincronización."}</p>
    ${user ? '<button class="btn g" style="margin-top:12px" data-a="logout">Cerrar sesión</button>' : ""}
    <div class="row wrap" style="margin-top:12px"><button class="btn g" data-a="export">Copia de seguridad</button><button class="btn d" data-a="reset">Borrar todo</button></div>
    <div style="margin-top:18px;padding-top:16px;border-top:1px solid var(--bd)"><b>Empezar de cero</b><p class="sm mu" style="margin-top:4px">Si estabas probando la app: borra tu XP, nivel, insignias y todo lo que registraste. Quedan tus hábitos, tus tarjetas, tu nombre y tu presupuesto.</p><button class="btn g" style="margin-top:10px" data-a="fresh">Empezar de cero</button></div>
    ${showExport ? `<textarea id="exp" style="margin-top:12px;font-size:12px;min-height:120px" readonly>${esc(JSON.stringify(S))}</textarea><button class="btn sm" style="margin-top:8px" data-a="copy">Copiar</button>` : ""}
    <form data-f="import" style="margin-top:16px"><label class="sm mu">Restaurar una copia (pegá el texto)</label><textarea name="j" style="margin-top:6px;min-height:70px;font-size:12px"></textarea><button class="btn g sm" style="margin-top:8px">Restaurar</button></form>
  </div></div>`;

/* ---------- render ---------- */
function render() {
  const l = lvl(S.xp),
    r = rankOf(l);
  $("#side").innerHTML =
    `<div class="logo"><span class="mark"><svg viewBox="0 0 24 24"><path d="M6 13l6-6 6 6"/><path d="M6 19l6-6 6 6"/></svg></span>Ascenso</div>${NAV.map((n) => `<button class="nav ${view === n[0] ? "on" : ""}" data-a="go" data-v="${n[0]}">${ic(n[0])}${n[2]}</button>`).join("")}
  <div class="side-lvl"><div class="row between"><span class="sm" style="font-weight:600">${r[2]} ${r[1]}</span><span class="pill a">Nivel ${l}</span></div><div class="bar" style="margin-top:10px"><b style="width:${((S.xp % PER) / PER) * 100}%"></b></div><div class="sm mu" style="margin-top:6px">${fmt(S.xp % PER)} / ${PER} XP</div></div>
  <div class="sync">${user ? "☁️ " + esc(user.email) : "💾 Modo local"}</div>`;
  const more = !MAIN.includes(view);
  $("#bnav").innerHTML =
    MAIN.map((v) => {
      const n = NAV.find((x) => x[0] === v);
      return `<button class="${view === v ? "on" : ""}" data-a="go" data-v="${v}">${ic(v)}${n[2]}</button>`;
    }).join("") +
    `<button class="${more ? "on" : ""}" data-a="more">${ic(more ? view : "mas")}${more ? NAV.find((n) => n[0] === view)[2] : "Más"}</button>`;
  $("#sheetPane").innerHTML = NAV.filter((n) => !MAIN.includes(n[0]))
    .map((n) => `<button data-a="go" data-v="${n[0]}">${ic(n[0])}${n[2]}</button>`)
    .join("");
  $("#view").innerHTML = V[view]();
  const ht = $("#homeTop"),
    fg = $("#focoG");
  if (innerWidth <= 860) {
    if (ht) ht.style.gridTemplateColumns = "1fr";
    if (fg) fg.style.gridTemplateColumns = "1fr";
  }
}

/* ---------- eventos ---------- */
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-a]");
  if (!el) return;
  const a = el.dataset.a,
    id = el.dataset.id;
  if (a === "close") {
    if (e.target === el || el.tagName === "BUTTON") $("#modal").innerHTML = "";
    return;
  }
  if (a === "confirm") {
    $("#modal").innerHTML = "";
    if (pendingConfirm) pendingConfirm();
    pendingConfirm = null;
    return;
  }
  if (a === "go") return go(el.dataset.v);
  if (a === "more") return $("#sheet").classList.toggle("open");
  if (a === "hab") return toggleHabit(id, el.dataset.k);
  if (a === "wk") {
    const d = +el.dataset.d;
    weekOff = d === 0 ? 0 : Math.min(0, weekOff + d);
    return render();
  }
  if (a === "delhab")
    return ask("¿Eliminar este hábito?", () => {
      S.habits = S.habits.filter((h) => h.id !== id);
      commit();
    });
  if (a === "delcc") {
    S.cc = S.cc.filter((p) => p.id !== id);
    return commit();
  }
  if (a === "delpay") {
    const p = S.ccpay.find((x) => x.id === id);
    S.ccpay = S.ccpay.filter((x) => x.id !== id);
    if (p) S.tx = S.tx.filter((t) => t.id !== p.tx);
    toast("Pago deshecho");
    return commit();
  }
  if (a === "delcard")
    return ask("¿Eliminar esta tarjeta y todas sus compras?", () => {
      S.cards = S.cards.filter((c) => c.id !== id);
      S.cc = S.cc.filter((p) => p.card !== id);
      S.ccpay = S.ccpay.filter((p) => p.card !== id);
      commit();
    });
  if (a === "deltx") {
    S.tx = S.tx.filter((t) => t.id !== id);
    return commit();
  }
  if (a === "delset") {
    S.sets = S.sets.filter((s) => s.id !== id);
    return commit();
  }
  if (a === "delgoal")
    return ask("¿Eliminar esta meta?", () => {
      S.goals = S.goals.filter((g) => g.id !== id);
      commit();
    });
  if (a === "deltask") {
    S.tasks = S.tasks.filter((t) => t.id !== id);
    return commit();
  }
  if (a === "delnote") {
    S.notes = S.notes.filter((n) => n.id !== id);
    return commit();
  }
  if (a === "mv") {
    const t = S.tasks.find((x) => x.id === id);
    t.col = Math.max(0, Math.min(2, t.col + +el.dataset.d));
    if (t.col === 2 && !t.xp) {
      t.xp = 1;
      gain(30, "Tarea terminada");
      beep(740, 0.1);
    }
    return commit();
  }
  if (a === "rest") {
    beep(1, 0.001);
    clearInterval(rest.int);
    rest.left = +el.dataset.s;
    const up = () => {
      const t = $("#restT");
      if (t) t.textContent = Math.floor(rest.left / 60) + ":" + pad(rest.left % 60);
    };
    up();
    rest.int = setInterval(() => {
      rest.left--;
      up();
      if (rest.left <= 0) {
        clearInterval(rest.int);
        rest.left = 0;
        up();
        beep(880, 0.3);
        toast("¡A la próxima serie! 💪");
      }
    }, 1000);
    return;
  }
  if (a === "preset") {
    clearInterval(F.int);
    F.run = false;
    F.len = +el.dataset.m * 60;
    F.left = F.len;
    F.focus = el.dataset.f === "1";
    document.title = "Ascenso — Subí de nivel cada día";
    return render();
  }
  if (a === "fplay") {
    beep(1, 0.001);
    if (F.run) {
      clearInterval(F.int);
      F.run = false;
    } else {
      F.run = true;
      F.int = setInterval(ftick, 1000);
    }
    el.textContent = F.run ? "Pausar" : "Empezar";
    return;
  }
  if (a === "freset") {
    clearInterval(F.int);
    F.run = false;
    F.left = F.len;
    document.title = "Ascenso — Subí de nivel cada día";
    return render();
  }
  if (a === "install") {
    if (!installEv) return;
    installEv.prompt();
    installEv.userChoice.finally(() => {
      installEv = null;
      render();
    });
    return;
  }
  if (a === "logout")
    return ask(
      "¿Cerrar sesión en este dispositivo?",
      () => {
        clearTimeout(tmr);
        flush().finally(() => window.fbOut && window.fbOut());
      },
      "Cerrar sesión",
    );
  if (a === "export") {
    showExport = !showExport;
    return render();
  }
  if (a === "copy") {
    const t = $("#exp");
    t.select();
    navigator.clipboard &&
      navigator.clipboard.writeText(t.value).then(
        () => toast("Copiado ✓"),
        () => toast("Seleccioná el texto y copialo a mano"),
      );
    return;
  }
  if (a === "fresh")
    return ask(
      "¿Empezar de cero? Se borran tu XP, insignias y registros. Tus hábitos y tarjetas quedan.",
      () => {
        S = { ...DEF(), name: S.name, budget: S.budget, habits: S.habits, cards: S.cards };
        weekOff = 0;
        commit();
        toast("Listo, arrancás desde el nivel 1 🌱");
        go("inicio");
      },
      "Empezar de cero",
    );
  if (a === "reset")
    return ask(
      "¿Borrar todos tus datos? No se puede deshacer.",
      () => {
        S = { ...DEF(), ts: Date.now() };
        weekOff = 0;
        commit();
        toast("Datos borrados");
      },
      "Borrar todo",
    );
});
$("#sheet").addEventListener("click", (e) => {
  if (e.target.id === "sheet") $("#sheet").classList.remove("open");
});
document.addEventListener("change", (e) => {
  if (!e.target.classList.contains("ccdue")) return;
  const c = S.cards.find((x) => x.id === e.target.dataset.id);
  c.due = Math.min(31, Math.max(1, +e.target.value || 1));
  commit();
});
document.addEventListener("input", (e) => {
  if (e.target.id === "nq") {
    noteQ = e.target.value;
    $("#notesL").innerHTML = notesHTML();
  }
});
document.addEventListener("submit", (e) => {
  const f = e.target,
    k = f.dataset.f;
  if (!k) return;
  e.preventDefault();
  const v = (n) => (f.elements[n] ? f.elements[n].value : "").trim();
  if (k === "habit") {
    S.habits.push({ id: uid(), name: v("name"), icon: v("icon") || "⭐" });
    toast("Hábito creado");
    return commit();
  }
  if (k === "ccbuy") {
    S.cc.push({
      id: uid(),
      card: v("card"),
      desc: v("desc"),
      amt: +v("amt"),
      n: +v("n"),
      m: ymAdd(ymNow(), +v("w")),
      d: dk(),
    });
    gain(10, "Compra en tarjeta cargada");
    return commit();
  }
  if (k === "ccpay") {
    const c = S.cards.find((x) => x.id === f.dataset.id),
      amt = +v("v"),
      debe = cardInfo(c).mes,
      t = { id: uid(), d: dk(), desc: "Pago tarjeta " + c.name, amt, cat: "Tarjetas", type: "out" };
    S.tx.push(t);
    S.ccpay.push({ id: uid(), card: c.id, amt, d: dk(), tx: t.id });
    if (amt >= debe - 1) gain(100, c.name + " al día 💳");
    else toast("Pago registrado: " + money(amt));
    return commit();
  }
  if (k === "card") {
    S.cards.push({
      id: uid(),
      name: v("name"),
      due: Math.min(31, Math.max(1, +v("due"))),
      color: CC_COLORS[S.cards.length % CC_COLORS.length],
    });
    toast("Tarjeta agregada");
    return commit();
  }
  if (k === "tx") {
    finCat = v("cat");
    const t = parseTx(v("t"), finCat);
    if (!t) return toast('No encontré el monto. Probá: "uber 3500"', "err");
    S.tx.push(t);
    gain(
      10,
      (t.type === "in" ? "Ingreso " : "Gasto ") + money(t.amt) + (t.type === "in" ? "" : " · " + t.cat),
    );
    finCat = "auto";
    return commit();
  }
  if (k === "set") {
    const ex = v("ex"),
      kg = +v("kg"),
      reps = +v("reps"),
      n = Math.max(1, Math.min(10, +v("n") || 1)),
      d = dk();
    const first = !S.sets.some((s) => s.d === d);
    for (let i = 0; i < n; i++) S.sets.push({ id: uid(), d, ex, kg, reps });
    gain(first ? 120 : 10 * n, first ? "Entreno registrado" : n + " serie" + (n > 1 ? "s" : ""));
    return commit();
  }
  if (k === "goal") {
    S.goals.push({
      id: uid(),
      name: v("name"),
      icon: v("icon") || "🎯",
      target: +v("target"),
      saved: 0,
      done: false,
    });
    toast("Meta creada");
    return commit();
  }
  if (k === "addgoal") {
    const g = S.goals.find((x) => x.id === f.dataset.id);
    g.saved = Math.max(0, g.saved + +v("v"));
    if (g.saved >= g.target && !g.done) {
      g.done = true;
      gain(1000, "¡Meta cumplida! " + g.icon);
    } else toast("Sumaste " + money(+v("v")));
    return commit();
  }
  if (k === "task") {
    S.tasks.push({ id: uid(), t: v("t"), tag: v("tag"), col: 0 });
    return commit();
  }
  if (k === "note") {
    S.notes.push({ id: uid(), t: v("t"), d: dk() });
    gain(5, "Nota guardada");
    return commit();
  }
  if (k === "prefs") {
    S.name = v("name");
    S.budget = +v("budget") || 0;
    toast("Guardado ✓");
    return commit();
  }
  if (k === "import") {
    try {
      const o = JSON.parse(v("j"));
      if (!o || !Array.isArray(o.habits)) throw 0;
      S = { ...DEF(), ...o };
      S.ts = Date.now();
      toast("Copia restaurada ✓");
      showExport = false;
      return commit();
    } catch (err) {
      return toast("Ese texto no es una copia válida", "err");
    }
  }
});
window.addEventListener("resize", () => {
  const ht = $("#homeTop"),
    fg = $("#focoG"),
    m = innerWidth <= 860;
  if (ht) ht.style.gridTemplateColumns = m ? "1fr" : "1.5fr 1fr";
  if (fg) fg.style.gridTemplateColumns = m ? "1fr" : "1.3fr 1fr";
});
if (FB_ON) $("#auth").style.display = "grid";
render();