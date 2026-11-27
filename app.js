'use strict';

/* ================= Data ================= */
const STORE = 'savvy.v1';

const CATS = {
  expense: [
    { id: 'casa', name: 'Casa', ic: '🏠', c: '#E6E7FD' },
    { id: 'super', name: 'Supermercado', ic: '🛒', c: '#E1F4EA' },
    { id: 'rest', name: 'Restaurantes', ic: '🍽️', c: '#FDE9DF' },
    { id: 'transp', name: 'Transportes', ic: '🚗', c: '#E2EEFC' },
    { id: 'contas', name: 'Contas', ic: '⚡', c: '#FFF4D6' },
    { id: 'subs', name: 'Subscrições', ic: '📺', c: '#EFE4FB' },
    { id: 'saude', name: 'Saúde', ic: '💊', c: '#FCE6EC' },
    { id: 'lazer', name: 'Lazer', ic: '🎬', c: '#E4F1F7' },
    { id: 'compras', name: 'Compras', ic: '🛍️', c: '#FBE6F5' },
    { id: 'educ', name: 'Educação', ic: '📚', c: '#E8F0DE' },
    { id: 'viagens', name: 'Viagens', ic: '✈️', c: '#DFF3F6' },
    { id: 'outros', name: 'Outros', ic: '📦', c: '#EDEDF4' }
  ],
  income: [
    { id: 'salario', name: 'Salário', ic: '💼', c: '#E6E7FD' },
    { id: 'extra', name: 'Extra', ic: '💰', c: '#E1F4EA' },
    { id: 'reemb', name: 'Reembolso', ic: '↩️', c: '#E2EEFC' },
    { id: 'outros_r', name: 'Outros', ic: '✨', c: '#FFF4D6' }
  ]
};
const CAT_COLORS = ['#5B5FE0', '#F4A9BC', '#8FA8F7', '#F0835E', '#7BCBA4', '#B79AF0', '#F6C667', '#6CC3D5', '#E58FCB', '#A0A3C8', '#9CC77E', '#D0D1E6'];
const GOAL_EMOJIS = ['🎯', '🏖️', '🚗', '🏠', '💻', '🎓', '💍', '🛟', '✈️', '🎁', '📱', '🐷'];

const blank = () => ({ version: 1, currency: 'EUR', tx: [], recurring: [], goals: [] });

function load() {
  try { return Object.assign(blank(), JSON.parse(localStorage.getItem(STORE)) || {}); }
  catch { return blank(); }
}
function save() { localStorage.setItem(STORE, JSON.stringify(S)); }

let S = load();
let view = (location.hash || '#dashboard').slice(1);
let cur = monthKey(new Date());
let movFilter = 'all';

/* ================= Helpers ================= */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function pad(n) { return String(n).padStart(2, '0'); }
function monthKey(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
function today() { const d = new Date(); return monthKey(d) + '-' + pad(d.getDate()); }
function addMonths(key, n) { const [y, m] = key.split('-').map(Number); return monthKey(new Date(y, m - 1 + n, 1)); }
function daysIn(key) { const [y, m] = key.split('-').map(Number); return new Date(y, m, 0).getDate(); }
function monthLabel(key, opts = { month: 'long', year: 'numeric' }) {
  const [y, m] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-PT', opts).format(new Date(y, m - 1, 1));
}
function shortMonth(key) { return monthLabel(key, { month: 'short' }).replace('.', '').toUpperCase(); }
function dayLabel(iso) {
  if (iso === today()) return 'Hoje';
  const d = new Date(iso + 'T12:00'); const y = new Date(); y.setDate(y.getDate() - 1);
  if (iso === monthKey(y) + '-' + pad(y.getDate())) return 'Ontem';
  return new Intl.DateTimeFormat('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
}
function fmt(n, dec = 2) {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: S.currency, minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n || 0);
}
function fmt0(n) { return fmt(n, Math.abs(n) >= 1000 ? 0 : 2); }
function parseAmt(v) { const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? Math.round(n * 100) / 100 : NaN; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function cat(type, id) { return CATS[type].find(c => c.id === id) || CATS[type][CATS[type].length - 1]; }
const $ = (s, r = document) => r.querySelector(s);

/* Entries for a month = one-off tx + active recurring items */
function entries(key) {
  const list = S.tx.filter(t => t.date.startsWith(key)).map(t => ({ ...t, fixed: false }));
  for (const r of S.recurring) {
    if (r.start <= key && (!r.end || key <= r.end)) {
      list.push({
        id: r.id, recId: r.id, type: r.type, amount: r.amount, cat: r.cat, desc: r.desc,
        date: key + '-' + pad(Math.min(r.day, daysIn(key))), fixed: true
      });
    }
  }
  return list.sort((a, b) => b.date.localeCompare(a.date) || (a.fixed - b.fixed));
}
function totals(key) {
  const t = { inc: 0, exp: 0, fixed: 0, oneoff: 0, n: 0 };
  for (const e of entries(key)) {
    if (e.type === 'income') t.inc += e.amount;
    else { t.exp += e.amount; e.fixed ? t.fixed += e.amount : t.oneoff += e.amount; t.n++; }
  }
  t.bal = t.inc - t.exp;
  t.rate = t.inc > 0 ? Math.max(0, t.bal / t.inc) : 0;
  return t;
}
function byCategory(key) {
  const m = {};
  for (const e of entries(key)) if (e.type === 'expense') m[e.cat] = (m[e.cat] || 0) + e.amount;
  return Object.entries(m).map(([id, v]) => ({ ...cat('expense', id), v })).sort((a, b) => b.v - a.v);
}
function hasData() { return S.tx.length || S.recurring.length; }

/* ================= Icons ================= */
const IC = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  movimentos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3"/></svg>',
  estatisticas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 16v-4M12 16V8M16 16v-6"/></svg>',
  objetivos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
  definicoes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
};
const VIEWS = { dashboard: 'Dashboard', movimentos: 'Movimentos', estatisticas: 'Estatísticas', objetivos: 'Objetivos', definicoes: 'Definições' };

/* ================= Charts (SVG) ================= */
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d;
}
function niceMax(v) { if (v <= 0) return 100; const p = Math.pow(10, Math.floor(Math.log10(v))); return Math.ceil(v / p * 2) / 2 * p; }
function kfmt(v) { return v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0).replace('.', ',') + 'k' : Math.round(v); }

