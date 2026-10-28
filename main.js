gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(pointer: fine)").matches;
const { clamp, random } = gsap.utils;

const storage = (area) => ({
  get: (key) => { try { return area().getItem(key); } catch { return null; } },
  set: (key, value) => { try { area().setItem(key, value); } catch {} },
});
const local = storage(() => localStorage);
const session = storage(() => sessionStorage);

let lang = local.get("lang");
const words = () => I18N.bird[lang || "es"];
const langToggle = document.querySelector("[data-lang-toggle]");

const applyLanguage = (code) => {
  lang = code;
  local.set("lang", code);
  document.documentElement.lang = code;
  langToggle.textContent = code === "en" ? "ES" : "EN";
  if (code !== "en") return;
  const pack = I18N.en;
  document.title = pack.title;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const value = pack.text[el.dataset.i18n];
    if (value) el.textContent = value;
  });
};

let theme = local.get("theme");
const themeToggle = document.querySelector("[data-theme-toggle]");

const applyTheme = (value) => {
  theme = value;
  local.set("theme", value);
  document.documentElement.dataset.theme = value;
};

themeToggle.addEventListener("click", () => {
  applyTheme(theme === "dark" ? "light" : "dark");
  document.dispatchEvent(new Event("theme:change"));
});

langToggle.addEventListener("click", () => {
  local.set("lang", lang === "en" ? "es" : "en");
  session.set("lang-switched", "1");
  location.reload();
});

let audio = null;
let soundOn = local.get("sound") !== "off";

const unlockAudio = () => {
  audio ??= new AudioContext();
  audio.resume();
};

["pointerdown", "keydown", "touchstart"].forEach((type) => addEventListener(type, unlockAudio, { once: true }));

const audible = () => soundOn && audio?.state === "running";

const blip = () => {
  if (!audible()) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(random(420, 640), now);
  osc.frequency.exponentialRampToValueAtTime(random(300, 420), now + 0.06);
  filter.type = "lowpass";
  filter.frequency.value = 1800;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
  osc.connect(filter).connect(gain).connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.08);
};

const tone = ({ type = "sine", from, to = from, dur = 0.12, gain = 0.15, delay = 0 }) => {
  if (!audible()) return;
  const now = audio.currentTime + delay;
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, now);
  osc.frequency.exponentialRampToValueAtTime(to, now + dur);
  amp.gain.setValueAtTime(0.0001, now);
  amp.gain.exponentialRampToValueAtTime(gain, now + 0.012);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(amp).connect(audio.destination);
  osc.start(now);
  osc.stop(now + dur + 0.02);
};

const notes = [523, 587, 659, 784, 880, 1047, 1175];

const sfx = {
  land: () => tone({ from: 240, to: 70, dur: 0.14, gain: 0.28 }),
  boing: () => {
    tone({ type: "triangle", from: 160, to: 640, dur: 0.18, gain: 0.14 });
    tone({ type: "triangle", from: 640, to: 300, dur: 0.16, gain: 0.08, delay: 0.17 });
  },
  pop: () => tone({ from: 420, to: 1500, dur: 0.09, gain: 0.14 }),
  tick: () => {
    tone({ type: "square", from: 2200, to: 1400, dur: 0.025, gain: 0.035 });
    tone({ from: random(520, 700), to: 380, dur: 0.05, gain: 0.05 });
  },
  whoosh: () => {
    tone({ from: 180, to: 900, dur: 0.6, gain: 0.07 });
    tone({ type: "triangle", from: 90, to: 320, dur: 0.5, gain: 0.06 });
  },

  squeak: () => tone({ type: "triangle", from: 700, to: 1150, dur: 0.11, gain: 0.08 }),
  kick: () => tone({ type: "square", from: 190, to: 60, dur: 0.09, gain: 0.16 }),
  boom: () => {
    tone({ type: "sawtooth", from: 140, to: 28, dur: 0.9, gain: 0.14 });
    tone({ type: "triangle", from: 70, to: 20, dur: 1, gain: 0.18 });
    tone({ type: "square", from: 900, to: 90, dur: 0.25, gain: 0.05 });
  },
  ding: () => {
    tone({ from: 988, dur: 0.3, gain: 0.12 });
    tone({ from: 1319, dur: 0.4, gain: 0.1, delay: 0.09 });
  },
  chime: () => [659, 988, 1319].forEach((from, i) => tone({ from, dur: 0.35, gain: 0.1, delay: i * 0.09 })),
  wobble: () => [420, 300, 400, 280, 380].forEach((from, i) => tone({ type: "triangle", from, dur: 0.12, gain: 0.09, delay: i * 0.1 })),
  note: (i) => tone({ type: "triangle", from: notes[i % notes.length], dur: 0.2, gain: 0.1 }),
};

let engine = null;

const engineOn = () => {
  if (!audible() || engine) return;
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const flutter = audio.createOscillator();
  const depth = audio.createGain();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = 82;
  flutter.frequency.value = 17;
  depth.gain.value = 7;
  filter.type = "lowpass";
  filter.frequency.value = 520;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(0.03, now + 0.5);
  flutter.connect(depth).connect(osc.frequency);
  osc.connect(filter).connect(gain).connect(audio.destination);
  osc.start(now);
  flutter.start(now);
  engine = { osc, flutter, gain };
};

const engineOff = () => {
  if (!engine) return;
  const now = audio.currentTime;
  const { osc, flutter, gain } = engine;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0.0001, now + 0.45);
  osc.stop(now + 0.5);
  flutter.stop(now + 0.5);
  engine = null;
};

