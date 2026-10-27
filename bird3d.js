import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const bird = document.querySelector(".bird");
const host = bird.querySelector(".bird__body");
const DOT = devicePixelRatio >= 2 ? 1 : 2;
const BASE_YAW = 0.5;

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
renderer.setPixelRatio(1);
renderer.setClearColor(0x000000, 0);
host.append(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(17.6, 1, 0.1, 20);
camera.position.set(0, 0.7, 4.2);
camera.lookAt(0, 0.65, 0);

scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(-2, 3, 3);
scene.add(key);
const rim = new THREE.DirectionalLight(0xffffff, 1.1);
rim.position.set(2.5, 1, -2);
scene.add(rim);

const skin = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 });
const black = new THREE.MeshBasicMaterial({ color: 0x000000 });

const root = new THREE.Group();
scene.add(root);

const body = new THREE.Group();
root.add(body);

const profile = [new THREE.Vector2(0, 0), new THREE.Vector2(0.31, 0), new THREE.Vector2(0.31, 0.75)];
for (let i = 1; i <= 16; i++) {
  const a = (i / 16) * Math.PI / 2;
  profile.push(new THREE.Vector2(0.31 * Math.cos(a), 0.75 + 0.36 * Math.sin(a)));
}
const torso = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), skin);
torso.scale.z = 0.88;
body.add(torso);

const legs = [-1, 1].map((side) => {
  const hip = new THREE.Group();
  hip.position.set(side * 0.3, 0.62, 0);
  const leg = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.62, 32), skin);
  leg.position.y = -0.31;
  hip.add(leg);
  body.add(hip);
  return hip;
});

const head = new THREE.Group();
head.position.y = 0.82;
body.add(head);

const eyes = [-1, 1].map((side) => {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), black);
  eye.scale.set(0.062, 0.03, 0.04);
  eye.position.set(side * 0.09, 0.09, 0.262);
  eye.rotation.y = side * 0.3;
  head.add(eye);
  return eye;
});

const beakTop = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.34, 32), skin);
beakTop.rotation.x = Math.PI / 2;
beakTop.position.set(0, -0.06, 0.4);
head.add(beakTop);

const jaw = new THREE.Group();
jaw.position.set(0, -0.1, 0.24);
head.add(jaw);

const beakBottom = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.24, 32), skin);
beakBottom.rotation.x = Math.PI / 2;
beakBottom.position.set(0, 0, 0.12);
jaw.add(beakBottom);

const cloth = new THREE.MeshStandardMaterial({ color: 0x8a8a8a, roughness: 0.7 });
const dark = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.5 });

const piece = (parent, build) => {
  const group = new THREE.Group();
  build(group);
  group.scale.setScalar(0);
  group.userData = { size: 0, speed: 0, target: 0 };
  parent.add(group);
  return group;
};

const dome = (radius, length, material) => new THREE.Mesh(
  new THREE.SphereGeometry(radius, 40, 20, 0, Math.PI * 2, 0, length),
  material,
);

const dangles = [];

const dangle = (parent, x, y, z, weight, build, { stiff = 0.15, damp = 0.88, phase = weight } = {}) => {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  build(pivot);
  parent.add(pivot);
  dangles.push({ pivot, weight, stiff, damp, phase, ax: 0, az: 0, vx: 0, vz: 0 });
  return pivot;
};

const strip = (parent, x, y, z, { count, length, width, weight, phase, material }) => {
  let joint = parent;
  let at = new THREE.Vector3(x, y, z);
  const step = length / count;
  for (let i = 0; i < count; i++) {
    const taper = 1 - i * 0.06;
    joint = dangle(joint, at.x, at.y, at.z, weight * (0.55 + i * 0.22), (p) => {
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(width * taper, step * 1.08, 0.035), material);
      cloth.position.y = -step / 2;
      p.add(cloth);
    }, { stiff: 0.16 - i * 0.018, damp: 0.86 + i * 0.015, phase: phase + i * 0.7 });
    at = new THREE.Vector3(0, -step, 0);
  }
};