// Grouped bars: income vs expense
function barChart(keys) {
  const W = 330, H = 170, L = 34, B = 22, T = 8;
  const data = keys.map(k => totals(k));
  const max = niceMax(Math.max(...data.map(d => Math.max(d.inc, d.exp)), 1));
  const step = (W - L - 6) / keys.length;
  let g = '';
  for (let i = 0; i <= 3; i++) {
    const y = T + (H - B - T) * (1 - i / 3);
    g += `<text x="0" y="${y + 3}" font-size="9" fill="#A6A9C8">${kfmt(max * i / 3)}</text>`;
  }
  keys.forEach((k, i) => {
    const x = L + step * i + step / 2, d = data[i], h = H - B - T;
    const hi = d.inc / max * h, he = d.exp / max * h, on = k === cur;
    g += `<rect x="${x - 8}" y="${H - B - he}" width="6" height="${Math.max(he, 0)}" rx="3" fill="${on ? '#F08CA6' : '#F4A9BC'}" opacity="${on ? 1 : .75}"/>`;
    g += `<rect x="${x + 2}" y="${H - B - hi}" width="5" height="${Math.max(hi, 0)}" rx="2.5" fill="${on ? '#4A4ED6' : '#5B5FE0'}" opacity="${on ? 1 : .85}"/>`;
    g += `<text x="${x}" y="${H - 6}" font-size="9" text-anchor="middle" fill="${on ? '#5B5FE0' : '#A6A9C8'}" font-weight="${on ? 700 : 500}">${shortMonth(k)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="100%">${g}</svg>`;
}

// Smooth line like the "exchange rates" card
function lineChart(keys, values, color = '#5B5FE0') {
  const W = 330, H = 150, L = 30, B = 22, T = 14;
  const max = niceMax(Math.max(...values, 1)), min = 0;
  const step = (W - L - 12) / (keys.length - 1 || 1);
  const pts = values.map((v, i) => [+(L + step * i).toFixed(1), +(T + (H - B - T) * (1 - (v - min) / (max - min))).toFixed(1)]);
  const id = 'lg' + Math.random().toString(36).slice(2, 6);
  let g = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".18"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`;
  for (let i = 0; i <= 2; i++) {
    const y = T + (H - B - T) * (1 - i / 2);
    g += `<text x="0" y="${y + 3}" font-size="9" fill="#A6A9C8">${kfmt(max * i / 2)}</text>`;
  }
  const path = smoothPath(pts);
  g += `<path d="${path} L${pts.at(-1)[0]},${H - B} L${pts[0][0]},${H - B} Z" fill="url(#${id})"/>`;
  g += `<path d="${path}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`;
  keys.forEach((k, i) => {
    const show = keys.length <= 6 || i % 2 === (keys.length - 1) % 2;
    if (show) g += `<text x="${pts[i][0]}" y="${H - 5}" font-size="9" text-anchor="middle" fill="${k === cur ? color : '#A6A9C8'}" font-weight="${k === cur ? 700 : 500}">${shortMonth(k)}</text>`;
  });
  const ci = keys.indexOf(cur);
  if (ci >= 0) {
    const [x, y] = pts[ci];
    g += `<line x1="${x}" x2="${x}" y1="${y}" y2="${H - B}" stroke="#F4A9BC" stroke-dasharray="2 3"/>`;
    g += `<circle cx="${x}" cy="${y}" r="7" fill="#F4A9BC" opacity=".35"/><circle cx="${x}" cy="${y}" r="4" fill="#F08CA6" stroke="#fff" stroke-width="1.5"/>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}" width="100%">${g}</svg>`;
}

// Efficiency ring: indigo = saved, pink = spent
function ring(t, size = 150) {
  const r = 58, c = 2 * Math.PI * r, cx = 75;
  const base = Math.max(t.inc, t.exp, 1);
  const spent = Math.min(t.exp / base, 1), saved = t.inc > 0 ? Math.max(t.bal, 0) / base : 0;
  const gap = 0.025 * c;
  const s1 = Math.max(saved * c - gap, 0), s2 = Math.max(spent * c - gap, 0);
  return `<div class="ring-wrap"><svg viewBox="0 0 150 150" width="${size}" height="${size}" style="transform:rotate(-90deg)">
    <circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="#ECEDFB" stroke-width="9"/>
    ${s2 > 0 ? `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="#F4A9BC" stroke-width="9" stroke-linecap="round" stroke-dasharray="${s2} ${c}" stroke-dashoffset="${-(saved * c)}"/>` : ''}
    ${s1 > 0 ? `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="#5B5FE0" stroke-width="9" stroke-linecap="round" stroke-dasharray="${s1} ${c}"/>` : ''}
  </svg><div class="ring-center"><b>${fmt0(Math.max(t.bal, 0))}</b><span class="tag">${Math.round(t.rate * 100)}% poupado</span></div></div>`;
}

function donut(items, total, size = 150) {
  const r = 56, c = 2 * Math.PI * r; let off = 0, g = '';
  items.forEach((it, i) => {
    const len = it.v / total * c;
    g += `<circle cx="75" cy="75" r="${r}" fill="none" stroke="${CAT_COLORS[i % CAT_COLORS.length]}" stroke-width="16" stroke-dasharray="${Math.max(len - 1.5, 0.5)} ${c}" stroke-dashoffset="${-off}"/>`;
    off += len;
  });
  return `<div class="ring-wrap"><svg viewBox="0 0 150 150" width="${size}" height="${size}" style="transform:rotate(-90deg)"><circle cx="75" cy="75" r="${r}" fill="none" stroke="#ECEDFB" stroke-width="16"/>${g}</svg>
    <div class="ring-center"><small style="color:var(--muted);font-size:10px">Total</small><b style="font-size:17px">${fmt0(total)}</b></div></div>`;
}

/* ================= Partials ================= */
function txRow(e) {
  const c = cat(e.type, e.cat), pos = e.type === 'income';
  return `<button class="tx" data-action="${e.fixed ? 'edit-rec' : 'edit-tx'}" data-id="${e.id}">
    <span class="avatar" style="background:${c.c}">${c.ic}</span>
    <span class="info"><b>${esc(e.desc || c.name)}${e.fixed ? '<span class="badge">FIXO</span>' : ''}</b><small>${c.name}</small></span>
    <span class="amt ${pos ? 'pos' : 'neg'}">${pos ? '+' : '−'}${fmt(e.amount)}</span></button>`;
}
function txList(list, limit) {
  if (!list.length) return `<div class="empty"><span class="e-ic">🧾</span>Sem movimentos neste mês.<br>Toca em ＋ para adicionar.</div>`;
  let html = '', last = '';
  for (const e of list.slice(0, limit || list.length)) {
    if (e.date !== last) { html += `<div class="tx-group">${dayLabel(e.date)}</div>`; last = e.date; }
    html += txRow(e);
  }
  return `<div class="tx-list">${html}</div>`;
}
function quickActions() {
  return `<div class="quick">
    <button data-action="add" data-type="expense"><span class="q-ic">−</span>Despesa</button>
    <button data-action="add" data-type="income"><span class="q-ic">＋</span>Receita</button>
    <button data-action="add" data-type="expense" data-fixed="1"><span class="q-ic">↻</span>Fixo</button>
    <button data-action="add-goal"><span class="q-ic">🎯</span>Objetivo</button></div>`;
}
function goalCard(g, compact) {
  const pct = g.target ? Math.min(g.saved / g.target, 1) : 0;
  let hint = '';
  if (g.deadline && g.saved < g.target) {
    const months = Math.max(1, (new Date(g.deadline + '-01') - new Date(cur + '-01')) / (1000 * 60 * 60 * 24 * 30.44) + 1);
    hint = `${fmt(Math.ceil((g.target - g.saved) / Math.round(months)))} / mês até ${monthLabel(g.deadline, { month: 'short', year: 'numeric' })}`;
  } else if (g.saved >= g.target) hint = 'Objetivo atingido 🎉';
  return `<div class="goal glass">
    <span class="avatar" style="background:var(--primary-soft);width:46px;height:46px;font-size:22px">${g.emoji}</span>
    <div class="g-body"><b>${esc(g.name)}</b>${hint ? `<small>${hint}</small>` : ''}
      <div class="progress"><i style="width:${(pct * 100).toFixed(1)}%"></i></div>
      <div class="g-meta"><span><b>${fmt0(g.saved)}</b> de ${fmt0(g.target)}</span><span>${Math.round(pct * 100)}%</span></div>
      ${compact ? '' : `<div class="g-actions"><button class="btn primary sm" data-action="contrib" data-id="${g.id}">＋ Juntar</button>
      <button class="btn sm" data-action="withdraw" data-id="${g.id}">− Retirar</button><button class="btn sm" data-action="edit-goal" data-id="${g.id}">Editar</button></div>`}
    </div></div>`;
}

/* ================= Views ================= */
function vDashboard() {
  const t = totals(cur), prev = totals(addMonths(cur, -1));
  const last6 = Array.from({ length: 6 }, (_, i) => addMonths(cur, i - 5));
  const last8 = Array.from({ length: 8 }, (_, i) => addMonths(cur, i - 7));
  const diff = prev.exp ? (t.exp - prev.exp) / prev.exp : 0;
  const list = entries(cur);
  return `
  <div class="dash-top">
    <div class="balance">
      <div class="row"><div><small>Saldo do mês</small><div class="big">${fmt(t.bal)}</div></div>
        <div style="text-align:right"><small>Movimentos</small><b style="font-size:20px">${pad(list.length)}</b></div></div>
      <div class="dots">•••• •••• •••• <b>${String(new Date().getFullYear())}</b></div>
      <div class="row mini">
        <div><small>Receitas</small><b>${fmt0(t.inc)}</b></div>
        <div><small>Despesas</small><b>${fmt0(t.exp)}</b></div>
        <div style="align-self:center"><span class="pill">${t.exp && prev.exp ? (diff > 0 ? '▲ ' : '▼ ') + Math.abs(Math.round(diff * 100)) + '%' : monthLabel(cur, { month: 'short' }).replace('.', '')}</span></div>
      </div>
    </div>
    <div class="dash-quick-mobile">${quickActions()}</div>
    <div class="card glass"><div class="card-head"><h2>Evolução das despesas</h2><span style="font-size:11px;color:var(--muted);font-weight:600">${S.currency} · 8 meses</span></div>
      ${lineChart(last8, last8.map(k => totals(k).exp))}</div>
  </div>
  <div class="two" style="margin-top:14px">
    <div class="card glass"><div class="card-head"><h2>Histórico</h2><button class="more" data-nav="estatisticas">•••</button></div>
      ${barChart(last6)}<div class="legend"><span><i style="background:#5B5FE0"></i>Receitas</span><span><i style="background:#F4A9BC"></i>Despesas</span></div></div>
    <div class="card glass"><div class="card-head"><h2>Eficiência</h2><button class="more" data-nav="estatisticas">•••</button></div>
      ${ring(t)}<div class="legend"><span><i style="background:#5B5FE0"></i>Poupado</span><span><i style="background:#F4A9BC"></i>Gasto</span></div></div>
  </div>
  <div class="dash-right-only grid" style="margin-top:14px">
    ${S.goals.length ? `<div class="card-head" style="margin:6px 4px 0"><h2>Objetivos</h2><button class="more" data-nav="objetivos">ver todos</button></div>${S.goals.slice(0, 2).map(g => goalCard(g, true)).join('')}` : ''}
    <div class="card glass"><div class="card-head"><h2>Movimentos recentes</h2><button class="more" data-nav="movimentos">ver todos</button></div>${txList(list, 6)}</div>
  </div>
  ${!hasData() ? `<div class="card glass" style="margin-top:14px;text-align:center"><p style="margin:4px 0 12px;font-size:13px;color:var(--muted)">Primeira vez? Começa por adicionar o teu salário e as despesas fixas (renda, contas, subscrições).</p><button class="btn primary" data-action="demo">Ver com dados de exemplo</button></div>` : ''}`;
}

function vRight() {
  const list = entries(cur);
  const hour = new Date().getHours();
  return `<div style="display:flex;justify-content:flex-end;gap:8px"><button class="icon-btn glass" data-nav="definicoes" aria-label="Definições" style="width:34px;height:34px;display:grid;place-items:center">${IC.definicoes.replace('<svg', '<svg width="16"')}</button></div>
    <div style="text-align:center;margin-top:8px">
      <div class="avatar" style="width:64px;height:64px;font-size:30px;margin:0 auto;background:linear-gradient(135deg,#E6E7FD,#FCE6EC);box-shadow:var(--shadow)">🐷</div>
      <h2 style="margin:12px 0 2px;font-size:16px">${hour < 12 ? 'Bom dia' : hour < 20 ? 'Boa tarde' : 'Boa noite'}!</h2>
      <small style="color:var(--muted);font-size:12px">${monthLabel(cur)}</small>
    </div>
    <div style="margin-top:20px">${quickActions()}</div>
    ${S.goals.length ? `<h2>Objetivos</h2>${S.goals.slice(0, 2).map(g => goalCard(g, true)).join('<div style="height:8px"></div>')}` : ''}
    <h2>Movimentos recentes</h2>${txList(list, 7)}`;
}

function vMovimentos() {
  let list = entries(cur);
  const t = totals(cur);
  if (movFilter === 'fixed') list = list.filter(e => e.fixed);
  if (movFilter === 'oneoff') list = list.filter(e => !e.fixed && e.type === 'expense');
  if (movFilter === 'income') list = list.filter(e => e.type === 'income');
  const f = (k, l) => `<button class="${movFilter === k ? 'on' : ''}" data-action="filter" data-f="${k}">${l}</button>`;
  return `
  <div class="kpis" style="margin-bottom:14px">
    <div class="kpi glass"><small>Despesas fixas</small><b>${fmt(t.fixed)}</b></div>
    <div class="kpi glass"><small>Despesas pontuais</small><b>${fmt(t.oneoff)}</b></div>
  </div>
  <div class="seg glass">${f('all', 'Tudo')}${f('fixed', 'Fixos')}${f('oneoff', 'Pontuais')}${f('income', 'Receitas')}</div>
  <div class="card glass">${txList(list)}</div>
  ${movFilter === 'fixed' && S.recurring.some(r => r.end && r.end < cur) ? `<p style="font-size:11px;color:var(--muted);text-align:center">Os fixos terminados não aparecem nos meses seguintes.</p>` : ''}`;
}

function vEstatisticas() {
  const t = totals(cur), prev = totals(addMonths(cur, -1));
  const cats = byCategory(cur), prevCats = Object.fromEntries(byCategory(addMonths(cur, -1)).map(c => [c.id, c.v]));
  const last12 = Array.from({ length: 12 }, (_, i) => addMonths(cur, i - 11));
  const isCurrent = cur === monthKey(new Date());
  const days = isCurrent ? new Date().getDate() : daysIn(cur);
  const avg12 = last12.map(k => totals(k).exp).filter(v => v > 0);
  const avg = avg12.length ? avg12.reduce((a, b) => a + b, 0) / avg12.length : 0;
  const d = prev.exp ? (t.exp - prev.exp) / prev.exp : null;
  const delta = d === null ? '' : `<span class="delta" style="color:${d > 0 ? 'var(--neg)' : 'var(--primary)'}">${d > 0 ? '▲' : '▼'} ${Math.abs(Math.round(d * 100))}% vs mês anterior</span>`;
  return `<div class="grid stats-grid">
    <div class="kpis wide">
      <div class="kpi glass"><small>Gasto este mês</small><b>${fmt(t.exp)}</b>${delta}</div>
      <div class="kpi glass"><small>Taxa de poupança</small><b>${Math.round(t.rate * 100)}%</b><span class="delta" style="color:var(--muted)">${fmt0(Math.max(t.bal, 0))} poupados</span></div>
      <div class="kpi glass"><small>Média por dia</small><b>${fmt(t.exp / days)}</b><span class="delta" style="color:var(--muted)">${isCurrent ? 'até hoje' : 'no mês'}</span></div>
      <div class="kpi glass"><small>Média mensal (12m)</small><b>${fmt0(avg)}</b><span class="delta" style="color:var(--muted)">fixos: ${t.exp ? Math.round(t.fixed / t.exp * 100) : 0}% do mês</span></div>
    </div>
    <div class="card glass"><div class="card-head"><h2>Por categoria</h2></div>
      ${cats.length ? donut(cats, t.exp) + `<div style="margin-top:12px">${cats.map((c, i) => {
        const p = prevCats[c.id];
        const ch = p ? Math.round((c.v - p) / p * 100) : null;
        return `<div class="cat-row"><span class="avatar" style="background:${c.c};width:32px;height:32px;font-size:14px">${c.ic}</span>
          <div class="info"><div>${c.name}<span>${fmt(c.v)} · ${Math.round(c.v / t.exp * 100)}%${ch !== null && ch !== 0 ? ` · <span style="color:${ch > 0 ? 'var(--neg)' : 'var(--primary)'}">${ch > 0 ? '+' : ''}${ch}%</span>` : ''}</span></div>
          <div class="bar"><i style="width:${c.v / cats[0].v * 100}%;background:${CAT_COLORS[i % CAT_COLORS.length]}"></i></div></div></div>`;
      }).join('')}</div>` : '<div class="empty"><span class="e-ic">📊</span>Sem despesas neste mês.</div>'}
    </div>
    <div class="grid">
      <div class="card glass"><div class="card-head"><h2>Despesas · 12 meses</h2></div>${lineChart(last12, last12.map(k => totals(k).exp))}</div>
      <div class="card glass"><div class="card-head"><h2>Receitas vs despesas</h2></div>${barChart(last12.slice(-6))}
        <div class="legend"><span><i style="background:#5B5FE0"></i>Receitas</span><span><i style="background:#F4A9BC"></i>Despesas</span></div></div>
      <div class="card glass"><div class="card-head"><h2>Fixos vs pontuais</h2></div>
        ${t.exp ? `<div class="progress" style="height:14px;background:var(--pink-soft)"><i style="width:${t.fixed / t.exp * 100}%"></i></div>
        <div class="g-meta"><span><b>${fmt(t.fixed)}</b> fixos</span><span><b>${fmt(t.oneoff)}</b> pontuais</span></div>` : '<div class="empty">—</div>'}
      </div>
    </div>
  </div>`;
}

function vObjetivos() {
  const total = S.goals.reduce((a, g) => a + g.saved, 0), target = S.goals.reduce((a, g) => a + g.target, 0);
  return `
  ${S.goals.length ? `<div class="balance" style="margin-bottom:14px"><div class="row"><div><small>Total poupado em objetivos</small><div class="big">${fmt(total)}</div></div>
    <span class="pill">${target ? Math.round(total / target * 100) : 0}%</span></div>
    <div class="progress" style="background:rgba(255,255,255,.2);margin-top:16px"><i style="width:${target ? Math.min(total / target, 1) * 100 : 0}%;background:#fff"></i></div>
    <small style="margin-top:4px">Meta total: ${fmt(target)}</small></div>` : ''}
  <div class="grid goals-grid">${S.goals.map(g => goalCard(g)).join('') || `<div class="card glass empty"><span class="e-ic">🎯</span>Ainda não tens objetivos de poupança.</div>`}</div>
  <button class="btn primary block" style="margin-top:14px" data-action="add-goal">＋ Novo objetivo</button>`;
}

function vDefinicoes() {
  const opts = ['EUR', 'USD', 'GBP', 'BRL', 'CHF'].map(c => `<option ${c === S.currency ? 'selected' : ''}>${c}</option>`).join('');
  return `<div class="card glass">
    <div class="settings-item"><div><b>Moeda</b><small>Usada em toda a app</small></div><select class="input" style="width:auto" data-action="currency">${opts}</select></div>
    <div class="settings-item"><div><b>Despesas e receitas fixas</b><small>${S.recurring.length} ativas/terminadas</small></div><button class="btn sm" data-action="list-rec">Gerir</button></div>
    <div class="settings-item"><div><b>Exportar cópia de segurança</b><small>Ficheiro .json com todos os dados</small></div><button class="btn sm" data-action="export">Exportar</button></div>
    <div class="settings-item"><div><b>Importar cópia</b><small>Substitui os dados atuais</small></div><label class="btn sm">Importar<input type="file" accept="application/json,.json" hidden id="importFile"></label></div>
    <div class="settings-item"><div><b>Exportar CSV</b><small>Movimentos do mês para Excel</small></div><button class="btn sm" data-action="csv">CSV</button></div>
    <div class="settings-item"><div><b>Apagar tudo</b><small>Não pode ser desfeito</small></div><button class="btn sm danger" data-action="reset">Apagar</button></div>
  </div>
  <div class="card glass" style="margin-top:14px;font-size:12px;color:var(--muted);line-height:1.55">
    <b style="color:var(--text);font-size:13px">📲 Instalar no telemóvel</b><br>
    <b>Android (Chrome):</b> menu ⋮ → <i>Instalar app</i> / <i>Adicionar ao ecrã principal</i>.<br>
    <b>iPhone (Safari):</b> botão Partilhar → <i>Adicionar ao ecrã principal</i>.<br>
    Funciona sem internet e sem conta. Os dados ficam guardados apenas neste dispositivo — exporta uma cópia de vez em quando.
    ${deferredPrompt ? '<br><button class="btn primary" style="margin-top:10px" data-action="install">Instalar agora</button>' : ''}
  </div>`;
}

/* ================= Render ================= */
function nav(active) {
  const items = Object.keys(VIEWS);
  $('#sideNav').innerHTML = items.map(k => `<button class="${k === active ? 'on' : ''}" data-nav="${k}">${IC[k]}${VIEWS[k]}</button>`).join('');
  const b = ['dashboard', 'movimentos', null, 'estatisticas', 'objetivos'];
  $('#bottomNav').innerHTML = b.map(k => k ? `<button class="${k === active ? 'on' : ''}" data-nav="${k}">${IC[k]}${k === 'estatisticas' ? 'Stats' : VIEWS[k]}</button>`
    : `<button class="fab" data-action="add" aria-label="Adicionar">＋</button>`).join('');
}
function render() {
  if (!VIEWS[view]) view = 'dashboard';
  nav(view);
  const ml = monthLabel(cur); $('#monthLabel').textContent = ml[0].toUpperCase() + ml.slice(1);
  $('#viewTitle').textContent = VIEWS[view];
  const fn = { dashboard: vDashboard, movimentos: vMovimentos, estatisticas: vEstatisticas, objetivos: vObjetivos, definicoes: vDefinicoes }[view];
  $('#view').innerHTML = fn();
  $('#rightcol').innerHTML = vRight();
  const f = $('#importFile'); if (f) f.onchange = importFile;
}

/* ================= Sheets ================= */
function openSheet(html) {
  $('#sheet').innerHTML = '<div class="grab"></div>' + html;
  $('#backdrop').hidden = false;
  document.body.style.overflow = 'hidden';
}
function closeSheet() { $('#backdrop').hidden = true; document.body.style.overflow = ''; }
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2200);
}

function txForm({ mode = 'new', type = 'expense', fixed = false, item = {} } = {}) {
  const st = { type: item.type || type, cat: item.cat || CATS[item.type || type][0].id };
  const date = item.date || (cur === monthKey(new Date()) ? today() : cur + '-01');
  const draw = () => {
    openSheet(`
      <h3>${mode === 'new' ? 'Novo movimento' : mode === 'rec' ? 'Editar fixo' : 'Editar movimento'}</h3>
      <div class="seg glass" style="background:#fff">
        <button type="button" class="${st.type === 'expense' ? 'on' : ''}" data-t="expense">Despesa</button>
        <button type="button" class="${st.type === 'income' ? 'on' : ''}" data-t="income">Receita</button></div>
      <div class="field"><input class="input amount-input" id="fAmt" inputmode="decimal" placeholder="0,00" value="${item.amount != null ? String(item.amount).replace('.', ',') : ''}" style="color:${st.type === 'income' ? 'var(--primary)' : 'var(--neg)'}"></div>
      <div class="field"><label>Categoria</label><div class="cats">${CATS[st.type].map(c =>
        `<button type="button" class="${c.id === st.cat ? 'on' : ''}" data-c="${c.id}"><span class="avatar" style="background:${c.c}">${c.ic}</span>${c.name}</button>`).join('')}</div></div>
      <div class="field"><label>Descrição</label><input class="input" id="fDesc" maxlength="60" placeholder="ex.: Renda, Continente, Netflix…" value="${esc(item.desc || '')}"></div>
      <div class="field"><label>${mode === 'rec' ? 'Dia do mês' : 'Data'}</label>${mode === 'rec'
        ? `<input class="input" id="fDay" type="number" min="1" max="31" value="${item.day || 1}">`
        : `<input class="input" id="fDate" type="date" value="${date}">`}</div>
      ${mode === 'new' ? `<div class="field"><div class="switch-row"><div><b style="font-size:14px">Fixo mensal</b><small>Repete automaticamente todos os meses</small></div>
        <label class="toggle"><input type="checkbox" id="fFixed" ${fixed ? 'checked' : ''}><span></span></label></div></div>` : ''}
      <div class="row-btns">
        ${mode === 'tx' ? '<button class="btn danger" data-act="del">Apagar</button>' : ''}
        ${mode === 'rec' ? `<button class="btn danger" data-act="del">Apagar</button><button class="btn" data-act="stop">${item.end ? 'Retomar' : 'Terminar'}</button>` : ''}
        <button class="btn primary" data-act="save">Guardar</button></div>
      ${mode === 'rec' ? `<p style="font-size:11px;color:var(--muted);margin:12px 2px 0">Começou em ${monthLabel(item.start)}${item.end ? ` · terminou em ${monthLabel(item.end)}` : ''}. “Terminar” mantém o histórico e deixa de contar a partir do próximo mês; “Apagar” remove-o de todos os meses.</p>` : ''}`);
    const sh = $('#sheet');
    sh.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { keep(); st.type = b.dataset.t; st.cat = CATS[st.type][0].id; draw(); });
    sh.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { keep(); st.cat = b.dataset.c; draw(); });
    sh.querySelector('[data-act="save"]').onclick = submit;
    const del = sh.querySelector('[data-act="del"]'); if (del) del.onclick = remove;
    const stop = sh.querySelector('[data-act="stop"]'); if (stop) stop.onclick = stopRec;
    if (mode === 'new' && !item.amount) setTimeout(() => $('#fAmt')?.focus(), 250);
  };
  // keep typed values across redraws
  const keep = () => {
    const a = $('#fAmt'), d = $('#fDesc'), dt = $('#fDate'), dy = $('#fDay'), fx = $('#fFixed');
    if (a) item.amount = a.value ? a.value : undefined;
    if (d) item.desc = d.value;
    if (dt) item.date = dt.value;
    if (dy) item.day = +dy.value;
    if (fx) fixed = fx.checked;
  };
  const submit = () => {
    const amount = parseAmt($('#fAmt').value);
    if (!(amount > 0)) { toast('Indica um valor válido'); return; }
    const desc = $('#fDesc').value.trim();
    if (mode === 'rec') {
      const r = S.recurring.find(x => x.id === item.id);
      Object.assign(r, { type: st.type, cat: st.cat, amount, desc, day: Math.min(31, Math.max(1, +$('#fDay').value || 1)) });
    } else {
      const d = $('#fDate').value || today();
      if (mode === 'new' && $('#fFixed').checked) {
        S.recurring.push({ id: uid(), type: st.type, cat: st.cat, amount, desc, day: +d.slice(8, 10), start: d.slice(0, 7), end: null });
      } else if (mode === 'new') {
        S.tx.push({ id: uid(), type: st.type, cat: st.cat, amount, desc, date: d });
      } else {
        Object.assign(S.tx.find(x => x.id === item.id), { type: st.type, cat: st.cat, amount, desc, date: d });
      }
    }
    save(); closeSheet(); render(); toast('Guardado ✓');
  };
  const remove = () => {
    if (!confirm(mode === 'rec' ? 'Apagar este fixo de todos os meses?' : 'Apagar este movimento?')) return;
    if (mode === 'rec') S.recurring = S.recurring.filter(x => x.id !== item.id);
    else S.tx = S.tx.filter(x => x.id !== item.id);
    save(); closeSheet(); render(); toast('Apagado');
  };
  const stopRec = () => {
    const r = S.recurring.find(x => x.id === item.id);
    if (r.end) r.end = null;
    else { const now = monthKey(new Date()); r.end = cur > now ? cur : now; if (r.end < r.start) r.end = r.start; }
    save(); closeSheet(); render(); toast(r.end ? 'Fixo terminado' : 'Fixo retomado');
  };
  draw();
}

