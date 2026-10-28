/* =====================================================================
   CLOUD MATCHA — hero, variant 3 (red gate)
   No dependencies. Modules:
     1. utils, pointer, single RAF loop
     2. asset preloading + preloader film (same as pages 1–2)
     3. text splitting (title, letter-roll links) + title fit + side-text alignment
     4. preloader → parallax curtain → cup lands + intro choreography
     5. cup glare (one sweep every 6–7 s)
     6. bead curtain: verlet strands + grey glyph rain under the pointer
     7. side pendants (rigid pendulums, the scroll carries the countdown)
     8. small seal cursor + hieroglyph trail; 8b. flavour ribbon + cup swap
     9. countdown
   ===================================================================== */
(() => {
  "use strict";

  /* --------------------------------------------------------------- 1 */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const TAU = Math.PI * 2;
  const DPR = () => Math.min(window.devicePixelRatio || 1, 2);
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;
  const isMobileLayout = () => matchMedia("(max-width: 760px) and (orientation: portrait)").matches;
  const EASE_OUT = "cubic-bezier(.16,1,.3,1)";
  const EASE_IO = "cubic-bezier(.76,0,.24,1)";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const body = document.body;
  const stage = $("#stage");
  const glass = $("#glass");
  const gate = $("#gate");
  const unit = () => stage.getBoundingClientRect().width / (isMobileLayout() ? 430 : 1920);

  const pointer = { x: -999, y: -999, px: -999, py: -999, vx: 0, vy: 0, inside: false, t: 0 };
  addEventListener("pointermove", (e) => {
    const now = performance.now();
    const dt = Math.max(8, now - pointer.t) / 1000;
    if (!pointer.inside) { pointer.x = e.clientX; pointer.y = e.clientY; }
    pointer.vx = lerp(pointer.vx, (e.clientX - pointer.x) / dt, 0.5);
    pointer.vy = lerp(pointer.vy, (e.clientY - pointer.y) / dt, 0.5);
    pointer.px = pointer.x; pointer.py = pointer.y;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.t = now;
    pointer.inside = true;
  }, { passive: true });
  document.addEventListener("pointerleave", () => (pointer.inside = false));
  addEventListener("blur", () => (pointer.inside = false));

  const tickers = new Set();
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    tickers.forEach((fn) => fn(dt, now / 1000));
    pointer.vx *= 0.9; pointer.vy *= 0.9;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function fitCanvas(canvas) {
    const r = canvas.getBoundingClientRect();
    const d = DPR();
    canvas.width = Math.max(1, Math.round(r.width * d));
    canvas.height = Math.max(1, Math.round(r.height * d));
    return { w: r.width, h: r.height, d, rect: r };
  }

  const loadImage = (src) => new Promise((res) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => (img.decode ? img.decode().catch(() => {}).then(() => res(img)) : res(img));
    img.onerror = () => res(null);
    img.src = src;
  });

  /* --------------------------------------------------------------- 2 */
  const ASSETS = {
    glass: "assets/glass-strawberry.webp",
    cupCherry: "assets/glass-cherry.webp",
    cupRaspberry: "assets/glass-raspberry.webp",
    cupMango: "assets/glass-mango.webp",
    cupPeach: "assets/glass-peach.webp",
    fStrawberry: "assets/fruit-strawberry.webp",
    fPeach: "assets/fruit-peach.webp",
    fCherry: "assets/fruit-cherry.webp",
    fMango: "assets/fruit-mango.webp",
    fRaspberry: "assets/fruit-raspberry.webp",
    land: "assets/land.webp",
    gate: "assets/arch-static.webp",
    strands: "assets/strands.webp",
    plaque: "assets/plaque.webp",
    pl: "assets/pend-left.webp",
    pi: "assets/pend-inner.webp",
    ps: "assets/pend-scroll.webp",
    logo: "assets/logo-lockup.svg",
    btn: "assets/btn-ornament-green.svg",
    btnPine: "assets/btn-ornament-pine.svg",
    btnRed: "assets/btn-ornament-red.svg",
    btnMatcha: "assets/btn-ornament-matcha.svg",
    last: "assets/preloader-last.webp",
    end: "assets/preloader-end.webp",
  };
  const images = {};
  const preloader = $("#preloader");
  const preloaderInner = $("#preloaderInner");
  const video = $("#preloaderVideo");
  const progress = { assets: 0, video: 0 };

  function loadAll() {
    const total = Object.keys(ASSETS).length + 1;
    let done = 0;
    const bump = () => { done++; progress.assets = done / total; };
    const jobs = Object.entries(ASSETS).map(([k, src]) => loadImage(src).then((img) => { images[k] = img; bump(); }));
    jobs.push(document.fonts.ready.then(() => Promise.all([
      document.fonts.load('400 100px "Angkor"'),
      document.fonts.load('500 20px "Inter"'),
      document.fonts.load('400 20px "Inter"'),
    ]).catch(() => {})).then(bump));
    return Promise.all(jobs);
  }

  function playFilm() {
    return new Promise((resolve) => {
      if (reduceMotion) { progress.video = 1; return resolve("skipped"); }
      video.muted = true;
      video.src = innerWidth <= 900 ? video.dataset.srcMobile : video.dataset.srcDesktop;
      let settled = false;
      const finish = (why) => { if (!settled) { settled = true; progress.video = 1; resolve(why); } };
      video.addEventListener("canplay", () => {
        video.play().then(() => video.classList.add("is-on")).catch(() => finish("blocked"));
      }, { once: true });
      video.addEventListener("ended", () => finish("ended"), { once: true });
      video.addEventListener("error", () => finish("error"), { once: true });
      setTimeout(() => finish("timeout"), 14000);
      video.load();
    });
  }

  /* --------------------------------------------------------------- 3 */
  function splitText() {
    // title: one span per glyph
    $$("#title .w").forEach((w) => {
      const t = w.textContent;
      w.textContent = "";
      [...t].forEach((ch) => { const s = document.createElement("span"); s.className = "ch"; s.textContent = ch; w.appendChild(s); });
    });
    // letter-roll: each glyph gets a twin that rises on hover
    $$("[data-roll]").forEach((el) => {
      const t = el.textContent.trim();
      el.setAttribute("aria-label", t);
      el.textContent = "";
      [...t].forEach((ch, i) => {
        const s = document.createElement("span");
        s.className = "rl";
        s.style.setProperty("--i", i);
        s.setAttribute("aria-hidden", "true");
        const c = ch === " " ? " " : ch;
        s.innerHTML = `<b>${c}</b><b>${c}</b>`;
        el.appendChild(s);
      });
    });
    // tagline: words
    $$("[data-reveal=words]").forEach((p) => {
      const words = p.textContent.trim().split(/\s+/);
      p.innerHTML = words.map((w) => `<span class="wd">${w}</span>`).join(" ");
    });
  }

  /** Fits the display line to its Figma width (1834 px), or MATCHA to the phone column. */
  /** Fits the title: desktop line to 1850 Figma px (was 1834) with tighter tracking (-2.5% instead
      of -1%), so the letters come out ~5% larger; phone: MATCHA to the 394 px column. */
  function fitTitle() {
    const t = $("#title");
    t.style.fontSize = "";
    t.style.letterSpacing = "-0.025em";
    const u = unit();
    const fs0 = parseFloat(getComputedStyle(t).fontSize);
    const ws = t.querySelectorAll(".w");
    let w, target;
    if (isMobileLayout()) { w = ws[1].getBoundingClientRect().width; target = 394 * u; }
    else {
      w = ws[1].getBoundingClientRect().right - ws[0].getBoundingClientRect().left;
      // On windows wider than 16:9 the title grows (up to +20%) into the side space, so the side
      // margins stay ~44 Figma px instead of turning into wide empty bands. Everything at the
      // sides follows the title's ink (alignSideTexts), so it all moves outward together.
      target = clamp(innerWidth - 2 * 44 * u, 1850 * u, 1850 * 1.2 * u);
    }
    t.style.fontSize = (fs0 * target / w) + "px";
    if (isMobileLayout()) t.style.left = "";
    else {
      const st = stage.getBoundingClientRect(), tr = t.getBoundingClientRect();
      const w2 = ws[1].getBoundingClientRect().right - ws[0].getBoundingClientRect().left;
      const off = ws[0].getBoundingClientRect().left - tr.left;
      t.style.left = ((st.width - w2) / 2 - off) + "px";     // keep the line centred on the page
    }
    alignSideTexts();
  }

  /** Left texts start exactly at the ink of the C; right texts end exactly at the ink of the last A. */
  const lines = { inkL: 0, inkR: 0 };
  // distance from the text lines to the card edge facing the gate (desktop); 40 px closer to the
  // gate than before so more of the outer cards is on screen
  const INNER_L = 318, INNER_R = 332;   // title ink edges in stage px, shared with the rails
  function alignSideTexts() {
    const t = $("#title");
    const chars = $$(".ch", t);
    const first = chars[0], lastCh = chars[chars.length - 1];
    const cs = getComputedStyle(t);
    const c = alignSideTexts.ctx || (alignSideTexts.ctx = document.createElement("canvas").getContext("2d"));
    c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    // the DOM holds "Cloud Matcha"; the title is uppercased by CSS, so measure the capitals
    const mC = c.measureText(first.textContent.toUpperCase()), mA = c.measureText(lastCh.textContent.toUpperCase());
    const st = stage.getBoundingClientRect();
    // glyph origin = left of its span (translateY during the intro does not move x)
    const inkL = first.getBoundingClientRect().left - st.left - mC.actualBoundingBoxLeft;
    const inkR = lastCh.getBoundingClientRect().left - st.left + mA.actualBoundingBoxRight;
    $$(".rail-label--left, .info--left").forEach((el) => { el.style.left = inkL + "px"; });
    $$(".info--right").forEach((el) => { el.style.left = "auto"; el.style.right = (st.width - inkR) + "px"; });
    // header follows the same lines: the whisk of the logo starts on the C,
    // the Instagram circle ends on the A (desktop only; phones keep their own header)
    lines.inkL = inkL; lines.inkR = inkR;
    // flavour rails: the inner card edges keep their distance to the text lines
    // (left: INNER_L px right of the C; right: INNER_R px left of the A) and run off the screen edge
    const railL = $(".rail--left"), railR = $(".rail--right"), labR = $(".rail-label--right");
    if (!isMobileLayout()) {
      const u = unit(), side = (innerWidth - st.width) / 2;
      railL.style.left = -side + "px"; railL.style.width = (inkL + INNER_L * u + 40 * u + side) + "px";  // +40: room for the tilted inner card
      const rl = inkR - INNER_R * u;
      railR.style.left = (rl - 40 * u) + "px"; railR.style.width = (st.width + side - rl + 40 * u) + "px";
      // labels sit right under the title: left one starts on the C, right one ends on the A
      const tr = t.getBoundingClientRect();
      const fA = mC.fontBoundingBoxAscent || parseFloat(cs.fontSize) * 0.9;
      const fD = mC.fontBoundingBoxDescent || parseFloat(cs.fontSize) * 0.25;
      const lh = parseFloat(cs.lineHeight) || tr.height;
      const baseline = tr.top - st.top + (lh - (fA + fD)) / 2 + fA;   // caps sit on the baseline
      const labTop = baseline + 26 * u;
      const labL = $(".rail-label--left");
      labL.style.top = labTop + "px";
      labR.style.top = labTop + "px";
      labR.style.left = "auto"; labR.style.right = (st.width - inkR) + "px";
    } else {
      [railL, railR, labR].forEach((el) => { el.style.left = ""; el.style.width = ""; el.style.top = ""; el.style.right = ""; });
      $(".rail-label--left").style.top = "";
    }
    if (!isMobileLayout()) {
      $(".logo").style.left = inkL + "px";
      const so = $(".social"); so.style.left = "auto"; so.style.right = (st.width - inkR) + "px";
    } else {
      $(".logo").style.left = ""; const so = $(".social"); so.style.left = ""; so.style.right = "";
    }
  }

  /** Gate scale: top fixed at 180 Figma px; 16:9 gives 1.0 (Figma size, stairs on screen).
      Taller windows get a slightly bigger gate (max 1.15) instead of an empty band. */
  function layoutGate() {
    if (isMobileLayout()) { stage.style.removeProperty("--gs"); return; }
    const H = stage.getBoundingClientRect().height / unit();
    stage.style.setProperty("--gs", clamp((H - 180) / 900, 0.92, 1.15).toFixed(4));
  }

  /* --------------------------------------------------------------- 4 */
  function filmCupRect() {
    const CUP = { x: 664.4, y: 129.3, w: 581.2, h: 952.0 }; // cup inside the 1920×1080 film
    const vw = innerWidth, vh = innerHeight;
    const s = Math.max(vw / 1920, vh / 1080);
    const ox = (vw - 1920 * s) / 2, oy = (vh - 1080 * s) / 2;
    return { x: ox + CUP.x * s, y: oy + CUP.y * s, w: CUP.w * s, h: CUP.h * s };
  }

  async function revealHero(filmResult) {
    let still = null;
    if (filmResult !== "ended") {
      still = document.createElement("img");
      still.src = ASSETS.last; still.className = "preloader__scene"; still.alt = "";
      preloaderInner.insertBefore(still, preloaderInner.querySelector(".preloader__vignette"));
      video.classList.remove("is-on");
    }

    // 1 — retina cup appears exactly over the film's cup
    const end = glass.getBoundingClientRect();
    const cup = filmCupRect();
    const s0 = cup.w / end.width;
    glass.classList.add("is-flying");
    glass.style.width = end.width + "px";
    glass.style.height = end.height + "px";
    glass.style.transformOrigin = "0 0";
    const from = `translate(${cup.x}px, ${cup.y}px) scale(${s0})`;
    const to = `translate(${end.left}px, ${end.top}px) scale(1)`;
    glass.style.transform = from;
    await glass.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduceMotion ? 10 : 220, easing: "ease-out", fill: "both" }).finished;
    const endFrame = document.createElement("img");
    endFrame.src = ASSETS.end; endFrame.className = "preloader__scene"; endFrame.alt = "";
    preloaderInner.insertBefore(endFrame, preloaderInner.querySelector(".preloader__vignette"));
    if (endFrame.decode) await endFrame.decode().catch(() => {});
    video.style.transition = "none";
    video.classList.remove("is-on");
    if (still) still.remove();

    // 2 — parallax curtain: film lifts, its content lags; hero layers rise at different depths;
    //     the cup travels and lands in the gate
    const D = reduceMotion ? 600 : 1550;
    const anims = [];
    anims.push(preloader.animate([{ transform: "translateY(0)" }, { transform: "translateY(-100%)" }], { duration: D, easing: EASE_IO, fill: "forwards" }));
    anims.push(preloaderInner.animate([{ transform: "translateY(0) scale(1)" }, { transform: "translateY(62%) scale(1.08)" }], { duration: D, easing: EASE_IO, fill: "forwards" }));
    $("#heroBg").animate([{ transform: "translateY(22%) scale(1.14)" }, { transform: "none" }], { duration: D + 500, easing: EASE_OUT, fill: "both" });
    // the gate finishes rising (at 80% of the curtain) before the cup touches the step, so the cup
    // lands on a stair that is already still: no slide, no correction at the end
    gate.animate([{ transform: "translateY(12%)" }, { transform: "none" }], { duration: D * 0.8, easing: EASE_OUT, fill: "both" })
      .finished.then(() => gate.getAnimations().forEach((a) => a.cancel()));
    $("#title").animate([{ transform: "translateY(30%)" }, { transform: "none" }], { duration: D + 450, easing: EASE_OUT, fill: "both" });

    // cup: one continuous ease straight onto the step — no overshoot, no squash, so the
    // hand-off to the static cup at the end is pixel-identical (no jump)
    anims.push(glass.animate([{ transform: from }, { transform: to }], { duration: D, easing: EASE_IO, fill: "forwards" }));

    intro(reduceMotion ? 0 : D * 0.32);

    await Promise.all(anims.map((a) => a.finished));
    glass.getAnimations().forEach((a) => a.cancel());
    glass.classList.remove("is-flying");
    glass.style.cssText = "";
    preloader.classList.add("is-done");
    startGlare();
    flavours && flavours.start();   // cup swaps are allowed once the cup has landed
    video.pause();
    video.removeAttribute("src");
    video.load();
  }

  function intro(t0) {
    const A = (el, kf, o) => el && el.animate(kf, Object.assign({ fill: "both", easing: EASE_OUT }, o));

    // title glyphs rise out of the roof line
    const title = $("#title");
    title.style.clipPath = "inset(-60% -4% 0 -4%)";
    $$("#title .ch").forEach((c, i) =>
      A(c, [{ transform: "translateY(110%)" }, { transform: "none" }], { duration: 1200, delay: t0 + 100 + i * 50 }));
    setTimeout(() => (title.style.clipPath = ""), t0 + 2200);

    $$('.hero [data-intro="fade-down"]').forEach((el, i) =>
      A(el, [{ opacity: 0, transform: "translateY(-14px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: t0 + 250 + i * 90 }));
    $$('.hero [data-intro="pop"]').forEach((el, i) =>
      A(el, [{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "none" }], { duration: 700, delay: t0 + 600 + i * 110, easing: "cubic-bezier(.34,1.56,.64,1)" })
        ?.finished.then(() => el.getAnimations().forEach((a) => a.cancel())));

    // nav: letters rise one by one (300 ms each)
    $$(".nav a").forEach((a, ai) => $$(".rl > b:first-child", a).forEach((b, i) =>
      A(b, [{ transform: "translateY(105%)" }, { transform: "none" }], { duration: 300, delay: t0 + 800 + ai * 120 + i * 22 })
        ?.finished.then(() => b.getAnimations().forEach((x) => x.cancel()))));

    // flavour ribbons slide in from the screen edges
    flavours && flavours.enter(t0 + 850);

    // bottom info: masked lines (400 ms each)
    $$(".info .ln > span").forEach((el, i) =>
      A(el, [{ transform: "translateY(115%)" }, { transform: "none" }], { duration: 400, delay: t0 + 950 + (i % 2) * 90 + (i > 1 ? 50 : 0) }));

    A($("#book"), [{ opacity: 0, transform: "translateY(40%) scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 1100, delay: t0 + 700 })
      ?.finished.then(() => $("#book").getAnimations().forEach((a) => a.cancel()));

    countdown.enter(t0 + 1100);
    body.classList.remove("is-loading");
  }

  /* --------------------------------------------------------------- 5 */
  let glareTimer = 0;
  function startGlare() {
    if (reduceMotion) return;
    const i = $(".glass__shine i");
    const sweep = () => {
      i.animate([
        { transform: "translateX(-160%) skewX(-14deg)" },
        { transform: "translateX(420%) skewX(-14deg)" },
      ], { duration: 950, easing: "cubic-bezier(.45,0,.3,1)" });
      glareTimer = setTimeout(sweep, rand(6000, 7000)); // one sweep every 6–7 s
    };
    glareTimer = setTimeout(sweep, 700);
  }

  /* --------------------------------------------------------------- 6 */
  // strand centres (x) in arch-image px; each strand hangs from y=273 to y=770
  const STRAND_X = [304, 326, 348, 368, 388, 407, 426, 446, 465, 486, 506, 525, 545, 564, 584, 604, 623, 642, 662, 682, 702, 722, 742, 761, 781, 802, 824];
  const S_TOP = 273, S_LEN = 497, S_HW = 10;
  const CV = { x: 250, y: 230, w: 640 };   // canvas box in arch px (see .gate__strands)
  const GLYPHS = "抹茶雲緑静和風月花水山心道禅泡香甘夢光森葉露縁".split("");

  function Strands() {
    const canvas = $("#strands");
    const ctx = canvas.getContext("2d");
    const atlas = images.strands;
    let k = 1, d = 1, list = [];
    const streams = [];
    const SLICE = 2;

    function resize() {
      const r = fitCanvas(canvas);
      d = r.d;
      k = r.w / CV.w;
      list = STRAND_X.map((x, i) => {
        const L = S_LEN * k;
        const n = 16;
        const seg = L / (n - 1);
        const nodes = [];
        for (let j = 0; j < n; j++) nodes.push({ x: 0, y: j * seg, ox: 0, oy: j * seg });
        return { px: (x - CV.x) * k, py: (S_TOP - CV.y) * k, i, L, n, seg, nodes, ph: i * 0.61, stiff: rand(0.45, 0.65) };
      });
      // settle the chains under gravity before the first frame, so they hang perfectly still
      const idle = { active: false, over: false };
      for (let i = 0; i < 400; i++) step(1 / 120, 0, idle);
      ctx.font = "";
    }

    /** position on strand s at distance y (css px) from its top */
    function at(s, y) {
      const f = clamp(y / s.seg, 0, s.n - 1.001);
      const j = f | 0, t = f - j;
      const a = s.nodes[j], b = s.nodes[j + 1];
      return { x: s.px + lerp(a.x, b.x, t), y: s.py + lerp(a.y, b.y, t) };
    }

    function step(dt, time, ptr) {
      const G = 1500, damp = 0.982, dt2 = dt * dt;
      const R = 34 * k;
      for (const s of list) {
        const N = s.nodes;
        for (let j = 1; j < N.length; j++) {
          const p = N[j];
          const vx = (p.x - p.ox) * damp, vy = (p.y - p.oy) * damp;
          p.ox = p.x; p.oy = p.y;
          p.x += vx;
          p.y += vy + G * dt2;
          if (ptr.active) {
            const wx = s.px + p.x, wy = s.py + p.y;
            const sx = ptr.mx - ptr.pmx, sy = ptr.my - ptr.pmy;
            const l2 = sx * sx + sy * sy || 1;
            const t = clamp(((wx - ptr.pmx) * sx + (wy - ptr.pmy) * sy) / l2, 0, 1);
            const dist = Math.hypot(wx - (ptr.pmx + sx * t), wy - (ptr.pmy + sy * t));
            if (dist < R) {
              const f = (1 - dist / R) * s.stiff;
              p.x += clamp(pointer.vx, -2400, 2400) * dt * f * 0.5;
            }
          }
        }
        for (let it = 0; it < 12; it++) { // stiff chain: no stretching, so no up/down bob
          N[0].x = 0; N[0].y = 0;
          for (let j = 0; j < N.length - 1; j++) {
            const a = N[j], b = N[j + 1];
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.hypot(dx, dy) || 0.0001;
            const diff = (dist - s.seg) / dist;
            if (j === 0) { b.x -= dx * diff; b.y -= dy * diff; }
            else { a.x += dx * diff * 0.5; a.y += dy * diff * 0.5; b.x -= dx * diff * 0.5; b.y -= dy * diff * 0.5; }
          }
        }
        // sleep: once a strand has (almost) stopped, snap it to its exact rest pose so it is
        // pixel-still until the pointer touches it again (no idle shimmer or vertical bob)
        let e = 0;
        for (const p of N) e += Math.abs(p.x - p.ox) + Math.abs(p.x) * 0.02;
        if (e < 0.04 * s.n) for (let j = 0; j < N.length; j++) { const p = N[j]; p.x = p.ox = 0; p.y = p.oy = j * s.seg; }
      }
    }

    /* grey glyph streams flow down the strands near the pointer */
    let spawnAcc = 0;
    function glyphs(dt, ptr) {
      if (ptr.over && !reduceMotion) {
        const speed = Math.hypot(pointer.vx, pointer.vy);
        const R = 70 * k;
        for (const s of list) {
          const top = at(s, 0);
          const dx = Math.abs(top.x - ptr.mx);
          if (dx > R) continue;
          const yl = ptr.my - s.py;
          if (yl < -20 * k || yl > s.L) continue;
          const near = 1 - dx / R;
          const rate = near * (2.4 + Math.min(speed, 1600) / 200); // streams per second per strand
          if (Math.random() < rate * dt && streams.length < 140) {
            const len = (rand(3, 7)) | 0;
            streams.push({
              s, y: clamp(yl - rand(0, 70 * k), 0, s.L), v: rand(95, 175) * k,
              len, gap: rand(16, 19) * k, size: rand(14, 16.5) * k,
              chars: Array.from({ length: len }, () => pick(GLYPHS)), flick: 0,
              life: 0, max: rand(1.3, 2.3),
            });
          }
        }
      }
      for (let i = streams.length - 1; i >= 0; i--) {
        const g = streams[i];
        g.life += dt; g.y += g.v * dt; g.flick -= dt;
        if (g.flick <= 0) { g.chars[(Math.random() * g.len) | 0] = pick(GLYPHS); g.flick = rand(0.07, 0.16); }
        if (g.life > g.max || g.y - g.len * g.gap > g.s.L) streams.splice(i, 1);
      }
      void spawnAcc;
    }

    function draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!atlas) return;
      const dw = S_HW * 2 * k;
      for (const s of list) {
        const N = s.nodes;
        for (let y = 0; y < s.L; y += SLICE) {
          const f = y / s.seg;
          const j = Math.min(N.length - 2, f | 0);
          const t = f - j;
          const a = N[j], b = N[j + 1];
          const x = lerp(a.x, b.x, t), yy = lerp(a.y, b.y, t);
          const ang = Math.atan2(b.x - a.x, b.y - a.y);
          const cs = Math.cos(ang), sn = Math.sin(ang);
          ctx.setTransform(d * cs, -d * sn, d * sn, d * cs, (s.px + x) * d, (s.py + yy) * d);
          const sh = Math.min(SLICE, s.L - y);
          ctx.drawImage(atlas, s.i * S_HW * 2, y / k, S_HW * 2, sh / k, -dw / 2, 0, dw, sh + 0.75);
        }
      }
      // glyphs
      if (!streams.length) return;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const g of streams) {
        const fadeIn = clamp(g.life / 0.18, 0, 1);
        const fadeOut = clamp((g.max - g.life) / 0.5, 0, 1);
        for (let j = 0; j < g.len; j++) {
          const yy = g.y - j * g.gap;
          if (yy < 0 || yy > g.s.L) continue;
          const p = at(g.s, yy);
          const head = j === 0;
          const a = (head ? 1 : 0.85 * (1 - j / (g.len + 1))) * fadeIn * fadeOut;
          if (a <= 0.02) continue;
          ctx.setTransform(d, 0, 0, d, p.x * d, p.y * d);
          ctx.font = `${head ? 600 : 400} ${g.size}px "Hiragino Mincho ProN","Yu Mincho","Noto Serif CJK JP","Songti SC",serif`;
          // cream halo keeps grey glyphs legible over the beads
          ctx.globalAlpha = a * 0.7;
          ctx.fillStyle = "rgba(255,249,235,.85)";
          ctx.beginPath(); ctx.ellipse(0, 0, g.size * 0.58, g.size * 0.6, 0, 0, TAU); ctx.fill();
          ctx.globalAlpha = a;
          ctx.fillStyle = head ? "#5f5f5f" : "#8c8c8c";
          ctx.fillText(g.chars[j], 0, 0);
        }
      }
      ctx.globalAlpha = 1;
    }

    tickers.add((dt, time) => {
      const r = canvas.getBoundingClientRect();
      const mx = pointer.x - r.left, my = pointer.y - r.top;
      const ptr = {
        mx, my, pmx: pointer.px - r.left, pmy: pointer.py - r.top,
        over: pointer.inside && mx > 0 && my > 0 && mx < r.width && my < r.height,
      };
      ptr.active = ptr.over && Math.hypot(pointer.vx, pointer.vy) > 20;
      const steps = Math.ceil(dt / (1 / 120));
      for (let i = 0; i < steps; i++) step(dt / steps, time, ptr);
      glyphs(dt, ptr);
      draw();
    });
    addEventListener("resize", resize);
    resize();
    return {
      gust(power = 1) { list.forEach((s, i) => s.nodes.forEach((p, j) => { p.ox -= (j / s.n) * 0.9 * power * (0.7 + 0.3 * Math.sin(i)); })); },
    };
  }
  let strands = null;

  /* --------------------------------------------------------------- 7 */
  function Pendants() {
    const items = $$(".pend").map((el) => ({ el, w: parseFloat(el.dataset.pend) || 1, th: 0, om: 0, ph: rand(0, TAU) }));
    tickers.add((dt, time) => {
      for (const p of items) {
        const r = p.el.getBoundingClientRect();
        const over = pointer.inside && pointer.x > r.left - 8 && pointer.x < r.right + 8 && pointer.y > r.top && pointer.y < r.bottom;
        if (over) {
          const lever = clamp((pointer.y - r.top) / r.height, 0.15, 1);
          p.om += clamp(pointer.vx, -2000, 2000) * 0.00055 * lever * p.w;
        }
        // no breeze: a pendant only moves after the pointer has pushed it
        const acc = -18 * p.w * Math.sin(p.th) - 2.2 * p.om;
        p.om += acc * dt;
        p.th = clamp(p.th + p.om * dt, -0.32, 0.32);
        p.el.style.transform = `rotate(${p.th}rad)`;
      }
    });
    return { gust(power = 1) { items.forEach((p, i) => (p.om += (i % 2 ? -0.5 : 0.6) * power * p.w)); } };
  }
  let pendants = null;

  /* --------------------------------------------------------------- 8 */
  /* Small custom cursor: an ink-red seal dot (no whisk). Over links/cards it opens into a ring.
     While the pointer MOVES it leaves grey-green hieroglyphs behind; they fade in under a second,
     and nothing is spawned while the pointer is still. */
  function Cursor() {
    if (!finePointer || reduceMotion) return null;
    const canvas = $("#cursorCanvas");
    const ctx = canvas.getContext("2d");
    body.classList.add("has-cursor");
    let d = 1;
    function resize() { d = fitCanvas(canvas).d; }
    resize();
    addEventListener("resize", resize);

    const TRAIL = "抹茶雲緑静和風月花水山心道禅泡香甘夢光森葉露縁桜竹石".split("");
    const FONT = '"Hiragino Mincho ProN","Yu Mincho","Noto Serif CJK JP","Songti SC",serif';
    const glyphs = [];
    const cur = { x: -100, y: -100, hover: 0, shown: 0, press: 0 };
    let hoverTarget = false, travelled = 0, lx = null, ly = null;
    document.addEventListener("pointerover", (e) => { hoverTarget = !!e.target.closest("a, button"); });
    addEventListener("pointerdown", () => (cur.press = 1));

    tickers.add((dt) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cur.shown = lerp(cur.shown, pointer.inside ? 1 : 0, Math.min(1, dt * 10));

      // spawn by distance travelled → only while moving
      if (pointer.inside) {
        if (lx === null) { lx = pointer.x; ly = pointer.y; }
        const dist = Math.hypot(pointer.x - lx, pointer.y - ly);
        travelled += dist;
        const SPACING = 30;
        while (travelled > SPACING && glyphs.length < 60) {
          travelled -= SPACING;
          const t = dist ? clamp(1 - travelled / dist, 0, 1) : 1;
          glyphs.push({
            x: lerp(lx, pointer.x, t) + rand(-3, 3), y: lerp(ly, pointer.y, t) + rand(-3, 3),
            ch: pick(TRAIL), life: 0, max: rand(0.7, 1.0), size: rand(13, 17), rot: rand(-0.25, 0.25),
          });
        }
        lx = pointer.x; ly = pointer.y;
      } else { lx = ly = null; travelled = 0; }

      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      for (let i = glyphs.length - 1; i >= 0; i--) {
        const g = glyphs[i];
        g.life += dt;
        const k = g.life / g.max;
        if (k >= 1) { glyphs.splice(i, 1); continue; }
        ctx.setTransform(d, 0, 0, d, g.x * d, (g.y + 12 * k) * d);   // drifts down a little
        ctx.rotate(g.rot);
        ctx.globalAlpha = 0.5 * Math.pow(1 - k, 1.4) * Math.min(1, g.life / 0.08);
        ctx.font = `${g.size * (1 - 0.2 * k)}px ${FONT}`;
        ctx.fillStyle = "#3d5a33";                                     // grey-green ink
        ctx.fillText(g.ch, 0, 0);
      }
      ctx.globalAlpha = 1;

      // the seal
      cur.x = lerp(cur.x, pointer.x, Math.min(1, dt * 40));
      cur.y = lerp(cur.y, pointer.y, Math.min(1, dt * 40));
      cur.hover = lerp(cur.hover, hoverTarget ? 1 : 0, Math.min(1, dt * 14));
      cur.press = Math.max(0, cur.press - dt * 4);
      const s = cur.shown;
      if (s > 0.01) {
        ctx.setTransform(d, 0, 0, d, cur.x * d, cur.y * d);
        // ring (links / cards)
        if (cur.hover > 0.02) {
          ctx.globalAlpha = cur.hover * s;
          ctx.strokeStyle = "#c60c09"; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(0, 0, 6 + 11 * cur.hover + 3 * cur.press, 0, TAU); ctx.stroke();
        }
        // dot: 9 px red seal with a cream keyline so it reads on the red gate too
        const r = (4.5 - 2 * cur.hover) * (1 - 0.3 * cur.press) * s;
        ctx.globalAlpha = s;
        ctx.fillStyle = "#f3ebd9"; ctx.beginPath(); ctx.arc(0, 0, r + 1.2, 0, TAU); ctx.fill();
        ctx.fillStyle = "#c60c09"; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
    });
    return {};
  }

  /* -------------------------------------------------------------- 8b */
  /* Flavour ribbon + cup swap.
     One looped strip of cards (order below) seen through two windows: the right window starts
     with the selected flavour, the left one shows the three before it. Wheel / trackpad / drag
     over a window scrolls the strip one card at a time; clicking a card (image or text) brings it
     to the front. Whenever the selected card changes, the cup on the stairs is swapped. */
  const FLAVOURS = [
    // img: visible crop of the Figma fruit layer, in card px (left, top, width, height)
    { id: "strawberry", name: "Strawberry", note: "Sweet & Juicy", img: [0, 33, 146, 108] },
    { id: "peach",      name: "Peach",      note: "Super Sweet",   img: [0, 41, 147, 100] },
    { id: "cherry",     name: "Cherry",     note: "Sweet & Sour",  img: [0, 40, 164, 134] },
    { id: "mango",      name: "Mango",      note: "Sweet & Tangy", img: [4, 39, 142, 102] },
    { id: "raspberry",  name: "Raspberry",  note: "Sweet & Sour",  img: [0, 40, 146, 101] },
  ];
  const mod = (n, m) => ((n % m) + m) % m;

  /* Layout variants for review. Open the page with #v1, #v2 or #v3 to try one (a small switcher
     appears bottom-right); without a hash the page uses v0. To settle on one, change DEFAULT_VARIANT.
       k     card scale (1 = Figma 147×142)
       step  distance between card centres along the arc (gap at mid-height = step − 147·k)
       R     arc radius: smaller = tighter wheel, cards tilt faster
       btn   button colour file */
  const VARIANTS = {
    // all cards ~20% bigger than the previous round; arc radius and spacing scaled with them
    // Upward arc with real gaps. Card centres sit on a circle (radius R) whose centre is ABOVE
    // the cards, so the cards' top edges are the ones that converge: the angle between cards
    // (dT) is chosen so that even at the top edge there is ~30 px of air
    // (dT·(R − h/2) − w ≈ 30). Steeper tilt (t0 → t0+dT → …) packs the cards tighter
    // horizontally, so more of them fit beside the gate — like the reference.
    v0: { k: 1.15, R: 557, t0: 14, dT: 24, btn: "green",  label: "current" },
    v1: { k: 1.25, R: 623, t0: 14, dT: 23, btn: "pine",   label: "soft" },
    v2: { k: 1.35, R: 690, t0: 13, dT: 22, btn: "red",    label: "bold" },
    v3: { k: 1.2,  R: 522, t0: 15, dT: 27, btn: "matcha", label: "wheel" },
  };
  const DEFAULT_VARIANT = "v0";
  let VAR = VARIANTS[DEFAULT_VARIANT];
  function applyVariant() {
    const h = location.hash.slice(1);
    const id = VARIANTS[h] ? h : DEFAULT_VARIANT;
    VAR = VARIANTS[id];
    document.documentElement.style.setProperty("--card-k", VAR.k);
    $(".book__frame").src = `assets/btn-ornament-${VAR.btn}.svg`;
    let sw = $("#variantSwitch");
    if (VARIANTS[h] && !sw) {
      sw = document.createElement("nav");
      sw.id = "variantSwitch";
      sw.className = "vswitch";
      sw.setAttribute("aria-label", "Layout variants");
      sw.innerHTML = Object.entries(VARIANTS).map(([k, v]) => `<a href="#${k}" data-v="${k}">${k} · ${v.label}</a>`).join("");
      body.appendChild(sw);
    }
    if (sw) $$("a", sw).forEach((a) => a.classList.toggle("is-on", a.dataset.v === id));
  }
  applyVariant();
  addEventListener("hashchange", applyVariant);

  function Flavours() {
    const rails = $$(".rail").map((el) => ({ el, side: el.dataset.rail, cards: new Map() }));
    const live = $("#flavourLive");
    let pos = 0, target = 0, activeK = 0, ready = false, snapT = 0;

    const geo = () => isMobileLayout()
      ? { step: 121.6, w: 117.6, base: { right: 18, left: -999 } }
      : { step: 152, w: 147 * VAR.k, h: 142 * VAR.k, base: { right: lines.inkR / unit() - INNER_R, left: lines.inkL / unit() + INNER_L + 5 } };

    function rollMarkup(text) {
      return [...text].map((ch, i) => {
        const c = ch === " " ? " " : ch;
        return `<span class="rl" style="--i:${i}" aria-hidden="true"><b>${c}</b><b>${c}</b></span>`;
      }).join("");
    }

    function makeCard(k) {
      const f = FLAVOURS[mod(k, FLAVOURS.length)];
      const b = document.createElement("button");
      b.type = "button";
      b.className = "card";
      b.dataset.k = k;
      b.setAttribute("aria-label", `${f.name} — ${f.note}`);
      const [l, t, w, h] = f.img;
      b.innerHTML = `<span class="card__in">
          <img class="card__img" src="assets/fruit-${f.id}.webp" alt="" draggable="false"
               style="left:calc(${l} * var(--cu));top:calc(${t} * var(--cu));width:calc(${w} * var(--cu));height:calc(${h} * var(--cu))" />
          <span class="card__txt"><span class="card__name">${f.name}</span><span class="card__note">${f.note}</span></span>
        </span>`;
      b.addEventListener("click", (e) => pickCard(b, k, e));
      return b;
    }

    function pickCard(b, k, e) {
      if (dragMoved) return;
      // press + ink ripple from the click point (card or its text)
      const r = b.getBoundingClientRect();
      const ink = document.createElement("span");
      ink.className = "ink";
      const size = Math.max(r.width, r.height) * 2.2;
      Object.assign(ink.style, { width: size + "px", height: size + "px", left: (e.clientX ? e.clientX - r.left : r.width / 2) + "px", top: (e.clientY ? e.clientY - r.top : r.height / 2) + "px" });
      b.appendChild(ink);
      ink.animate([{ transform: "translate(-50%,-50%) scale(0)", opacity: 1 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 0 }], { duration: 650, easing: EASE_OUT })
        .finished.then(() => ink.remove());
      $(".card__in", b).animate([
        { transform: "scale(1)" }, { transform: "scale(.93)", offset: 0.25 }, { transform: "scale(1.04)", offset: 0.6 }, { transform: "scale(1)" },
      ], { duration: 450, easing: "ease-out" });
      $(".card__img", b).animate([
        { transform: "translateY(0) rotate(0)" }, { transform: "translateY(-10%) rotate(-6deg)", offset: 0.4 }, { transform: "translateY(0) rotate(0)" },
      ], { duration: 520, easing: EASE_OUT, composite: "add" });
      target = k;
    }

    /* layout: place the cards that are inside each window */
    /* Desktop: the cards sit on an upward arc around the gate: the card next to the gate is
       nearly level and lowest, each next card climbs higher and tilts more.
       Card centres lie on a circle of radius ARC_R; cards are ARC_STEP apart along it
       (tight: bottom corners almost touch, ~30 px at the top). A card that slides past the
       gate fades out, as if it went behind it. Phones keep a flat strip. */
    /** The circle the cards sit on (stage units). Its centre is ABOVE the cards, so the strip
        climbs as it goes outward. The card next to the gate keeps its edge INNER_L / INNER_R
        from the text lines; its top sits at y 540 (rail window top + 240). */
    function arc(side, g, topU) {
      const dir = side === "right" ? 1 : -1;
      const R = VAR.R, dT = VAR.dT * Math.PI / 180, t0 = VAR.t0 * Math.PI / 180;
      const base = g.base[side];
      const icx = side === "right" ? base + g.w / 2 : base - 5 - g.w / 2;
      const icy = topU + 240 + g.h / 2;
      return { dir, R, dT, t0, icx, icy, Cx: icx - dir * R * Math.sin(t0), Cy: icy - R * Math.cos(t0) };
    }

    /* Curved labels: "Choose your flavours →" and "Scroll for more →" run along the same arc,
       just above the cards (SVG textPath), instead of sitting as straight lines over them.
       Left label ends at the inner card with its arrow pointing to the cup; right label starts
       at the inner card with its arrow pointing outward, the way the strip scrolls. */
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "arc-labels");
    svg.setAttribute("aria-hidden", "true");
    $("#flavours").appendChild(svg);
    const CURVED_LABELS = false;   // labels now sit straight under the title (see alignSideTexts)
    function drawLabels() {
      svg.textContent = "";
      if (!CURVED_LABELS || isMobileLayout()) return;
      const u = unit(), g = geo();
      const st = $("#flavours").getBoundingClientRect();
      svg.setAttribute("viewBox", `0 0 ${st.width} ${st.height}`);
      const fs = 20 * u;
      [["left", "Choose your flavours"], ["right", "Scroll for more"]].forEach(([side, text]) => {
        const Rl = rails.find((r) => r.side === side);
        const A = arc(side, g, Rl.el.offsetTop / u);
        const r = A.R - g.h / 2 - 18;                               // baseline 18 px above the cards
        const P = (th) => [(A.Cx + A.dir * r * Math.sin(th)) * u, (A.Cy + r * Math.cos(th)) * u];
        const thIn = A.t0 - (g.w / 2) / (A.R - g.h / 2);            // inner card's inner edge
        const span = 1.25;                                           // radians of path
        const [t1, t2] = side === "right" ? [thIn, thIn + span] : [thIn + span, thIn];
        const a = P(t1), b = P(t2);
        const id = "arc-" + side;
        const path = document.createElementNS(NS, "path");
        path.setAttribute("id", id);
        path.setAttribute("d", `M${a[0]},${a[1]} A${r * u},${r * u} 0 0 0 ${b[0]},${b[1]}`);
        path.setAttribute("fill", "none");
        svg.appendChild(path);
        const T = document.createElementNS(NS, "text");
        T.setAttribute("class", "arc-label arc-label--" + side);
        T.setAttribute("font-size", fs);
        T.setAttribute("letter-spacing", -1.2 * u);
        const tp = document.createElementNS(NS, "textPath");
        tp.setAttribute("href", "#" + id);
        tp.textContent = text.toUpperCase();
        T.appendChild(tp);
        svg.appendChild(T);
        const len = T.getComputedTextLength();
        const pathLen = path.getTotalLength();
        const gap = 13 * u, arrowLen = 34 * u;
        // left: text + arrow end at the inner edge; right: start there
        const start = side === "right" ? 0 : pathLen - len - gap - arrowLen;
        tp.setAttribute("startOffset", start);
        // arrow placed along the arc after the text, rotated to the tangent
        const sA = start + len + gap;
        const p0 = path.getPointAtLength(sA), p1 = path.getPointAtLength(sA + arrowLen);
        const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x) * 180 / Math.PI;
        const arr = document.createElementNS(NS, "path");
        const L = arrowLen, hh = 4.5 * u;
        arr.setAttribute("d", `M0,0 H${L} M${L},0 L${L - 4 * u},${-hh + 0.8 * u} M${L},0 L${L - 4 * u},${hh - 0.8 * u}`);
        arr.setAttribute("class", "arc-arrow arc-label--" + side);
        arr.setAttribute("transform", `translate(${p0.x},${p0.y}) rotate(${ang}) translate(0,${-6.5 * u})`); // lifted to x-height
        svg.appendChild(arr);
        if (side === "right") {
          // the curved text is the clickable "scroll for more"
          [T, arr].forEach((el) => el.addEventListener("click", () => (target = Math.round(target) + 1)));
        }
      });
    }
    addEventListener("resize", () => setTimeout(drawLabels, 140));
    addEventListener("hashchange", () => setTimeout(drawLabels, 0));
    document.fonts.ready.then(drawLabels);

    function render(u) {
      const g = geo();
      const mobile = isMobileLayout();
      rails.forEach((R) => {
        const base = g.base[R.side];
        const leftU = R.el.offsetLeft / u, rightU = leftU + R.el.offsetWidth / u, topU = R.el.offsetTop / u;
        const visible = new Set();
        if (base > -999 && R.el.offsetWidth) {
          let kmin, kmax;
          if (mobile) {
            kmin = Math.ceil(pos + (leftU - g.w - base) / g.step);
            kmax = Math.floor(pos + (rightU - base) / g.step);
          } else if (R.side === "right") { kmin = Math.floor(pos) - 1; kmax = Math.ceil(pos) + 7; }
          else { kmin = Math.floor(pos) - 8; kmax = Math.ceil(pos); }
          for (let k = kmin; k <= kmax; k++) {
            let tf, op = 1;
            if (mobile) {
              const x = base + (k - pos) * g.step - leftU;
              tf = `translate3d(${(x * u).toFixed(2)}px,0,0)`;
            } else {
              const dir = R.side === "right" ? 1 : -1;
              const sIdx = R.side === "right" ? k - pos : (pos - 1) - k;      // 0 = card next to the gate
              op = clamp((sIdx + 0.4) / 0.4, 0, 1);
              if (op <= 0 && sIdx < 0) continue;
              const A = arc(R.side, g, topU);
              const ARC_R = A.R;
              const th = A.t0 + sIdx * A.dT;
              const cx = A.Cx + dir * ARC_R * Math.sin(th), cy = A.Cy + ARC_R * Math.cos(th);
              const x = cx - g.w / 2 - leftU, y = cy - g.h / 2 - (topU + 14);
              tf = `translate3d(${(x * u).toFixed(2)}px,${(y * u).toFixed(2)}px,0) rotate(${(-dir * th * 180 / Math.PI).toFixed(2)}deg)`;
            }
            visible.add(k);
            let c = R.cards.get(k);
            if (!c) { c = makeCard(k); R.cards.set(k, c); R.el.appendChild(c); }
            c.style.transform = tf;
            c.style.opacity = op < 1 ? op.toFixed(3) : "";
            c.classList.toggle("is-active", R.side === "right" && k === activeK);
          }
        }
        R.cards.forEach((c, k) => { if (!visible.has(k)) { c.remove(); R.cards.delete(k); } });
      });
    }

    /* cup on the stairs */
    function swapCup(f, instant) {
      const glassEl = $("#glass");
      const shine = $(".glass__shine", glassEl);
      const imgs = $$(".glass__img", glassEl);
      const curr = imgs[imgs.length - 1];
      if (curr && curr.dataset.f === f.id) return;
      const src = `assets/glass-${f.id}.webp`;
      const next = new Image();
      next.className = "glass__img";
      next.src = src;
      next.alt = `${f.name} matcha latte in a Cloud cup`;
      next.dataset.f = f.id;
      glassEl.insertBefore(next, shine);
      shine.style.webkitMaskImage = shine.style.maskImage = `url("${src}")`;
      imgs.forEach((old) => {
        old.getAnimations().forEach((a) => a.cancel());
        if (instant || reduceMotion) return old.remove();
        old.animate([{ opacity: 1, transform: "none", filter: "blur(0)" }, { opacity: 0, transform: "translateY(3%) scale(.95)", filter: "blur(3px)" }],
          { duration: 280, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" }).finished.then(() => old.remove(), () => {});
      });
      if (!instant && !reduceMotion)
        next.animate([{ opacity: 0, transform: "translateY(-7%) scale(1.02)" }, { opacity: 1, transform: "none" }],
          { duration: 520, delay: 80, easing: EASE_OUT, fill: "backwards" });
      live.textContent = `${f.name} selected`;
    }

    function setActive(k) {
      activeK = k;
      const f = FLAVOURS[mod(k, FLAVOURS.length)];
      swapCup(f);
    }

    /* input: wheel, drag, keys, "scroll for more" */
    const snapSoon = () => { clearTimeout(snapT); snapT = setTimeout(() => (target = Math.round(target)), 140); };
    let drag = null, dragMoved = false;
    rails.forEach((R) => {
      R.el.addEventListener("wheel", (e) => {
        e.preventDefault();
        const dv = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        const px = e.deltaMode === 1 ? dv * 40 : dv;
        target += px / (geo().step * unit());
        snapSoon();
      }, { passive: false });
      R.el.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        drag = { x: e.clientX, t0: target, last: e.clientX, v: 0, time: performance.now(), el: R.el, id: e.pointerId };
        dragMoved = false;
      });
      R.el.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") { target = Math.round(target) + 1; e.preventDefault(); }
        if (e.key === "ArrowLeft") { target = Math.round(target) - 1; e.preventDefault(); }
      });
    });
    addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!dragMoved && Math.abs(dx) > 6) { dragMoved = true; drag.el.classList.add("is-dragging"); try { drag.el.setPointerCapture(drag.id); } catch (_) {} }
      if (dragMoved) {
        const now = performance.now();
        drag.v = lerp(drag.v, (e.clientX - drag.last) / Math.max(8, now - drag.time), 0.5);
        drag.last = e.clientX; drag.time = now;
        target = drag.t0 - dx / (geo().step * unit());
      }
    });
    addEventListener("pointerup", () => {
      if (!drag) return;
      if (dragMoved) {
        target = Math.round(target - (drag.v * 120) / (geo().step * unit())); // flick
        drag.el.classList.remove("is-dragging");
        setTimeout(() => (dragMoved = false), 0); // swallow the click that follows a drag
      }
      drag = null;
    });
    $("#railNext").addEventListener("click", () => (target = Math.round(target) + 1));

    tickers.add((dt) => {
      const u = unit();
      if (!reduceMotion) pos = lerp(pos, target, 1 - Math.exp(-dt * 9));
      else pos = target;
      if (Math.abs(pos - target) < 0.0005) pos = target;
      const k = Math.round(target);
      if (ready && k !== activeK) setActive(k);
      render(u);
    });

    return {
      enter(delay) {
        const A = (el, kf, o) => el.animate(kf, Object.assign({ fill: "both", easing: EASE_OUT }, o));
        A($(".rail--left"), [{ opacity: 0, transform: "translateX(-60px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay });
        A($(".rail--right"), [{ opacity: 0, transform: "translateX(60px)" }, { opacity: 1, transform: "none" }], { duration: 900, delay: delay + 80 });
        $$(".arc-label, .arc-arrow").forEach((el) => el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: delay + 300, fill: "backwards" }));
        $$(".rail-label").forEach((el, i) => A(el, [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 400, delay: delay + 200 + i * 80 }));
      },
      start() { ready = true; },
      drawLabels,
    };
  }
  let flavours = null;

  /* --------------------------------------------------------------- 9 */
  const countdown = (() => {
    const box = $("#countdown");
    const nums = { days: $('[data-unit="days"]', box), hours: $('[data-unit="hours"]', box), minutes: $('[data-unit="minutes"]', box) };
    // Deadline: data-deadline="2026-11-08T20:00:00+02:00", or 10 d 23 h 32 m from first visit.
    let deadline = Date.parse(box.dataset.deadline || "");
    const fallback = () => Date.now() + ((10 * 24 + 23) * 60 + 32) * 60000 + 59000;
    if (!deadline) {
      try {
        deadline = Number(localStorage.getItem("cm3-deadline")) || 0;
        if (deadline < Date.now()) { deadline = fallback(); localStorage.setItem("cm3-deadline", String(deadline)); }
      } catch (_) { deadline = fallback(); }
    }
    const current = { days: "10", hours: "24", minutes: "32" };
    let live = false;
    function values() {
      const m = Math.floor(Math.max(0, deadline - Date.now()) / 60000);
      return { days: String(Math.floor(m / 1440)).padStart(2, "0"), hours: String(Math.floor((m % 1440) / 60)).padStart(2, "0"), minutes: String(m % 60).padStart(2, "0") };
    }
    function setUnit(key, next) {
      const el = nums[key], prev = current[key];
      if (prev === next) return;
      current[key] = next;
      el.textContent = "";
      [...next].forEach((ch, i) => {
        const old = prev[i] ?? ch;
        if (old === ch) { const s = document.createElement("span"); s.textContent = ch; el.appendChild(s); return; }
        const roll = document.createElement("span");
        roll.className = "roll";
        roll.innerHTML = `<span>${old}</span><span class="next">${ch}</span>`;
        el.appendChild(roll);
        requestAnimationFrame(() => requestAnimationFrame(() => roll.classList.add("go")));
        setTimeout(() => { roll.className = ""; roll.textContent = ch; }, 700);
      });
    }
    function tick() { if (live) { const v = values(); setUnit("days", v.days); setUnit("hours", v.hours); setUnit("minutes", v.minutes); } }
    setInterval(tick, 1000);
    function enter(delay) {
      const target = values();
      Object.keys(nums).forEach((k) => { nums[k].textContent = "00"; current[k] = "00"; });
      $$(".cd-unit", box).forEach((u, i) =>
        u.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 400, delay: delay + i * 90, easing: EASE_OUT, fill: "backwards" }));
      setTimeout(() => {
        const t0 = performance.now(), D = 1200;
        const go = (now) => {
          const p = clamp((now - t0) / D, 0, 1);
          const e = 1 - Math.pow(1 - p, 3);
          Object.keys(nums).forEach((k) => { const v = String(Math.round(Number(target[k]) * e)).padStart(2, "0"); nums[k].textContent = v; current[k] = v; });
          if (p < 1) requestAnimationFrame(go); else { live = true; tick(); }
        };
        requestAnimationFrame(go);
      }, delay + 200);
    }
    return { enter };
  })();

  /* ------------------------------------------------------------ boot */
  splitText();
  Cursor();
  layoutGate();
  // registered before the canvases, so they resize against the new gate size
  addEventListener("resize", layoutGate);
  let rT;
  addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(fitTitle, 120); });

  Promise.all([loadAll(), playFilm()]).then(async ([, film]) => {
    fitTitle();
    strands = Strands();
    pendants = Pendants();
    flavours = Flavours();
    await wait(reduceMotion ? 0 : 150);
    revealHero(film);
  });
})();
