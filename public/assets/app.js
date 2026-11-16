// One Another's Burdens. Small enhancements for the landing page and the reader.
(() => {
  const d = document, root = d.documentElement;
  const store = {
    get(k) { try { return localStorage.getItem("oab:" + k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem("oab:" + k, v); } catch {} },
    del(k) { try { localStorage.removeItem("oab:" + k); } catch {} },
  };

  // Reveal on scroll
  const reveals = d.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }, { rootMargin: "0px 0px -8% 0px" });
    // Anything already on screen reveals right away; the rest waits for the observer.
    reveals.forEach((el) => {
      if (el.getBoundingClientRect().top < innerHeight) el.classList.add("in"); else io.observe(el);
    });
  } else reveals.forEach((el) => el.classList.add("in"));

  // Landing: pick up where the reader left off
  const last = store.get("last");
  if (last && last !== "intro") {
    d.querySelectorAll("[data-continue]").forEach((a) => {
      a.href = "read/#" + last;
      a.querySelector("span").textContent = last.startsWith("chapter-") ? "Continue chapter " + last.split("-")[1] : "Continue reading";
    });
  }

  // Reader
  const views = [...d.querySelectorAll(".view")];
  if (!views.length) return;
  const ids = views.map((v) => v.id);
  const now = d.getElementById("now");
  const links = [...d.querySelectorAll(".toc a[href^='#']")];
  const seen = new Set((store.get("seen") || "").split(",").filter(Boolean));
  let current = ids[0];

  const closeToc = () => { root.classList.remove("toc-open"); tocBtn.setAttribute("aria-expanded", "false"); };
  const closePop = () => { pop.classList.remove("open"); aa.setAttribute("aria-expanded", "false"); };

  function show(id, jump) {
    if (!ids.includes(id)) id = ids[0];
    current = id;
    for (const v of views) v.classList.toggle("active", v.id === id);
    const v = d.getElementById(id);
    now.textContent = v.dataset.short;
    d.title = v.dataset.title + " · One Another’s Burdens";
    seen.add(id);
    store.set("seen", [...seen].join(","));
    store.set("last", id);
    for (const a of links) {
      const key = a.hash.slice(1);
      if (key === id) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
      a.classList.toggle("seen", seen.has(key));
    }
    closeToc();
    if (jump) window.scrollTo({ top: 0, behavior: "instant" });
  }

  const tocBtn = d.getElementById("tocbtn"), aa = d.getElementById("aa"), pop = d.getElementById("pop");
  tocBtn.addEventListener("click", () => {
    const open = root.classList.toggle("toc-open");
    tocBtn.setAttribute("aria-expanded", String(open));
    closePop();
  });
  aa.addEventListener("click", () => {
    const open = pop.classList.toggle("open");
    aa.setAttribute("aria-expanded", String(open));
  });
  d.addEventListener("click", (e) => { if (!e.target.closest("#pop, #aa")) closePop(); });

  // Reading settings
  function sync() {
    const size = root.dataset.size || "m";
    pop.querySelectorAll("[data-size]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.size === size)));
  }
  pop.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.size) {
      if (b.dataset.size === "m") { delete root.dataset.size; store.del("size"); }
      else { root.dataset.size = b.dataset.size; store.set("size", b.dataset.size); }
    }
    sync();
  });
  sync();

  // Keyboard: arrows move between chapters, Escape closes panels
  d.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closePop(); closeToc(); return; }
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.target.closest("input, textarea, select")) return;
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const next = ids[ids.indexOf(current) + step];
    if (step && next) location.hash = next;
  });

  // Print one practice card
  d.querySelectorAll(".print").forEach((b) => b.addEventListener("click", () => {
    b.closest(".blk").classList.add("print-host");
    root.classList.add("print-card");
    window.print();
  }));
  addEventListener("afterprint", () => {
    root.classList.remove("print-card");
    d.querySelectorAll(".print-host").forEach((el) => el.classList.remove("print-host"));
  });

  addEventListener("hashchange", () => show(location.hash.slice(1), true));
  show(location.hash.slice(1) || store.get("last") || ids[0], false);
})();
