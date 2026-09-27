/* =========================================================
   Content data
   ========================================================= */

// Videos come from js/videos.js (VIDEOS: [{ id, title, cat, w, h }])
const V = Object.fromEntries(VIDEOS.map((v) => [v.id, v]));
const poster = (id) => `assets/posters/${id}.jpg`;
const preview = (id) => `assets/videos/preview/${id}.mp4`;
const full = (id) => `assets/videos/${id}.mp4`;

// Gallery rows, grouped by the Drive categories
const GALLERY_ROWS = [
  ["Latest Ads"],
  ["Insta Reels", "UGC"],
  ["Jewellery", "Lifestyle"],
  ["TV Commercial", "Story Ads", "Local Business", "Real Estate"],
];

/* ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";

/* ---------- Gooey buttons: inject blob layer + rolling label ---------- */
function initButtons() {
  $$(".btn").forEach((btn) => {
    const text = btn.textContent.trim();
    btn.textContent = "";

    const goo = document.createElement("span");
    goo.className = "btn__goo";
    goo.setAttribute("aria-hidden", "true");
    goo.innerHTML = '<span class="btn__fill"></span><span class="btn__blob"></span><span class="btn__blob btn__blob--2"></span><span class="btn__blob btn__blob--3"></span>';

    const label = document.createElement("span");
    label.className = "btn__label";
    const inner = document.createElement("span");
    inner.textContent = text;
    inner.dataset.text = text;
    label.appendChild(inner);

    btn.append(goo, label);
  });
}

/* ---------- Hero tunnel walls ---------- */
function tunnelDepth() {
  return window.innerWidth < 768 ? 1800 : 3200;
}
function buildTunnel() {
  const tunnel = $("[data-tunnel]");
  if (!tunnel) return;
  const depth = tunnelDepth();
  tunnel.style.setProperty("--depth", `${depth}px`);

  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const sideCols = Math.ceil(depth / (vh * 0.62));
  const capCols = vw < 640 ? 2 : 4;
  const capRows = Math.ceil(depth / ((vw / capCols) * 0.8));
  const counts = { left: sideCols * 2, right: sideCols * 2, top: capCols * capRows, bottom: capCols * capRows };

  const ids = VIDEOS.map((v) => v.id);
  let n = 0;
  $$("[data-wall]", tunnel).forEach((wall) => {
    const side = wall.dataset.wall;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < counts[side]; i++) {
      const el = new Image();
      el.src = poster(ids[n++ % ids.length]);
      el.alt = "";
      el.decoding = "async";
      frag.appendChild(el);
    }
    wall.replaceChildren(frag);
  });
}

/* ---------- Gallery rows: poster cards that preview on hover, open in the player on click ---------- */
function buildGallery() {
  const root = $("[data-gallery]");
  if (!root) return;
  const arrow = (dir) =>
    `<button class="edge-arrow edge-arrow--${dir}" data-${dir === "left" ? "prev" : "next"} aria-label="${dir === "left" ? "Previous" : "Next"}"><svg viewBox="0 0 24 24"><path d="${dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}"/></svg></button>`;

  GALLERY_ROWS.forEach((cats) => {
    const items = VIDEOS.filter((v) => cats.includes(v.cat));
    if (!items.length) return;
    const slider = document.createElement("div");
    slider.className = "slider";
    slider.dataset.slider = "";
    const track = document.createElement("div");
    track.className = "slider__track";
    track.dataset.track = "";

    items.forEach((v) => {
      const card = document.createElement("figure");
      card.className = "gcard";
      card.dataset.play = v.id;
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", `Play ${v.title}`);
      card.style.aspectRatio = `${v.w} / ${v.h}`;
      const im = new Image();
      im.src = poster(v.id);
      im.alt = "";
      im.loading = "lazy";
      const info = document.createElement("figcaption");
      info.className = "gcard__info";
      info.innerHTML = `<span class="gcard__model"></span><p class="gcard__prompt"></p>`;
      info.firstChild.textContent = v.cat;
      info.lastChild.textContent = v.title;
      const play = document.createElement("span");
      play.className = "gcard__play";
      play.setAttribute("aria-hidden", "true");
      card.append(im, play, info);
      track.appendChild(card);
    });

    slider.insertAdjacentHTML("beforeend", arrow("left"));
    slider.appendChild(track);
    slider.insertAdjacentHTML("beforeend", arrow("right"));
    root.appendChild(slider);
  });

  // hover preview (mouse only) — the preview video is created on first hover
  const canHover = matchMedia("(hover: hover)").matches && !reduceMotion;
  if (!canHover) return;
  root.addEventListener("pointerover", (e) => {
    const card = e.target.closest(".gcard");
    if (!card || card.contains(e.relatedTarget)) return;
    let vid = $("video", card);
    if (!vid) {
      vid = document.createElement("video");
      Object.assign(vid, { muted: true, loop: true, playsInline: true, src: preview(card.dataset.play) });
      vid.className = "gcard__vid";
      card.insertBefore(vid, card.children[1]);
    }
    vid.play().then(() => card.classList.add("is-playing")).catch(() => {});
  });
  root.addEventListener("pointerout", (e) => {
    const card = e.target.closest(".gcard");
    if (!card || card.contains(e.relatedTarget)) return;
    card.classList.remove("is-playing");
    $("video", card)?.pause();
  });
}

