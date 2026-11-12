// Cloud sync for Polymath: Supabase email sign-in plus record-level sync.
//
// Every keyword, entry and library mark is one row in the `records` table
// (see supabase/schema.sql). After each local save the store is diffed against
// the last snapshot; changed or removed records are queued with the time they
// changed, pushed, and the newest write wins (a trigger enforces this on the
// server). Pulls fetch rows changed since the last pull. Theme and the unsent
// draft stay on the device.
(function () {
  "use strict";

  const COLLS = ["items", "keywords", "status", "done", "liked", "custom"];
  const STATE_KEY = "polymath:v1:sync";
  const OVERLAP_MS = 30e3; // re-read a little history so late commits aren't missed
  const PAGE = 1000;       // PostgREST's default row cap
  const BATCH = 500;
  const has = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);

  function flatten(store) {
    const out = new Map();
    for (const c of COLLS) for (const [id, v] of Object.entries(store[c] || {})) out.set(c + ":" + id, JSON.stringify(v));
    return out;
  }
  const splitKey = key => { const i = key.indexOf(":"); return [key.slice(0, i), key.slice(i + 1)]; };
  // When local data first joins an account, date each record by its own
  // timestamps so a newer copy already in the account wins.
  function seedTime(coll, v) {
    if (coll === "items" || coll === "keywords") return +v?.updated || +v?.created || 1;
    if (coll === "done" || coll === "liked") return +v || 1;
    return 1;
  }

  // ════════════ Engine (no DOM; testable) ════════════
  function createEngine({ store, client, storage, save, onRemote = () => {}, now = Date.now }) {
    const read = () => {
      try { const s = JSON.parse(storage.getItem(STATE_KEY) || "null"); if (s && typeof s === "object") return { ...s, dirty: s.dirty || {} }; }
      catch { /* fall through */ }
      return { dirty: {} };
    };
    const write = s => { try { storage.setItem(STATE_KEY, JSON.stringify(s)); } catch { /* storage full */ } };
    let snap = flatten(store);
    let userId = null, running = null, again = false;

    // Call after every successful local save. Returns how many records changed.
    function noteChange() {
      const cur = flatten(store);
      let n = 0;
      const s = read();
      if (s.user) {
        const t = now();
        for (const [k, j] of cur) if (snap.get(k) !== j) { s.dirty[k] = t; n++; }
        for (const k of snap.keys()) if (!cur.has(k)) { s.dirty[k] = t; n++; }
        if (n) write(s);
      }
      snap = cur;
      return n;
    }
    // The store was replaced by another tab's save; that tab queued the changes.
    const adopt = () => { snap = flatten(store); };

    function begin(id) {
      const s = read();
      if (s.user && s.user !== id) throw new Error("Local data belongs to another account");
      if (!s.user) {
        const dirty = {};
        for (const c of COLLS) for (const [k, v] of Object.entries(store[c] || {})) dirty[c + ":" + k] = seedTime(c, v);
        write({ user: id, cursor: null, dirty });
      }
      userId = id;
    }
    const end = () => { userId = null; };
    const forget = () => { try { storage.removeItem(STATE_KEY); } catch { /* ignore */ } userId = null; };
    function wipe() {
      for (const c of COLLS) store[c] = {};
      store.draft = null;
      snap = flatten(store);
      save();
    }

    async function push() {
      for (;;) {
        const s = read();
        if (s.user !== userId) return;
        const batch = Object.entries(s.dirty).slice(0, BATCH);
        if (!batch.length) return;
        const rows = batch.map(([key, m]) => {
          const [coll, id] = splitKey(key);
          const live = has(store[coll], id);
          return { user_id: userId, coll, id, data: live ? store[coll][id] : null, deleted: !live, m };
        });
        const { error } = await client.from("records").upsert(rows, { onConflict: "user_id,coll,id" });
        if (error) throw error;
        const after = read();
        for (const [key, m] of batch) if (after.dirty[key] === m) delete after.dirty[key];
        write(after);
        if (batch.length < BATCH) return;
      }
    }

    async function pull() {
      const s = read();
      if (s.user !== userId) return;
      let since = s.cursor ? new Date(Date.parse(s.cursor) - OVERLAP_MS).toISOString() : null;
      let cursor = s.cursor, changed = false;
      for (;;) {
        let q = client.from("records").select("coll,id,data,deleted,m,updated_at").eq("user_id", userId)
          .order("updated_at", { ascending: true }).limit(PAGE);
        if (since) q = q.gt("updated_at", since);
        const { data, error } = await q;
        if (error) throw error;
        const st = read();
        if (st.user !== userId) return; // signed out mid-pull
        for (const row of data) {
          if (!COLLS.includes(row.coll)) continue;
          const key = row.coll + ":" + row.id;
          if (has(st.dirty, key)) {
            if (st.dirty[key] > row.m) continue; // our unpushed edit is newer
            delete st.dirty[key];
          }
          const bucket = store[row.coll] || (store[row.coll] = {});
          if (row.deleted) {
            if (has(bucket, row.id)) { delete bucket[row.id]; changed = true; }
            snap.delete(key);
          } else {
            const j = JSON.stringify(row.data);
            if (!has(bucket, row.id) || JSON.stringify(bucket[row.id]) !== j) { bucket[row.id] = row.data; changed = true; }
            snap.set(key, j);
          }
        }
        if (data.length) cursor = data[data.length - 1].updated_at;
        write(st);
        if (data.length < PAGE) {
          if (changed) onRemote(); // reconciles and saves the store (which may queue new changes), re-renders
          // The cursor moves only after the store is saved, so a crash re-pulls.
          write({ ...read(), cursor, lastSync: now() });
          return;
        }
        since = cursor;
      }
    }

    // One sync at a time; a request made while one is running runs it again after.
    function sync() {
      if (!userId) return Promise.resolve();
      if (running) { again = true; return running; }
      running = (async () => {
        try { do { again = false; await push(); await pull(); } while (again && userId); }
        finally { running = null; }
      })();
      return running;
    }

    return {
      noteChange, adopt, begin, end, forget, wipe, sync,
      pendingCount: () => Object.keys(read().dirty).length,
      owner: () => read().user || null,
      lastSync: () => read().lastSync || null,
      isRunning: () => !!running,
    };
  }

  // ════════════ Sign-in UI ════════════
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  function ago(ts) {
    const s = (Date.now() - ts) / 1000;
    if (s < 60) return "just now";
    if (s < 3600) return `${Math.floor(s / 60)} min ago`;
    if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
    return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  const LOCAL_NOTE = "Everything is stored in this browser only. Export a backup now and then.";
  const CLOUD = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4.5 4.5 0 0 1-.5 9.5H7Z"/></svg>';

  function start({ store, save, onRemote, toast }) {
    const cfg = window.POLYMATH_CONFIG || {};
    const btn = document.getElementById("account-btn");
    if (!cfg.supabaseUrl || !cfg.supabaseKey || !window.supabase?.createClient) {
      if (cfg.supabaseUrl && !window.supabase) console.warn("Polymath: the Supabase library didn't load, so sync is off.");
      return { enabled: false, noteChange() {}, adopt() {}, note: () => LOCAL_NOTE, accountLabel: () => "" };
    }

    const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
    const engine = createEngine({ store, client, storage: localStorage, save, onRemote });
    let session = null, authReady = false, lastError = null, retry = 0, timer = null, view = "email", pendingEmail = "";

    function state() {
      if (!session) return !authReady && engine.owner() ? "connecting" : engine.owner() ? "expired" : "signed-out";
      if (engine.isRunning()) return "syncing";
      if (!navigator.onLine) return "offline";
      if (lastError) return "error";
      return engine.pendingCount() ? "pending" : "synced";
    }
    function note() {
      const n = engine.pendingCount(), last = engine.lastSync();
      switch (state()) {
        case "signed-out": return "Stored in this browser only. Sign in to back up your diary and use it on any device.";
        case "connecting": return "Connecting to your account…";
        case "expired": return n ? `You're signed out, and ${plural(n, "change")} haven't synced. Sign in again to sync them.` : "You're signed out. Sign in again to keep syncing.";
        case "syncing": return "Syncing…";
        case "offline": return n ? `Offline. ${plural(n, "change")} will sync when you're back online.` : "Offline. Changes will sync when you're back online.";
        case "error": return "Couldn't reach your account. Trying again shortly.";
        case "pending": return `${plural(n, "change")} waiting to sync.`;
        default: return `Synced to your account${last ? `, ${ago(last)}` : ""}.`;
      }
    }
    const accountLabel = () => (session ? "Account" : "Sign in to sync");

    function render() {
      const st = state();
      if (btn) {
        btn.hidden = false;
        btn.dataset.state = st;
        const label = session ? `Account and sync: ${note()}` : "Sign in to sync";
        btn.setAttribute("aria-label", label);
        btn.title = label;
      }
      document.querySelectorAll("[data-sync-note]").forEach(el => { el.textContent = note(); });
      document.querySelectorAll("[data-account]").forEach(el => { el.textContent = accountLabel(); });
      if (dlg.open && view === "account") drawDialog();
    }

    async function runSync() {
      clearTimeout(timer);
      if (!session) return;
      const p = engine.sync();
      render();
      try { await p; lastError = null; retry = 0; }
      catch (e) {
        lastError = e; console.warn("Polymath sync failed:", e?.message || e);
        retry = Math.min(retry + 1, 6);
        timer = setTimeout(runSync, 5000 * 2 ** retry);
      }
      render();
    }
    const schedule = (ms = 1500) => { clearTimeout(timer); timer = setTimeout(runSync, ms); };

    async function handleSession(s) {
      const prev = session?.user?.id;
      session = s; authReady = true;
      if (!s) { engine.end(); render(); return; }
      if (prev === s.user.id) { render(); return; } // token refresh
      const owner = engine.owner();
      if (owner && owner !== s.user.id) {
        const n = engine.pendingCount();
        if (n && !confirm(`This browser has ${plural(n, "unsynced change")} from a different account. Signing in as ${s.user.email} removes them from this browser. Continue?`)) {
          session = null; await client.auth.signOut({ scope: "local" }).catch(() => {}); render(); return;
        }
        engine.forget(); engine.wipe(); onRemote();
      }
      const first = !engine.owner();
      engine.begin(s.user.id);
      if (dlg.open) { view = "account"; drawDialog(); }
      await runSync();
      if (first && !lastError) toast("Signed in. Your diary now syncs to your account.");
    }
    // Supabase warns against awaiting its own calls inside this callback.
    client.auth.onAuthStateChange((_event, s) => { setTimeout(() => handleSession(s), 0); });

    async function signOut() {
      await runSync();
      const n = engine.pendingCount();
      if (n && !confirm(`${plural(n, "change")} haven't reached your account yet. Signing out removes them from this browser. Sign out anyway?`)) return;
      engine.forget(); engine.wipe(); onRemote();
      session = null;
      await client.auth.signOut({ scope: "local" }).catch(() => {});
      dlg.close(); render();
      toast("Signed out. Your diary is safe in your account.");
    }

    // ── Dialog ──
    const dlg = document.createElement("dialog");
    dlg.className = "dialog";
    dlg.setAttribute("aria-labelledby", "sync-title");
    document.body.appendChild(dlg);
    dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });

    function drawDialog() {
      const close = `<button class="icon-btn dialog-close" type="button" data-act="close" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`;
      let body;
      if (session) {
        body = `<h2 id="sync-title">Your account</h2>
          <p>Signed in as <strong>${esc(session.user.email)}</strong>.</p>
          <p class="sync-line"><span class="sync-dot" data-state="${state()}"></span><span>${esc(note())}</span></p>
          <div class="actions"><button class="btn danger" type="button" data-act="signout">Sign out</button><button class="btn primary" type="button" data-act="sync">Sync now</button></div>`;
      } else if (view === "code") {
        body = `<h2 id="sync-title">Check your email</h2>
          <p>We sent a sign-in link to <strong>${esc(pendingEmail)}</strong>. Open it in this browser, or type the code from the email here.</p>
          <form data-form="code" novalidate>
            <label for="sync-code">Code</label>
            <input class="input" id="sync-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" required>
            <p class="dialog-error" role="alert"></p>
            <div class="actions"><button class="btn" type="button" data-act="back">Use a different email</button><button class="btn primary" type="submit">Sign in</button></div>
          </form>`;
      } else {
        body = `<h2 id="sync-title">Sync your diary</h2>
          <p>Sign in to back up your diary and use it on every device. We'll email you a sign-in link, so there's no password to remember.</p>
          <form data-form="email" novalidate>
            <label for="sync-email">Email</label>
            <input class="input" id="sync-email" name="email" type="email" autocomplete="email" placeholder="you@example.com" value="${esc(pendingEmail)}" required>
            <p class="dialog-error" role="alert"></p>
            <div class="actions"><button class="btn primary" type="submit">Email me a sign-in link</button></div>
          </form>
          <p class="side-note">Anything already in this browser is added to your account when you sign in.</p>`;
      }
      dlg.innerHTML = `<div class="dialog-body">${close}${body}</div>`;
      dlg.querySelector("input")?.focus();
    }

    dlg.addEventListener("click", async e => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "close") dlg.close();
      else if (act === "back") { view = "email"; drawDialog(); }
      else if (act === "sync") { lastError = null; runSync(); }
      else if (act === "signout") signOut();
    });
    dlg.addEventListener("submit", async e => {
      e.preventDefault();
      const form = e.target, err = form.querySelector(".dialog-error"), submit = form.querySelector("[type=submit]");
      const fail = msg => { err.textContent = msg; submit.disabled = false; };
      submit.disabled = true; err.textContent = "";
      if (form.dataset.form === "email") {
        const email = form.email.value.trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email address.");
        const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname, shouldCreateUser: true } });
        if (error) return fail(error.status === 429 ? "Too many emails were sent. Wait a minute and try again." : error.message);
        pendingEmail = email; view = "code"; drawDialog();
      } else {
        const token = form.code.value.replace(/\D/g, "");
        if (token.length < 6) return fail("Enter the code from the email.");
        const { error } = await client.auth.verifyOtp({ email: pendingEmail, token, type: "email" });
        if (error) return fail("That code didn't work. It may have expired, so request a new one.");
        // onAuthStateChange takes it from here.
      }
    });

    function open() { view = session ? "account" : view === "code" ? "code" : "email"; drawDialog(); if (!dlg.open) dlg.showModal(); }
    btn?.addEventListener("click", open);
    document.addEventListener("click", e => { if (e.target.closest("[data-account]")) open(); });

    // ── When to sync ──
    window.addEventListener("online", () => { lastError = null; runSync(); });
    window.addEventListener("offline", render);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") runSync();
      else if (engine.pendingCount()) runSync();
    });
    setInterval(() => { if (document.visibilityState === "visible") runSync(); }, 60e3);

    if (btn) btn.innerHTML = CLOUD;
    render();

    return {
      enabled: true,
      noteChange() { if (engine.noteChange() && session) schedule(); render(); },
      adopt: engine.adopt,
      note, accountLabel,
    };
  }

  window.PolymathSync = { start, createEngine };
})();
