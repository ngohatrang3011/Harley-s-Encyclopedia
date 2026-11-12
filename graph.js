// Small dependency-free force-directed graph on <canvas>.
// Supports drag, pan, wheel/pinch zoom, hover highlighting and click.
class ForceGraph {
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.o = Object.assign({
      linkDistance: 70, charge: 420, gravity: 0.045, collidePad: 22, labelAspect: 0.42,
      minZoom: 0.25, maxZoom: 3, maxFitZoom: 1.5,
      padding: () => ({ top: 40, right: 40, bottom: 40, left: 40 }),
      getColor: () => "#888", getStatus: () => null,
      onClick: () => {}, labelAll: true, focusId: null,
    }, opts);

    const index = new Map();
    this.nodes = opts.nodes.map((n, i) => {
      // Phyllotaxis seed gives a deterministic, even starting layout.
      const a = i * 2.399963, rad = 24 * Math.sqrt(i + 0.5);
      const node = { ...n, x: Math.cos(a) * rad, y: Math.sin(a) * rad, vx: 0, vy: 0 };
      index.set(n.id, node);
      return node;
    });
    this.index = index;
    this.links = opts.links
      .map(l => ({ s: index.get(l.source), t: index.get(l.target), w: l.w || 1 }))
      .filter(l => l.s && l.t);
    this.adj = new Map(this.nodes.map(n => [n.id, new Set()]));
    for (const l of this.links) { this.adj.get(l.s.id).add(l.t.id); this.adj.get(l.t.id).add(l.s.id); }
    for (const n of this.nodes) {
      n.r = n.r || 5 + Math.sqrt(this.adj.get(n.id).size) * 2.4;
      if (n.id === this.o.focusId) { n.fx = 0; n.fy = 0; n.r += 3; }
    }

    this.view = { x: 0, y: 0, k: 1 };
    this.hover = null;
    this.highlight = null;
    this.alpha = 1;
    this.alphaTarget = 0;
    this.pointers = new Map();
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.refreshColors();
    // Stretch gravity so the settled layout matches the shape of the free area.
    this.resize();
    const p = this.o.padding();
    const aw = this.w - p.left - p.right, ah = this.h - p.top - p.bottom;
    const ratio = aw > 0 && ah > 0 ? Math.min(2.6, Math.max(0.5, aw / ah)) : 1;
    this.gx = this.o.gravity / ratio; this.gy = this.o.gravity * Math.sqrt(ratio);
    const warm = this.nodes.length > 250 ? 140 : 320;
    for (let i = 0; i < warm; i++) this.tick();
    this.alpha = this.reduced ? 0 : 0.06;