/* ---------- Lightbox player: full video with sound ---------- */
function initLightbox() {
  const box = $("[data-lightbox]");
  const vid = $("video", box);
  const title = $("[data-lb-title]", box);
  const cat = $("[data-lb-cat]", box);
  let lastFocus = null;

  const open = (id) => {
    const v = V[id];
    if (!v) return;
    lastFocus = document.activeElement;
    box.style.setProperty("--ar", `${v.w} / ${v.h}`);
    box.classList.toggle("is-portrait", v.h > v.w);
    title.textContent = v.title;
    cat.textContent = v.cat;
    vid.poster = poster(id);
    vid.src = full(id);
    box.setAttribute("aria-hidden", "false");
    document.body.classList.add("lightbox-open");
    lenis?.stop();
    vid.play().catch(() => {});
    $("[data-lb-close]", box).focus({ preventScroll: true });
  };
  const close = () => {
    if (!document.body.classList.contains("lightbox-open")) return;
    vid.pause();
    box.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
    lenis?.start();
    setTimeout(() => { vid.removeAttribute("src"); vid.load(); }, 500);
    lastFocus?.focus?.({ preventScroll: true });
  };

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-play]");
    if (trigger) { e.preventDefault(); open(trigger.dataset.play); return; }
    if (e.target.closest("[data-lb-close]") || e.target === box) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
    if ((e.key === "Enter" || e.key === " ") && e.target.matches?.("[data-play]:not(button)")) {
      e.preventDefault();
      open(e.target.dataset.play);
    }
  });
}

/* ---------- Muted loops play only while on screen ---------- */
function initAutoplay() {
  const vids = $$("video[data-autoplay]");
  if (reduceMotion) return;
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) e.target.play().catch(() => {});
    else e.target.pause();
  }), { threshold: 0.2 });
  vids.forEach((v) => { v.muted = true; io.observe(v); });
}