function recList() {
  const rows = S.recurring.map(r => {
    const c = cat(r.type, r.cat);
    return `<button class="tx" data-action="edit-rec" data-id="${r.id}"><span class="avatar" style="background:${c.c}">${c.ic}</span>
      <span class="info"><b>${esc(r.desc || c.name)}</b><small>Dia ${r.day} · desde ${monthLabel(r.start, { month: 'short', year: 'numeric' })}${r.end ? ' · terminado' : ''}</small></span>
      <span class="amt ${r.type === 'income' ? 'pos' : 'neg'}">${r.type === 'income' ? '+' : '−'}${fmt(r.amount)}</span></button>`;
  }).join('');
  openSheet(`<h3>Fixos mensais</h3>${rows || '<div class="empty">Ainda não tens fixos.</div>'}
    <button class="btn primary block" style="margin-top:12px" data-action="add" data-fixed="1">＋ Novo fixo</button>`);
}

function goalForm(g) {
  const isNew = !g; g = g || { name: '', target: '', saved: 0, deadline: '', emoji: '🎯' };
  let emoji = g.emoji;
  openSheet(`<h3>${isNew ? 'Novo objetivo' : 'Editar objetivo'}</h3>
    <div class="field"><label>Ícone</label><div class="emoji-pick">${GOAL_EMOJIS.map(e => `<button type="button" class="${e === emoji ? 'on' : ''}" data-e="${e}">${e}</button>`).join('')}</div></div>
    <div class="field"><label>Nome</label><input class="input" id="gName" maxlength="40" placeholder="ex.: Férias, Fundo de emergência" value="${esc(g.name)}"></div>
    <div class="field"><label>Valor a atingir</label><input class="input" id="gTarget" inputmode="decimal" placeholder="0,00" value="${g.target ? String(g.target).replace('.', ',') : ''}"></div>
    ${isNew ? `<div class="field"><label>Já tenho poupado</label><input class="input" id="gSaved" inputmode="decimal" placeholder="0,00"></div>` : ''}
    <div class="field"><label>Prazo (opcional)</label><input class="input" id="gDeadline" type="month" value="${g.deadline || ''}"></div>
    <div class="row-btns">${isNew ? '' : '<button class="btn danger" data-act="del">Apagar</button>'}<button class="btn primary" data-act="save">Guardar</button></div>`);
  const sh = $('#sheet');
  sh.querySelectorAll('[data-e]').forEach(b => b.onclick = () => {
    emoji = b.dataset.e; sh.querySelectorAll('[data-e]').forEach(x => x.classList.toggle('on', x === b));
  });
  sh.querySelector('[data-act="save"]').onclick = () => {
    const name = $('#gName').value.trim(), target = parseAmt($('#gTarget').value);
    if (!name || !(target > 0)) { toast('Indica nome e valor'); return; }
    const deadline = $('#gDeadline').value || '';
    if (isNew) S.goals.push({ id: uid(), name, target, saved: Math.max(0, parseAmt($('#gSaved').value) || 0), deadline, emoji, history: [] });
    else Object.assign(g, { name, target, deadline, emoji });
    save(); closeSheet(); render(); toast('Objetivo guardado ✓');
  };
  const del = sh.querySelector('[data-act="del"]');
  if (del) del.onclick = () => { if (confirm('Apagar este objetivo?')) { S.goals = S.goals.filter(x => x.id !== g.id); save(); closeSheet(); render(); } };
}