const click = (strength = 1) => {
  if (!audible()) return;
  const now = audio.currentTime;

  const noise = audio.createBuffer(1, audio.sampleRate * 0.03, audio.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);

  const source = audio.createBufferSource();
  const band = audio.createBiquadFilter();
  const clackGain = audio.createGain();
  source.buffer = noise;
  band.type = "bandpass";
  band.frequency.value = 2400 + Math.random() * 600;
  clackGain.gain.value = 0.35 * strength;
  source.connect(band).connect(clackGain).connect(audio.destination);
  source.start(now);

  const thump = audio.createOscillator();
  const thumpGain = audio.createGain();
  thump.frequency.setValueAtTime(140, now);
  thump.frequency.exponentialRampToValueAtTime(60, now + 0.06);
  thumpGain.gain.setValueAtTime(0.25 * strength, now);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  thump.connect(thumpGain).connect(audio.destination);
  thump.start(now);
  thump.stop(now + 0.09);
};

const soundButton = document.querySelector("[data-sound]");
soundButton.setAttribute("aria-pressed", soundOn);
soundButton.addEventListener("click", () => {
  soundOn = !soundOn;
  local.set("sound", soundOn ? "on" : "off");
  soundButton.setAttribute("aria-pressed", soundOn);
  if (!soundOn) engineOff();
  click();
});

document.querySelectorAll("[data-copy]").forEach((btn) => {
  const hint = btn.querySelector("[data-hint]");
  btn.addEventListener("click", async () => {
    const label = hint.textContent;
    sfx.ding();
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      hint.textContent = I18N[lang || "es"].copied;
    } catch {
      hint.textContent = btn.dataset.copy;
    }
    setTimeout(() => { hint.textContent = label; }, 1600);
  });
});

const modal = document.querySelector(".modal");
const modalBody = modal.querySelector(".modal__body");
let scroller = null;

const openProject = (id) => {
  modalBody.replaceChildren(document.querySelector(`[data-detail="${id}"]`).cloneNode(true));
  modal.showModal();
  modal.querySelector(".modal__panel").scrollTop = 0;
  scroller?.stop();
  sfx.pop();
  if (!reduceMotion) {
    gsap.fromTo(".modal__panel", { y: 40, scale: 0.97, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.55, ease: "expo.out" });
  }
};

modal.addEventListener("close", () => scroller?.start());
modal.querySelector(".modal__close").addEventListener("click", () => modal.close());
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.close();
});

document.querySelectorAll("[data-project]").forEach((card) => {
  card.addEventListener("click", () => openProject(card.dataset.project));
});

const loader = document.querySelector(".loader");

const finishLoading = () => {
  loader.remove();
  document.body.classList.remove("is-loading");
};