/* ---------- Slider: drag, edge arrows, stretch bullets ---------- */
function initSlider(root) {
  const track = $("[data-track]", root);
  const prev = $("[data-prev]", root);
  const next = $("[data-next]", root);
  const slides = [...track.children];
  const oneAtATime = root.hasAttribute("data-bullets");
  const gap = () => parseFloat(getComputedStyle(track).columnGap) || 0;
  const slideStep = () => slides[0].getBoundingClientRect().width + gap();
  const pageStep = () => {
    if (oneAtATime) return slideStep();
    const s = slideStep();
    return Math.max(1, Math.floor((track.clientWidth * 0.85) / s)) * s;
  };

  prev?.addEventListener("click", () => track.scrollBy({ left: -pageStep(), behavior: "smooth" }));
  next?.addEventListener("click", () => track.scrollBy({ left: pageStep(), behavior: "smooth" }));

  // bullets
  let bullets = [];
  const wrap = $("[data-bullet-wrap]", root);
  if (wrap) {
    bullets = slides.map((slide, i) => {
      const b = document.createElement("button");
      b.className = "bullet";
      b.setAttribute("aria-label", `Go to slide ${i + 1}`);
      b.addEventListener("click", () =>
        track.scrollTo({ left: slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2, behavior: "smooth" })
      );
      wrap.appendChild(b);
      return b;
    });
  }

  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    if (prev) prev.disabled = track.scrollLeft <= 4;
    if (next) next.disabled = track.scrollLeft >= max - 4;
    if (bullets.length) {
      const center = track.scrollLeft + track.clientWidth / 2;
      let active = 0, best = Infinity;
      slides.forEach((s, i) => {
        const d = Math.abs(s.offsetLeft + s.offsetWidth / 2 - center);
        if (d < best) { best = d; active = i; }
      });
      bullets.forEach((b, i) => {
        b.classList.toggle("is-active", i === active);
        b.dataset.distance = Math.min(Math.abs(i - active), 3);
      });
    }
  };
  track.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();

  // mouse drag (touch uses native scrolling)
  let startX = 0, startLeft = 0, down = false, dragged = false;
  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    down = true; dragged = false;
    startX = e.clientX; startLeft = track.scrollLeft;
  });
  track.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (!dragged && Math.abs(dx) > 6) {
      dragged = true;
      track.classList.add("is-dragging");
      track.setPointerCapture(e.pointerId);
    }
    if (dragged) track.scrollLeft = startLeft - dx;
  });
  const end = () => {
    if (!down) return;
    down = false;
    track.classList.remove("is-dragging");
  };
  track.addEventListener("pointerup", end);
  track.addEventListener("pointercancel", end);
  track.addEventListener("click", (e) => { if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; } }, true);
  track.addEventListener("dragstart", (e) => e.preventDefault());
}

/* ---------- Split headings into words for the rise-in ---------- */
function splitWords(el) {
  let i = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
          const w = document.createElement("span");
          w.className = "w";
          const s = document.createElement("span");
          s.textContent = part;
          s.style.setProperty("--i", i++);
          w.appendChild(s);
          frag.appendChild(w);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
        walk(child);
      }
    });
  };
  walk(el);
}

/* ---------- Scroll reveals ---------- */
function initReveals() {
  $$("[data-split]").forEach(splitWords);
  const targets = $$("[data-reveal], [data-split]");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    targets.forEach((t) => t.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
    }),
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );
  targets.forEach((t) => io.observe(t));
}

/* ---------- Result numbers count up when they enter ---------- */
function initCounters() {
  const els = $$("[data-count]");
  if (reduceMotion || !("IntersectionObserver" in window)) return;
  const render = (el, v) => { el.textContent = `${el.dataset.prefix || ""}${Math.round(v)}${el.dataset.suffix || ""}`; };
  els.forEach((el) => render(el, 0));
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, t0 = performance.now(), dur = 1600;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      render(el, to * (1 - Math.pow(1 - k, 4)));
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.3 });
  els.forEach((el) => io.observe(el));
}

/* ---------- Smooth scroll (Lenis) ---------- */
let lenis = null;
function initSmoothScroll() {
  if (reduceMotion || typeof Lenis === "undefined") return;
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  if (hasGsap) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  } else {
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
}

/* ---------- Nav: glass on scroll, hide on scroll down, menu ---------- */
function initNav() {
  const nav = $("[data-nav]");
  let last = window.scrollY;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    nav.classList.toggle("is-scrolled", y > 40);
    const menuOpen = document.body.classList.contains("menu-open");
    nav.classList.toggle("is-hidden", !menuOpen && y > last && y > 300);
    last = y;
  }, { passive: true });

  const burger = $("[data-burger]");
  const menu = $("[data-menu]");
  const setMenu = (open) => {
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", open);
    menu.setAttribute("aria-hidden", !open);
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  burger.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      const target = id === "#top" ? document.body : $(id);
      if (!target) return;
      e.preventDefault();
      setMenu(false);
      if (lenis) lenis.scrollTo(target, { offset: id === "#top" ? 0 : -76, duration: 1.4 });
      else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    });
  });
}

