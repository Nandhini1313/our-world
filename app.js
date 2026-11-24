/* OUR WORLD — dynamic content: Kavithai, Projects, Photos (saved in this browser via IndexedDB) */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const STORES = ["photos", "projects", "poems"];
  const toastEl = $("#toast");
  let toastTimer;
  const toast = (msg) => {
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("on"), 2600);
  };

  /* ---------- storage ---------- */
  const dbp = new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error("no indexedDB"));
    const r = indexedDB.open("our-world", 1);
    r.onupgradeneeded = () => STORES.forEach((s) => r.result.createObjectStore(s, { keyPath: "id" }));
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  dbp.catch(() => toast("Saving is unavailable in this browser mode."));
  const run = async (store, mode, fn) => {
    const db = await dbp;
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode);
      const rq = fn(t.objectStore(store));
      t.oncomplete = () => res(rq && rq.result);
      t.onerror = () => rej(t.error);
    });
  };
  const all = async (s) => ((await run(s, "readonly", (o) => o.getAll())) || []).sort((a, b) => b.ts - a.ts);
  const put = (s, v) => run(s, "readwrite", (o) => o.put(v));
  const del = (s, id) => run(s, "readwrite", (o) => o.delete(id));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- helpers ---------- */
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  let urls = [];
  const blobUrl = (b) => { const u = URL.createObjectURL(b); urls.push(u); return u; };
  const removeBtn = (store, id, label) => {
    const b = el("button", "remove", "Remove");
    b.type = "button";
    b.setAttribute("aria-label", label);
    b.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm("Remove this permanently?")) return;
      await del(store, id);
      render();
      toast("Removed");
    });
    return b;
  };
  const dropzone = (form, onChange) => {
    const zone = form.querySelector(".dropzone");
    const input = zone.querySelector("input");
    const text = zone.querySelector(".dz-text");
    const hint = zone.dataset.hint;
    ["dragenter", "dragover"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add("over"); }));
    ["dragleave", "drop"].forEach((ev) => zone.addEventListener(ev, () => zone.classList.remove("over")));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      input.files = e.dataTransfer.files;
      input.dispatchEvent(new Event("change"));
    });
    input.addEventListener("change", () => {
      const n = input.files.length;
      text.textContent = n ? (n === 1 ? input.files[0].name : `${n} files selected`) : hint;
      if (onChange) onChange(input.files);
    });
    return { input, reset: () => { input.value = ""; text.textContent = hint; } };
  };
  const when = (ts) => new Date(ts).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

  /* ---------- render ---------- */
  const ytId = (u) => {
    try {
      const x = new URL(u);
      if (x.hostname.includes("youtu.be")) return x.pathname.slice(1);
      if (x.hostname.includes("youtube.com")) return x.searchParams.get("v") || (x.pathname.match(/\/(?:embed|shorts)\/([\w-]+)/) || [])[1] || "";
    } catch {}
    return "";
  };
  async function render() {
    urls.forEach(URL.revokeObjectURL);
    urls = [];

    // Poems
    const poems = await all("poems");
    const pl = $("#poemList");
    pl.replaceChildren();
    if (!poems.length) pl.append(el("p", "empty", "No kavithai yet. Write the first one below."));
    poems.forEach((p) => {
      const c = el("article", "poem-card glass");
      c.append(el("h2", "", p.title), el("p", "poem-body", p.body));
      const f = el("footer", "", when(p.ts));
      f.append(removeBtn("poems", p.id, `Remove ${p.title}`));
      c.append(f);
      pl.append(c);
    });

    // Projects (links) — same look as the built-in project cards
    const projects = (await all("projects")).reverse();
    const prl = $("#projectList");
    prl.replaceChildren();
    projects.forEach((p, n) => {
      const c = el("div", "project-card user glass");
      let href, host = "";
      if (p.file) { href = blobUrl(p.file); host = p.file.name; }
      else {
        href = p.url;
        try { host = new URL(p.url).hostname.replace(/^www\./, ""); } catch {}
      }
      c.append(el("div", "project-number", String(n + 1).padStart(2, "0")), el("h2", "", p.title), el("p", "", p.desc || host));
      const act = el("div", "pc-actions");
      const open = el("a", "", p.file ? "Download" : "Open link");
      open.href = href;
      if (p.file) open.download = p.file.name; else { open.target = "_blank"; open.rel = "noopener noreferrer"; }
      act.append(open, removeBtn("projects", p.id, `Remove ${p.title}`));
      c.append(act);
      if (!p.file) c.addEventListener("click", (e) => { if (!e.target.closest("a,button")) window.open(href, "_blank", "noopener"); });
      prl.append(c);
    });

    // Photos
    const allPhotos = await all("photos");
    const photos = allPhotos.filter((p) => !p.kind);
    const mems = allPhotos.filter((p) => p.kind === "memory");
    const gl = $("#photoList");
    gl.replaceChildren();
    if (!photos.length) gl.append(el("p", "empty", "Your gallery is empty. Add a photo above."));
    const ml = $("#memoryList");
    ml.replaceChildren();
    ml.hidden = !mems.length;
    $("#memoryWorld").style.display = mems.length ? "none" : "";
    mems.forEach((p) => {
      const c = el("figure", "mem-card glass");
      const i = el("img");
      i.src = blobUrl(p.file); i.alt = p.caption || p.name; i.loading = "lazy";
      i.addEventListener("click", () => openBox(i.src, i.alt));
      c.append(i, el("span", "", p.caption || ""), removeBtn("photos", p.id, "Remove memory"));
      ml.append(c);
    });
    photos.forEach((p) => {
      const f = el("figure", "photo glass");
      const i = el("img");
      i.src = blobUrl(p.file); i.alt = p.name; i.loading = "lazy";
      f.append(i, removeBtn("photos", p.id, `Remove photo ${p.name}`));
      f.addEventListener("click", () => openBox(i.src, p.name));
      gl.append(f);
    });
  }

  /* ---------- forms ---------- */
  $("#poemForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      await put("poems", { id: uid(), ts: Date.now(), title: f.title.value.trim(), body: f.body.value.trim() });
      f.reset(); await render(); toast("Kavithai published");
    } catch { toast("Could not save. Try again."); }
  });

  const pf = $("#projectForm");
  pf.addEventListener("submit", async (e) => {
    e.preventDefault();
    let raw = pf.url.value.trim();
    if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
    let u;
    try { u = new URL(raw); if (!/^https?:$/.test(u.protocol) || !u.hostname.includes(".")) throw 0; }
    catch { return toast("That doesn't look like a valid link"); }
    try {
      await put("projects", { id: uid(), ts: Date.now(), title: pf.title.value.trim(), desc: pf.desc.value.trim(), url: u.href });
      pf.reset(); await render(); toast("Project added");
    } catch { toast("Could not save. Try again."); }
  });

  const phf = $("#photoForm");
  const phz = dropzone(phf, async (files) => {
    const imgs = [...files].filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return toast("Please choose image files");
    try {
      for (const file of imgs) await put("photos", { id: uid(), ts: Date.now(), name: file.name, file });
      phz.reset(); await render(); toast(`${imgs.length} photo${imgs.length > 1 ? "s" : ""} added`);
    } catch { toast("Could not save these photos."); }
  });

  const mf = $("#memoryForm");
  const mz = dropzone(mf);
  mf.addEventListener("submit", async (e) => {
    e.preventDefault();
    const imgs = [...mz.input.files].filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return toast("Choose at least one photo");
    try {
      let t = Date.now();
      for (const file of imgs) await put("photos", { id: uid(), ts: t++, kind: "memory", caption: mf.caption.value.trim(), name: file.name, file });
      mf.reset(); mz.reset(); await render(); toast("Added to memories");
    } catch { toast("Could not save these photos."); }
  });

  /* ---------- lightbox ---------- */
  const box = $("#lightbox");
  const openBox = (src, alt) => { box.querySelector("img").src = src; box.querySelector("img").alt = alt; box.hidden = false; };
  box.addEventListener("click", () => (box.hidden = true));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") box.hidden = true; });

  /* ---------- first-visit sample poem (delete it any time) ---------- */
  (async () => {
    try {
      if (!localStorage.getItem("ow-seeded") && !(await all("poems")).length) {
        await put("poems", { id: uid(), ts: Date.now(), title: "நிலவு", body: "நிலவின் ஒளியில்\nநினைவுகள் மிதக்கின்றன,\nஉன் பெயர் சொல்லும்\nஒவ்வொரு இரவிலும்…" });
        localStorage.setItem("ow-seeded", "1");
      }
    } catch {}
    render();
  })();

  /* ---------- safety: reveal tall sections that never hit the 16% threshold ---------- */
  const tall = new IntersectionObserver((en) => en.forEach((x) => x.isIntersecting && x.target.classList.add("show")), { threshold: 0 });
  document.querySelectorAll(".scene").forEach((s) => tall.observe(s));
})();