function contribForm(g, sign) {
  openSheet(`<h3>${sign > 0 ? 'Juntar a' : 'Retirar de'} “${esc(g.name)}”</h3>
    <div class="field"><input class="input amount-input" id="cAmt" inputmode="decimal" placeholder="0,00" style="color:${sign > 0 ? 'var(--primary)' : 'var(--neg)'}"></div>
    <p style="text-align:center;font-size:12px;color:var(--muted);margin:-4px 0 14px">Atual: ${fmt(g.saved)} de ${fmt(g.target)}</p>
    <button class="btn primary block" data-act="ok">${sign > 0 ? 'Juntar' : 'Retirar'}</button>`);
  setTimeout(() => $('#cAmt')?.focus(), 250);
  $('#sheet [data-act="ok"]').onclick = () => {
    const v = parseAmt($('#cAmt').value);
    if (!(v > 0)) { toast('Indica um valor válido'); return; }
    g.saved = Math.max(0, Math.round((g.saved + sign * v) * 100) / 100);
    (g.history = g.history || []).push({ date: today(), amount: sign * v });
    save(); closeSheet(); render();
    toast(g.saved >= g.target ? 'Objetivo atingido! 🎉' : 'Atualizado ✓');
  };
}

/* ================= Backup ================= */
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function importFile(e) {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!Array.isArray(d.tx) || !Array.isArray(d.goals)) throw 0;
      if (!confirm('Substituir os dados atuais pela cópia importada?')) return;
      S = Object.assign(blank(), d); save(); render(); toast('Cópia importada ✓');
    } catch { toast('Ficheiro inválido'); }
  };
  r.readAsText(file);
}
function csv() {
  const rows = [['Data', 'Tipo', 'Fixo', 'Categoria', 'Descrição', 'Valor']];
  for (const e of entries(cur).reverse()) rows.push([e.date, e.type === 'income' ? 'Receita' : 'Despesa', e.fixed ? 'Sim' : 'Não', cat(e.type, e.cat).name, e.desc || '', (e.type === 'income' ? '' : '-') + e.amount.toFixed(2).replace('.', ',')]);
  download(`savvy-${cur}.csv`, '﻿' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n'), 'text/csv');
}

/* Demo data so the dashboard can be previewed */
function demo() {
  const now = monthKey(new Date()), start = addMonths(now, -7);
  S.recurring = [
    { id: uid(), type: 'income', cat: 'salario', amount: 1650, desc: 'Salário', day: 25, start, end: null },
    { id: uid(), type: 'expense', cat: 'casa', amount: 550, desc: 'Renda', day: 1, start, end: null },
    { id: uid(), type: 'expense', cat: 'contas', amount: 62.4, desc: 'Luz e água', day: 8, start, end: null },
    { id: uid(), type: 'expense', cat: 'subs', amount: 13.99, desc: 'Netflix', day: 12, start, end: null },
    { id: uid(), type: 'expense', cat: 'subs', amount: 32, desc: 'Ginásio', day: 3, start, end: null },
    { id: uid(), type: 'expense', cat: 'contas', amount: 29.99, desc: 'Internet', day: 15, start, end: null }
  ];
  const samples = [['super', 'Continente', 40, 95], ['rest', 'Jantar fora', 18, 45], ['transp', 'Gasolina', 35, 60], ['lazer', 'Cinema', 8, 22],
    ['compras', 'Roupa', 25, 90], ['super', 'Pingo Doce', 15, 50], ['saude', 'Farmácia', 6, 25], ['rest', 'Café', 2, 6]];
  S.tx = [];
  for (let i = 0; i < 8; i++) {
    const k = addMonths(start, i), maxDay = k === now ? new Date().getDate() : daysIn(k);
    const n = 6 + Math.floor(Math.random() * 6);
    for (let j = 0; j < n; j++) {
      const [c, d, a, b] = samples[Math.floor(Math.random() * samples.length)];
      S.tx.push({ id: uid(), type: 'expense', cat: c, desc: d, amount: Math.round((a + Math.random() * (b - a)) * 100) / 100, date: k + '-' + pad(1 + Math.floor(Math.random() * maxDay)) });
    }
    if (i % 3 === 1) S.tx.push({ id: uid(), type: 'income', cat: 'extra', desc: 'Freelance', amount: 180, date: k + '-' + pad(Math.min(18, maxDay)) });
  }
  S.goals = [
    { id: uid(), name: 'Fundo de emergência', target: 5000, saved: 2150, deadline: addMonths(now, 10), emoji: '🛟', history: [] },
    { id: uid(), name: 'Férias no verão', target: 1200, saved: 480, deadline: addMonths(now, 7), emoji: '🏖️', history: [] }
  ];
  save(); render(); toast('Dados de exemplo carregados');
}

/* ================= Events ================= */
document.addEventListener('click', e => {
  const n = e.target.closest('[data-nav]');
  if (n) { location.hash = n.dataset.nav; closeSheet(); return; }
  const a = e.target.closest('[data-action]'); if (!a) return;
  const act = a.dataset.action, id = a.dataset.id;
  switch (act) {
    case 'prev-month': cur = addMonths(cur, -1); render(); break;
    case 'next-month': cur = addMonths(cur, 1); render(); break;
    case 'add': txForm({ type: a.dataset.type || 'expense', fixed: !!a.dataset.fixed }); break;
    case 'edit-tx': txForm({ mode: 'tx', item: { ...S.tx.find(t => t.id === id) } }); break;
    case 'edit-rec': txForm({ mode: 'rec', item: { ...S.recurring.find(r => r.id === id) } }); break;
    case 'filter': movFilter = a.dataset.f; render(); break;
    case 'add-goal': goalForm(); break;
    case 'edit-goal': goalForm(S.goals.find(g => g.id === id)); break;
    case 'contrib': contribForm(S.goals.find(g => g.id === id), 1); break;
    case 'withdraw': contribForm(S.goals.find(g => g.id === id), -1); break;
    case 'list-rec': recList(); break;
    case 'export': download(`savvy-backup-${today()}.json`, JSON.stringify(S, null, 2), 'application/json'); toast('Cópia exportada'); break;
    case 'csv': csv(); break;
    case 'reset': if (confirm('Apagar todos os dados? Isto não pode ser desfeito.')) { S = blank(); save(); render(); toast('Dados apagados'); } break;
    case 'demo': demo(); break;
    case 'install': deferredPrompt?.prompt(); break;
  }
});
document.addEventListener('change', e => {
  if (e.target.matches('[data-action="currency"]')) { S.currency = e.target.value; save(); render(); }
});
$('#backdrop').addEventListener('click', e => { if (e.target.id === 'backdrop') closeSheet(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
window.addEventListener('hashchange', () => { view = location.hash.slice(1) || 'dashboard'; render(); window.scrollTo(0, 0); });

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; if (view === 'definicoes') render(); });

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});

render();