/* ---------- Clients: "see more" reveals the rest ---------- */
function initClients() {
  const wrap = $("[data-clients]");
  if (!wrap) return;
  const btn = $("[data-clients-toggle]", wrap);
  const setLabel = (t) => {
    const inner = $(".btn__label > span", btn);
    if (inner) { inner.textContent = t; inner.dataset.text = t; } else btn.textContent = t;
  };
  btn.addEventListener("click", () => {
    const opening = wrap.classList.contains("is-collapsed");
    wrap.classList.toggle("is-collapsed", !opening);
    setLabel(opening ? btn.dataset.less : btn.dataset.more);
    if (opening) {
      if (hasGsap && !reduceMotion) {
        gsap.fromTo($$(".client--more", wrap), { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.7, stagger: 0.045, ease: "power3.out", clearProps: "opacity,transform" });
      }
    } else {
      const top = wrap.getBoundingClientRect().top + window.scrollY - 120;
      lenis ? lenis.scrollTo(top, { duration: 1 }) : window.scrollTo({ top, behavior: "smooth" });
    }
    if (hasGsap) ScrollTrigger.refresh();
  });
}

/* ---------- Pixel robot: cycles expressions, gets angry when poked ---------- */
function initRobot() {
  const robot = $("[data-robot]");
  if (!robot) return;
  const exprs = $$("[data-expr]", robot);
  const order = ["happy", "wink", "surprised", "love", "sleepy", "angry"];
  let i = 0, timer = null, poked = false;
  const show = (name) => {
    exprs.forEach((g) => g.classList.toggle("is-on", g.dataset.expr === name));
    robot.classList.toggle("is-angry", name === "angry" && poked);
  };
  const next = () => { i = (i + 1) % order.length; show(order[i]); };
  const start = () => { if (!timer && !reduceMotion) timer = setInterval(next, 2400); };
  const stop = () => { clearInterval(timer); timer = null; };

  robot.addEventListener("pointerenter", () => { poked = true; stop(); show("angry"); });
  robot.addEventListener("pointerleave", () => { poked = false; show(order[i]); start(); });
  robot.addEventListener("click", () => { poked = false; stop(); next(); start(); });

  // only animate while the desk is on screen
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(robot);
}

