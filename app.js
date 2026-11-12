(function () {
  "use strict";

  // ════════════ Helpers ════════════
  const $ = (s, el = document) => el.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
  const plain = t => String(t || "").replace(/`|\*\*|\*/g, "").replace(/\s+/g, " ").trim();
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const app = $("#app");

  const pad = n => String(n).padStart(2, "0");
  const dayKey = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const keyToDate = k => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
  function dayLabel(k) {
    if (k === dayKey(Date.now())) return "Today";
    const y = new Date(); y.setDate(y.getDate() - 1);
    if (k === dayKey(y)) return "Yesterday";
    const d = keyToDate(k);
    return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", ...(d.getFullYear() !== new Date().getFullYear() && { year: "numeric" }) });
  }
  const shortDate = ts => new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", ...(new Date(ts).getFullYear() !== new Date().getFullYear() && { year: "numeric" }) });
  const timeLabel = ts => new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  function relTime(ts) {
    const s = (Date.now() - ts) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
    return shortDate(ts);
  }

  const I = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const ICON = {
    search: I('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    trash: I('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
    sun: I('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    moon: I('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>'),
    plus: I('<path d="M12 5v14M5 12h14"/>'),
    minus: I('<path d="M5 12h14"/>'),
    fit: I('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    left: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18 9 12l6-6"/></svg>',
    x: I('<path d="M6 6l12 12M18 6 6 18"/>'),
    edit: I('<path d="M4 20h4L19 9l-4-4L4 16v4Z"/>'),
    link: I('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
    note: I('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/>'),
    question: I('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.4M12 17h.01"/>'),
    keyword: I('<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>'),
    shuffle: I('<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>'),
    reply: I('<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v5"/>'),
    merge: I('<path d="M6 3v6a6 6 0 0 0 6 6h6M15 12l3 3-3 3M6 21v-3"/>'),
  };

  const KIND = {
    note: { label: "Note", plural: "Notes", prompt: "What did you learn? Write #keyword to file it under a keyword." },
    question: { label: "Question", plural: "Questions", prompt: "What are you wondering about?" },
  };
  const PALETTE = ["computing", "humanities", "science", "math", "ai", "meta", "creative"];

  // ════════════ Persistent state ════════════
  const KEY = "polymath:v1";
  const fresh = () => ({ v: 3, keywords: {}, items: {}, status: {}, done: {}, liked: {}, custom: {}, draft: null, theme: null });
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); return s ? Object.assign(fresh(), s, { v: s.v || 2 }) : fresh(); }
    catch { return fresh(); }
  }
  const store = load();
  let saveWarned = false;
  let sync = null; // cloud sync (sync.js), started at boot
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(store)); saveWarned = false; sync?.noteChange(); return true; }
    catch {
      if (!saveWarned) toast("Couldn't save: browser storage is full or blocked. Export a backup.");
      saveWarned = true; return false;
    }
  }
  let saveTimer;
  const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); };

  // ════════════ Model: keywords and items ════════════
  const items = () => Object.values(store.items);
  const keywords = () => Object.values(store.keywords);
  const TAG_RE = /(^|[\s(])#([\p{L}\p{N}][\p{L}\p{N}_-]*)/gu;
  const keyOf = name => String(name).trim().toLowerCase().replace(/[\s_-]+/g, "-").replace(/[^\p{L}\p{N}+#.-]/gu, "").replace(/^-+|-+$/g, "");
  const cleanName = name => String(name).trim().replace(/\s+/g, " ").slice(0, 80);
  const findKeyword = name => { const k = keyOf(name); return k ? keywords().find(x => keyOf(x.name) === k) : null; };
  function ensureKeyword(name, extra = {}) {
    const n = cleanName(name);
    if (!keyOf(n)) return null;
    const found = findKeyword(n);
    if (found) return found;
    const now = Date.now();
    const k = { id: uid(), name: n, desc: "", related: [], created: now, updated: now, ...extra };
    store.keywords[k.id] = k;
    return k;
  }
  const hashNames = text => [...String(text || "").matchAll(TAG_RE)].map(m => m[2].replace(/[-_]+/g, " "));
  function resolveKws(p) {
    const ids = [];
    for (const n of [...(p.kwNames || []), ...hashNames(p.text)]) {
      const k = ensureKeyword(n);
      if (k && !ids.includes(k.id)) ids.push(k.id);
    }
    return ids;
  }
  const touch = ids => { const now = Date.now(); for (const id of ids) if (store.keywords[id]) store.keywords[id].updated = now; };
  function saveNew(p, extra = {}) {
    const ts = extra.created || Date.now();
    const it = { id: uid(), kind: p.kind === "question" ? "question" : "note", text: p.text.trim(), kws: resolveKws(p), created: ts, updated: ts };
    if (it.kind === "question") it.answered = false;
    if (extra.answers) it.answers = extra.answers;
    store.items[it.id] = it;
    if (!extra.created) touch(it.kws);
    return it;
  }
  function updateItem(it, p) {
    const was = it.kind;
    Object.assign(it, { kind: p.kind === "question" ? "question" : "note", text: p.text.trim(), kws: resolveKws(p), updated: Date.now() });
    if (it.kind === "question" && was !== "question") it.answered = false;
    if (it.kind !== "question") delete it.answered;
    touch(it.kws);
  }
  function deleteItem(id) {
    delete store.items[id];
    for (const it of items()) if (it.answers === id) delete it.answers;
  }
  function deleteKeyword(id) {
    delete store.keywords[id];
    for (const it of items()) it.kws = it.kws.filter(x => x !== id);
    for (const k of keywords()) k.related = (k.related || []).filter(x => x !== id);
  }
  function mergeKeyword(fromId, toId) {
    const from = store.keywords[fromId], to = store.keywords[toId];
    for (const it of items()) if (it.kws.includes(fromId)) it.kws = [...new Set(it.kws.map(x => (x === fromId ? toId : x)))];
    to.related = [...new Set([...(to.related || []), ...(from.related || [])])].filter(x => x !== toId && x !== fromId);
    for (const k of keywords()) if (k.related?.includes(fromId)) k.related = [...new Set(k.related.map(x => (x === fromId ? toId : x)))].filter(x => x !== k.id);
    if (!to.desc && from.desc) to.desc = from.desc;
    if (!to.lib && from.lib) to.lib = from.lib;
    delete store.keywords[fromId];
    touch([toId]);
  }
  // After changes arrive from another device: fold together keywords created
  // with the same name on two devices (the oldest wins, so every device picks
  // the same one), and drop references to things deleted elsewhere.
  function reconcile() {
    const groups = new Map();
    for (const k of keywords()) {
      if (!Array.isArray(k.related)) k.related = [];
      const key = keyOf(k.name);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(k);
    }
    for (const g of groups.values()) {
      if (g.length < 2) continue;
      g.sort((a, b) => (a.created || 0) - (b.created || 0) || (a.id < b.id ? -1 : 1));
      for (const k of g.slice(1)) mergeKeyword(k.id, g[0].id);
    }
    for (const it of items()) {
      const kws = (Array.isArray(it.kws) ? it.kws : []).filter(id => store.keywords[id]);
      if (kws.length !== it.kws?.length) it.kws = kws;
      if (it.answers && !store.items[it.answers]) delete it.answers;
    }
    for (const k of keywords()) {
      const rel = k.related.filter(id => id !== k.id && store.keywords[id]);
      if (rel.length !== k.related.length) k.related = rel;
    }
  }
  function relate(a, b) { const k = store.keywords[a]; if (k && a !== b) k.related = [...new Set([...(k.related || []), b])]; }
  function unrelate(a, b) {
    if (store.keywords[a]) store.keywords[a].related = (store.keywords[a].related || []).filter(x => x !== b);
    if (store.keywords[b]) store.keywords[b].related = (store.keywords[b].related || []).filter(x => x !== a);
  }

  // Keyword graph: keywords are nodes; entries filed under two keywords connect them.
  function buildIndex() {
    const kwItems = new Map(keywords().map(k => [k.id, []]));
    const pairs = new Map();
    const addPair = (a, b, shared, explicit) => {
      if (a === b || !kwItems.has(a) || !kwItems.has(b)) return;
      const [x, y] = a < b ? [a, b] : [b, a], key = x + "|" + y;
      const p = pairs.get(key) || { a: x, b: y, shared: 0, explicit: false };
      p.shared += shared; p.explicit ||= explicit; p.w = p.shared + (p.explicit && !p.shared ? 1 : 0);
      pairs.set(key, p);
    };
    for (const it of items()) {
      const ks = [...new Set(it.kws)].filter(id => kwItems.has(id));
      for (const id of ks) kwItems.get(id).push(it);
      for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) addPair(ks[i], ks[j], 1, false);
    }
    for (const k of keywords()) for (const r of k.related || []) addPair(k.id, r, 0, true);
    const nb = new Map();
    for (const p of pairs.values()) {
      (nb.get(p.a) || nb.set(p.a, []).get(p.a)).push({ id: p.b, shared: p.shared, explicit: p.explicit, w: p.w });
      (nb.get(p.b) || nb.set(p.b, []).get(p.b)).push({ id: p.a, shared: p.shared, explicit: p.explicit, w: p.w });
    }
    // Connected clusters get a shared color; isolated keywords stay neutral.
    const parent = new Map(keywords().map(k => [k.id, k.id]));
    const find = x => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
    for (const p of pairs.values()) parent.set(find(p.a), find(p.b));
    const groups = new Map();
    for (const k of keywords()) { const r = find(k.id); (groups.get(r) || groups.set(r, []).get(r)).push(k.id); }
    const color = new Map(), clusters = [...groups.values()].sort((a, b) => b.length - a.length);
    clusters.forEach((g, i) => g.forEach(id => color.set(id, g.length > 1 ? PALETTE[i % PALETTE.length] : "tag")));
    return {
      kwItems, pairs: [...pairs.values()],
      neighbors: id => (nb.get(id) || []).slice().sort((x, y) => y.w - x.w),
      color: id => color.get(id) || "tag",
      last: id => Math.max(store.keywords[id]?.updated || 0, ...(kwItems.get(id) || []).map(i => i.updated)),
    };
  }

  // Suggest keywords for a piece of text: mentions of a keyword's name, plus shared rare words.
  const STOP = new Set(("a an the and or but if of to in on at for with from by is are was were be been being it its this that these those as i me my we our " +
    "you your he she they them their what which who whom how why when where do does did can could should would will just not no so than then there here " +
    "about into over also very more most some any all each like get got one two use used using way make made thing things really still even much many").split(" "));
  const tokens = text => (String(text).toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [])
    .filter(w => !STOP.has(w)).map(w => w.replace(/ies$/, "y").replace(/([^s])s$/, "$1"));
  const mentions = (text, name) => name.length >= 2 && new RegExp(`(^|[^\\p{L}\\p{N}])${reEsc(name.toLowerCase())}($|[^\\p{L}\\p{N}])`, "u").test(text.toLowerCase());
  function scoreKeywords(text, excludeIds, idx, limit = 5) {
    const q = new Set(tokens(text));
    if (!text.trim()) return [];
    const docs = keywords().filter(k => !excludeIds.has(k.id)).map(k => ({
      k, name: new Set(tokens(k.name)),
      words: new Set([...tokens(k.name), ...tokens(k.desc || ""), ...(idx.kwItems.get(k.id) || []).flatMap(i => tokens(i.text))]),
    }));
    const df = new Map();
    for (const d of docs) for (const w of d.words) df.set(w, (df.get(w) || 0) + 1);
    const N = Math.max(docs.length, 1);
    return docs.map(d => {
      let s = mentions(text, d.k.name) ? 6 : 0;
      for (const w of q) if (d.words.has(w)) s += Math.log(1 + N / df.get(w)) * (d.name.has(w) ? 2.2 : 1);
      return { k: d.k, s };
    }).filter(x => x.s > 1.6).sort((a, b) => b.s - a.s).slice(0, limit).map(x => x.k);
  }

  function searchKeywords(q, exclude = new Set()) {
    q = q.trim().toLowerCase().replace(/^#/, "");
    const pool = keywords().filter(k => !exclude.has(k.id));
    if (!q) return pool.sort((a, b) => b.updated - a.updated);
    return pool.map(k => {
      const n = k.name.toLowerCase();
      const s = n === q ? 10 : n.startsWith(q) ? 6 : n.split(/[\s-]+/).some(w => w.startsWith(q)) ? 4 : n.includes(q) ? 3 : (k.desc || "").toLowerCase().includes(q) ? 1 : 0;
      return { k, s };
    }).filter(x => x.s).sort((a, b) => b.s - a.s || b.k.updated - a.k.updated).map(x => x.k);
  }
  const searchItems = q => { q = q.trim().toLowerCase(); return q ? items().filter(i => i.text.toLowerCase().includes(q)).sort((a, b) => b.updated - a.updated) : []; };
  const itemHref = it => (it.kws[0] && store.keywords[it.kws[0]] ? `#/k/${it.kws[0]}/${it.id}` : `#/day/${dayKey(it.created)}/${it.id}`);

  // ════════════ Migration from the entries/links version ════════════
  function migrateEntries(old) {
    const list = Object.values(old || {}).filter(e => e && typeof e.title === "string");
    if (!list.length) return 0;
    const map = new Map();
    const oldTags = e => {
      const s = new Set(e.tags || []);
      for (const m of `${e.title}\n${e.body || ""}`.matchAll(TAG_RE)) s.add(m[2].toLowerCase());
      return [...s].map(t => t.replace(/[-_]+/g, " "));
    };
    for (const e of list.filter(e => e.type === "topic")) {
      const k = ensureKeyword(e.title, { created: e.created || Date.now(), updated: e.updated || Date.now() });
      if (!k) continue;
      if (e.body && !k.desc) k.desc = e.body.replace(/\[\[([^\]]+)\]\]/g, "$1").trim();
      if (e.lib) k.lib = e.lib;
      map.set(e.id, k.id);
    }
    const byTitle = new Map(list.map(e => [e.title.trim().toLowerCase(), e]));
    for (const e of list.filter(e => e.type === "topic")) for (const t of oldTags(e)) { const tk = ensureKeyword(t); if (tk) relate(map.get(e.id), tk.id); }
    let n = 0;
    for (const e of list.filter(e => e.type !== "topic")) {
      const kws = new Set(oldTags(e).map(t => ensureKeyword(t)?.id).filter(Boolean));
      for (const id of e.links || []) if (map.has(id)) kws.add(map.get(id));
      for (const m of (e.body || "").matchAll(/\[\[([^\[\]\n]+)\]\]/g)) { const t = byTitle.get(m[1].trim().toLowerCase()); if (t && map.has(t.id)) kws.add(map.get(t.id)); }
      for (const o of list) if (o.type === "topic" && (o.links || []).includes(e.id)) kws.add(map.get(o.id));
      const body = (e.body || "").replace(/\[\[([^\]]+)\]\]/g, "$1").trim();
      const it = { id: e.id, kind: e.type === "question" ? "question" : "note", text: body ? `**${e.title}**\n\n${body}` : e.title, kws: [...kws], created: e.created || Date.now(), updated: e.updated || e.created || Date.now() };
      if (it.kind === "question") it.answered = !!e.answered;
      store.items[it.id] = it; n++;
    }
    return n;
  }
  if (store.v < 3) {
    if (store.entries && Object.keys(store.entries).length) {
      try { localStorage.setItem(KEY + ":backup-before-keywords", JSON.stringify(store)); } catch { /* ignore */ }
      migrateEntries(store.entries);
    }
    delete store.entries;
    if (store.draft && typeof store.draft.text !== "string") store.draft = null;
    store.v = 3;
    save();
  }

  // ════════════ Rendering helpers ════════════
  function inline(s) {
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (_, c) => `\u0000${codes.push(c) - 1}\u0000`);
    s = s.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g, u => `<a href="${u}" target="_blank" rel="noopener noreferrer">${trunc(u.replace(/^https?:\/\//, ""), 60)}</a>`);
    s = s.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*\w])\*([^*\s][^*\n]*?)\*(?!\w)/g, "$1<em>$2</em>");
    s = s.replace(TAG_RE, (m, pre, t) => { const k = findKeyword(t.replace(/[-_]+/g, " ")); return k ? `${pre}<a class="tag" href="#/k/${k.id}">#${t}</a>` : m; });
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[+i]}</code>`);
  }
  function renderText(text) {
    let html = "", para = [], list = [];
    const flushP = () => { if (para.length) { html += `<p>${para.join("<br>")}</p>`; para = []; } };
    const flushL = () => { if (list.length) { html += `<ul>${list.map(i => `<li>${i}</li>`).join("")}</ul>`; list = []; } };
    for (const raw of esc(text || "").split("\n")) {
      if (/^\s*[-*]\s+/.test(raw)) { flushP(); list.push(inline(raw.replace(/^\s*[-*]\s+/, ""))); }
      else if (!raw.trim()) { flushP(); flushL(); }
      else if (/^&gt;\s?/.test(raw)) { flushP(); flushL(); html += `<blockquote>${inline(raw.replace(/^&gt;\s?/, ""))}</blockquote>`; }
      else { flushL(); para.push(inline(raw)); }
    }
    flushP(); flushL();
    return html;
  }
  const kindBadge = it => `<span class="type-badge" style="--c:var(--c-${it.kind})">${ICON[it.kind]}${KIND[it.kind].label}</span>`;
  const qState = it => it.kind === "question" ? `<span class="q-state${it.answered ? " is-answered" : ""}">${it.answered ? "Answered" : "Open"}</span>` : "";
  const kwChip = (k, idx, extra = "") => `<a class="chip kw-chip" href="#/k/${k.id}" style="--c:var(--c-${idx.color(k.id)})"><span class="dot"></span>${esc(k.name)}${extra}</a>`;
  const kwOption = (k, idx) => {
    const n = idx.kwItems.get(k.id)?.length || 0;
    return `<span class="dot" style="--c:var(--c-${idx.color(k.id)})"></span><div><div class="r-title">${esc(k.name)}</div><div class="r-sum">${n} ${n === 1 ? "entry" : "entries"}${k.desc ? " · " + esc(trunc(k.desc, 60)) : ""}</div></div>`;
  };

  function suggestBox(wrap) {
    const ul = document.createElement("ul");
    ul.className = "results suggest"; ul.hidden = true; ul.setAttribute("role", "listbox");
    wrap.appendChild(ul);
    let list = [], sel = 0, pick = null;
    const mark = () => { [...ul.children].forEach((li, i) => li.setAttribute("aria-selected", String(i === sel))); ul.children[sel]?.scrollIntoView({ block: "nearest" }); };
    ul.addEventListener("mousedown", e => { const li = e.target.closest("[data-i]"); if (li) { e.preventDefault(); pick(list[+li.dataset.i]); } });
    ul.addEventListener("mousemove", e => { const li = e.target.closest("[data-i]"); if (li && +li.dataset.i !== sel) { sel = +li.dataset.i; mark(); } });
    return {
      open(l, onPick) {
        list = l; pick = onPick; sel = 0;
        if (!l.length) { this.close(); return; }
        ul.innerHTML = l.map((it, i) => `<li role="option" data-i="${i}" aria-selected="${i === 0}">${it.html}</li>`).join("");
        ul.hidden = false;
      },
      close() { ul.hidden = true; list = []; },
      key(e) {
        if (ul.hidden || !list.length) return false;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length; mark(); return true; }
        if ((e.key === "Enter" && !e.ctrlKey && !e.metaKey) || e.key === "Tab") { e.preventDefault(); pick(list[sel]); return true; }
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); this.close(); return true; }
        return false;
      },
    };
  }

  // A small "pick a keyword" input (autocomplete + create) used in several places.
  function keywordPicker(wrap, input, { exclude = () => new Set(), onPick, allowCreate = true, createLabel = q => `Create keyword “${esc(q)}”` }) {
    const box = suggestBox(wrap);
    const update = () => {
      const idx = buildIndex(), q = input.value.trim().replace(/^#/, "");
      const list = searchKeywords(q, exclude()).slice(0, 7).map(k => ({ html: kwOption(k, idx), id: k.id, name: k.name }));
      if (allowCreate && q && !findKeyword(q)) list.push({ html: `<span class="opt-new">${ICON.plus} ${createLabel(q)}</span>`, create: q });
      box.open(list, it => { input.value = ""; box.close(); onPick(it); });
    };
    input.addEventListener("input", update);
    input.addEventListener("focus", update);
    input.addEventListener("keydown", e => {
      if (box.key(e)) return;
      if (e.key === "Enter") { e.preventDefault(); const q = input.value.trim(); if (q && allowCreate) { input.value = ""; box.close(); const k = findKeyword(q); onPick(k ? { id: k.id, name: k.name } : { create: q }); } }
    });
    input.addEventListener("blur", () => setTimeout(() => box.close(), 150));
    return box;
  }

  // ════════════ Editor ════════════
  function editorHTML(d, { compact = false, submitLabel = "Save", cancel = false, dateTs } = {}) {
    const kind = d.kind === "question" ? "question" : "note";
    const ts = dateTs || d.created;
    return `<form class="editor${compact ? " compact" : ""}" autocomplete="off" novalidate>
      <div class="editor-top">
        <div class="segmented type-pick" role="radiogroup" aria-label="Kind of entry">
          ${Object.entries(KIND).map(([k, t]) => `<button type="button" role="radio" data-kind="${k}" aria-checked="${k === kind}" style="--sc:var(--c-${k})">${ICON[k]}${t.label}</button>`).join("")}
        </div>
        <span class="faint" style="font-size:13px">${ts ? `${dayLabel(dayKey(ts))} · ${timeLabel(ts)}` : `Today · ${timeLabel(Date.now())}`}</span>
      </div>
      <div class="ta-wrap"><textarea name="text" rows="${compact ? 2 : 4}" aria-label="Entry text" placeholder="${esc(KIND[kind].prompt)}">${esc(d.text || "")}</textarea></div>
      <div class="editor-row kw-row">
        <span class="faint kw-label">Keywords</span>
        <span class="kw-picked"></span>
        <div class="ac-wrap kw-wrap"><input class="input kw-input" placeholder="+ Add keyword" aria-label="Add a keyword"></div>
      </div>
      <div class="suggestions" hidden></div>
      <div class="editor-actions">
        <span class="hint faint">Ctrl + Enter to save</span>
        ${cancel ? '<button type="button" class="btn" data-cancel>Cancel</button>' : ""}
        <button class="btn primary" type="submit">${esc(submitLabel)}</button>
      </div>
    </form>`;
  }

  function wireEditor(form, init, { onSave, onCancel, onChange }) {
    const st = {
      kind: init.kind === "question" ? "question" : "note",
      names: init.kwNames ? [...init.kwNames] : (init.kws || []).map(id => store.keywords[id]?.name).filter(Boolean),
      dismissed: new Set(),
    };
    const text = $("[name=text]", form), kwInput = $(".kw-input", form), sugEl = $(".suggestions", form);
    const has = n => st.names.some(x => keyOf(x) === keyOf(n));
    const payload = () => ({ kind: st.kind, text: text.value, kwNames: [...st.names] });
    let sugTimer;
    const changed = () => {
      if (!form.isConnected) return;
      onChange?.(payload());
      clearTimeout(sugTimer); sugTimer = setTimeout(renderSuggestions, 250);
    };

    form.querySelectorAll("[data-kind]").forEach(b => b.addEventListener("click", () => {
      st.kind = b.dataset.kind;
      form.querySelectorAll("[data-kind]").forEach(x => x.setAttribute("aria-checked", String(x === b)));
      text.placeholder = KIND[st.kind].prompt;
      changed();
    }));

    function renderChips() {
      const idx = buildIndex();
      $(".kw-picked", form).innerHTML = st.names.map(n => {
        const k = findKeyword(n);
        return `<span class="chip removable kw-chip" style="--c:var(--c-${k ? idx.color(k.id) : "tag"})"><span class="dot"></span>${esc(k ? k.name : n)}${k ? "" : ' <span class="faint" style="font-size:11px">new</span>'}<button type="button" data-drop-kw="${esc(n)}" aria-label="Remove keyword ${esc(n)}">${ICON.x}</button></span>`;
      }).join("");
    }
    const addName = n => { n = cleanName(n.replace(/^#/, "")); if (keyOf(n) && !has(n)) { st.names.push(n); st.dismissed.delete(keyOf(n)); } renderChips(); changed(); };
    form.addEventListener("click", e => {
      const d = e.target.closest("[data-drop-kw]");
      if (d) { st.names = st.names.filter(x => x !== d.dataset.dropKw); st.dismissed.add(keyOf(d.dataset.dropKw)); renderChips(); changed(); return; }
      const s = e.target.closest("[data-add-kw]");
      if (s) addName(s.dataset.addKw);
    });

    // Finished #hashtags in the text become keyword chips as you type.
    text.addEventListener("input", () => {
      const v = text.value, before = st.names.length;
      for (const m of v.matchAll(TAG_RE)) {
        const end = m.index + m[0].length;
        if (end < v.length) { const n = m[2].replace(/[-_]+/g, " "); if (!has(n) && !st.dismissed.has(keyOf(n))) { const k = findKeyword(n); st.names.push(k ? k.name : n); } }
      }
      if (st.names.length !== before) renderChips();
      changed();
    });

    keywordPicker($(".kw-wrap", form), kwInput, {
      exclude: () => new Set(st.names.map(n => findKeyword(n)?.id).filter(Boolean)),
      onPick: it => addName(it.name || it.create),
      createLabel: q => `Add new keyword “${esc(q)}”`,
    });
    kwInput.addEventListener("keydown", e => {
      if (e.key === "Backspace" && !kwInput.value && st.names.length) { st.dismissed.add(keyOf(st.names.pop())); renderChips(); changed(); }
    });
    kwInput.addEventListener("input", () => { if (/,$/.test(kwInput.value)) { addName(kwInput.value.slice(0, -1)); kwInput.value = ""; } });

    function renderSuggestions() {
      if (!form.isConnected) return;
      const idx = buildIndex();
      const exclude = new Set(st.names.map(n => findKeyword(n)?.id).filter(Boolean));
      const rel = scoreKeywords(text.value, exclude, idx, 5);
      sugEl.hidden = !rel.length;
      sugEl.innerHTML = `<span class="muted">Suggested:</span>` + rel.map(k =>
        `<button type="button" class="chip suggest-chip" data-add-kw="${esc(k.name)}" style="--c:var(--c-${idx.color(k.id)})" title="Add keyword ${esc(k.name)}">${ICON.plus}${esc(k.name)}</button>`).join("");
    }

    form.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); form.requestSubmit(); } });
    form.addEventListener("submit", e => {
      e.preventDefault();
      if (kwInput.value.trim()) { addName(kwInput.value); kwInput.value = ""; }
      const p = payload();
      if (!p.text.trim()) { toast("Write something first"); text.focus(); return; }
      onSave(p);
    });
    $("[data-cancel]", form)?.addEventListener("click", onCancel);
    form.addEventListener("focusin", () => form.classList.add("expanded"));
    renderChips();
    if (text.value || st.names.length) { form.classList.add("expanded"); renderSuggestions(); }
    return { focus: () => text.focus() };
  }

  // ════════════ Item list (journal + keyword pages) ════════════
  function itemCard(it, ctx) {
    if (ctx.editing === it.id) return `<article class="entry-card item-card editing" data-item="${it.id}">${editorHTML(it, { submitLabel: "Save changes", cancel: true })}</article>`;
    const idx = ctx.idx;
    const kws = it.kws.map(id => store.keywords[id]).filter(Boolean);
    const shown = kws.filter(k => k.id !== ctx.currentKw);
    const answers = it.kind === "question" ? items().filter(x => x.answers === it.id).sort((a, b) => a.created - b.created) : [];
    const answered = it.answers && store.items[it.answers];
    const long = it.text.length > 360 || it.text.split("\n").length > 7;
    return `<article class="entry-card item-card" data-item="${it.id}" style="--c:var(--c-${it.kind})">
      <div class="ec-head">${kindBadge(it)}${qState(it)}<time datetime="${new Date(it.created).toISOString()}">${ctx.showDate ? shortDate(it.created) + " · " : ""}${timeLabel(it.created)}</time></div>
      <div class="item-text prose${long ? " clamped" : ""}">${renderText(it.text)}</div>
      ${answered ? `<div class="answers-ref">${ICON.reply.replace("<svg", '<svg width="14" height="14"')} Answers <a href="${itemHref(answered)}">${esc(trunc(plain(answered.text), 90))}</a></div>` : ""}
      ${answers.length ? `<ul class="answers">${answers.map(a => `<li><a href="${itemHref(a)}">${esc(trunc(plain(a.text), 160))}<span class="a-meta">Answer · ${relTime(a.created)}</span></a></li>`).join("")}</ul>` : ""}
      <div class="item-foot">
        <div class="kw-chips">${shown.map(k => kwChip(k, idx)).join("") || (kws.length ? "" : '<span class="unsorted-tag">No keyword yet</span>')}</div>
        <div class="item-actions">
          ${it.kind === "question" ? `<button class="mini-btn" data-act="answer">${it.answered ? "Add answer" : "Answer"}</button><button class="mini-btn" data-act="toggle">${it.answered ? "Reopen" : "Mark answered"}</button>` : ""}
          <button class="ghost-btn" data-act="edit" aria-label="Edit entry" title="Edit">${ICON.edit}</button>
          <button class="ghost-btn" data-act="delete" aria-label="Delete entry" title="Delete">${ICON.trash}</button>
        </div>
      </div>
      ${ctx.answering === it.id ? `<div class="answer-box">${editorHTML({ kind: "note", text: "", kws: it.kws }, { submitLabel: "Save answer", cancel: true })}</div>` : ""}
    </article>`;
  }

  function mountList(el, getItems, opts = {}) {
    const ctx = { editing: null, answering: null, currentKw: opts.currentKw, showDate: false };
    function render() {
      ctx.idx = buildIndex();
      const list = getItems();
      if (!list.length) { el.innerHTML = opts.empty ? opts.empty() : `<div class="empty-state">Nothing here yet.</div>`; return; }
      const groups = new Map();
      for (const it of list) { const k = dayKey(it.created); (groups.get(k) || groups.set(k, []).get(k)).push(it); }
      el.innerHTML = [...groups].map(([k, its]) => `
        <section class="day-group">
          <h2 class="day-head"><a href="#/day/${k}">${esc(dayLabel(k))}</a><span class="count">${its.length}</span></h2>
          ${its.map(it => itemCard(it, ctx)).join("")}
        </section>`).join("");
      if (ctx.editing && store.items[ctx.editing]) {
        const it = store.items[ctx.editing], f = $(`[data-item="${it.id}"] form`, el);
        wireEditor(f, it, {
          onSave: p => { updateItem(it, p); ctx.editing = null; if (save()) toast("Saved"); refresh(); },
          onCancel: () => { ctx.editing = null; render(); },
        });
        $("textarea", f).focus();
      }
      if (ctx.answering && store.items[ctx.answering]) {
        const q = store.items[ctx.answering], f = $(`[data-item="${q.id}"] .answer-box form`, el);
        wireEditor(f, { kind: "note", text: "", kws: q.kws }, {
          onSave: p => { saveNew(p, { answers: q.id }); q.answered = true; q.updated = Date.now(); ctx.answering = null; if (save()) toast("Answer saved, question marked answered"); refresh(); },
          onCancel: () => { ctx.answering = null; render(); },
        });
        $("textarea", f).focus();
      }
    }
    el.addEventListener("click", e => {
      const btn = e.target.closest("[data-act]");
      if (!btn || btn.closest("form")) return;
      const it = store.items[btn.closest("[data-item]")?.dataset.item];
      if (!it) return;
      const act = btn.dataset.act;
      if (act === "edit") { ctx.editing = it.id; ctx.answering = null; render(); }
      else if (act === "answer") { ctx.answering = it.id; ctx.editing = null; render(); }
      else if (act === "toggle") { it.answered = !it.answered; save(); toast(it.answered ? "Marked answered" : "Question reopened"); refresh(); }
      else if (act === "delete") {
        if (!confirm("Delete this entry? This can't be undone.")) return;
        deleteItem(it.id); save(); toast("Entry deleted"); refresh();
      }
    });
    render();
    return { render, ctx };
  }

  // ════════════ Toast / theme ════════════
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg; el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }
  const graphs = new Set();
  const themeBtn = $("#theme-toggle");
  const isDark = () => (store.theme ? store.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
  function applyTheme() {
    if (store.theme) document.documentElement.dataset.theme = store.theme;
    else delete document.documentElement.dataset.theme;
    themeBtn.innerHTML = isDark() ? ICON.sun : ICON.moon;
    themeBtn.setAttribute("aria-label", isDark() ? "Switch to light mode" : "Switch to dark mode");
    graphs.forEach(g => g.refreshColors());
  }
  themeBtn.addEventListener("click", () => { store.theme = isDark() ? "light" : "dark"; save(); applyTheme(); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { if (!store.theme) applyTheme(); });

  // ════════════ Router ════════════
  let cleanup = [];
  function teardown() {
    graphs.forEach(g => g.destroy()); graphs.clear();
    cleanup.forEach(fn => fn()); cleanup = [];
  }
  function route() {
    teardown();
    let parts;
    try { parts = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent); } catch { parts = [""]; }
    const [view, arg, focusItem] = parts;
    let nav = "journal";
    if (!view) renderJournal({});
    else if (view === "day" && /^\d{4}-\d{2}-\d{2}$/.test(arg)) renderJournal({ day: arg });
    else if (view === "unsorted") renderJournal({ unsorted: true });
    else if (view === "map") { nav = "map"; renderMap(); }
    else if (view === "keywords") { nav = "keywords"; renderKeywords(); }
    else if (view === "k" && store.keywords[arg]) { nav = "keywords"; renderKeyword(store.keywords[arg]); }
    else if (view === "tag" && arg) { const k = findKeyword(arg); if (k) { location.replace(`#/k/${k.id}`); return; } renderJournal({}); }
    else { if (view === "k") toast("That keyword no longer exists"); renderJournal({}); }
    document.querySelectorAll("[data-nav]").forEach(a => { if (a.dataset.nav === nav) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    window.scrollTo(0, 0);
    if (focusItem) {
      const el = $(`[data-item="${CSS.escape(focusItem)}"]`);
      if (el) { el.scrollIntoView({ block: "center" }); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1700); }
    }
  }
  const refresh = () => { const y = window.scrollY; route(); window.scrollTo(0, y); };
  window.addEventListener("hashchange", route);
  window.addEventListener("storage", e => {
    if (e.key !== KEY) return;
    const theme = store.theme;
    Object.assign(store, load());
    sync?.adopt();
    if (store.theme !== theme) applyTheme();
    if (!document.activeElement?.matches("input, textarea")) refresh();
  });

  // ════════════ Journal ════════════
  let feedKind = "all", feedQuery = "";
  function renderJournal({ day, unsorted }) {
    document.title = day ? `${dayLabel(day)} · Polymath` : unsorted ? "No keyword yet · Polymath" : "Journal · Polymath";
    const draft = store.draft && typeof store.draft.text === "string" ? store.draft : { kind: "note", text: "", kwNames: [] };
    const all = items();
    const count = k => (k === "all" ? all.length : all.filter(i => i.kind === k).length);

    app.innerHTML = `
      <div class="page journal">
        <div class="journal-grid">
          <div>
            <section class="card composer" aria-label="New entry">${editorHTML(draft, { compact: true })}</section>
            ${day || unsorted ? `<div class="active-filter">Showing <strong>${day ? esc(dayLabel(day)) : "entries without a keyword"}</strong> <a href="#/">Show everything</a></div>` : ""}
            <div class="feed-tools">
              <div class="segmented" role="radiogroup" aria-label="Filter by kind">
                ${[["all", "All"], ["note", "Notes"], ["question", "Questions"]].map(([k, l]) =>
                  `<button role="radio" data-feed-kind="${k}" aria-checked="${feedKind === k}">${l} <span class="count">${count(k)}</span></button>`).join("")}
              </div>
              <input class="input" id="feed-q" type="search" placeholder="Filter entries…" value="${esc(feedQuery)}" aria-label="Filter entries">
            </div>
            <div class="feed" aria-live="polite"></div>
          </div>
          <aside class="sidebar">${journalSidebar()}</aside>
        </div>
      </div>`;

    const form = $(".composer .editor");
    wireEditor(form, draft, {
      onChange: p => { store.draft = p.text.trim() || p.kwNames.length ? p : null; saveSoon(); },
      onSave: p => {
        const it = saveNew(p);
        store.draft = null;
        const n = it.kws.length;
        if (save()) toast(n ? `Saved under ${it.kws.map(id => store.keywords[id].name).join(", ")}` : "Saved. Add a keyword later to place it on the map.");
        refresh();
        $(".composer textarea")?.focus();
      },
    });

    const list = mountList($(".feed"), () => {
      let l = items().sort((a, b) => b.created - a.created);
      if (day) l = l.filter(i => dayKey(i.created) === day);
      if (unsorted) l = l.filter(i => !i.kws.some(id => store.keywords[id]));
      if (feedKind !== "all") l = l.filter(i => i.kind === feedKind);
      const q = feedQuery.trim().toLowerCase();
      if (q) l = l.filter(i => `${i.text} ${i.kws.map(id => store.keywords[id]?.name || "").join(" ")}`.toLowerCase().includes(q));
      return l;
    }, { empty: () => (items().length ? `<div class="empty-state">No entries match these filters.</div>` : welcomeHTML()) });

    $(".journal").addEventListener("click", e => {
      const fk = e.target.closest("[data-feed-kind]");
      if (fk) {
        feedKind = fk.dataset.feedKind;
        app.querySelectorAll("[data-feed-kind]").forEach(b => b.setAttribute("aria-checked", String(b === fk)));
        list.render();
      }
      if (e.target.closest("#load-examples")) { loadExamples(); refresh(); }
    });
    $("#feed-q").addEventListener("input", e => { feedQuery = e.target.value; list.render(); });
    wireDataButtons();
  }

  function welcomeHTML() {
    return `<div class="card welcome">
      <h2>Your learning diary</h2>
      <p>Write down what you learn and what you wonder about, as it happens. File each entry under one or more <strong>keywords</strong>. Keywords are the points on your map, and entries that share them draw the lines between them.</p>
      <ul class="welcome-list">
        <li style="--c:var(--c-note)">${ICON.note}<span><strong>Notes</strong>: something you learned, read or figured out.</span></li>
        <li style="--c:var(--c-question)">${ICON.question}<span><strong>Questions</strong>: what you're curious about. Answer them later, and the answer links back.</span></li>
        <li>${ICON.keyword}<span><strong>Keywords</strong>: pick them in the box, or just write <code>#sleep</code> in your text. Polymath suggests keywords it thinks fit.</span></li>
        <li>${ICON.link}<span><strong>Connections</strong>: an entry under <em>Sleep</em> and <em>Memory</em> links those two keywords. More shared entries make a thicker line.</span></li>
      </ul>
      <button class="btn" id="load-examples">${ICON.shuffle} Load example entries</button>
    </div>`;
  }

  function journalSidebar() {
    const all = items(), idx = buildIndex();
    const counts = new Map();
    for (const it of all) { const k = dayKey(it.created); counts.set(k, (counts.get(k) || 0) + 1); }
    const weeks = 17, today = new Date(); today.setHours(0, 0, 0, 0);
    const start = new Date(today); start.setDate(start.getDate() - today.getDay() - (weeks - 1) * 7);
    const todayK = dayKey(today);
    let cells = "";
    for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      const k = dayKey(d), n = counts.get(k) || 0, lvl = n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4;
      const label = `${n} ${n === 1 ? "entry" : "entries"} on ${d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`;
      cells += `<a class="hm-cell l${lvl}${k === todayK ? " is-today" : ""}" href="#/day/${k}" title="${label}" aria-label="${label}"></a>`;
    }
    let streak = 0;
    const d = new Date(today);
    if (!counts.has(dayKey(d))) d.setDate(d.getDate() - 1);
    while (counts.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1); }

    const open = all.filter(i => i.kind === "question" && !i.answered).sort((a, b) => b.created - a.created);
    const unsorted = all.filter(i => !i.kws.some(id => store.keywords[id])).length;
    const kws = keywords().filter(k => idx.kwItems.get(k.id).length).sort((a, b) => idx.kwItems.get(b.id).length - idx.kwItems.get(a.id).length);
    const stale = keywords().filter(k => idx.kwItems.get(k.id).length && Date.now() - idx.last(k.id) > 3 * 864e5)
      .sort((a, b) => idx.neighbors(a.id).length - idx.neighbors(b.id).length || idx.last(a.id) - idx.last(b.id)).slice(0, 6);
    const seed = [...todayK].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
    const revisit = stale.length ? stale[seed % stale.length] : null;

    return `
      <div class="card">
        <h3>Activity</h3>
        <div class="heatmap" role="group" aria-label="Entries per day, last ${weeks} weeks">${cells}</div>
        <div class="hm-stats"><span><strong>${all.length}</strong> entries</span><span><strong>${streak}</strong> day streak</span></div>
      </div>
      ${unsorted ? `<div class="card"><h3>No keyword yet <span class="count">${unsorted}</span></h3>
        <p class="side-note" style="margin:0 0 10px">${unsorted === 1 ? "This entry isn't" : "These entries aren't"} on your map yet. Add a keyword to connect ${unsorted === 1 ? "it" : "them"}.</p>
        <a class="btn" href="#/unsorted">Sort ${unsorted === 1 ? "it" : "them"}</a></div>` : ""}
      ${open.length ? `<div class="card"><h3>Open questions <span class="count">${open.length}</span></h3><ul class="mini-list">
        ${open.slice(0, 6).map(q => `<li><a href="${itemHref(q)}"><span class="dot" style="--c:var(--c-question)"></span><span>${esc(trunc(plain(q.text), 90))}<span class="sub">${q.kws.map(id => store.keywords[id]?.name).filter(Boolean).map(esc).join(", ") || "no keyword"} · ${relTime(q.created)}</span></span></a></li>`).join("")}
      </ul></div>` : ""}
      ${kws.length ? `<div class="card"><h3>Keywords <span class="count">${keywords().length}</span></h3><div class="tag-cloud">
        ${kws.slice(0, 18).map(k => kwChip(k, idx, ` <span class="count">${idx.kwItems.get(k.id).length}</span>`)).join("")}</div>
        <p class="side-note"><a href="#/keywords" style="color:var(--accent);text-decoration:none">All keywords →</a> · <a href="#/map" style="color:var(--accent);text-decoration:none">See the map →</a></p></div>` : ""}
      ${revisit ? `<div class="card resurface"><h3>Revisit</h3>
        <a class="rs-title" href="#/k/${revisit.id}">${esc(revisit.name)}</a>
        <p>Last entry ${relTime(idx.last(revisit.id))}${idx.neighbors(revisit.id).length ? "" : ", and it isn't connected to other keywords yet"}. Learned anything new about it?</p>
        <a class="btn" href="#/k/${revisit.id}">${ICON.plus} Add to it</a></div>` : ""}
      <div class="card"><h3>Your data</h3>
        <div class="toolbar">
          <button class="btn" data-export>Export</button>
          <label class="btn" tabindex="0" data-import-label>Import<input type="file" accept="application/json,.json" hidden data-import></label>
          ${sync?.enabled ? `<button class="btn" data-account>${esc(sync.accountLabel())}</button>` : ""}
        </div>
        <p class="side-note" data-sync-note>${esc(sync ? sync.note() : "Everything is stored in this browser only. Export a backup now and then.")}</p>
      </div>`;
  }

  function wireDataButtons() {
    $("[data-export]", app)?.addEventListener("click", () => {
      const { theme, draft, ...data } = store;
      const blob = new Blob([JSON.stringify({ app: "polymath", exported: new Date().toISOString(), ...data }, null, 2)], { type: "application/json" });
      const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `polymath-diary-${dayKey(Date.now())}.json` });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    $("[data-import-label]", app)?.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); $("[data-import]", app).click(); } });
    $("[data-import]", app)?.addEventListener("change", async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        const obj = v => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
        let added = 0, updated = 0;
        for (const [id, k] of Object.entries(obj(data.keywords))) {
          if (!k || typeof k.name !== "string" || !keyOf(k.name)) continue;
          const clean = { id, name: cleanName(k.name), desc: String(k.desc || ""), related: Array.isArray(k.related) ? k.related.map(String) : [], created: +k.created || Date.now(), updated: +k.updated || Date.now(), ...(k.lib && { lib: String(k.lib) }) };
          const dup = findKeyword(clean.name);
          if (dup && dup.id !== id) continue;
          if (!store.keywords[id] || clean.updated > store.keywords[id].updated) store.keywords[id] = clean;
        }
        for (const [id, it] of Object.entries(obj(data.items))) {
          if (!it || typeof it.text !== "string" || !it.text.trim()) continue;
          const clean = { id, kind: it.kind === "question" ? "question" : "note", text: it.text, kws: Array.isArray(it.kws) ? it.kws.map(String).filter(k => store.keywords[k]) : [], created: +it.created || Date.now(), updated: +it.updated || +it.created || Date.now() };
          if (clean.kind === "question") clean.answered = !!it.answered;
          if (it.answers) clean.answers = String(it.answers);
          const cur = store.items[id];
          if (!cur) { store.items[id] = clean; added++; } else if (clean.updated > cur.updated) { store.items[id] = clean; updated++; }
        }
        if (data.entries) added += migrateEntries(obj(data.entries)); // older export format
        for (const k of ["status", "done", "liked", "custom"]) Object.assign(store[k], obj(data[k]));
        save(); refresh();
        toast(`Imported: ${added} new, ${updated} updated`);
      } catch { toast("That file isn't a valid Polymath export"); }
    });
  }

  function loadExamples() {
    const D = 864e5, now = Date.now();
    const at = (daysAgo, h, m) => { const t = new Date(now - daysAgo * D); t.setHours(h, m, 0, 0); return Math.min(t.getTime(), now - 60000 * (10 - daysAgo)); };
    ensureKeyword("Spaced repetition", { desc: "Reviewing material at increasing intervals, right before you would forget it." });
    ensureKeyword("Rust", { desc: "A systems language I'm learning." });
    const add = (daysAgo, h, m, kind, text, kwNames, extra = {}) => saveNew({ kind, text, kwNames }, { created: at(daysAgo, h, m), ...extra });
    add(4, 9, 12, "note", "Reviewing something right before you would forget it makes the memory last much longer than cramming.", ["Spaced repetition", "Memory", "Learning"]);
    add(4, 21, 40, "note", "**The forgetting curve**: memory fades roughly exponentially after learning. Each successful review flattens the curve, so the next review can wait longer.", ["Memory", "Spaced repetition"]);
    const sleepQ = add(3, 8, 5, "question", "Why does sleep help memory?", ["Sleep", "Memory"]);
    add(3, 18, 30, "note", "Rust ownership in one sentence: every value has exactly **one owner**, and when the owner goes out of scope the value is dropped.", ["Rust"]);
    add(2, 12, 15, "note", "Borrow checker rules:\n- any number of shared references `&T`\n- **or** exactly one mutable reference `&mut T`\n- references never outlive their owner", ["Rust", "Programming"]);
    add(1, 22, 10, "question", "When should I use `Rc` instead of `Box`? Both put data on the heap.", ["Rust", "Programming"]);
    add(0, 8, 20, "note", "During deep (slow-wave) sleep the hippocampus replays recent experiences, which helps move them into long-term storage.", ["Sleep", "Memory"], { answers: sleepQ.id });
    sleepQ.answered = true;
    add(0, 9, 45, "note", "Testing beats re-reading: quizzing yourself gives better long-term retention than reading the same material again. It pairs well with #spaced-repetition.", ["Learning"]);
    add(0, 10, 5, "question", "Does handwriting notes help me remember more than typing them?", ["Learning", "Memory"]);
    // Date each example keyword by its entries rather than by "now".
    const idx = buildIndex();
    for (const k of keywords()) {
      const ts = idx.kwItems.get(k.id).map(i => i.created);
      if (ts.length) { k.created = Math.min(k.created, ...ts); k.updated = Math.max(...ts); }
    }
    save();
    toast("Loaded 9 example entries");
  }

  // ════════════ Keywords index ════════════
  let kwSort = "recent", kwFilter = "";
  function renderKeywords() {
    document.title = "Keywords · Polymath";
    const idx = buildIndex();
    app.innerHTML = `
      <div class="page">
        <h1 class="title">Keywords</h1>
        <p class="lede">${keywords().length ? `${keywords().length} keywords with ${idx.pairs.length} connections between them.` : "Keywords appear here as you file entries under them."}</p>
        <div class="kw-tools">
          <form class="create" id="kw-create" autocomplete="off"><input class="input" name="name" placeholder="New keyword…" aria-label="New keyword name" maxlength="80"><button class="btn primary" type="submit">${ICON.plus} Create</button></form>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <input class="input" id="kw-filter" type="search" placeholder="Filter keywords…" value="${esc(kwFilter)}" aria-label="Filter keywords">
            <div class="segmented" role="radiogroup" aria-label="Sort">
              ${[["recent", "Recent"], ["size", "Most entries"], ["az", "A–Z"]].map(([k, l]) => `<button role="radio" data-sort="${k}" aria-checked="${kwSort === k}">${l}</button>`).join("")}
            </div>
          </div>
        </div>
        <div class="grid" id="kw-grid"></div>
      </div>`;
    const grid = $("#kw-grid");
    function renderGrid() {
      let list = kwFilter.trim() ? searchKeywords(kwFilter) : keywords();
      const size = k => idx.kwItems.get(k.id).length;
      if (!kwFilter.trim()) list.sort(kwSort === "az" ? (a, b) => a.name.localeCompare(b.name) : kwSort === "size" ? (a, b) => size(b) - size(a) || idx.last(b.id) - idx.last(a.id) : (a, b) => idx.last(b.id) - idx.last(a.id));
      grid.innerHTML = list.length ? list.map(k => {
        const its = idx.kwItems.get(k.id), open = its.filter(i => i.kind === "question" && !i.answered).length;
        const latest = its.slice().sort((a, b) => b.created - a.created)[0];
        return `<a class="topic-card kw-card" href="#/k/${k.id}" style="--c:var(--c-${idx.color(k.id)})">
          <div class="tc-head"><span class="dot"></span>${esc(k.name)}</div>
          <p>${esc(k.desc || (latest ? plain(latest.text) : "No entries yet."))}</p>
          <div class="tc-foot"><span>${its.length} ${its.length === 1 ? "entry" : "entries"}${open ? ` · ${open} open` : ""} · ${idx.neighbors(k.id).length} linked</span><span>${relTime(idx.last(k.id))}</span></div>
        </a>`;
      }).join("") : `<div class="empty-state" style="grid-column:1/-1">${keywords().length ? "No keywords match." : 'No keywords yet. Write an entry in the <a href="#/">journal</a> and give it a keyword.'}</div>`;
    }
    renderGrid();
    $("#kw-filter").addEventListener("input", e => { kwFilter = e.target.value; renderGrid(); });
    app.querySelectorAll("[data-sort]").forEach(b => b.addEventListener("click", () => {
      kwSort = b.dataset.sort; app.querySelectorAll("[data-sort]").forEach(x => x.setAttribute("aria-checked", String(x === b))); renderGrid();
    }));
    $("#kw-create").addEventListener("submit", e => {
      e.preventDefault();
      const name = e.target.elements.namedItem("name").value.trim();
      if (!keyOf(name)) return;
      const existing = findKeyword(name);
      const k = existing || ensureKeyword(name);
      save();
      if (existing) toast(`“${k.name}” already exists`);
      location.hash = `#/k/${k.id}`;
    });
  }

  // ════════════ Keyword page ════════════
  function renderKeyword(k, editing = false) {
    document.title = `${k.name} · Polymath`;
    const idx = buildIndex();
    const its = idx.kwItems.get(k.id);
    const nb = idx.neighbors(k.id);
    const open = its.filter(i => i.kind === "question" && !i.answered).length;
    const color = idx.color(k.id);
    const rerender = ed => { const y = scrollY; teardown(); renderKeyword(store.keywords[k.id], ed); scrollTo(0, y); };
    let kindFilter = "all";

    app.innerHTML = `
      <article class="page keyword-page">
        <a class="back" href="#/keywords">${ICON.left} Keywords</a>
        <header class="kw-head">
          <div class="meta-line"><span class="pill" style="--c:var(--c-${color})">${ICON.keyword.replace("<svg", '<svg width="13" height="13"')} Keyword</span>
            <span>${its.length} ${its.length === 1 ? "entry" : "entries"}${open ? ` · ${open} open question${open === 1 ? "" : "s"}` : ""} · since ${shortDate(k.created)}</span></div>
          ${editing ? `<form class="kw-form" id="kw-edit" autocomplete="off">
              <input class="input" name="name" value="${esc(k.name)}" maxlength="80" aria-label="Keyword name" required>
              <textarea class="input" name="desc" rows="2" placeholder="What is this keyword about? (optional)" aria-label="Description">${esc(k.desc || "")}</textarea>
              <div class="row"><button class="btn primary" type="submit">Save</button><button class="btn" type="button" data-kact="cancel">Cancel</button></div>
            </form>`
            : `<h1 class="title">${esc(k.name)}</h1>${k.desc ? `<p class="lede">${esc(k.desc)}</p>` : ""}`}
          ${editing ? "" : `<div class="kw-actions">
            <button class="btn" data-kact="edit">${ICON.edit} ${k.desc ? "Edit" : "Rename / describe"}</button>
            <span class="merge-wrap ac-wrap"><button class="btn" data-kact="merge">${ICON.merge} Merge into…</button></span>
            <button class="btn danger" data-kact="delete">${ICON.trash} Delete</button>
          </div>`}
        </header>
        <div class="entry-layout">
          <div>
            <section class="card composer" aria-label="New entry in ${esc(k.name)}">${editorHTML({ kind: "note", text: "", kwNames: [k.name] }, { compact: true, submitLabel: `Add to ${trunc(k.name, 24)}` })}</section>
            <div class="feed-tools">
              <div class="segmented" role="radiogroup" aria-label="Filter by kind">
                ${[["all", "All", its.length], ["question", "Questions", its.filter(i => i.kind === "question").length], ["note", "Notes", its.filter(i => i.kind === "note").length]]
                  .map(([v, l, n]) => `<button role="radio" data-kfilter="${v}" aria-checked="${v === "all"}">${l} <span class="count">${n}</span></button>`).join("")}
              </div>
            </div>
            <div class="feed"></div>
          </div>
          <aside class="sidebar">
            ${nb.length ? `<div class="card"><h3>Neighborhood</h3><div class="mini-graph"><canvas aria-label="Keywords connected to ${esc(k.name)}"></canvas></div></div>` : ""}
            <div class="card"><h3>Connected keywords <span class="count">${nb.length}</span></h3>
              ${nb.length ? `<ul class="conn-mini">${nb.map(n => {
                const o = store.keywords[n.id];
                return `<li><span class="dot" style="--c:var(--c-${idx.color(o.id)});margin:0"></span><a href="#/k/${o.id}">${esc(o.name)}</a>
                  <span class="w">${n.shared ? `${n.shared} shared` : "related"}</span>
                  ${n.explicit ? `<button class="ghost-btn" data-unrelate="${o.id}" aria-label="Remove relation to ${esc(o.name)}" title="Remove relation">${ICON.x}</button>` : ""}</li>`;
              }).join("")}</ul>` : `<p class="side-note" style="margin:0 0 12px">Keywords connect when an entry is filed under both, or when you relate them here.</p>`}
              <div class="ac-wrap connect-wrap"><input class="input" id="relate" placeholder="Relate to keyword…" aria-label="Relate to another keyword"></div>
            </div>
            <div class="card maybe-card" hidden><h3>Might be related</h3><ul class="conn-mini" id="maybe"></ul></div>
          </aside>
        </div>
      </article>`;

    const page = $(".keyword-page");
    // Composer inside this keyword
    wireEditor($(".composer .editor", page), { kind: "note", text: "", kwNames: [k.name] }, {
      onSave: p => { saveNew(p); if (save()) toast(`Added to ${k.name}`); refresh(); $(".composer textarea")?.focus(); },
    });
    const list = mountList($(".feed", page), () => (buildIndex().kwItems.get(k.id) || []).filter(i => kindFilter === "all" || i.kind === kindFilter).sort((a, b) => b.created - a.created), {
      currentKw: k.id,
      empty: () => `<div class="empty-state">${its.length ? "Nothing of this kind yet." : `Nothing in <strong>${esc(k.name)}</strong> yet. Add a note or question above.`}</div>`,
    });
    page.querySelectorAll("[data-kfilter]").forEach(b => b.addEventListener("click", () => {
      kindFilter = b.dataset.kfilter; page.querySelectorAll("[data-kfilter]").forEach(x => x.setAttribute("aria-checked", String(x === b))); list.render();
    }));

    // Header actions
    page.addEventListener("click", e => {
      const ur = e.target.closest("[data-unrelate]");
      if (ur) { unrelate(k.id, ur.dataset.unrelate); save(); toast("Relation removed"); rerender(editing); return; }
      const rel = e.target.closest("[data-relate]");
      if (rel) { relate(k.id, rel.dataset.relate); save(); toast(`Related to ${store.keywords[rel.dataset.relate].name}`); rerender(editing); return; }
      const act = e.target.closest("[data-kact]")?.dataset.kact;
      if (act === "edit") rerender(true);
      else if (act === "cancel") rerender(false);
      else if (act === "delete") {
        if (!confirm(`Delete the keyword “${k.name}”? Its ${its.length} ${its.length === 1 ? "entry stays" : "entries stay"} in your journal; only the keyword is removed.`)) return;
        deleteKeyword(k.id); save(); toast("Keyword deleted"); location.hash = "#/keywords";
      } else if (act === "merge") {
        const wrap = e.target.closest(".merge-wrap");
        wrap.innerHTML = `<input class="input" placeholder="Merge “${esc(trunc(k.name, 18))}” into…" aria-label="Keyword to merge into">`;
        const inp = $("input", wrap);
        keywordPicker(wrap, inp, {
          exclude: () => new Set([k.id]), allowCreate: false,
          onPick: it => {
            const target = store.keywords[it.id];
            if (!target || !confirm(`Move all ${its.length} entries from “${k.name}” into “${target.name}” and remove “${k.name}”?`)) return;
            mergeKeyword(k.id, target.id); save(); toast(`Merged into ${target.name}`); location.hash = `#/k/${target.id}`;
          },
        });
        inp.focus();
      }
    });
    $("#kw-edit", page)?.addEventListener("submit", e => {
      e.preventDefault();
      const f = e.target.elements;
      const name = cleanName(f.namedItem("name").value), desc = f.namedItem("desc").value.trim();
      if (!keyOf(name)) { toast("A keyword needs a name"); return; }
      const dup = findKeyword(name);
      if (dup && dup.id !== k.id) { toast(`“${dup.name}” already exists. Use Merge to combine them.`); return; }
      Object.assign(k, { name, desc, updated: Date.now() });
      save(); toast("Saved"); rerender(false);
    });
    if (editing) $("#kw-edit [name=name]", page).focus();

    keywordPicker($(".connect-wrap", page), $("#relate", page), {
      exclude: () => new Set([k.id, ...nb.map(n => n.id)]),
      createLabel: q => `Create “${esc(q)}” and relate`,
      onPick: it => { const id = it.id || ensureKeyword(it.create).id; relate(k.id, id); save(); toast(`Related to ${store.keywords[id].name}`); rerender(false); },
    });

    // Might be related: keywords whose entries share words with this one's.
    const text = [k.name, k.desc || "", ...its.map(i => i.text)].join("\n");
    const maybe = scoreKeywords(text, new Set([k.id, ...nb.map(n => n.id)]), idx, 5);
    if (maybe.length) {
      $(".maybe-card", page).hidden = false;
      $("#maybe", page).innerHTML = maybe.map(m => `<li><span class="dot" style="--c:var(--c-${idx.color(m.id)});margin:0"></span><a href="#/k/${m.id}">${esc(m.name)}</a><button class="mini-btn" data-relate="${m.id}">${ICON.link.replace("<svg", '<svg width="12" height="12"')} Relate</button></li>`).join("");
    }

    if (nb.length) {
      const ids = new Set([k.id, ...nb.map(n => n.id)]);
      for (const id of [...ids]) for (const n of idx.neighbors(id)) if (ids.size < 16) ids.add(n.id);
      const g = new ForceGraph($(".mini-graph canvas", page), {
        nodes: [...ids].map(id => ({ id, label: trunc(store.keywords[id].name, 22), cat: idx.color(id), r: kwRadius(idx, id) * 0.85 })),
        links: idx.pairs.filter(p => ids.has(p.a) && ids.has(p.b)).map(p => ({ source: p.a, target: p.b, w: p.w })),
        focusId: k.id, linkDistance: 100, charge: 800, gravity: 0.05, collidePad: 30, maxFitZoom: 1,
        padding: () => ({ top: 10, right: 10, bottom: 10, left: 10 }),
        getStatus: id => (hasOpenQ(idx, id) ? "open" : null),
        onClick: n => { if (n.id !== k.id) location.hash = `#/k/${n.id}`; },
      });
      graphs.add(g);
    }
  }
  const kwRadius = (idx, id) => Math.min(24, 5 + Math.sqrt(idx.kwItems.get(id)?.length || 0) * 3);
  const hasOpenQ = (idx, id) => (idx.kwItems.get(id) || []).some(i => i.kind === "question" && !i.answered);

  // ════════════ Map ════════════
  function renderMap() {
    document.title = "Map · Polymath";
    const kws = keywords();
    if (!kws.length) {
      app.innerHTML = `<div class="map-empty"><div><h1>Your map is empty</h1><p class="muted">Write a few entries and give them keywords. Each keyword becomes a point, and shared entries connect them.</p><a class="btn primary" href="#/">Go to journal</a></div></div>`;
      return;
    }
    const idx = buildIndex();
    const unsorted = items().filter(i => !i.kws.some(id => store.keywords[id])).length;
    app.innerHTML = `
      <section class="home map">
        <div class="graph-wrap"><canvas aria-label="Map of your ${kws.length} keywords. Use the Keywords page for keyboard access."></canvas></div>
        <div class="map-toolbar">
          <div class="search">${ICON.search.replace("<svg", '<svg class="search-icon"')}<input id="map-q" type="search" placeholder="Find a keyword or text…" aria-label="Highlight keywords"></div>
          <span class="map-stats">${kws.length} keyword${kws.length === 1 ? "" : "s"} · ${idx.pairs.length} connection${idx.pairs.length === 1 ? "" : "s"} · ${items().length} entries${unsorted ? ` · <a href="#/unsorted" style="color:var(--accent);text-decoration:none">${unsorted} without keyword</a>` : ""}</span>
        </div>
        <div class="legend" role="group" aria-label="Highlight">
          <button class="chip" data-hl="open" aria-pressed="false" style="--c:var(--c-question)"><span class="dot" style="background:none;border:1.5px dashed var(--c)"></span>Has open questions</button>
          <button class="chip" data-hl="recent" aria-pressed="false" style="--c:var(--accent)"><span class="dot"></span>Active this week</button>
          <button class="chip" data-hl="lonely" aria-pressed="false" style="--c:var(--c-tag)"><span class="dot"></span>Not connected</button>
        </div>
        <div class="graph-hint">Bigger = more entries · Thicker line = more shared entries</div>
        <div class="zoom">
          <button class="icon-btn" data-zoom="in" aria-label="Zoom in">${ICON.plus}</button>
          <button class="icon-btn" data-zoom="out" aria-label="Zoom out">${ICON.minus}</button>
          <button class="icon-btn" data-zoom="fit" aria-label="Fit to screen">${ICON.fit}</button>
        </div>
        <div class="tooltip" hidden></div>
      </section>`;

    const home = $(".map"), tip = $(".tooltip", home), toolbar = $(".map-toolbar", home), legend = $(".legend", home);
    const g = new ForceGraph($("canvas", home), {
      nodes: kws.map(k => ({ id: k.id, label: trunc(k.name, 28), cat: idx.color(k.id), r: kwRadius(idx, k.id), hollow: !idx.kwItems.get(k.id).length })),
      links: idx.pairs.map(p => ({ source: p.a, target: p.b, w: p.w })),
      linkDistance: 80, charge: 520,
      padding: () => ({ top: toolbar.offsetTop + toolbar.offsetHeight + 12, right: 24, bottom: legend.offsetHeight + 40, left: 24 }),
      getStatus: id => (hasOpenQ(idx, id) ? "open" : null),
      onClick: n => { location.hash = `#/k/${n.id}`; },
      onHover: n => {
        if (!n) { tip.hidden = true; return; }
        const k = store.keywords[n.id], its = idx.kwItems.get(k.id);
        const notes = its.filter(i => i.kind === "note").length, qs = its.filter(i => i.kind === "question"), open = qs.filter(i => !i.answered).length;
        const nbs = idx.neighbors(k.id).slice(0, 4).map(x => store.keywords[x.id].name);
        tip.innerHTML = `<strong>${esc(k.name)}</strong>${k.desc ? esc(trunc(k.desc, 120)) : ""}
          <div class="t-meta">${notes} note${notes === 1 ? "" : "s"} · ${qs.length} question${qs.length === 1 ? "" : "s"}${open ? ` (${open} open)` : ""} · last ${relTime(idx.last(k.id))}</div>
          ${nbs.length ? `<div class="t-meta">Linked to ${nbs.map(esc).join(", ")}${idx.neighbors(k.id).length > 4 ? "…" : ""}</div>` : ""}`;
        tip.hidden = false;
        const v = g.view, sx = n.x * v.k + v.x, sy = n.y * v.k + v.y, w = tip.offsetWidth, h = tip.offsetHeight;
        let left = sx + 16;
        if (left + w > home.clientWidth - 8) left = sx - w - 16;
        tip.style.left = Math.max(8, left) + "px";
        tip.style.top = Math.min(Math.max(8, sy - h / 2), home.clientHeight - h - 8) + "px";
      },
    });
    graphs.add(g);

    let active = null;
    const input = $("#map-q", home);
    function highlight() {
      const q = input.value.trim().toLowerCase();
      let set = null;
      if (q) {
        set = new Set(searchKeywords(q).map(k => k.id));
        for (const it of searchItems(q)) it.kws.forEach(id => set.add(id));
      } else if (active === "open") set = new Set(kws.filter(k => hasOpenQ(idx, k.id)).map(k => k.id));
      else if (active === "recent") set = new Set(kws.filter(k => Date.now() - idx.last(k.id) < 7 * 864e5).map(k => k.id));
      else if (active === "lonely") set = new Set(kws.filter(k => !idx.neighbors(k.id).length).map(k => k.id));
      g.setHighlight(set);
    }
    input.addEventListener("input", () => { active = null; legend.classList.remove("has-active"); legend.querySelectorAll("[data-hl]").forEach(c => c.setAttribute("aria-pressed", "false")); highlight(); });
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") { const first = searchKeywords(input.value)[0]; if (first) location.hash = `#/k/${first.id}`; }
      if (e.key === "Escape") { input.value = ""; highlight(); input.blur(); }
    });
    legend.addEventListener("click", e => {
      const chip = e.target.closest("[data-hl]");
      if (!chip) return;
      active = active === chip.dataset.hl ? null : chip.dataset.hl;
      legend.classList.toggle("has-active", !!active);
      legend.querySelectorAll("[data-hl]").forEach(c => c.setAttribute("aria-pressed", String(c.dataset.hl === active)));
      input.value = ""; highlight();
    });
    home.addEventListener("click", e => {
      const z = e.target.closest("[data-zoom]");
      if (z) { if (z.dataset.zoom === "fit") g.fit(); else g.zoomBy(z.dataset.zoom === "in" ? 1.25 : 0.8); }
    });
  }

  // ════════════ Command palette ════════════
  function openPalette() {
    if ($(".palette-backdrop")) return;
    const prev = document.activeElement;
    const bd = document.createElement("div");
    bd.className = "palette-backdrop";
    bd.innerHTML = `<div class="palette" role="dialog" aria-modal="true" aria-label="Search">
      <div class="search">${ICON.search.replace("<svg", '<svg class="search-icon"')}
        <input placeholder="Search keywords and entries, or jot something down…" aria-label="Search" role="combobox" aria-expanded="true" aria-controls="pal-results" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div>
      <ul class="results" id="pal-results" role="listbox"></ul></div>`;
    document.body.appendChild(bd);
    const input = $("input", bd), ul = $("ul", bd);
    let list = [], sel = 0;
    const close = () => { bd.remove(); document.removeEventListener("keydown", onKey, true); if (prev?.isConnected) prev.focus(); };
    const pick = it => { close(); if (it.go) location.hash = it.go; else it.act(); };
    function render() {
      const q = input.value.trim(), idx = buildIndex();
      const ks = searchKeywords(q).slice(0, q ? 6 : 6).map(k => ({ group: q ? "Keywords" : "Recent keywords", html: kwOption(k, idx), go: `#/k/${k.id}` }));
      const es = searchItems(q).slice(0, 5).map(it => ({ group: "Entries", html: `<span class="dot" style="--c:var(--c-${it.kind})"></span><div><div class="r-title">${esc(trunc(plain(it.text), 90))}</div><div class="r-sum">${KIND[it.kind].label} · ${it.kws.map(id => store.keywords[id]?.name).filter(Boolean).map(esc).join(", ") || "no keyword"} · ${shortDate(it.created)}</div></div>`, go: itemHref(it) }));
      const acts = q ? [
        { group: "Create", html: `<span class="opt-new">${ICON.note} Save note: “${esc(trunc(q, 60))}”</span>`, act: () => quickSave("note", q) },
        { group: "Create", html: `<span class="opt-new">${ICON.question} Save question: “${esc(trunc(q, 60))}”</span>`, act: () => quickSave("question", q) },
        ...(!findKeyword(q) && q.length <= 60 ? [{ group: "Create", html: `<span class="opt-new">${ICON.keyword} New keyword “${esc(q)}”</span>`, act: () => { const k = ensureKeyword(q); save(); location.hash = `#/k/${k.id}`; } }] : []),
      ] : [];
      list = [...ks, ...es, ...acts];
      sel = 0;
      let last = null;
      ul.innerHTML = list.length ? list.map((it, i) => {
        const head = it.group !== last ? `<li class="group" aria-hidden="true">${it.group}</li>` : "";
        last = it.group;
        return head + `<li role="option" data-i="${i}" aria-selected="${i === 0}">${it.html}</li>`;
      }).join("") : `<li class="empty">Type to search, or to save a quick note. Use #keyword to file it.</li>`;
    }
    const mark = () => { ul.querySelectorAll("[data-i]").forEach(li => li.setAttribute("aria-selected", String(+li.dataset.i === sel))); ul.querySelector(`[data-i="${sel}"]`)?.scrollIntoView({ block: "nearest" }); };
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (list.length) { sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length; mark(); } }
      else if (e.key === "Enter") { e.preventDefault(); if (list[sel]) pick(list[sel]); }
    }
    document.addEventListener("keydown", onKey, true);
    input.addEventListener("input", render);
    ul.addEventListener("mousedown", e => { const li = e.target.closest("[data-i]"); if (li) { e.preventDefault(); pick(list[+li.dataset.i]); } });
    ul.addEventListener("mousemove", e => { const li = e.target.closest("[data-i]"); if (li && +li.dataset.i !== sel) { sel = +li.dataset.i; mark(); } });
    bd.addEventListener("mousedown", e => { if (e.target === bd) close(); });
    render(); input.focus();
  }
  function quickSave(kind, text) {
    const it = saveNew({ kind, text, kwNames: [] });
    if (save()) toast(it.kws.length ? `Saved under ${it.kws.map(id => store.keywords[id].name).join(", ")}` : "Saved to your journal (no keyword yet)");
    const h = itemHref(it);
    if (location.hash === h) refresh(); else location.hash = h;
  }
  $("#open-search").addEventListener("click", openPalette);
  document.addEventListener("keydown", e => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
    if ((e.key === "k" && (e.ctrlKey || e.metaKey)) || (e.key === "/" && !typing)) { e.preventDefault(); openPalette(); }
    else if (e.key === "n" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && !$(".palette-backdrop")) {
      e.preventDefault();
      if ($(".composer textarea")) $(".composer textarea").focus(); else { location.hash = "#/"; setTimeout(() => $(".composer textarea")?.focus(), 0); }
    }
  });

  sync = window.PolymathSync?.start({
    store, save, toast,
    onRemote: () => {
      reconcile(); save();
      if (!document.activeElement?.matches("input, textarea")) refresh();
    },
  }) || null;
  applyTheme();
  route();
})();