if (reduceMotion) {
  applyLanguage(lang || (navigator.language.startsWith("en") ? "en" : "es"));
  applyTheme(theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  finishLoading();
} else {
  const hero = document.querySelector(".hero");
  if (lang) applyLanguage(lang);
  if (!lang || !theme) hero.classList.add("is-picking");

  const lenis = new Lenis({ lerp: 0.06, wheelMultiplier: 0.7 });
  scroller = lenis;
  let autoScroll = false;
  let flown = false;
  let landing = false;
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const toEnd = link.hasAttribute("data-end");
      autoScroll = true;
      if (toEnd) {
        lenis.scrollTo(lenis.limit, { immediate: true, force: true });
        requestAnimationFrame(() => {
          lenis.scrollTo(lenis.limit, { immediate: true, force: true });
          autoScroll = false;
        });
        return;
      }
      lenis.scrollTo(link.getAttribute("href"), {
        duration: 1.4,
        force: true,
        onComplete: () => { autoScroll = false; },
      });
    });
  });

  const bird = document.querySelector(".bird");
  const birdBob = bird.querySelector(".bird__bob");
  const birdBody = bird.querySelector(".bird__body");
  const bubble = document.querySelector(".bubble");
  const bubbleText = bubble.querySelector("[data-bubble]");
  const lerp = gsap.utils.interpolate;
  const emit = (type, detail) => bird.dispatchEvent(new CustomEvent(type, { detail }));
  const wearOutfit = (name) => {
    dressed = false;
    emit("bird:wear", name);
    sfx.pop();
  };
  const resumeScroll = () => !hero.classList.contains("is-picking") && lenis.start();

  const spots = {
    top: { x: 0.74, y: 1.06, s: 1 },
    hago: { x: 0.93, y: 1.04, s: 0.45 },
    hagoBig: { x: 0.87, y: 1.05, s: 0.64 },
    trabajo: { x: 0.93, y: 1.04, s: 0.4 },
    sobre: { x: 0.2, y: 1.07, s: 1.08 },
    stack: { x: 0.07, y: 0.4, s: 0.32 },
    ship: { x: 0.8, y: 0.86, s: 0.62 },
    contacto: { x: 0.5, y: 1.06, s: 0.56 },
  };

  const state = { x: 0, y: 0, s: 1 };
  let dir = 1;
  let current = "top";
  let ready = false;
  let dragging = false;
  let asleep = false;
  let hopTl = null;
  let typer = 0;
  let pokeIndex = 0;
  let talkingUntil = 0;
  let shipOn = false;
  let readIndex = -1;
  let tickIndex = -1;
  let lookIndex = 0;
  let dressed = false;

  const outfitFor = { top: "none", hago: "headphones", trabajo: "winter", sobre: "student", stack: "headphones", contacto: "fancy" };
  const scenes = ["sobre", "stack"];
  const looks = ["cap", "headphones", "winter", "student", "fancy", "nerd"];
  let narrow = innerWidth < 720;

  const size = () => ({ w: bird.offsetWidth, h: bird.offsetHeight });

  const spotPx = (name) => {
    const narrow = innerWidth < 720;
    const spot = spots[name];
    const big = name === "top" || name === "sobre";
    const x = narrow ? (big ? 0.5 : name === "stack" ? 0.12 : 0.86) : spot.x;
    const y = narrow && big ? 1.1 : spot.y;
    const s = narrow ? (name === "stack" ? 0.5 : name === "hagoBig" ? 0.55 : big ? 1 : 0.38) : spot.s;
    if (name === "trabajo") {
      const tiny = narrow ? 0.2 : 0.16;
      return { x: innerWidth - (size().w * tiny) / 2 - 14, y: innerHeight + 6, s: tiny };
    }
    if (narrow && name === "sobre") {
      const pin = document.querySelector("[data-pin]").getBoundingClientRect();
      const text = document.querySelector("[data-scrub]").getBoundingClientRect();
      const room = innerHeight * 1.06 - (text.bottom - pin.top) - 16;
      return { x: 0.5 * innerWidth, y: 1.06 * innerHeight, s: clamp(0.45, 0.75, room / size().h) };
    }
    return { x: x * innerWidth, y: y * innerHeight, s };
  };

  const onScreen = () => {
    const { w, h } = size();
    const half = (w * state.s) / 2;
    return state.x + half > 0 && state.x - half < innerWidth && state.y - h * state.s < innerHeight && state.y > 0;
  };

  const placeBubble = () => {
    if (!onScreen() && gsap.getProperty(bubble, "autoAlpha") > 0) gsap.set(bubble, { autoAlpha: 0 });
    const { h } = size();
    const left = state.x > innerWidth / 2;
    const bw = bubble.offsetWidth;
    const bh = bubble.offsetHeight;
    const bx = clamp(12, innerWidth - bw - 12, left ? state.x - bw * 0.4 : state.x - bw * 0.6);
    const by = state.y - h * state.s * 0.82 - bh - 18;
    const tail = clamp(26, bw - 26, state.x - bx);
    bubble.style.setProperty("--tail", `${tail}px`);
    bubble.style.transformOrigin = `${tail}px 100%`;
    gsap.set(bubble, { x: bx, y: Math.max(76, by) });
  };

  const last = { x: null, y: null };

  const render = () => {
    const { w, h } = size();
    if (last.x !== null) emit("bird:move", { dx: state.x - last.x, dy: state.y - last.y });
    last.x = state.x;
    last.y = state.y;
    gsap.set(bird, { x: state.x - w / 2, y: state.y - h, scale: state.s });
    placeBubble();
  };

  const hideBubble = () => {
    clearInterval(typer);
    gsap.to(bubble, { autoAlpha: 0, scale: 0.8, duration: 0.2, overwrite: true });
  };

  const typed = (parts, count) => {
    let left = count;
    bubbleText.replaceChildren(...parts.map(({ text, mark }) => {
      const shown = text.slice(0, Math.max(0, left));
      left -= text.length;
      if (!mark) return document.createTextNode(shown);
      const em = document.createElement("em");
      em.textContent = shown;
      return em;
    }));
  };

  const say = (line) => {
    if (!onScreen()) return;
    clearInterval(typer);
    const parts = line.split("*").map((text, i) => ({ text, mark: i % 2 === 1 }));
    const total = parts.reduce((sum, part) => sum + part.text.length, 0);
    typed(parts, 0);
    placeBubble();
    gsap.fromTo(bubble, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(2)", overwrite: true });
    emit("bird:talk", total * 36 + 120);
    talkingUntil = performance.now() + total * 36 + Math.max(2600, total * 45);
    let i = 0;
    typer = setInterval(() => {
      typed(parts, ++i);
      placeBubble();
      if (i % 3 === 0) blip();
      if (i >= total) clearInterval(typer);
    }, 36);
  };

  const sayNext = (text) => {
    const busy = hopTl?.isActive() ? 1800 : 0;
    const wait = Math.max(busy, talkingUntil - performance.now(), 0);
    gsap.delayedCall(wait / 1000, () => !dragging && say(text));
  };

  const face = (d) => {
    if (d === dir) return;
    dir = d;
    emit("bird:face", d);
  };

  const hop = (to, onDone, fast = false) => {
    hopTl?.kill();
    const from = { ...state };
    const dx = to.x - from.x;
    if (Math.abs(dx) > 4) face(dx > 0 ? 1 : -1);
    const dist = Math.hypot(dx, to.y - from.y);
    const arc = fast ? 60 : 80 + dist * 0.18;
    const p = { v: 0 };
    hideBubble();
    hopTl = gsap.timeline({ onComplete: onDone })
      .to(birdBody, { scaleX: 1.12, scaleY: 0.86, duration: 0.12, ease: "power2.out" })
      .to(p, {
        v: 1,
        duration: fast ? 0.55 : clamp(0.6, 1.3, dist / 900),
        ease: "power1.inOut",
        onUpdate: () => {
          state.x = lerp(from.x, to.x, p.v);
          state.y = lerp(from.y, to.y, p.v) - Math.sin(Math.PI * p.v) * arc;
          state.s = lerp(from.s, to.s, p.v);
          render();
        },
      })
      .to(birdBody, { scaleX: 0.95, scaleY: 1.06, duration: 0.2 }, "<")
      .to(birdBody, { scaleX: 1.12, scaleY: 0.88, duration: 0.08 })
      .add(sfx.land)
      .to(birdBody, { scaleX: 1, scaleY: 1, duration: 0.6, ease: "elastic.out(1, 0.4)" });
  };

  const go = (name, direction = 1) => {
    if (name === current || !ready || dragging || shipOn) {
      current = name;
      return;
    }
    current = name;
    emit("bird:pose", null);
    const lock = scenes.includes(name) && direction > 0 && !autoScroll;
    if (lock) lenis.stop();
    if (name === "stack" && lock && !flown) {
      wearOutfit(outfitFor.stack);
      say(words().stack);
      hopTl = gsap.timeline().add(() => hop({ x: -size().w * state.s, y: state.y, s: state.s }, () => {
        emit("bird:plane", true);
        engineOn();
        resumeScroll();
      }, true), 1.6);
      return;
    }
    emit("bird:plane", name === "stack");
    if (name === "stack") engineOn();
    else engineOff();
    hop(spotPx(name), () => {
      if (lock) resumeScroll();
      wearOutfit(outfitFor[name]);
      if (words()[name]) say(words()[name]);
      sceneLook();
    }, lock);
  };

  const sceneLook = () => {
    if (current === "sobre") {
      const r = document.querySelector("[data-scrub]").getBoundingClientRect();
      emit("bird:look", { x: r.left + 40, y: r.top + 40 });
    }
  };

  const jump = (height = "-40%") => gsap.timeline()
    .add(sfx.boing)
    .to(birdBody, { scaleX: 1.12, scaleY: 0.86, duration: 0.12, ease: "power2.out" })
    .to(birdBody, { y: height, scaleX: 0.94, scaleY: 1.08, duration: 0.3, ease: "power2.out" })
    .to(birdBody, { y: 0, scaleX: 0.96, scaleY: 1.04, duration: 0.26, ease: "power2.in" })
    .to(birdBody, { scaleX: 1.1, scaleY: 0.9, duration: 0.08 })
    .to(birdBody, { scaleX: 1, scaleY: 1, duration: 0.6, ease: "elastic.out(1, 0.4)" });

  const poke = () => {
    if (dressed) {
      wearOutfit(outfitFor[current]);
    } else {
      do lookIndex = (lookIndex + 1) % looks.length;
      while (looks[lookIndex] === outfitFor[current]);
      wearOutfit(looks[lookIndex]);
      dressed = true;
    }
    say(words().pokes[pokeIndex++ % words().pokes.length]);
    jump();
  };

  const swing = gsap.quickTo(birdBody, "rotation", { duration: 0.4, ease: "power3" });
  const lean = gsap.quickTo(bird, "rotation", { duration: 0.5, ease: "power3" });
  let grab = null;

  bird.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    bird.setPointerCapture(e.pointerId);
    dragging = true;
    grab = { x: e.clientX, y: e.clientY, sx: state.x, sy: state.y, moved: false };
    hopTl?.kill();
    resumeScroll();
  });

  bird.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - grab.x;
    const dy = e.clientY - grab.y;
    if (!grab.moved && Math.hypot(dx, dy) > 6) {
      grab.moved = true;
      bird.classList.add("is-grabbing");
      sfx.squeak();
      say(words().grab);
      gsap.to(birdBody, { scaleX: 0.92, scaleY: 1.1, duration: 0.2 });
    }
    if (!grab.moved) return;
    const prev = state.x;
    state.x = grab.sx + dx;
    state.y = grab.sy + dy;
    render();
    swing(clamp(-35, 35, (state.x - prev) * 2.5));
  });

  bird.addEventListener("pointerup", () => {
    if (!dragging) return;
    dragging = false;
    bird.classList.remove("is-grabbing");
    if (!grab.moved) return poke();
    swing(0);
    hop(spotPx(current), () => say(words().drop));
  });

  let idle = 0;
  const sleep = () => {
    if (hero.classList.contains("is-picking")) return;
    asleep = true;
    emit("bird:sleep", true);
    say(words().sleep);
  };

  const wake = () => {
    clearTimeout(idle);
    idle = setTimeout(sleep, 12000);
    if (!asleep) return;
    asleep = false;
    emit("bird:sleep", false);
    say(words().wake);
    gsap.delayedCall(1.8, () => !asleep && say(words()[current]));
  };

  ["pointermove", "keydown", "wheel", "touchstart"].forEach((type) => addEventListener(type, wake, { passive: true }));

  let dizzyReady = true;
  const dizzy = () => {
    dizzyReady = false;
    sfx.wobble();
    say(words().dizzy);
    gsap.to(birdBody, { keyframes: { rotation: [-16, 14, -10, 6, 0] }, duration: 0.9, ease: "power1.inOut" });
    gsap.delayedCall(4, () => { dizzyReady = true; });
  };

  document.querySelectorAll("[data-spot]").forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: "top 55%",
      refreshPriority: -1,
      end: "bottom 55%",
      onToggle: (self) => self.isActive && go(section.dataset.spot, self.direction),
    });
  });

  addEventListener("resize", () => {
    if (dragging) return;
    hopTl?.kill();
    resumeScroll();
    Object.assign(state, spotPx(current));
    render();
    const nowNarrow = innerWidth < 720;
    if (nowNarrow === narrow) return;
    narrow = nowNarrow;
    if (ready) say(narrow ? words().mobile : words().desktop);
  });

  ScrollTrigger.create({
    trigger: ".services__grid",
    start: "bottom 92%",
    refreshPriority: -1,
    onEnter: () => {
      if (!ready || current !== "hago" || shipOn || dragging || autoScroll) return;
      lenis.stop();
      const safety = gsap.delayedCall(7, resumeScroll);
      gsap.delayedCall(hopTl?.isActive() ? 1 : 0.2, () => {
        if (current !== "hago") return resumeScroll();
        hop(spotPx("hagoBig"), () => {
          wearOutfit("nerd");
          emit("bird:pose", "point");
          const line = words().creation;
          say(line);
          gsap.delayedCall((line.replace(/\*/g, "").length * 36 + 1400) / 1000, () => {
            safety.kill();
            resumeScroll();
          });
        });
      });
    },
  });

  document.querySelectorAll("[data-say]").forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: "top 65%",
      refreshPriority: -1,
      once: true,
      onEnter: () => ready && sayNext(words()[el.dataset.say]),
    });
  });

  const enterBird = (onLanded) => {
    const target = spotPx("top");
    Object.assign(state, target, { y: innerHeight + size().h * target.s });
    render();
    gsap.set(bird, { autoAlpha: 1 });
    gsap.to(birdBob, { yPercent: -3, duration: 1.4, ease: "sine.inOut", yoyo: true, repeat: -1 });
    gsap.to(state, { y: target.y, duration: 1.2, ease: "back.out(1.6)", onUpdate: render, onComplete: onLanded });
  };

  let intro = null;

  const playScene = (tl, { onProgress, ...vars }) => {
    let done = false;
    let seek = null;
    ScrollTrigger.create({
      ...vars,
      start: "top top",
      pin: true,
      onUpdate: (self) => {
        if (done) return;
        seek?.kill();
        seek = tl.tweenTo(tl.duration() * self.progress, { duration: 0.5, ease: "power2.out" });
        if (self.progress > 0.995) done = true;
        onProgress?.(self);
      },
      onLeave: (self) => {
        if (!done) return;
        const distance = self.end - self.start;
        const y = lenis.scroll;
        self.kill(true);
        lenis.scrollTo(y - distance, { immediate: true, force: true });
        ScrollTrigger.refresh();
      },
    });
  };

  const splitContent = () => {
    const heroSplit = SplitText.create("[data-hero-title]", { type: "words", mask: "words" });
    intro = gsap.timeline({ paused: true })
      .from(heroSplit.words, { yPercent: 110, duration: 1.2, ease: "expo.out", stagger: 0.08 })
      .from(".circled path", { drawSVG: "0%", duration: 1.5, ease: "power2.inOut" }, "-=0.15");

    document.querySelectorAll("[data-split]").forEach((el) => {
      const split = SplitText.create(el, { type: "words, chars", mask: "chars" });
      gsap.from(split.chars, {
        yPercent: 115,
        rotation: 8,
        duration: 1,
        ease: "expo.out",
        stagger: 0.025,
        scrollTrigger: { trigger: el, start: "top 88%", end: "bottom 12%", toggleActions: "play reverse play reverse" },
      });
    });

    const scrub = SplitText.create("[data-scrub]", { type: "words" });
    const readTl = gsap.timeline({ paused: true })
      .fromTo(scrub.words, { opacity: 0.12 }, { opacity: 1, ease: "none", stagger: 0.1 });

    playScene(readTl, {
      trigger: "[data-pin]",
      end: "+=280%",
      onToggle: (self) => emit("bird:read", self.isActive && readTl.progress() < 1),
      onProgress: (self) => {
        const index = Math.min(scrub.words.length - 1, Math.floor(self.progress * scrub.words.length));
        if (index > tickIndex) sfx.tick();
        tickIndex = index;
        if (current !== "sobre" || hopTl?.isActive() || dragging) return;
        const r = scrub.words[index].getBoundingClientRect();
        emit("bird:look", { x: r.left + r.width / 2, y: r.top + r.height / 2 });
        if (index === readIndex) return;
        readIndex = index;
        emit("bird:talk", 170);
        if (index === scrub.words.length - 1) emit("bird:read", false);
      },
    });

    document.querySelectorAll(".service").forEach((card) => {
      const title = SplitText.create(card.querySelector(".service__title"), { type: "words, chars", mask: "chars" });
      const text = SplitText.create(card.querySelector(".service__text"), { type: "words, chars" });
      gsap.timeline({ scrollTrigger: { trigger: card, start: "top 75%", end: "bottom 15%", toggleActions: "play reverse play reverse" } })
        .from(title.chars, { yPercent: 115, duration: 0.8, ease: "expo.out", stagger: 0.025 })
        .from(text.chars, { autoAlpha: 0, duration: 0.01, stagger: 0.02 }, "-=0.3");
    });

    const stackPin = document.querySelector("[data-stack-pin]");

    const within = (el) => {
      const point = { x: el.offsetWidth / 2, y: el.offsetHeight / 2 };
      for (let node = el; node && node !== stackPin; node = node.offsetParent) {
        point.x += node.offsetLeft;
        point.y += node.offsetTop;
      }
      return point;
    };

    const planeScale = () => (innerWidth < 720 ? 0.5 : 0.32);
    const smoke = document.querySelector(".smoke");
    let lastPuff = null;

    const puff = (dir) => {
      if (lastPuff !== null && Math.abs(state.x - lastPuff) < 22) return;
      const forward = lastPuff === null || (state.x - lastPuff) * dir > 0;
      lastPuff = state.x;
      if (!forward || reduceMotion) return;
      const { w, h } = size();
      const cloud = document.createElement("span");
      cloud.className = "smoke__puff";
      smoke.append(cloud);
      gsap.set(cloud, {
        x: state.x - dir * w * state.s * 0.42,
        y: state.y - h * state.s * 0.26 + random(-6, 6),
        xPercent: -50,
        yPercent: -50,
      });
      gsap.fromTo(cloud, { scale: 0.35, opacity: 0.9 }, {
        scale: random(1.4, 1.9),
        opacity: 0,
        y: "-=14",
        duration: 0.7,
        ease: "power2.out",
        onComplete: () => cloud.remove(),
      });
    };

    const fly = (group, dir, p) => {
      if (current !== "stack" || dragging || shipOn || landing) return;
      hopTl?.kill();
      if (gsap.getProperty(bubble, "autoAlpha") > 0) hideBubble();
      const { h } = size();
      const row = within(group.querySelector(".tech")).y;
      state.s = planeScale();
      state.x = lerp(dir > 0 ? -0.18 : 1.18, dir > 0 ? 1.18 : -0.18, p) * innerWidth;
      state.y = row + h * state.s * 0.42;
      face(dir);
      render();
      puff(dir);
    };

    const crashLanding = () => {
      landing = true;
      lenis.stop();
      hopTl?.kill();
      const size3d = innerWidth < 720 ? 0.95 : 1;
      const from = { x: innerWidth * 1.3, y: innerHeight * 0.4, s: planeScale() };
      const to = { x: innerWidth * 0.5, y: innerHeight * 1.02, s: size3d };
      const p = { v: 0 };
      const line = words().drive;
      hopTl = gsap.timeline({ delay: 0.7 })
        .call(() => {
          face(-1);
          lastPuff = null;
        })
        .to(p, {
          v: 1,
          duration: 2.2,
          ease: "power2.out",
          onUpdate: () => {
            state.x = lerp(from.x, to.x, p.v);
            state.y = lerp(from.y, to.y, p.v) - Math.sin(Math.PI * p.v) * 60;
            state.s = lerp(from.s, to.s, p.v);
            render();
            puff(-1);
          },
        })
        .call(() => say(line))
        .call(() => {
          engineOff();
          emit("bird:kick");
          sfx.boing();
        }, null, `+=${line.length * 0.036 + 1.3}`)
        .call(sfx.kick, null, "+=0.9")
        .call(sfx.boom, null, "+=0.2")
        .call(() => {
          gsap.to(state, { s: state.s * 0.34, duration: 0.4, ease: "power2.out", onUpdate: render });
          landing = false;
          resumeScroll();
        }, null, "+=1.1");
    };

    const stackTl = gsap.timeline({ paused: true });
    const legs = 1.3;

    stackPin.querySelectorAll(".stack__group").forEach((group, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      const at = i * legs;
      const trip = { p: 0 };
      const span = innerWidth * 1.36;
      const start = dir > 0 ? -0.18 * innerWidth : 1.18 * innerWidth;

      stackTl
        .to(trip, { p: 1, duration: legs, ease: "none", onUpdate: () => fly(group, dir, trip.p) }, at)
        .from(group.querySelector(".label"), { autoAlpha: 0, y: 10, duration: 0.3 }, at + 0.15);

      group.querySelectorAll(".tech").forEach((tile) => {
        const passed = Math.abs(within(tile).x - start) / span;
        stackTl.from(tile, { autoAlpha: 0, scale: 0.3, y: -16, rotation: dir * -20, duration: 0.25, ease: "back.out(2.2)" }, at + passed * legs + 0.14);
      });
    });

    stackTl.to({}, { duration: 0.4 });

    playScene(stackTl, {
      trigger: stackPin,
      end: "+=340%",
      onProgress: (self) => {
        if (self.progress < 0.995 || flown) return;
        flown = true;
        if (current === "stack" && !autoScroll && !dragging && !shipOn) crashLanding();
      },
    });

    ScrollTrigger.refresh();
  };

  const greet = (first) => {
    say(first);
    gsap.delayedCall(2.6, () => current === "top" && !asleep && !dragging && say(words().top));
  };

  const themePicker = document.querySelector("[data-theme-picker]");
  const langPicker = document.querySelector("[data-lang-picker]");

  const showPicker = (picker, line) => {
    picker.hidden = false;
    say(line);
    gsap.fromTo(picker, { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: "expo.out" });
  };

  const hidePicker = (picker, then) => {
    gsap.to(picker, {
      autoAlpha: 0,
      y: -24,
      duration: 0.45,
      ease: "power2.in",
      onComplete: () => {
        picker.hidden = true;
        then();
      },
    });
  };

  const startSite = () => {
    hero.classList.remove("is-picking");
    if (!intro) splitContent();
    intro.play();
    lenis.start();
  };

  const chooseTheme = (choice) => {
    sfx.chime();
    applyTheme(choice);
    say(choice === "dark" ? I18N.bird.pickedDark : I18N.bird.pickedLight);
    hidePicker(themePicker, () => {
      if (!lang) return gsap.delayedCall(1.4, () => showPicker(langPicker, I18N.bird.ask));
      startSite();
      gsap.delayedCall(1.6, () => say(words().top));
    });
  };

  const choose = (code) => {
    sfx.chime();
    applyLanguage(code);
    greet(words().hello);
    hidePicker(langPicker, startSite);
  };

  document.querySelectorAll("[data-theme-choice]").forEach((btn) => {
    btn.addEventListener("click", () => chooseTheme(btn.dataset.themeChoice));
  });

  document.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.addEventListener("click", () => choose(btn.dataset.lang));
  });

  document.addEventListener("theme:change", () => ready && say(words()[theme]));

  const afterLoad = () => {
    finishLoading();
    if (lang && theme) {
      lenis.start();
      intro.play();
    }
    enterBird(() => {
      if (session.get("demo")) {
        wearOutfit(outfitFor.top);
        return welcome();
      }
      session.set("demo", "1");
      demo(welcome);
    });
  };

  const hand = document.querySelector(".hand");

  const demo = (onDone) => {
    const { h } = size();
    const hw = hand.offsetWidth;
    const hh = hw * (76 / 64);
    const home = state.x;
    const tipX = state.x - hw * 0.46;
    const tipY = state.y - h * state.s * 0.42 - hh * 0.1;
    const drag = { dx: 0 };
    const pull = () => {
      state.x = home + drag.dx;
      render();
      gsap.set(hand, { x: tipX + drag.dx });
    };
    gsap.set(hand, { x: innerWidth + 60, y: innerHeight + 40, rotation: -14, scale: 1, autoAlpha: 1 });
    gsap.timeline({ delay: 0.3, onComplete: onDone })
      .to(hand, { x: tipX, y: tipY, rotation: 0, duration: 1, ease: "power3.out" })
      .to(hand, { scale: 0.86, duration: 0.1, ease: "power2.in" })
      .add(() => jump("-18%"))
      .to(hand, { scale: 1, duration: 0.25, ease: "back.out(3)" })
      .add(() => hand.classList.add("is-fist"), "+=0.3")
      .to(drag, { dx: -Math.min(90, innerWidth * 0.12), duration: 0.65, ease: "power2.inOut", onUpdate: pull })
      .add(() => swing(-14), "<")
      .add(() => {
        hand.classList.remove("is-fist");
        swing(0);
      })
      .to(drag, { dx: 0, duration: 1, ease: "elastic.out(1, 0.45)", onUpdate: () => {
        state.x = home + drag.dx;
        render();
      } })
      .to(hand, { x: innerWidth + 60, y: innerHeight + 40, rotation: 14, autoAlpha: 0, duration: 0.7, ease: "power2.in" }, "<0.1");
  };

  const welcome = () => {
    ready = true;
    wake();
    if (!theme) return showPicker(themePicker, I18N.bird.askTheme);
    if (!lang) return showPicker(langPicker, I18N.bird.ask);
    const switched = session.get("lang-switched");
    session.set("lang-switched", "");
    if (current !== "top") {
      const next = current;
      current = "top";
      return go(next);
    }
    greet(switched ? words().hello : words().back);
  };

  if (lang) splitContent();

  const letters = loader.querySelectorAll(".loader__word span");
  const count = loader.querySelector("[data-count]");
  const progress = { value: 0 };

  gsap.set(letters, { scale: 0, rotation: () => random(-25, 25) });
  gsap.set(".loader__scribble path", { drawSVG: "0%" });

  document.fonts.ready.then(() => {
    gsap.timeline()
      .to(letters, { scale: 1, rotation: 0, duration: 0.7, ease: "back.out(2.2)", stagger: 0.08 })
      .to(".loader__scribble path", { drawSVG: "100%", duration: 0.9, ease: "power2.out" }, 0.4)
      .to(progress, {
        value: 100,
        duration: 1.6,
        ease: "power2.inOut",
        onUpdate: () => { count.textContent = String(Math.round(progress.value)).padStart(3, "0"); },
      }, 0)
      .to(letters, { yPercent: -130, rotation: () => random(-20, 20), duration: 0.6, ease: "power3.in", stagger: 0.04 }, "+=0.15")
      .to(".loader__scribble path", { drawSVG: "100% 100%", duration: 0.5, ease: "power2.in" }, "<")
      .fromTo(loader, { clipPath: "inset(0% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.9, ease: "power4.inOut" }, "-=0.2")
      .add(afterLoad, "-=0.45");
  });

  let lastPointer = 0;

  addEventListener("pointermove", (e) => {
    lastPointer = performance.now();
    if (scenes.includes(current)) return;
    emit("bird:look", { x: e.clientX, y: e.clientY });
  }, { passive: true });

  const bar = document.querySelector(".scrollbar");
  const thumb = bar.querySelector(".scrollbar__thumb");
  const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const room = () => bar.clientHeight - thumb.offsetHeight;

  const sizeThumb = () => {
    thumb.style.height = `${Math.max(64, (innerHeight / document.documentElement.scrollHeight) * bar.clientHeight)}px`;
  };

  const moveThumb = () => gsap.set(thumb, { y: clamp(0, 1, lenis.scroll / maxScroll()) * room() });

  const scrollToBar = (clientY, offset) => {
    const top = bar.getBoundingClientRect().top;
    const p = clamp(0, 1, (clientY - top - offset) / room());
    lenis.scrollTo(p * maxScroll(), { immediate: true, force: true });
  };

  lenis.on("scroll", moveThumb);
  ScrollTrigger.addEventListener("refresh", () => {
    sizeThumb();
    moveThumb();
  });

  let grabOffset = 0;

  thumb.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    thumb.setPointerCapture(e.pointerId);
    grabOffset = e.clientY - thumb.getBoundingClientRect().top;
    bar.classList.add("is-dragging");
  });

  thumb.addEventListener("pointermove", (e) => {
    if (bar.classList.contains("is-dragging")) scrollToBar(e.clientY, grabOffset);
  });

  thumb.addEventListener("pointerup", () => bar.classList.remove("is-dragging"));

  bar.addEventListener("pointerdown", (e) => {
    if (e.target === thumb) return;
    scrollToBar(e.clientY, thumb.offsetHeight / 2);
  });

  const nav = document.querySelector(".nav");
  lenis.on("scroll", ({ direction, scroll }) => {
    nav.classList.toggle("is-hidden", direction > 0 && scroll > 160);
  });

  let lastClimb = 0;

  const board = () => {
    shipOn = true;
    hopTl?.kill();
    emit("bird:ship", true);
    sfx.whoosh();
    say(words().ship);
    const to = spotPx("ship");
    gsap.to(state, { x: to.x, y: to.y, s: to.s, duration: 0.7, ease: "power3.out", onUpdate: render, overwrite: true });
  };

  const disembark = () => {
    shipOn = false;
    emit("bird:ship", false);
    hop(spotPx(current), () => wearOutfit(outfitFor[current]));
  };

  lenis.on("scroll", ({ direction, velocity }) => {
    if (!ready || dragging || current === "top" || scenes.includes(current) || direction >= 0 || Math.abs(velocity) < 1.5) return;
    lastClimb = performance.now();
    if (!shipOn) board();
  });

  gsap.ticker.add(() => {
    if (shipOn && performance.now() - lastClimb > 700) disembark();
  });

  lenis.on("scroll", () => {
    if (scenes.includes(current) || performance.now() - lastPointer < 1500) return;
    const heading = document.querySelector(`[data-spot="${current}"] h1, [data-spot="${current}"] h2`);
    const r = heading?.getBoundingClientRect();
    emit("bird:look", r ? { x: r.left + r.width * 0.3, y: r.top + r.height / 2 } : { x: innerWidth * 0.35, y: innerHeight * 0.45 });
  });

  ScrollTrigger.addEventListener("scrollEnd", () => lean(0));

  ScrollTrigger.create({
    onUpdate: (self) => {
      const velocity = self.getVelocity();
      if (ready && !dragging) lean(clamp(-10, 10, velocity / 300));
      if (ready && dizzyReady && Math.abs(velocity) > 4000) dizzy();
    },
  });

  const reveal = (batch) => gsap.to(batch, {
    y: 0,
    autoAlpha: 1,
    filter: "blur(0px)",
    duration: 1.1,
    ease: "expo.out",
    stagger: 0.1,
    overwrite: true,
  });

  const conceal = (y) => (batch) => gsap.to(batch, {
    y,
    autoAlpha: 0,
    filter: "blur(10px)",
    duration: 0.5,
    ease: "power2.in",
    overwrite: true,
  });

  gsap.set("[data-reveal]", { y: 50, autoAlpha: 0, filter: "blur(10px)" });
  ScrollTrigger.batch("[data-reveal]", {
    refreshPriority: -1,
    start: "top 90%",
    end: "bottom 10%",
    onEnter: reveal,
    onEnterBack: reveal,
    onLeave: conceal(-50),
    onLeaveBack: conceal(50),
  });

  document.querySelectorAll("[data-tilt]").forEach((card) => {
    const rx = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3" });
    const ry = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3" });
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 14);
      rx(((e.clientY - r.top) / r.height - 0.5) * -14);
    });
    card.addEventListener("pointerleave", () => {
      gsap.to(card, { rotationX: 0, rotationY: 0, duration: 1, ease: "elastic.out(1, 0.4)", overwrite: true });
    });
  });

  const circled = document.querySelector(".circled");
  circled.addEventListener("pointerenter", () => {
    if (intro?.isActive()) return;
    gsap.fromTo(".circled path", { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.9, ease: "power2.inOut", overwrite: true });
  });

  document.querySelectorAll(".foot__name span").forEach((letter, i) => {
    letter.addEventListener("pointerenter", () => {
      sfx.note(i);
      gsap.timeline({ overwrite: true })
        .to(letter, { yPercent: -22, rotation: random(-12, 12), duration: 0.3, ease: "back.out(3)" })
        .to(letter, { yPercent: 0, rotation: 0, duration: 0.9, ease: "elastic.out(1, 0.35)" }, "+=0.1");
    });
  });

  if (finePointer) {

    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const inner = el.querySelectorAll(".btn__text, .btn__arrow");
      const arrow = el.querySelector(".btn__arrow");
      let wiggle = null;

      el.addEventListener("pointerenter", () => {
        if (!arrow) return;
        wiggle = gsap.timeline({ repeat: -1, repeatDelay: 0.2 })
          .to(arrow, { rotation: -25, duration: 0.22, ease: "power2.out" })
          .to(arrow, { rotation: 0, duration: 0.4, ease: "back.out(2.5)" });
      });

      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = gsap.getProperty(el, "x");
        const y = gsap.getProperty(el, "y");
        const dx = e.clientX - (r.left - x + r.width / 2);
        const dy = e.clientY - (r.top - y + r.height / 2);
        gsap.to(el, { x: dx * 0.3, y: dy * 0.3, duration: 0.3, ease: "power2.out", overwrite: "auto" });
        gsap.to(inner, { x: dx * 0.12, y: dy * 0.12, duration: 0.3, ease: "power2.out", overwrite: "auto" });
      });

      el.addEventListener("pointerleave", () => {
        wiggle?.kill();
        if (arrow) gsap.to(arrow, { rotation: 0, duration: 0.35 });
        gsap.to([el, ...inner], { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1.1, 0.4)", overwrite: "auto" });
      });
    });
  }
}