/* ---------- Mascot: shows up at random moments, peeks in, walks out, slips on a peel, says hello ---------- */
function initMascot() {
  const bot = $("[data-bot]");
  if (!bot || !hasGsap || reduceMotion) return;
  const char = $("[data-bot-char]", bot);
  const peel = $(".bot__peel", bot);
  const bubble = $("[data-bot-bubble]", bot);
  const say = $("[data-bot-say]", bot);
  const burst = $("[data-bot-burst]", bot);
  const stars = $("[data-bot-stars]", bot);
  const head = $(".bot__head", bot);
  const armR = $(".bot__arm--r", bot);
  const armL = $(".bot__arm--l", bot);
  const legs = $$(".bot__leg", bot);
  const sweat = $("[data-bot-sweat]", bot);
  const notes = $("[data-bot-notes]", bot);
  const burstText = $("[data-bot-burst-text]", bot);
  const eyes = (name) => $$("[data-eyes]", bot).forEach((g) => g.classList.toggle("is-on", g.dataset.eyes === name));
  const rand = (a, b) => a + Math.random() * (b - a);
  const walkTo = () => -(window.innerWidth * (window.innerWidth < 640 ? 0.42 : 0.34)) + 10;

  // SVG parts: GSAP needs explicit pivots (CSS transform-origin is ignored for SVG)
  gsap.set(head, { transformOrigin: "50% 100%" });
  gsap.set(armL, { transformOrigin: "100% 0%" });
  gsap.set(armR, { transformOrigin: "0% 0%" });
  gsap.set(legs, { transformOrigin: "50% 0%" });

  const reset = () => {
    gsap.set(char, { x: 0, y: 0, xPercent: 120, rotation: 0, scaleX: 1, scaleY: 1, transformOrigin: "50% 100%" });
    gsap.set([head, armR, armL, ...legs], { rotation: 0, x: 0, y: 0 });
    gsap.set(peel, { x: 0, y: 0, rotation: 0, opacity: 0 });
    gsap.set([bubble, burst], { scale: 0, opacity: 0 });
    gsap.set([stars, sweat, notes], { opacity: 0 });
    gsap.set(sweat, { y: 0 });
    eyes("look");
  };
  reset();
  bot.classList.add("is-live");

  const step = (reps) => gsap.timeline({ repeat: reps, yoyo: true })
    .to(legs[0], { y: -5, duration: 0.14 }, 0).to(legs[1], { y: 0, duration: 0.14 }, 0)
    .to(char, { y: -4, duration: 0.14, ease: "sine.inOut" }, 0);
  const bubbleIn = (text) => gsap.timeline()
    .call(() => { say.textContent = text; })
    .to(bubble, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2.5)" });

  // slow peek from the edge — looks around, blinks
  const peek = () => gsap.timeline()
    .to(char, { xPercent: 52, rotation: -14, duration: 2.2, ease: "power1.inOut" })
    .to(head, { rotation: -8, duration: 2.2, ease: "power1.inOut" }, "<")
    .call(() => eyes("open"), null, "+=0.3")
    .call(() => eyes("look"), null, "+=0.5")
    .call(() => eyes("open"), null, "+=0.4");

  const burstIn = (text) => gsap.timeline()
    .call(() => { burstText.textContent = text; })
    // counter-rotate so the burst reads upright even when he's upside down
    .fromTo(burst, { scale: 0, opacity: 0, rotation: () => -gsap.getProperty(char, "rotation") - 20 },
      { scale: 1, opacity: 1, rotation: () => -gsap.getProperty(char, "rotation") + 6, duration: 0.3, ease: "back.out(3)" });
  const bubbleOut = () => gsap.to(bubble, { scale: 0, opacity: 0, duration: 0.2, ease: "back.in(2)" });

  // full routine: hums along, slips on the peel, flails, BONK (head pops off), dizzy, "meant to do that", hello, leave
  const fullShow = () => gsap.timeline({ defaults: { ease: "power2.out" } })
    .add(peek())
    .to(char, { rotation: 0, duration: 0.3 })
    .to(head, { rotation: 0, duration: 0.3 }, "<")
    // hop out with squash & stretch
    .to(char, { scaleY: 0.8, scaleX: 1.15, duration: 0.12 })
    .to(char, { xPercent: 0, y: -40, scaleY: 1.15, scaleX: 0.9, duration: 0.3 })
    .to(char, { y: 0, scaleY: 1, scaleX: 1, duration: 0.3, ease: "bounce.out" })
    .to(peel, { opacity: 1, duration: 0.2 })
    // stroll + hum, not looking where he's going
    .call(() => eyes("happy"))
    .add(bubbleIn("♪ LA LA LA"), "walk")
    .to(notes, { opacity: 1, duration: 0.2 }, "walk")
    .add(step(7), "walk")
    .to(head, { rotation: 8, duration: 0.3, repeat: 5, yoyo: true, ease: "sine.inOut" }, "walk")
    .to(char, { x: walkTo, duration: 2.1, ease: "none" }, "walk")
    .add(bubbleOut(), "-=0.2")
    .to(notes, { opacity: 0, duration: 0.2 }, "<")
    // steps on it — freeze
    .call(() => eyes("shock"))
    .add(bubbleIn("?!"))
    .to(char, { y: -6, duration: 0.08, repeat: 3, yoyo: true })
    .add(bubbleOut())
    // WHOA — feet shoot out, big flip, arms and legs flailing
    .add(burstIn("WHOA!!"), "slip")
    .to(char, { x: "-=70", duration: 0.25, ease: "power1.in" }, "slip")
    .to(char, { y: -140, rotation: -210, duration: 0.55, ease: "power2.out" }, "slip+=0.15")
    .to(peel, { x: 90, y: -70, rotation: 260, opacity: 0, duration: 0.8 }, "slip+=0.1")
    .to([armL, armR], { rotation: (i) => (i ? -70 : 70), duration: 0.08, repeat: 9, yoyo: true, ease: "none" }, "slip+=0.1")
    .to(legs, { rotation: (i) => (i ? -45 : 45), duration: 0.07, repeat: 9, yoyo: true, ease: "none" }, "slip+=0.1")
    .to(burst, { scale: 0, opacity: 0, duration: 0.15 }, "slip+=0.5")
    // crash landing on his back
    .to(char, { y: 0, rotation: -270, duration: 0.28, ease: "power3.in" })
    .to(char, { scaleY: 0.7, scaleX: 1.25, duration: 0.08 })
    .add(burstIn("BONK!"), "<")
    .call(() => eyes("dizzy"))
    // head pops off and bounces back on
    .to(head, { y: -70, x: 20, rotation: 50, duration: 0.3, ease: "power2.out" }, "<")
    .to(char, { scaleY: 1, scaleX: 1, duration: 0.3, ease: "elastic.out(1, 0.35)" }, "<+0.08")
    .to(head, { y: 0, x: 0, rotation: 0, duration: 0.55, ease: "bounce.out" })
    .to(stars, { opacity: 1, duration: 0.2 }, "<")
    .to(char, { x: "-=6", duration: 0.05, repeat: 7, yoyo: true }, "<")
    .to(burst, { scale: 0, opacity: 0, duration: 0.25, ease: "back.in(2)" }, "+=0.5")
    .to(stars, { opacity: 0, duration: 0.3 }, "+=0.4")
    // springs up, shakes it off, embarrassed
    .to(char, { rotation: -360, y: -70, duration: 0.45 })
    .set(char, { rotation: 0 })
    .to(char, { y: 0, duration: 0.35, ease: "bounce.out" })
    .to(char, { scaleY: 0.82, scaleX: 1.12, duration: 0.1 })
    .to(char, { scaleY: 1, scaleX: 1, duration: 0.35, ease: "elastic.out(1, 0.4)" })
    .to(char, { rotation: 8, duration: 0.07, repeat: 5, yoyo: true, ease: "none" })
    .set(char, { rotation: 0 })
    .call(() => eyes("squint"))
    .to(sweat, { opacity: 1, duration: 0.15 })
    .to(sweat, { y: 22, duration: 1.2, ease: "power1.in" }, "<")
    .add(bubbleIn("I MEANT TO DO THAT 😅"), "<")
    .to(sweat, { opacity: 0, duration: 0.2 })
    .add(bubbleOut(), "+=0.5")
    // hello!
    .call(() => eyes("happy"))
    .to(char, { y: -24, duration: 0.18, ease: "power2.out" })
    .to(char, { y: 0, duration: 0.3, ease: "bounce.out" })
    .add(bubbleIn("HELLO! 👋"), "<")
    .to(armR, { rotation: -150, duration: 0.25 }, "<")
    .to(armR, { rotation: -110, duration: 0.18, repeat: 9, yoyo: true, ease: "sine.inOut" })
    .to(head, { rotation: 7, duration: 0.35, repeat: 4, yoyo: true, ease: "sine.inOut" }, "<")
    .add(bubbleOut(), "+=0.4")
    .to(armR, { rotation: 0, duration: 0.3 }, "<")
    // wander off, waving
    .call(() => eyes("open"))
    .add(step(5), "exit")
    .to(char, { x: 0, xPercent: 120, duration: 1.8, ease: "power1.in" }, "exit")
    .to(armL, { rotation: 30, duration: 0.3, repeat: 5, yoyo: true }, "exit");

  // quick shy peek: pops a line and ducks back out
  const shyPeek = () => gsap.timeline()
    .add(peek())
    .call(() => eyes("happy"))
    .add(bubbleIn(["PSST!", "BEEP BOOP!", "STILL HERE? 😄", "WATCH THE REEL!"][Math.floor(Math.random() * 4)]))
    .to(bubble, { scale: 0, opacity: 0, duration: 0.2 }, "+=1.4")
    .call(() => eyes("look"))
    .to(char, { xPercent: 120, rotation: 0, duration: 0.5, ease: "back.in(1.6)" });

  let current = null, visits = 0;
  const busy = () => document.hidden || document.body.classList.contains("lightbox-open") || document.body.classList.contains("menu-open");
  const visit = () => {
    if (busy()) return schedule(rand(4, 8));
    reset();
    bot.classList.toggle("bot--left", Math.random() < 0.5);   // random side
    current = (visits++ === 0 || Math.random() < 0.7 ? fullShow() : shyPeek());
    current.eventCallback("onComplete", () => { current = null; schedule(rand(25, 45)); });
  };
  const schedule = (sec) => gsap.delayedCall(sec, visit);
  const debug = new URLSearchParams(location.search).has("pixel"); // ?pixel = show right away
  schedule(debug ? 0.5 : rand(6, 12));
  if (debug) window.__pixel = { visit, get current() { return current; } };

  // click: a little hop and a line
  const lines = ["HEHE!", "I'M PIXEL!", "WATCH THE REEL!", "BEEP BOOP!"];
  let n = 0;
  char.addEventListener("click", () => {
    if (current && current.isActive() && current.progress() < 0.85) return;
    eyes("happy");
    gsap.timeline()
      .to(char, { y: -30, duration: 0.2, ease: "power2.out" })
      .to(char, { y: 0, duration: 0.35, ease: "bounce.out" })
      .add(bubbleIn(lines[n++ % lines.length]), 0)
      .to(bubble, { scale: 0, opacity: 0, duration: 0.2 }, 1.4)
      .call(() => eyes("open"));
  });
}