const pieces = {
  cap: piece(head, (g) => {
    const crown = dome(0.33, 0.98, cloth);
    crown.scale.set(1, 1.15, 0.92);
    crown.position.y = -0.06;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.025, 40, 1, false, -Math.PI / 2, Math.PI), cloth);
    brim.scale.set(1, 1, 1.5);
    brim.position.set(0, 0.17, 0.2);
    brim.rotation.x = 0.12;
    g.add(crown, brim);
  }),
  beanie: piece(head, (g) => {
    const wool = dome(0.335, 0.95, dark);
    wool.scale.set(1, 1.15, 0.92);
    wool.position.y = -0.06;
    g.add(wool);
    dangle(g, 0, 0.32, 0, -1.4, (p) => {
      const pom = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 12), cloth);
      pom.position.y = 0.05;
      p.add(pom);
    });
  }),
  headphones: piece(head, (g) => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 12, 48, Math.PI), dark);
    band.position.y = -0.02;
    g.add(band);
    [-1, 1].forEach((side) => {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 28), dark);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(side * 0.33, -0.03, 0);
      g.add(cup);
    });
  }),
  grad: piece(head, (g) => {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.1, 32), dark);
    base.position.y = 0.27;
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.025, 0.52), dark);
    board.position.y = 0.33;
    board.rotation.y = Math.PI / 4;
    g.add(base, board);
    dangle(g, 0.26, 0.33, 0.1, 1.8, (p) => {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 8), cloth);
      cord.position.y = -0.09;
      const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 12), cloth);
      tassel.position.y = -0.19;
      p.add(cord, tassel);
    });
  }),
  glasses: piece(head, (g) => {
    [-1, 1].forEach((side) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 10, 32), black);
      ring.position.set(side * 0.095, 0.09, 0.29);
      ring.rotation.y = side * 0.3;
      g.add(ring);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.012), black);
    bridge.position.set(0, 0.1, 0.305);
    g.add(bridge);
  }),
  scarf: piece(body, (g) => {
    const wrap = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 14, 48), cloth);
    wrap.rotation.x = Math.PI / 2;
    wrap.scale.set(1, 0.88, 1);
    wrap.position.y = 0.54;
    g.add(wrap);
    strip(g, 0.12, 0.52, 0.29, { count: 6, length: 0.32, width: 0.1, weight: 0.5, phase: 0, material: cloth });
    strip(g, 0.03, 0.52, 0.3, { count: 5, length: 0.24, width: 0.09, weight: 0.45, phase: 1.6, material: cloth });
  }),
  bowtie: piece(body, (g) => {
    [-1, 1].forEach((side) => {
      const wing = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.14, 3), dark);
      wing.rotation.set(0, 0, side * Math.PI / 2);
      wing.scale.set(1, 1, 0.35);
      wing.position.set(side * 0.075, 0.5, 0.29);
      g.add(wing);
    });
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.032, 14, 10), cloth);
    knot.scale.set(1, 1.2, 0.7);
    knot.position.set(0, 0.5, 0.3);
    g.add(knot);
  }),
};

const glow = new THREE.MeshBasicMaterial({ color: 0xffffff });
const ship = new THREE.Group();
ship.scale.setScalar(0);
ship.visible = false;
scene.add(ship);

const hull = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 16), dark);
hull.scale.set(1, 0.2, 1);
const shipRim = new THREE.Mesh(new THREE.TorusGeometry(0.61, 0.035, 10, 64), cloth);
shipRim.rotation.x = Math.PI / 2;
const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.5, 24, 1, true), glow);
flame.rotation.x = Math.PI;
flame.position.y = -0.36;
const lights = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2;
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), glow);
  light.position.set(Math.cos(a) * 0.61, 0.02, Math.sin(a) * 0.61);
  return light;
});
ship.add(hull, shipRim, flame, ...lights);

const flight = { size: 0, speed: 0, target: 0 };

const plane = new THREE.Group();
plane.scale.setScalar(0);
plane.visible = false;
scene.add(plane);