/* ---------- uploads drawer ---------- */
(() => {
  const fab = document.getElementById("uploadFab"), drawer = document.getElementById("uploadDrawer");
  const tabs = [...drawer.querySelectorAll("[data-tab]")];
  const show = (id) => {
    tabs.forEach((t) => { const on = t.dataset.tab === id; t.classList.toggle("on", on); t.setAttribute("aria-selected", on); });
    drawer.querySelectorAll(".upload-panel").forEach((f) => f.classList.toggle("on", f.id === id));
  };
  const toggle = (open) => { drawer.hidden = !open; fab.setAttribute("aria-expanded", open); if (open) show(drawer.querySelector(".ud-tabs .on").dataset.tab); };
  fab.addEventListener("click", () => toggle(drawer.hidden));
  document.getElementById("udClose").addEventListener("click", () => toggle(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggle(false); });
  tabs.forEach((t) => t.addEventListener("click", () => show(t.dataset.tab)));
  show("photoForm");
})();

/* ---------- badge + text layout for Him / Her cards ---------- */
document.querySelectorAll(".thought-card,.memory-card").forEach((c) => {
  const b = c.querySelector("b"), s = c.querySelector("small");
  if (!b || c.querySelector(".badge")) return;
  const m = b.textContent.trim().match(/^(\p{Extended_Pictographic}\uFE0F?)\s*(.*)$/u);
  if (m) { const bd = document.createElement("span"); bd.className = "badge"; bd.textContent = m[1]; b.textContent = m[2]; c.prepend(bd); }
  const t = document.createElement("div"); t.className = "txt";
  [b, s].forEach((x) => x && t.append(x));
  c.append(t);
});