/* ---------- Hero is ready once fonts and the first wall images are decoded (capped at 1.5s) ---------- */
function whenHeroReady() {
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  const imgs = $$("[data-tunnel] img").slice(0, 16).map((im) => (im.decode ? im.decode().catch(() => {}) : Promise.resolve()));
  const cap = new Promise((r) => setTimeout(r, 1500));
  return Promise.race([Promise.all([fonts, ...imgs]), cap]);
}

/* ---------- GSAP: hero intro, tunnel fly-through, reel rise, feature media ---------- */
function initMotion() {
  if (!hasGsap || reduceMotion) return;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true }); // no jumps when the mobile URL bar shows/hides

  const persp = $("[data-persp]");
  const tunnel = $("[data-tunnel]");
  const content = $("[data-hero-content]");

  // intro — built paused so the hero stays hidden (via .is-loading) until it can play cleanly
  const intro = gsap.timeline({ paused: true, defaults: { ease: "expo.out" } })
    .from(persp, { opacity: 0, scale: 1.35, duration: 2.4 }, 0)
    .from(".hero__title .line > span", { yPercent: 110, duration: 1.4, stagger: 0.12 }, 0.35)
    .from(".hero__eyebrow", { opacity: 0, y: 20, duration: 1.2 }, 0.3)
    .from(".hero__sub", { opacity: 0, y: 20, duration: 1.2 }, 0.6)
    .from(".hero__btns .btn", { opacity: 0, y: 24, duration: 1.2, stagger: 0.08 }, 0.7)
    .from("[data-scroll-hint]", { opacity: 0, duration: 1 }, 1.2);
  whenHeroReady().then(() => {
    intro.progress(0);
    document.body.classList.remove("is-loading");
    intro.play();
  });

  // scroll: fly into the tunnel, fade the headline, fade to black
  gsap.timeline({
    scrollTrigger: { trigger: "[data-hero]", start: "top top", end: "bottom bottom", scrub: 1, invalidateOnRefresh: true },
  })
    .to(tunnel, { z: () => tunnelDepth() * 0.82, ease: "power1.in", duration: 1 }, 0)
    .to(content, { opacity: 0, scale: 0.88, filter: "blur(12px)", ease: "none", duration: 0.35 }, 0.12)
    .to("[data-scroll-hint]", { opacity: 0, duration: 0.1 }, 0)
    .to("[data-shade]", { opacity: 1, ease: "none", duration: 0.3 }, 0.7);

  // subtle mouse parallax — a small tilt of the tunnel, eased
  if (matchMedia("(hover: hover)").matches) {
    const rotY = gsap.quickTo(tunnel, "rotationY", { duration: 1.2, ease: "power3.out" });
    const rotX = gsap.quickTo(tunnel, "rotationX", { duration: 1.2, ease: "power3.out" });
    window.addEventListener("pointermove", (e) => {
      if (window.scrollY > window.innerHeight * 1.5) return;
      rotY((e.clientX / window.innerWidth - 0.5) * 4);
      rotX((e.clientY / window.innerHeight - 0.5) * -3);
    }, { passive: true });
  }

  // about desk: card opens as it rises over the tunnel, then pins while the objects settle onto the desk
  const about = $("[data-about]");
  if (about) {
    const desk = $("[data-desk]", about);
    gsap.fromTo(desk, { clipPath: "inset(14% 6% 0% 6% round 48px)" }, {
      clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none",
      scrollTrigger: { trigger: about, start: "top bottom", end: "top top", scrub: true },
    });
    // pin for a short hold; the objects start landing while the desk is still rising
    ScrollTrigger.create({ trigger: about, start: "top top", end: "+=70%", pin: true, anticipatePin: 1 });
    const objs = $$(".obj", desk);
    const tl = gsap.timeline({
      defaults: { ease: "power3.out", duration: 1 },
      scrollTrigger: {
        trigger: about, start: "top 55%", end: "top -45%", scrub: 1,
        onUpdate: (st) => desk.classList.toggle("is-assembled", st.progress > 0.85),
      },
    });
    objs.forEach((el, i) => {
      const [dx, dy, dr] = (el.dataset.from || "0,0,0").split(",").map(Number);
      tl.from(el, {
        x: () => (dx * window.innerWidth) / 100,
        y: () => (dy * window.innerHeight) / 100,
        rotation: dr, opacity: 0,
      }, i * 0.08);
    });
  }

  // reel scales up as it rises out of the tunnel
  gsap.fromTo("[data-reel] .slider", { scale: 0.85, opacity: 0.4 }, {
    scale: 1, opacity: 1, ease: "none",
    scrollTrigger: { trigger: "[data-reel]", start: "top bottom", end: "top 20%", scrub: 1 },
  });

  // feature media: clip-path open + image settle
  $$("[data-media]").forEach((el) => {
    gsap.fromTo(el, { clipPath: "inset(12% 10% 12% 10% round 48px)" }, {
      clipPath: "inset(0% 0% 0% 0% round 28px)", ease: "none",
      scrollTrigger: { trigger: el, start: "top 95%", end: "center 55%", scrub: 1 },
    });
    gsap.fromTo($("img, video", el), { scale: 1.3, yPercent: -6 }, {
      scale: 1, yPercent: 6, ease: "none",
      scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  // testimonial screenshots: drop in, then drift at different speeds (desktop)
  const shots = $$(".shot");
  if (shots.length) {
    gsap.from(shots, {
      opacity: 0, y: 120, scale: 0.9, duration: 1.4, ease: "expo.out", stagger: 0.12,
      scrollTrigger: { trigger: "[data-voices]", start: "top 80%" },
    });
    if (window.innerWidth >= 1024) {
      const speed = { "shot--a": 60, "shot--d": 60, "shot--h": 60, "shot--b": -40, "shot--e": -40, "shot--g": -40, "shot--c": 110, "shot--f": 110 };
      shots.forEach((el) => {
        const k = Object.keys(speed).find((c) => el.classList.contains(c));
        gsap.fromTo(el, { yPercent: 0 }, {
          yPercent: -(speed[k] || 40) / 6, ease: "none",
          scrollTrigger: { trigger: "[data-voices]", start: "top bottom", end: "bottom top", scrub: true },
        });
      });
    }
  }

  // giant headings drift for a touch of parallax
  $$(".h-giant").forEach((h) => {
    gsap.fromTo(h, { yPercent: 12 }, {
      yPercent: -8, ease: "none",
      scrollTrigger: { trigger: h, start: "top bottom", end: "bottom top", scrub: true },
    });
  });

  window.addEventListener("load", () => ScrollTrigger.refresh());
}

/* ========================================================= */
initButtons();
buildTunnel();
buildGallery();
$$("[data-slider]").forEach(initSlider);
initReveals();
initCounters();
initLightbox();
initAutoplay();
initRobot();
initClients();
initSmoothScroll();
initNav();
initMotion();
initMascot();
$("[data-year]").textContent = new Date().getFullYear();
if (!hasGsap || reduceMotion) {
  document.body.classList.remove("is-loading");
  document.body.classList.add("no-pin");
}

let resizeTimer;
let lastW = window.innerWidth;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (Math.abs(window.innerWidth - lastW) < 60) return; // ignore mobile URL-bar resizes
    lastW = window.innerWidth;
    buildTunnel();
    if (hasGsap) ScrollTrigger.refresh();
  }, 250);
});