    this._bind();
    // Refit on resize (window resize, phone rotation) until the user has panned or zoomed.
    this.ro = new ResizeObserver(() => { this.resize(); if (!this._fitted || !this.userMoved) { this.fit(); this._fitted = this.w > 0; } this.dirty = true; });
    this.ro.observe(canvas.parentElement);
    this.resize(); this.fit(); this._fitted = this.w > 0;
    this._loop = this._loop.bind(this);
    this.raf = requestAnimationFrame(this._loop);
  }

  // ── Physics ──
  tick() {
    const { nodes, links, o } = this, a = this.alpha;
    const n = nodes.length;
    for (let i = 0; i < n; i++) {
      const p = nodes[i];
      for (let j = i + 1; j < n; j++) {
        const q = nodes[j];
        let dx = q.x - p.x, dy = q.y - p.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
        const d = Math.sqrt(d2);
        // Many-body repulsion
        const f = (o.charge * a) / d2;
        p.vx -= dx * f; p.vy -= dy * f; q.vx += dx * f; q.vy += dy * f;
        // Collision, anisotropic: labels are wide, so nodes need more room side by side.
        const min = p.r + q.r + o.collidePad;
        const ex = dx * o.labelAspect, de = Math.sqrt(ex * ex + dy * dy) || 1;
        if (de < min) {
          const push = ((min - de) / de) * 0.25;
          p.x -= dx * push * 0.5; p.y -= dy * push * 0.5; q.x += dx * push * 0.5; q.y += dy * push * 0.5;
        }
      }
    }
    for (const l of links) {
      const dx = l.t.x - l.s.x, dy = l.t.y - l.s.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      // Heavier links (more shared entries) pull a little closer.
      const L = o.linkDistance / (1 + 0.12 * Math.min(l.w - 1, 6));
      const k = ((d - L) / d) * 0.12 * a;
      l.s.vx += dx * k; l.s.vy += dy * k; l.t.vx -= dx * k; l.t.vy -= dy * k;
    }
    for (const p of nodes) {
      p.vx -= p.x * this.gx * a; p.vy -= p.y * this.gy * a;
      if (p.fx != null) { p.x = p.fx; p.y = p.fy; p.vx = p.vy = 0; continue; }
      p.vx *= 0.6; p.vy *= 0.6;
      p.x += p.vx; p.y += p.vy;
    }
    this.alpha += (this.alphaTarget - this.alpha) * 0.03;
  }

  _loop() {
    if (this.alpha > 0.003 || this.alphaTarget > 0) { this.tick(); this.dirty = true; }
    if (this.dirty) { this.draw(); this.dirty = false; }
    this.raf = requestAnimationFrame(this._loop);
  }

  // ── View ──
  resize() {
    const r = this.canvas.parentElement.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = r.width; this.h = r.height;
    this.canvas.width = Math.max(1, Math.round(r.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * this.dpr));
    this.canvas.style.width = r.width + "px";
    this.canvas.style.height = r.height + "px";
  }

  fit() {
    if (!this.w || !this.nodes.length) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of this.nodes) {
      x0 = Math.min(x0, n.x - n.r - 40); x1 = Math.max(x1, n.x + n.r + 40);
      y0 = Math.min(y0, n.y - n.r - 10); y1 = Math.max(y1, n.y + n.r + 24);
    }
    const p = this.o.padding();
    const aw = Math.max(50, this.w - p.left - p.right), ah = Math.max(50, this.h - p.top - p.bottom);
    const k = Math.min(aw / (x1 - x0), ah / (y1 - y0), this.o.maxFitZoom);
    this.view.k = k;
    this.view.x = p.left + aw / 2 - ((x0 + x1) / 2) * k;
    this.view.y = p.top + ah / 2 - ((y0 + y1) / 2) * k;
    this.dirty = true;
  }

  zoomAt(sx, sy, factor) {
    this.userMoved = true;
    const v = this.view;
    const k = Math.min(this.o.maxZoom, Math.max(this.o.minZoom, v.k * factor));
    const f = k / v.k;
    v.x = sx - (sx - v.x) * f; v.y = sy - (sy - v.y) * f; v.k = k;
    this.dirty = true;
  }
  zoomBy(f) { this.zoomAt(this.w / 2, this.h / 2, f); }

  toWorld(sx, sy) { return { x: (sx - this.view.x) / this.view.k, y: (sy - this.view.y) / this.view.k }; }

  hit(sx, sy) {
    const p = this.toWorld(sx, sy);
    const slop = 6 / this.view.k;
    let best = null, bd = Infinity;
    for (const n of this.nodes) {
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d < n.r + slop && d < bd) { best = n; bd = d; }
    }
    return best;
  }

  setHighlight(ids) { this.highlight = ids && ids.size ? ids : null; this.dirty = true; }

  refreshColors() {
    const cs = getComputedStyle(document.documentElement);
    const v = name => cs.getPropertyValue(name).trim();
    this.colors = {
      bg: v("--bg"), text: v("--text"), muted: v("--muted"),
      edge: v("--graph-edge"), edgeStrong: v("--graph-edge-strong"),
      learned: v("--status-learned"), learning: v("--status-learning"), toLearn: v("--status-to-learn"), open: v("--c-question"),
      glow: parseFloat(v("--glow-r")) || 0,
    };
    this.catColors = {};
    for (const n of this.nodes) this.catColors[n.cat] ??= v(`--c-${n.cat}`) || "#888";
    this.dirty = true;
  }

  // ── Render ──
  draw() {
    const { ctx, colors: C, view: v } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    const hov = this.hover;
    const focus = hov ? new Set([hov.id, ...this.adj.get(hov.id)]) : null;
    const hl = this.highlight;
    const isOn = id => (focus ? focus.has(id) : hl ? hl.has(id) : true);

    ctx.save();
    ctx.translate(v.x, v.y); ctx.scale(v.k, v.k);

    // Edges
    ctx.lineCap = "round";
    for (const l of this.links) {
      const strong = focus ? (l.s === hov || l.t === hov) : hl ? (hl.has(l.s.id) && hl.has(l.t.id)) : false;
      const dim = (focus || hl) && !strong;
      ctx.globalAlpha = dim ? 0.35 : 1;
      ctx.strokeStyle = strong ? C.edgeStrong : C.edge;
      ctx.lineWidth = ((strong ? 1.8 : 1.1) + Math.min(5, (l.w - 1) * 1.4)) / v.k;
      ctx.beginPath(); ctx.moveTo(l.s.x, l.s.y); ctx.lineTo(l.t.x, l.t.y); ctx.stroke();
    }

    // Nodes
    for (const n of this.nodes) {
      const on = isOn(n.id);
      ctx.globalAlpha = on ? 1 : 0.2;
      const col = this.catColors[n.cat];
      const status = this.o.getStatus(n.id);
      if (status) {
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = status === "learned" ? C.learned : status === "learning" ? C.learning : status === "open" ? C.open : C.toLearn;
        ctx.lineWidth = 2.2;
        ctx.setLineDash(status === "to-learn" || status === "open" ? [3, 3] : []);
        ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.beginPath(); ctx.arc(n.x, n.y, n === hov ? n.r + 1.5 : n.r, 0, Math.PI * 2);
      if (n.hollow) { ctx.fillStyle = C.bg; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = col; ctx.stroke(); }
      else {
        ctx.fillStyle = col;
        if (C.glow && on) { ctx.shadowColor = col; ctx.shadowBlur = C.glow * 2; }
        ctx.fill(); ctx.shadowBlur = 0;
      }
      if (n.id === this.o.focusId) { ctx.lineWidth = 2; ctx.strokeStyle = C.bg; ctx.stroke(); }
    }
    ctx.restore();

    // Labels in screen space so they stay crisp at any zoom. Placed greedily
    // (emphasized first, then best-connected) and skipped if they would collide.
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.lineJoin = "round";
    const emph = n => n === hov || n.id === this.o.focusId || (hl && hl.has(n.id)) || (focus && focus.has(n.id));
    const order = this.nodes
      .map(n => ({ n, e: !!emph(n), deg: this.adj.get(n.id).size }))
      .sort((a, b) => (b.e - a.e) || (b.n === hov) - (a.n === hov) || (!!a.n.hollow - !!b.n.hollow) || b.deg - a.deg);
    const placed = [];
    const drawn = [];
    for (const { n, e } of order) {
      if (!this.o.labelAll && !e) continue;
      const size = e ? 13 : 12;
      ctx.font = `${e ? 600 : 500} ${size}px Inter, system-ui, sans-serif`;
      const w = ctx.measureText(n.label).width;
      const sx = n.x * v.k + v.x, sy = (n.y + n.r + 4) * v.k + v.y + 1;
      const box = { x0: sx - w / 2 - 3, x1: sx + w / 2 + 3, y0: sy - 1, y1: sy + size + 2 };
      const clash = placed.some(b => box.x0 < b.x1 && box.x1 > b.x0 && box.y0 < b.y1 && box.y1 > b.y0);
      if (clash && n !== hov) continue;
      placed.push(box);
      drawn.push({ n, e, sx, sy, font: ctx.font });
    }
    // Paint in reverse so higher-priority labels end up on top.
    for (let i = drawn.length - 1; i >= 0; i--) {
      const { n, e, sx, sy, font } = drawn[i];
      ctx.font = font;
      ctx.globalAlpha = isOn(n.id) ? 1 : 0.25;
      ctx.strokeStyle = C.bg; ctx.lineWidth = 4;
      ctx.strokeText(n.label, sx, sy);
      ctx.fillStyle = e ? C.text : C.muted;
      ctx.fillText(n.label, sx, sy);
    }
    ctx.globalAlpha = 1;
  }

  // ── Input ──
  _bind() {
    const c = this.canvas;
    const pos = e => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

    this._down = e => {
      c.setPointerCapture(e.pointerId);
      const p = pos(e);
      this.pointers.set(e.pointerId, p);
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) };
        if (this.drag?.node && this.drag.node.id !== this.o.focusId) this.drag.node.fx = this.drag.node.fy = null;
        this.drag = null; this.alphaTarget = 0;
        return;
      }
      const node = this.hit(p.x, p.y);
      this.drag = { node, start: p, last: p, moved: false };
      if (node) { node.fx = node.x; node.fy = node.y; }
    };
    this._move = e => {
      const p = pos(e);
      if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, p);
      if (this.pinch && this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        this.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / this.pinch.d);
        this.pinch.d = d;
        return;
      }
      const dr = this.drag;
      if (dr) {
        if (!dr.moved && Math.hypot(p.x - dr.start.x, p.y - dr.start.y) > 4) dr.moved = true;
        if (dr.moved) {
          if (dr.node) {
            const w = this.toWorld(p.x, p.y);
            dr.node.fx = w.x; dr.node.fy = w.y;
            this.alphaTarget = 0.25;
          } else {
            this.view.x += p.x - dr.last.x; this.view.y += p.y - dr.last.y;
            this.userMoved = true; this.dirty = true;
          }
        }
        dr.last = p;
        return;
      }
      const h = this.hit(p.x, p.y);
      if (h !== this.hover) {
        this.hover = h; this.dirty = true;
        c.style.cursor = h ? "pointer" : "grab";
        this.o.onHover?.(h);
      }
    };
    this._up = e => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
      const dr = this.drag;
      this.drag = null;
      if (!dr) return;
      if (dr.node && dr.node.id !== this.o.focusId) { dr.node.fx = dr.node.fy = null; }
      this.alphaTarget = 0;
      if (dr.node && !dr.moved) this.o.onClick(dr.node);
    };
    this._leave = () => { if (!this.drag && this.hover) { this.hover = null; this.dirty = true; this.o.onHover?.(null); } };
    this._wheel = e => {
      e.preventDefault();
      const p = pos(e);
      this.zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
    };

    c.addEventListener("pointerdown", this._down);
    c.addEventListener("pointermove", this._move);
    c.addEventListener("pointerup", this._up);
    c.addEventListener("pointercancel", this._up);
    c.addEventListener("pointerleave", this._leave);
    c.addEventListener("wheel", this._wheel, { passive: false });
    c.style.cursor = "grab";
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    const c = this.canvas;
    c.removeEventListener("pointerdown", this._down);
    c.removeEventListener("pointermove", this._move);
    c.removeEventListener("pointerup", this._up);
    c.removeEventListener("pointercancel", this._up);
    c.removeEventListener("pointerleave", this._leave);
    c.removeEventListener("wheel", this._wheel);
  }
}
window.ForceGraph = ForceGraph;