const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.62, 8, 24), cloth);
fuselage.rotation.z = Math.PI / 2;
const wing = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.035, 1.3), dark);
wing.position.set(0.05, -0.02, 0);
const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.03), dark);
tailFin.position.set(-0.42, 0.14, 0);
const stabilizer = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.46), dark);
stabilizer.position.set(-0.42, 0.04, 0);
const propeller = new THREE.Group();
propeller.position.x = 0.46;
const hub = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), dark);
const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.42, 0.05), dark);
propeller.add(hub, blade);
const wheels = [-1, 1].map((side) => {
  const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), dark);
  wheel.position.set(0.12, -0.17, side * 0.12);
  return wheel;
});
const cockpit = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 10, 32), dark);
cockpit.rotation.x = Math.PI / 2;
cockpit.position.set(0.04, 0.15, 0);
plane.add(fuselage, wing, tailFin, stabilizer, propeller, cockpit, ...wheels);

const aviation = { size: 0, speed: 0, target: 0, turn: 0 };
const crash = { start: -1, side: 1, gone: false, stand: 0 };

const blast = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), skin);
blast.visible = false;
scene.add(blast);

const debris = Array.from({ length: 22 }, (_, i) => {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.035 + (i % 4) * 0.012, 0), i % 3 ? dark : cloth);
  mesh.visible = false;
  scene.add(mesh);
  return { mesh, velocity: new THREE.Vector3(), spin: new THREE.Vector3() };
});

const explode = (at) => {
  blast.position.copy(at);
  debris.forEach(({ mesh, velocity, spin }) => {
    mesh.position.copy(at);
    mesh.visible = true;
    mesh.scale.setScalar(1);
    const a = Math.random() * Math.PI * 2;
    const force = 0.9 + Math.random() * 1.4;
    velocity.set(Math.cos(a) * force, 0.8 + Math.random() * 1.6, (Math.random() - 0.5) * 1.2);
    spin.set(Math.random() * 12, Math.random() * 12, Math.random() * 12);
  });
};

const roundedRect = (w, h, r) => {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return shape;
};

pieces.nerd = piece(head, (g) => {
  const rim = roundedRect(0.21, 0.16, 0.035);
  rim.holes.push(roundedRect(0.155, 0.11, 0.022));
  const rimGeometry = new THREE.ExtrudeGeometry(rim, { depth: 0.022, bevelEnabled: false, curveSegments: 6 });
  [-1, 1].forEach((side) => {
    const lens = new THREE.Group();
    lens.position.set(side * 0.118, 0.085, 0.3);
    lens.rotation.y = side * 0.32;
    const frame = new THREE.Mesh(rimGeometry, black);
    const temple = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.02, 0.26), black);
    temple.position.set(side * 0.1, 0.05, -0.12);
    lens.add(frame, temple);
    g.add(lens);
  });
  const brow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.032, 0.03), black);
  brow.position.set(0, 0.16, 0.315);
  g.add(brow);
});

const arm = new THREE.Group();
arm.position.set(0.27, 0.5, 0.12);
arm.scale.setScalar(0);
arm.visible = false;
body.add(arm);

const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.3, 16), skin);
upper.position.y = 0.15;
const hand = new THREE.Group();
hand.position.y = 0.34;
hand.rotation.z = 0.25;

const palm = new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), skin);
palm.scale.set(1.05, 1, 0.72);

const knuckles = [0.035, -0.005, -0.045].map((y) => {
  const curl = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.06, 6, 12), skin);
  curl.rotation.z = Math.PI / 2;
  curl.position.set(0.012, y, 0.045);
  return curl;
});

const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.019, 0.07, 6, 12), skin);
thumb.position.set(-0.015, -0.035, 0.07);
thumb.rotation.z = 1.05;

const finger = new THREE.Group();
finger.position.set(-0.052, 0.045, 0.02);
const fingerBone = new THREE.Mesh(new THREE.CapsuleGeometry(0.021, 0.13, 6, 12), skin);
fingerBone.position.y = 0.085;
finger.add(fingerBone);

