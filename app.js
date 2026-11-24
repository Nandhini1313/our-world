/* OUR WORLD — shared content (Kavithai, Projects, Photos, Memories) stored online with Supabase.
   Everyone can view; only the logged-in owners can upload or remove. */
   const SUPABASE_URL = "https://xqhuioqodyvwchqbxnfd.supabase.co";
   const SUPABASE_KEY = "sb_publishable__SE7NFaXFVpJ0bm2Iov4eA_2iWJvcKh";
   
   (() => {
     "use strict";
     const $ = (s) => document.querySelector(s);
     const toastEl = $("#toast");
     let tt;
     const toast = (m) => { toastEl.textContent = m; toastEl.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => toastEl.classList.remove("on"), 6000); };
     const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
     const when = (d) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
     const ytId = (u) => { try { const x = new URL(u); if (x.hostname.includes("youtu.be")) return x.pathname.slice(1); } catch {} return ""; };
   
     let sb = null, owner = false;
     const BUCKET = "uploads";
     const ball = $("#uploadFab"), drawer = $("#uploadDrawer");
     const tabsBar = drawer.querySelector(".ud-tabs");
     const tabs = [...drawer.querySelectorAll("[data-tab]")];
     let current = "photoForm";
   
     /* ---------- data ---------- */
     const fetchAll = async () => {
       const { data, error } = await sb.from("items").select("*").order("created_at", { ascending: false });
       if (error) { toast("Could not load: " + error.message); return []; }
       return data;
     };
     const addRow = async (row) => { const { error } = await sb.from("items").insert(row); if (error) throw error; };
     const shrink = (file) => new Promise((res) => {
       const img = new Image(), u = URL.createObjectURL(file);
       img.onload = () => {
         const k = Math.min(1, 1600 / Math.max(img.width, img.height));
         const c = document.createElement("canvas");
         c.width = img.width * k; c.height = img.height * k;
         c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
         URL.revokeObjectURL(u);
         c.toBlob((b) => res(b || file), "image/jpeg", 0.85);
       };
       img.onerror = () => res(file);
       img.src = u;
     });
     const upFile = async (file) => {
       const blob = await shrink(file);
       const path = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
       const { error } = await sb.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
       if (error) throw error;
       return { path, url: sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
     };
     const removeItem = async (it) => {
       if (it.path) await sb.storage.from(BUCKET).remove([it.path]);
       const { error } = await sb.from("items").delete().eq("id", it.id);
       if (error) throw error;
     };
     const removeBtn = (it, label) => {
       if (!owner) return null;
       const b = el("button", "remove", "Remove");
       b.type = "button"; b.setAttribute("aria-label", label);
       b.addEventListener("click", async (e) => {
         e.stopPropagation();
         if (!confirm("Remove this permanently?")) return;
         try { await removeItem(it); await render(); toast("Removed"); } catch { toast("Could not remove"); }
       });
       return b;
     };
   
     /* ---------- render ---------- */
     async function render() {
       const items = await fetchAll();
       const by = (k) => items.filter((i) => i.kind === k);
   
       const pl = $("#poemList"); pl.replaceChildren();
       if (!by("poem").length) pl.append(el("p", "empty", "No kavithai yet."));
       by("poem").forEach((p) => {
         const c = el("article", "poem-card glass");
         c.append(el("h2", "", p.title), el("p", "poem-body", p.body));
         const f = el("footer", "", when(p.created_at)); const r = removeBtn(p, `Remove ${p.title}`); if (r) f.append(r);
         c.append(f); pl.append(c);
       });
   
       const prl = $("#projectList"); prl.replaceChildren();
       by("project").reverse().forEach((p, n) => {
         const c = el("div", "project-card user glass");
         let host = ""; try { host = new URL(p.url).hostname.replace(/^www\./, ""); } catch {}
         c.append(el("div", "project-number", String(n + 5).padStart(2, "0")), el("h2", "", p.title), el("p", "", p.caption || host));
         const act = el("div", "pc-actions");
         const a = el("a", "", "Open link"); a.href = p.url; a.target = "_blank"; a.rel = "noopener noreferrer";
         act.append(a); const r = removeBtn(p, `Remove ${p.title}`); if (r) act.append(r);
         c.append(act);
         c.addEventListener("click", (e) => { if (!e.target.closest("a,button")) window.open(p.url, "_blank", "noopener"); });
         prl.append(c);
       });
   
       const mems = by("memory"), ml = $("#memoryList");
       ml.replaceChildren(); ml.hidden = !mems.length;
       $("#memoryWorld").style.display = mems.length ? "none" : "";
       mems.forEach((p) => {
         const c = el("figure", "mem-card glass"), i = el("img");
         i.src = p.url; i.alt = p.caption || "Memory"; i.loading = "lazy";
         i.addEventListener("click", () => openBox(p.url, i.alt));
         c.append(i, el("span", "", p.caption || "")); const r = removeBtn(p, "Remove memory"); if (r) c.append(r);
         ml.append(c);
       });
   
       const gl = $("#photoList"); gl.replaceChildren();
       if (!by("photo").length) gl.append(el("p", "empty", "No photos yet."));
       by("photo").forEach((p) => {
         const f = el("figure", "photo glass"), i = el("img");
         i.src = p.url; i.alt = p.caption || "Photo"; i.loading = "lazy";
         f.append(i); const r = removeBtn(p, "Remove photo"); if (r) f.append(r);
         f.addEventListener("click", () => openBox(p.url, i.alt));
         gl.append(f);
       });
     }
   
     /* ---------- upload forms ---------- */
     const dropzone = (form, onChange) => {
       const zone = form.querySelector(".dropzone"), input = zone.querySelector("input"), text = zone.querySelector(".dz-text"), hint = zone.dataset.hint;
       ["dragenter", "dragover"].forEach((ev) => zone.addEventListener(ev, (e) => { e.preventDefault(); zone.classList.add("over"); }));
       ["dragleave", "drop"].forEach((ev) => zone.addEventListener(ev, () => zone.classList.remove("over")));
       zone.addEventListener("drop", (e) => { e.preventDefault(); input.files = e.dataTransfer.files; input.dispatchEvent(new Event("change")); });
       input.addEventListener("change", () => {
         const n = input.files.length;
         text.textContent = n ? (n === 1 ? input.files[0].name : `${n} files selected`) : hint;
         if (onChange) onChange(input.files);
       });
       return { input, reset: () => { input.value = ""; text.textContent = hint; } };
     };
     const uploadImages = async (files, kind, caption) => {
       const imgs = [...files].filter((f) => f.type.startsWith("image/"));
       if (!imgs.length) return toast("Please choose image files");
       if (!owner) return toast("Please log in first");
       try {
         toast("Uploading…");
         for (const f of imgs) { const { path, url } = await upFile(f); await addRow({ kind, path, url, caption: caption || null }); }
         await render(); toast(`${imgs.length} added`);
       } catch (err) { console.error(err); toast("Upload failed: " + (err.message || err)); }
     };
   
     const phf = $("#photoForm"), phz = dropzone(phf, async (files) => { await uploadImages(files, "photo", ""); phz.reset(); });
     const mf = $("#memoryForm"), mz = dropzone(mf);
     mf.addEventListener("submit", async (e) => { e.preventDefault(); await uploadImages(mz.input.files, "memory", mf.caption.value.trim()); mf.reset(); mz.reset(); });
   
     const pf = $("#projectForm");
     pf.addEventListener("submit", async (e) => {
       e.preventDefault();
       let raw = pf.url.value.trim(); if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;
       let u; try { u = new URL(raw); if (!u.hostname.includes(".")) throw 0; } catch { return toast("That doesn't look like a valid link"); }
       try { await addRow({ kind: "project", title: pf.title.value.trim(), caption: pf.desc.value.trim() || null, url: u.href }); pf.reset(); await render(); toast("Project added"); }
       catch (err) { console.error(err); toast("Could not save: " + (err.message || err)); }
     });
     $("#poemForm").addEventListener("submit", async (e) => {
       e.preventDefault(); const f = e.target;
       try { await addRow({ kind: "poem", title: f.title.value.trim(), body: f.body.value.trim() }); f.reset(); await render(); toast("Kavithai published"); }
       catch (err) { console.error(err); toast("Could not save: " + (err.message || err)); }
     });
   
     /* ---------- owner login + popup ---------- */
     const lf = el("form", "upload-panel"); lf.id = "loginForm";
     lf.innerHTML = '<h2>Owner login</h2><input class="field" name="email" type="email" placeholder="Email" required autocomplete="username"><input class="field" name="pw" type="password" placeholder="Password" required autocomplete="current-password"><button class="btn" type="submit">Log in</button>';
     drawer.querySelector(".ud-body").prepend(lf);
     const out = el("button", "remove", "Log out"); out.type = "button"; out.style.marginRight = "14px";
     drawer.querySelector(".ud-head").insertBefore(out, $("#udClose"));
     lf.addEventListener("submit", async (e) => {
       e.preventDefault();
       if (!sb) return toast("Online service is not connected yet");
       const { error } = await sb.auth.signInWithPassword({ email: lf.email.value.trim(), password: lf.pw.value });
       if (error) toast("Wrong email or password"); else { lf.reset(); toast("Welcome back"); }
     });
     out.addEventListener("click", () => sb.auth.signOut());
   
     const show = (id) => {
       current = id;
       tabs.forEach((t) => { const on = t.dataset.tab === id; t.classList.toggle("on", on); t.setAttribute("aria-selected", on); });
       drawer.querySelectorAll(".upload-panel").forEach((f) => f.classList.toggle("on", owner ? f.id === id : f.id === "loginForm"));
     };
     const applyOwner = () => {
       tabsBar.style.display = owner ? "" : "none";
       out.style.display = owner ? "" : "none";
       show(current);
       if (sb) render();
     };
     const toggle = (open) => { drawer.hidden = !open; ball.setAttribute("aria-expanded", open); if (open) show(current); };
     ball.addEventListener("click", () => toggle(drawer.hidden));
     $("#udClose").addEventListener("click", () => toggle(false));
     document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggle(false); });
     tabs.forEach((t) => t.addEventListener("click", () => show(t.dataset.tab)));
     window.addEventListener("hashchange", applyOwner);
   
     /* ---------- lightbox ---------- */
     const box = $("#lightbox");
     const openBox = (src, alt) => { box.querySelector("img").src = src; box.querySelector("img").alt = alt; box.hidden = false; };
     box.addEventListener("click", () => (box.hidden = true));
     document.addEventListener("keydown", (e) => { if (e.key === "Escape") box.hidden = true; });
   
     /* ---------- start ---------- */
     if (SUPABASE_URL.startsWith("PASTE")) { toast("Add your Supabase details at the top of app.js"); }
     else {
       const s = document.createElement("script");
       s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
       s.onload = async () => {
         sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
         owner = !!(await sb.auth.getSession()).data.session;
         sb.auth.onAuthStateChange((_e, session) => { const o = !!session; if (o !== owner) { owner = o; applyOwner(); } });
         applyOwner();
       };
       s.onerror = () => toast("Could not load the online service");
       document.head.append(s);
     }
   
     /* reveal tall sections */
     const tall = new IntersectionObserver((en) => en.forEach((x) => x.isIntersecting && x.target.classList.add("show")), { threshold: 0 });
     document.querySelectorAll(".scene").forEach((s) => tall.observe(s));
   
     /* badge + text layout for Him / Her cards */
     document.querySelectorAll(".thought-card,.memory-card").forEach((c) => {
       const b = c.querySelector("b"), s = c.querySelector("small");
       if (!b || c.querySelector(".badge")) return;
       const m = b.textContent.trim().match(/^(\p{Extended_Pictographic}\uFE0F?)\s*(.*)$/u);
       if (m) { const bd = el("span", "badge", m[1]); b.textContent = m[2]; c.prepend(bd); }
       const t = el("div", "txt"); [b, s].forEach((x) => x && t.append(x)); c.append(t);
     });
   })();
