// ===== Telegram: the game as a mini app, progress in the player's Telegram cloud =====
function tgApp() { const w = window.Telegram && window.Telegram.WebApp; return window.KOVRY_TG && w ? w : null; }
function tgCall(fn, ...args) { return new Promise((res, rej) => { try { fn(...args, (err, val) => (err ? rej(err) : res(val))); } catch (e) { rej(e); } }); }
const TG_CHUNK = 4000;
// CloudStorage keeps strings up to 4096 chars under keys of [A-Za-z0-9_-]:
// a document is packed, cut into pieces and written into one of two slots, then the meta key points at the fresh slot
function tgDb() {
  const w = tgApp();
  if (!w || !w.CloudStorage || (w.isVersionAtLeast && !w.isVersionAtLeast("6.9"))) return null;
  const cs = w.CloudStorage;
  const call = (m, ...a) => tgCall(cs[m].bind(cs), ...a);
  const metas = {};
  const readMeta = async (name) => {
    if (metas[name] !== undefined) return metas[name];
    const v = await call("getItem", "m_" + name);
    metas[name] = v ? JSON.parse(v) : null;
    return metas[name];
  };
  return {
    doc(path) {
      const name = path.replace(/[^A-Za-z0-9_-]/g, "_");
      return {
        async get() {
          metas[name] = undefined;
          const m = await readMeta(name);
          if (!m || !m.n) return { exists: false, data: () => null };
          const keys = [];
          for (let i = 0; i < m.n; i++) keys.push(`c_${name}_${m.s}_${i}`);
          const vals = await call("getItems", keys);
          const b64 = keys.map((k, i) => (Array.isArray(vals) ? vals[i] : vals[k]) || "").join("").replace(/-/g, "+").replace(/_/g, "/");
          let u = b64ToU8(b64 + "===".slice((b64.length + 3) % 4));
          if (m.z) u = await inflateU8(u);
          if (!u) return { exists: false, data: () => null };
          const obj = JSON.parse(new TextDecoder().decode(u));
          return { exists: true, data: () => obj };
        },
        async set(obj) {
          const u = new TextEncoder().encode(JSON.stringify(obj));
          const z = await deflateU8(u);
          const b = u8ToB64(z || u).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
          let old = null;
          try { old = await readMeta(name); } catch (e) {}
          const s = old ? 1 - old.s : 0;
          const n = Math.max(1, Math.ceil(b.length / TG_CHUNK));
          for (let i = 0; i < n; i++) await call("setItem", `c_${name}_${s}_${i}`, b.slice(i * TG_CHUNK, (i + 1) * TG_CHUNK));
          const ns = (old && old.ns) || [0, 0];
          const stale = [];
          for (let i = n; i < (ns[s] || 0); i++) stale.push(`c_${name}_${s}_${i}`);
          ns[s] = n;
          const m = { s, n, z: z ? 1 : 0, ns, t: Date.now() };
          await call("setItem", "m_" + name, JSON.stringify(m));
          metas[name] = m;
          if (stale.length) call("removeItems", stale).catch(() => {});
        },
      };
    },
  };
}
(function tgInit() {
  const w = tgApp(); if (!w) return;
  document.documentElement.classList.add("tg");
  try { w.ready(); w.expand(); } catch (e) {}
  try { if (w.isVersionAtLeast("7.7")) w.disableVerticalSwipes(); } catch (e) {}
  try { w.setHeaderColor("#120E0B"); w.setBackgroundColor("#120E0B"); } catch (e) {}
  try { if (w.isVersionAtLeast("7.10")) w.setBottomBarColor("#120E0B"); } catch (e) {}
})();