hand.add(palm, ...knuckles, thumb, finger);
arm.add(upper, hand);

const pose = { size: 0, speed: 0, target: 0 };

const outfits = {
  none: [],
  nerd: ["nerd"],
  cap: ["cap"],
  headphones: ["headphones"],
  winter: ["beanie", "scarf"],
  student: ["grad", "glasses"],
  fancy: ["bowtie"],
};

const wear = (name) => {
  const on = outfits[name] || [];
  Object.entries(pieces).forEach(([key, group]) => {
    group.userData.target = on.includes(key) ? 1 : 0;
  });
};

const target = new THREE.WebGLRenderTarget(1, 1);
const post = new THREE.Scene();
const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const tone = (hex) => new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);

const palettes = {
  light: [0x0b0018, 0x280060, 0x9a7bff],
  dark: [0x1a0840, 0x6d45e6, 0xd9cbff],
};

const dither = new THREE.ShaderMaterial({
  uniforms: {
    tScene: { value: target.texture },
    c0: { value: new THREE.Vector3() },
    c1: { value: new THREE.Vector3() },
    c2: { value: new THREE.Vector3() },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tScene;
    uniform vec3 c0;
    uniform vec3 c1;
    uniform vec3 c2;
    varying vec2 vUv;

    float bayer2(vec2 a) {
      a = floor(a);
      return fract(dot(a, vec2(0.5, a.y * 0.75)));
    }

    float bayer4(vec2 a) {
      return bayer2(0.5 * a) * 0.25 + bayer2(a);
    }

    void main() {
      vec4 s = texture2D(tScene, vUv);
      if (s.a < 0.5) discard;
      float l = pow(dot(s.rgb, vec3(0.299, 0.587, 0.114)), 0.4545);
      float v = clamp(l * 1.9 - 0.3, 0.0, 1.999);
      float level = floor(v) + step(bayer4(gl_FragCoord.xy), fract(v));
      vec3 col = level < 0.5 ? c0 : (level < 1.5 ? c1 : c2);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
});

post.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), dither));

const paint = () => {
  const colors = palettes[document.documentElement.dataset.theme === "dark" ? "dark" : "light"];
  ["c0", "c1", "c2"].forEach((key, i) => dither.uniforms[key].value.copy(tone(colors[i])));
};

paint();
new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

const shown = { w: 0, h: 0 };

const resize = () => {
  const m = new DOMMatrix(getComputedStyle(bird).transform);
  const s = Math.hypot(m.a, m.b) || 1;
  const w = Math.max(1, Math.round((host.clientWidth * s) / DOT));
  const h = Math.max(1, Math.round((host.clientHeight * s) / DOT));
  if (w === shown.w && h === shown.h) return;
  shown.w = w;
  shown.h = h;
  renderer.setSize(w, h, false);
  target.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
};

new ResizeObserver(resize).observe(host);
resize();

const look = { yaw: BASE_YAW, pitch: 0, toYaw: BASE_YAW, toPitch: 0 };
let face = 1;
let talkUntil = 0;
let asleep = false;
let reading = false;
let nextBlink = 2;
let blinkT = 0;

bird.addEventListener("bird:look", (e) => {
  const r = host.getBoundingClientRect();
  const dx = (e.detail.x - (r.left + r.width / 2)) / innerWidth;
  const dy = (e.detail.y - (r.top + r.height * 0.3)) / innerHeight;
  look.toYaw = THREE.MathUtils.clamp(dx * 2.6, -1.25, 1.25);
  look.toPitch = THREE.MathUtils.clamp(dy * 1.2, -0.45, 0.5);
});

bird.addEventListener("bird:face", (e) => { face = e.detail; });
bird.addEventListener("bird:talk", (e) => { talkUntil = performance.now() + e.detail; });
bird.addEventListener("bird:plane", (e) => { aviation.target = e.detail ? 1 : 0; });
bird.addEventListener("bird:kick", () => {
  crash.start = clock.elapsedTime;
  crash.side = face;
  crash.gone = false;
});
bird.addEventListener("bird:ship", (e) => { flight.target = e.detail ? 1 : 0; });
bird.addEventListener("bird:pose", (e) => { pose.target = e.detail === "point" ? 1 : 0; });
bird.addEventListener("bird:sleep", (e) => { asleep = e.detail; });
bird.addEventListener("bird:read", (e) => { reading = e.detail; });
bird.addEventListener("bird:wear", (e) => wear(e.detail));

const move = { x: 0, y: 0 };
let lastYaw = BASE_YAW;

bird.addEventListener("bird:move", (e) => {
  move.x += e.detail.dx;
  move.y += e.detail.dy;
});

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  resize();
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const ease = 1 - Math.pow(0.0015, dt);

  const facing = pose.target > 0;
  const piloting = aviation.target > 0;
  const yaw = piloting ? face * 1.15 : facing ? 0 : asleep ? BASE_YAW * face : look.toYaw + BASE_YAW * face * 0.35;
  const pitch = piloting ? 0.05 : facing ? 0 : asleep ? 0.28 : look.toPitch;
  look.yaw += (yaw - look.yaw) * ease;
  look.pitch += (pitch - look.pitch) * ease;

  root.rotation.y = look.yaw * 0.45;
  head.rotation.y = look.yaw * 0.55;
  head.rotation.x = Math.min(0.28, look.pitch + (reading ? 0.12 + Math.sin(t * 5) * 0.04 : 0));
  head.rotation.z = reading ? Math.sin(t * 1.3) * 0.06 : 0;
  body.scale.y = 1 + Math.sin(t * 2.2) * 0.015;

  const talking = performance.now() < talkUntil;
  const open = talking ? Math.abs(Math.sin(t * 17)) * 0.55 : 0;
  jaw.rotation.x += (open - jaw.rotation.x) * 0.5;

  if (t > nextBlink) {
    blinkT = 0.16;
    nextBlink = t + 2.5 + Math.random() * 3;
  }
  blinkT = Math.max(0, blinkT - dt);
  const closed = asleep ? 1 : Math.sin((blinkT / 0.16) * Math.PI);
  eyes.forEach((eye) => { eye.scale.y = 0.03 * (1 - closed * 0.8); });

  const spin = look.yaw - lastYaw;
  lastYaw = look.yaw;
  dangles.forEach((d) => {
    const breeze = Math.sin(t * 1.7 + d.phase) * 0.04;
    const tz = THREE.MathUtils.clamp((-move.x * 0.035 - spin * 9) * d.weight + breeze, -1.1, 1.1);
    const tx = THREE.MathUtils.clamp(move.y * 0.02 * Math.abs(d.weight) + Math.sin(t * 1.2 + d.phase) * 0.02, -0.8, 0.8);
    d.vz += (tz - d.az) * d.stiff;
    d.vx += (tx - d.ax) * d.stiff;
    d.vz *= d.damp;
    d.vx *= d.damp;
    d.az += d.vz;
    d.ax += d.vx;
    d.pivot.rotation.z = d.az;
    d.pivot.rotation.x = d.ax;
  });
  move.x *= 0.75;
  move.y *= 0.75;

  pose.speed += (pose.target - pose.size) * 0.16;
  pose.speed *= 0.72;
  pose.size += pose.speed;
  arm.visible = pose.size > 0.01;
  arm.scale.setScalar(Math.max(0, pose.size));
  arm.rotation.z = -0.35 + Math.sin(t * 6) * 0.08 * pose.target;
  finger.rotation.z = Math.sin(t * 9) * 0.12 * pose.target;

  flight.speed += (flight.target - flight.size) * 0.16;
  flight.speed *= 0.74;
  flight.size += flight.speed;
  aviation.speed += (aviation.target - aviation.size) * 0.16;
  aviation.speed *= 0.74;
  aviation.size += aviation.speed;
  aviation.turn += ((face > 0 ? 0 : Math.PI) - aviation.turn) * 0.12;
  const k = crash.start < 0 ? -1 : t - crash.start;
  const smooth = (v) => THREE.MathUtils.smoothstep(v, 0, 1);
  const out = k < 0 ? 0 : smooth(k / 0.45);
  crash.stand = k < 0 ? (aviation.size < 0.01 ? 0 : crash.stand) : out;
  plane.visible = aviation.size > 0.01 && !crash.gone;
  plane.scale.setScalar(Math.max(0, aviation.size) * (1 - out * 0.38));
  plane.position.x = crash.side * (0.36 * out + (k > 0.95 ? Math.min(0.12, (k - 0.95) * 1.2) : 0));
  plane.position.y = 0.3 - out * 0.13 + Math.sin(t * 2.6) * 0.025 * (1 - out);
  plane.rotation.set(Math.sin(t * 1.7) * 0.08 * (1 - out), aviation.turn, Math.sin(t * 2.6) * 0.05 * (1 - out) + (k > 0.95 ? crash.side * Math.sin((k - 0.95) * 40) * 0.25 : 0));
  const swing = k < 0.45 ? 0 : k < 0.85 ? smooth((k - 0.45) / 0.4) * 0.7 : k < 0.95 ? 0.7 - smooth((k - 0.85) / 0.1) * 1.9 : k < 1.5 ? -1.2 * (1 - smooth((k - 0.95) / 0.55)) : 0;
  legs[1].rotation.x = k < 0 ? 0 : swing;
  if (k > 1.1 && !crash.gone) {
    crash.gone = true;
    explode(plane.position.clone().setY(plane.position.y + 0.05));
  }
  const b = k - 1.1;
  blast.visible = b > 0 && b < 0.5;
  blast.scale.setScalar(b < 0.18 ? smooth(b / 0.18) * 1.6 : Math.max(0, 1.6 * (1 - (b - 0.18) / 0.32)));
  debris.forEach(({ mesh, velocity, spin }) => {
    if (!mesh.visible) return;
    velocity.y -= 4.5 * dt;
    mesh.position.addScaledVector(velocity, dt);
    mesh.rotation.x += spin.x * dt;
    mesh.rotation.y += spin.y * dt;
    mesh.scale.multiplyScalar(0.985);
    if (mesh.scale.x < 0.08 || mesh.position.y < -0.4) mesh.visible = false;
  });
  if (k > 2.2) {
    crash.start = -1;
    aviation.target = 0;
  }
  propeller.rotation.x += 0.9;

  const riding = THREE.MathUtils.clamp(flight.size, 0, 1);
  const seated = THREE.MathUtils.clamp(aviation.size, 0, 1);
  ship.visible = flight.size > 0.01;
  ship.scale.setScalar(Math.max(0, flight.size) * 0.78);
  ship.position.y = 0.4 + Math.sin(t * 3) * 0.02;
  ship.rotation.z = Math.sin(t * 2.2) * 0.06;
  flame.scale.set(1, 0.7 + Math.random() * 0.5, 1);
  lights.forEach((light, i) => { light.visible = Math.sin(t * 9 + i * 1.3) > 0; });
  const hopUp = k > 0 && k < 0.45 ? Math.sin((k / 0.45) * Math.PI) * 0.3 : 0;
  root.position.y = riding * 0.42 + Math.sin(t * 3) * 0.02 * riding + seated * (1 - crash.stand) * (0.26 + Math.sin(t * 2.6) * 0.025) + hopUp;
  root.position.x = seated * (1 - crash.stand) * 0.04 * Math.cos(aviation.turn);
  root.scale.setScalar(1 - riding * 0.25 - seated * 0.66);
  root.rotation.z = ship.rotation.z * riding + plane.rotation.z * seated * (1 - crash.stand);

  Object.values(pieces).forEach((group) => {
    const d = group.userData;
    d.speed += (d.target - d.size) * 0.18;
    d.speed *= 0.72;
    d.size += d.speed;
    group.visible = d.size > 0.01;
    group.scale.setScalar(Math.max(0, d.size));
  });

  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(post, postCamera);
});

host.classList.add("is-3d");
