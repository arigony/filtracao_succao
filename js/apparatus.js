import * as THREE from "../vendor/three.module.js";

const STEP_PIECES = Object.freeze([
  ["bench", "stand"],
  ["bench", "stand", "filter-flask", "clamp"],
  ["bench", "stand", "filter-flask", "clamp", "vacuum-hose-in", "vacuum-trap", "vent-clamp"],
  ["bench", "stand", "filter-flask", "clamp", "vacuum-hose-in", "vacuum-trap", "vent-clamp", "vacuum-hose-out", "aspirator"],
  ["bench", "stand", "filter-flask", "clamp", "vacuum-hose-in", "vacuum-trap", "vent-clamp", "vacuum-hose-out", "aspirator", "adapter"],
  ["bench", "stand", "filter-flask", "clamp", "vacuum-hose-in", "vacuum-trap", "vent-clamp", "vacuum-hose-out", "aspirator", "adapter", "buchner"],
  ["bench", "stand", "filter-flask", "clamp", "vacuum-hose-in", "vacuum-trap", "vent-clamp", "vacuum-hose-out", "aspirator", "adapter", "buchner", "filter-paper"],
  ["bench", "stand", "filter-flask", "clamp", "vacuum-hose-in", "vacuum-trap", "vent-clamp", "vacuum-hose-out", "aspirator", "adapter", "buchner", "filter-paper", "cold-solvent"]
]);

function mesh(geometry, material, { position, rotation, scale, cast = true, receive = true } = {}) {
  const object = new THREE.Mesh(geometry, material);
  if (position) object.position.set(...position);
  if (rotation) object.rotation.set(...rotation);
  if (scale) object.scale.set(...scale);
  object.castShadow = cast;
  object.receiveShadow = receive;
  return object;
}

function tube(points, radius, material, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  return mesh(new THREE.TubeGeometry(curve, 64, radius, 12, closed), material);
}

function rodBetween(start, end, radius, material) {
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...end);
  const direction = to.clone().sub(from);
  const object = mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 20), material, {
    position: from.clone().add(to).multiplyScalar(0.5).toArray()
  });
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return object;
}

function tagPiece(group, id, name, labelOffset = [0, 0.45, 0]) {
  group.name = id;
  group.userData.pieceId = id;
  group.userData.pieceName = name;
  group.userData.labelOffset = new THREE.Vector3(...labelOffset);
  group.traverse((object) => {
    if (!object.isMesh) return;
    object.material = Array.isArray(object.material)
      ? object.material.map((material) => material.clone())
      : object.material.clone();
    object.userData.pieceId = id;
  });
  return group;
}

function materials() {
  return {
    bench: new THREE.MeshStandardMaterial({ color: 0xe3e9e6, roughness: 0.78 }),
    edge: new THREE.MeshStandardMaterial({ color: 0x71867f, roughness: 0.45, metalness: 0.36 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xa9b5b2, roughness: 0.25, metalness: 0.82 }),
    darkSteel: new THREE.MeshStandardMaterial({ color: 0x43544f, roughness: 0.3, metalness: 0.76 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x26312e, roughness: 0.92 }),
    redRubber: new THREE.MeshStandardMaterial({ color: 0xa83e3e, roughness: 0.78 }),
    porcelain: new THREE.MeshPhysicalMaterial({ color: 0xf8faf7, roughness: 0.22, clearcoat: 0.32 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xfdfcf4, roughness: 0.95, side: THREE.DoubleSide }),
    wetPaper: new THREE.MeshStandardMaterial({ color: 0xdcecf1, roughness: 0.68, side: THREE.DoubleSide }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xc7edf0, roughness: 0.08, transmission: 0.72, thickness: 0.16, transparent: true, opacity: 0.62, side: THREE.DoubleSide, depthWrite: false }),
    glassEdge: new THREE.MeshPhysicalMaterial({ color: 0x9fd8df, roughness: 0.2, transmission: 0.28, transparent: true, opacity: 0.86, side: THREE.DoubleSide, depthWrite: false }),
    water: new THREE.MeshPhysicalMaterial({ color: 0x1599d1, roughness: 0.16, transmission: 0.2, transparent: true, opacity: 0.62, depthWrite: false }),
    solvent: new THREE.MeshPhysicalMaterial({ color: 0x80cfe3, roughness: 0.18, transmission: 0.24, transparent: true, opacity: 0.7, depthWrite: false }),
    filtrate: new THREE.MeshPhysicalMaterial({ color: 0xe6b85f, roughness: 0.2, transmission: 0.2, transparent: true, opacity: 0.67, depthWrite: false }),
    slurry: new THREE.MeshPhysicalMaterial({ color: 0xd59b55, roughness: 0.34, transparent: true, opacity: 0.84 }),
    solid: new THREE.MeshStandardMaterial({ color: 0xf1e4b7, roughness: 0.92 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x148fc7, emissive: 0x06334a, emissiveIntensity: 0.18 }),
    green: new THREE.MeshStandardMaterial({ color: 0x14996f, emissive: 0x063b2a, emissiveIntensity: 0.18 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xe2a42d, emissive: 0x573500, emissiveIntensity: 0.14 }),
    red: new THREE.MeshStandardMaterial({ color: 0xd94b4b, emissive: 0x5f1111, emissiveIntensity: 0.26 })
  };
}

function createBench(m) {
  const group = new THREE.Group();
  group.add(mesh(new THREE.BoxGeometry(6.8, 0.25, 3.45), m.bench, { position: [0, -1.44, 0], cast: false }));
  group.add(mesh(new THREE.BoxGeometry(6.86, 0.08, 3.51), m.edge, { position: [0, -1.6, 0] }));
  for (const x of [-2.95, 2.95]) for (const z of [-1.35, 1.35]) {
    group.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.35, 18), m.darkSteel, { position: [x, -2.31, z] }));
  }
  return tagPiece(group, "bench", "Bancada aberta", [0, 0.4, -1.4]);
}

function createStand(m) {
  const group = new THREE.Group();
  group.add(mesh(new THREE.BoxGeometry(1.8, 0.14, 1.05), m.darkSteel, { position: [-0.72, -1.23, 0.15] }));
  group.add(mesh(new THREE.CylinderGeometry(0.055, 0.065, 3.15, 24), m.steel, { position: [-1.48, 0.28, 0.15] }));
  group.add(mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.07, 22), m.rubber, { position: [-1.48, 1.87, 0.15] }));
  return tagPiece(group, "stand", "Suporte universal", [-0.1, 1.1, 0]);
}

function createFilterFlask(m) {
  const group = new THREE.Group();
  group.position.set(-0.35, -0.42, 0.1);
  const body = mesh(new THREE.CylinderGeometry(0.64, 0.44, 0.84, 44, 1, true), m.glass, { position: [0, -0.38, 0] });
  const shoulder = mesh(new THREE.ConeGeometry(0.64, 0.64, 44, 1, true), m.glass, { position: [0, 0.36, 0] });
  const neck = mesh(new THREE.CylinderGeometry(0.21, 0.3, 0.48, 36, 1, true), m.glassEdge, { position: [0, 0.82, 0] });
  const rim = mesh(new THREE.TorusGeometry(0.22, 0.025, 10, 34), m.glassEdge, { rotation: [Math.PI / 2, 0, 0], position: [0, 1.07, 0] });
  const bottom = mesh(new THREE.CircleGeometry(0.44, 44), m.glassEdge, { rotation: [-Math.PI / 2, 0, 0], position: [0, -0.81, 0] });
  const sideArm = mesh(new THREE.CylinderGeometry(0.075, 0.105, 0.74, 24, 1, true), m.glassEdge, { rotation: [0, 0, Math.PI / 2], position: [0.58, 0.42, 0] });
  const armRim = mesh(new THREE.TorusGeometry(0.083, 0.018, 10, 24), m.glassEdge, { rotation: [0, Math.PI / 2, 0], position: [0.95, 0.42, 0] });
  const filtrate = mesh(new THREE.CylinderGeometry(0.43, 0.34, 0.3, 36), m.filtrate, { position: [0, -0.61, 0], cast: false });
  filtrate.visible = false;
  group.add(body, shoulder, neck, rim, bottom, sideArm, armRim, filtrate);
  group.userData.filtrate = filtrate;
  return tagPiece(group, "filter-flask", "Kitassato de parede espessa", [0.45, 0.78, 0]);
}

function createClamp(m) {
  const group = new THREE.Group();
  const muffle = mesh(new THREE.BoxGeometry(0.27, 0.22, 0.34), m.darkSteel, { position: [-1.48, 0.12, 0.15] });
  const arm = rodBetween([-1.34, 0.12, 0.15], [-0.68, 0.12, 0.12], 0.04, m.steel);
  const fork = new THREE.Group();
  fork.position.set(-0.58, 0.12, 0.1);
  for (const angle of [-0.58, 0.58]) {
    const finger = mesh(new THREE.CapsuleGeometry(0.055, 0.34, 7, 14), m.steel, { rotation: [Math.PI / 2, 0, angle] });
    const tip = mesh(new THREE.SphereGeometry(0.075, 18, 12), m.rubber, { position: [Math.sin(angle) * 0.22, 0, Math.cos(angle) * 0.22] });
    fork.add(finger, tip);
  }
  group.add(muffle, arm, fork);
  return tagPiece(group, "clamp", "Garra de estabilização", [0.35, 0.35, 0]);
}

function createAdapter(m) {
  const group = new THREE.Group();
  group.position.set(-0.35, 0.78, 0.1);
  const sleeve = mesh(new THREE.CylinderGeometry(0.27, 0.19, 0.34, 36, 1, true), m.rubber);
  const lip = mesh(new THREE.TorusGeometry(0.265, 0.035, 12, 36), m.rubber, { rotation: [Math.PI / 2, 0, 0], position: [0, 0.17, 0] });
  group.add(sleeve, lip);
  return tagPiece(group, "adapter", "Adaptador de borracha", [0.42, 0.2, 0]);
}

function createBuchner(m) {
  const group = new THREE.Group();
  group.position.set(-0.35, 1.42, 0.1);
  const cup = mesh(new THREE.CylinderGeometry(0.62, 0.58, 0.64, 48, 1, true), m.porcelain, { position: [0, 0.16, 0] });
  const base = mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.09, 48), m.porcelain, { position: [0, -0.16, 0] });
  const stem = mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.65, 32), m.porcelain, { position: [0, -0.51, 0] });
  const rim = mesh(new THREE.TorusGeometry(0.62, 0.04, 12, 48), m.porcelain, { rotation: [Math.PI / 2, 0, 0], position: [0, 0.49, 0] });
  const plate = mesh(new THREE.CircleGeometry(0.55, 48), m.porcelain, { rotation: [-Math.PI / 2, 0, 0], position: [0, -0.105, 0] });
  const holes = new THREE.Group();
  for (let ring = 0; ring <= 3; ring += 1) {
    const count = ring === 0 ? 1 : ring * 8;
    const radius = ring * 0.12;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      holes.add(mesh(new THREE.CircleGeometry(0.018, 12), m.darkSteel, {
        rotation: [-Math.PI / 2, 0, 0], position: [Math.cos(angle) * radius, -0.099, Math.sin(angle) * radius], cast: false
      }));
    }
  }
  const cake = mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.12, 40), m.solid, { position: [0, 0.02, 0] });
  cake.visible = false;
  group.add(stem, cup, base, plate, holes, rim, cake);
  group.userData.cake = cake;
  return tagPiece(group, "buchner", "Funil de Büchner", [0.68, 0.42, 0]);
}

function createFilterPaper(m) {
  const group = new THREE.Group();
  group.position.set(-0.35, 1.525, 0.1);
  const disk = mesh(new THREE.CircleGeometry(0.53, 64), m.paper, { rotation: [-Math.PI / 2, 0, 0], cast: false });
  const wet = mesh(new THREE.CircleGeometry(0.525, 64), m.wetPaper, { rotation: [-Math.PI / 2, 0, 0], position: [0, 0.006, 0], cast: false });
  wet.visible = false;
  group.add(disk, wet);
  group.userData.dry = disk;
  group.userData.wet = wet;
  return tagPiece(group, "filter-paper", "Papel-filtro", [0.58, 0.1, 0]);
}

function createTrap(m) {
  const group = new THREE.Group();
  group.position.set(1.26, -0.6, 0.22);
  const body = mesh(new THREE.CylinderGeometry(0.34, 0.43, 0.68, 40, 1, true), m.glass, { position: [0, -0.12, 0] });
  const shoulder = mesh(new THREE.CylinderGeometry(0.15, 0.34, 0.36, 40, 1, true), m.glass, { position: [0, 0.4, 0] });
  const neck = mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.3, 32, 1, true), m.glassEdge, { position: [0, 0.71, 0] });
  const bottom = mesh(new THREE.CircleGeometry(0.43, 40), m.glassEdge, { rotation: [-Math.PI / 2, 0, 0], position: [0, -0.46, 0] });
  const stopper = mesh(new THREE.CylinderGeometry(0.145, 0.165, 0.16, 32), m.rubber, { position: [0, 0.78, 0] });
  const topTube = mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.54, 22, 1, true), m.glassEdge, { position: [0, 1.04, 0] });
  const sideArm = mesh(new THREE.CylinderGeometry(0.065, 0.085, 0.64, 22, 1, true), m.glassEdge, { rotation: [0, 0, Math.PI / 2], position: [-0.42, 0.34, 0] });
  const armRim = mesh(new THREE.TorusGeometry(0.07, 0.016, 10, 24), m.glassEdge, { rotation: [0, Math.PI / 2, 0], position: [-0.74, 0.34, 0] });
  group.add(body, shoulder, neck, bottom, stopper, topTube, sideArm, armRim);
  group.userData.ports = Object.freeze({ apparatus: "side-arm", vacuumSource: "top", vent: "tee" });
  return tagPiece(group, "vacuum-trap", "Armadilha de vácuo com braço lateral", [0.5, 1.05, 0]);
}

function createVentClamp(m) {
  const group = new THREE.Group();
  group.position.set(1.56, 0.54, 0.22);
  const tee = mesh(new THREE.SphereGeometry(0.085, 22, 16), m.rubber);
  const vent = mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.6, 20), m.rubber, { position: [0, 0.29, 0] });
  const clamp = mesh(new THREE.BoxGeometry(0.25, 0.1, 0.16), m.redRubber, { position: [0, 0.36, 0] });
  const tab = mesh(new THREE.BoxGeometry(0.07, 0.27, 0.11), m.redRubber, { position: [0.16, 0.36, 0], rotation: [0, 0, -0.34] });
  const openMark = mesh(new THREE.TorusGeometry(0.11, 0.023, 10, 30), m.green, { rotation: [Math.PI / 2, 0, 0], position: [0, 0.7, 0] });
  group.add(tee, vent, clamp, tab, openMark);
  group.userData.openMark = openMark;
  return tagPiece(group, "vent-clamp", "Derivação de respiro com pinça", [0.34, 0.72, 0]);
}

function createHoseIn(m) {
  const group = new THREE.Group();
  group.add(tube([[0.6, 0, 0.1], [0.72, -0.02, 0.13], [0.66, -0.2, 0.18], [0.52, -0.26, 0.22]], 0.075, m.rubber));
  return tagPiece(group, "vacuum-hose-in", "Mangueira do kitassato", [0.9, 0.3, 0]);
}

function createHoseOut(m) {
  const group = new THREE.Group();
  group.add(tube([[1.26, 0.71, 0.22], [1.4, 0.74, 0.22], [1.56, 0.54, 0.22], [1.75, 0.28, 0.14], [1.68, -0.12, 0.02]], 0.075, m.rubber));
  return tagPiece(group, "vacuum-hose-out", "Mangueira do aspirador", [1.9, 0.25, 0]);
}

function createAspirator(m) {
  const group = new THREE.Group();
  group.position.set(2.75, -0.56, 0);
  const faucet = mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.52, 28), m.steel, { position: [0, 0.24, 0] });
  const bend = tube([[0, 0.98, 0], [-0.18, 1.16, 0], [-0.48, 1.12, 0], [-0.58, 0.94, 0]], 0.16, m.steel);
  const nozzle = mesh(new THREE.CylinderGeometry(0.11, 0.145, 0.42, 26), m.steel, { position: [-0.58, 0.77, 0] });
  const aspirator = mesh(new THREE.CylinderGeometry(0.13, 0.18, 0.62, 26), m.blue, { position: [-0.58, 0.25, 0] });
  const sidePort = mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.46, 20), m.blue, { rotation: [0, 0, Math.PI / 2], position: [-0.84, 0.44, 0] });
  const water = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.92, 20), m.water, { position: [-0.58, -0.55, 0], cast: false });
  water.visible = false;
  group.add(faucet, bend, nozzle, aspirator, sidePort, water);
  group.userData.water = water;
  return tagPiece(group, "aspirator", "Aspirador de água", [-0.42, 1.05, 0]);
}

function createColdSolvent(m) {
  const group = new THREE.Group();
  group.position.set(-2.45, -0.55, -0.38);
  const bottle = mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.76, 32, 1, true), m.glass, { position: [0, 0, 0] });
  const liquid = mesh(new THREE.CylinderGeometry(0.27, 0.32, 0.38, 30), m.solvent, { position: [0, -0.18, 0], cast: false });
  const neck = mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.32, 28, 1, true), m.glassEdge, { position: [0, 0.54, 0] });
  const cap = mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 28), m.blue, { position: [0, 0.76, 0] });
  group.add(bottle, liquid, neck, cap);
  group.userData.cap = cap;
  return tagPiece(group, "cold-solvent", "Solvente frio compatível", [0.35, 0.68, 0]);
}

function createMixtureFlask(m) {
  const group = new THREE.Group();
  group.position.set(-2.35, -0.58, 0.75);
  const body = mesh(new THREE.CylinderGeometry(0.38, 0.28, 0.56, 36, 1, true), m.glass, { position: [0, -0.1, 0] });
  const shoulder = mesh(new THREE.ConeGeometry(0.38, 0.36, 36, 1, true), m.glass, { position: [0, 0.36, 0] });
  const neck = mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.36, 28, 1, true), m.glassEdge, { position: [0, 0.7, 0] });
  const slurry = mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.33, 32), m.slurry, { position: [0, -0.2, 0], cast: false });
  group.add(body, shoulder, neck, slurry);
  group.userData.slurry = slurry;
  return tagPiece(group, "mixture-flask", "Frasco com a suspensão", [0.38, 0.66, 0]);
}

function createGlassRod(m) {
  const group = new THREE.Group();
  group.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.2, 16), m.glassEdge, { rotation: [Math.PI / 2, 0, 0.18], position: [-2.05, -0.95, -0.78] }));
  return tagPiece(group, "glass-rod", "Bastão de vidro", [0.2, 0.5, 0]);
}

function createWatchGlass(m) {
  const group = new THREE.Group();
  group.position.set(2.15, -1.25, 0.78);
  const dish = mesh(new THREE.SphereGeometry(0.48, 36, 12, 0, Math.PI * 2, 0, Math.PI * 0.13), m.glassEdge, { scale: [1, 0.28, 1], cast: false });
  group.add(dish);
  return tagPiece(group, "watch-glass", "Vidro de relógio", [0.5, 0.25, 0]);
}

function createReferenceVisuals(m) {
  const group = new THREE.Group();
  group.name = "reference-action-visuals";

  const solventStream = tube([[-0.33, 2.2, 0.06], [-0.3, 1.9, 0.08], [-0.35, 1.58, 0.1]], 0.026, m.solvent);
  const solventDrops = new THREE.Group();
  for (let index = 0; index < 4; index += 1) {
    solventDrops.add(mesh(new THREE.SphereGeometry(0.035, 16, 12), m.solvent, {
      position: [-0.3 - index * 0.012, 2.08 - index * 0.14, 0.07], cast: false
    }));
  }
  const slurryStream = tube([[-0.2, 2.2, 0.06], [-0.22, 1.93, 0.08], [-0.35, 1.61, 0.1]], 0.052, m.slurry);
  const slurryParticles = new THREE.Group();
  for (let index = 0; index < 7; index += 1) {
    slurryParticles.add(mesh(new THREE.SphereGeometry(0.025, 12, 9), m.solid, {
      position: [-0.2 - index * 0.018, 2.13 - index * 0.08, 0.07 + (index % 2) * 0.02], cast: false
    }));
  }
  const ventArrows = new THREE.Group();
  for (let index = 0; index < 3; index += 1) {
    ventArrows.add(mesh(new THREE.ConeGeometry(0.075, 0.18, 20), m.green, {
      position: [1.56, 1.43 + index * 0.19, 0.22], cast: false
    }));
  }

  group.add(solventStream, solventDrops, slurryStream, slurryParticles, ventArrows);
  group.userData.solventStream = solventStream;
  group.userData.solventDrops = solventDrops;
  group.userData.slurryStream = slurryStream;
  group.userData.slurryParticles = slurryParticles;
  group.userData.ventArrows = ventArrows;
  group.children.forEach((child) => { child.visible = false; });
  return group;
}

function snapshot(object) {
  return { position: object.position.clone(), rotation: object.rotation.clone(), scale: object.scale.clone() };
}

function entryOffset(id, index) {
  if (id.includes("hose")) return new THREE.Vector3(0.3, 0.5 + index * 0.1, 0.45);
  return new THREE.Vector3(index % 2 ? 0.35 : -0.35, 0.65 + index * 0.12, 0.25);
}

export function createApparatus() {
  const m = materials();
  const root = new THREE.Group();
  root.name = "filtracao-por-succao";

  const components = new Map();
  const add = (piece) => { components.set(piece.userData.pieceId, piece); root.add(piece); return piece; };
  const bench = add(createBench(m));
  add(createStand(m));
  const flask = add(createFilterFlask(m));
  add(createClamp(m));
  const hoseIn = add(createHoseIn(m));
  add(createTrap(m));
  const vent = add(createVentClamp(m));
  const hoseOut = add(createHoseOut(m));
  const aspirator = add(createAspirator(m));
  add(createAdapter(m));
  const buchner = add(createBuchner(m));
  const paper = add(createFilterPaper(m));
  const coldSolvent = add(createColdSolvent(m));
  const mixture = add(createMixtureFlask(m));
  add(createGlassRod(m));
  add(createWatchGlass(m));
  const referenceVisuals = createReferenceVisuals(m);
  root.add(referenceVisuals);

  const home = new Map([...components].map(([id, component]) => [id, snapshot(component)]));
  const animations = [];
  const flowParticles = new THREE.Group();
  for (let index = 0; index < 12; index += 1) {
    const particle = mesh(new THREE.SphereGeometry(0.035, 14, 10), m.blue, { cast: false, receive: false });
    particle.userData.offset = index / 12;
    flowParticles.add(particle);
  }
  flowParticles.visible = false;
  root.add(flowParticles);

  let reducedMotion = false;
  let vacuumOn = false;
  let ventOpen = true;
  let paperWet = false;
  let procedureState = "assembly";

  function restoreTransform(id) {
    const component = components.get(id);
    const state = home.get(id);
    if (!component || !state) return;
    component.position.copy(state.position);
    component.rotation.copy(state.rotation);
    component.scale.copy(state.scale);
  }

  function clearHighlights() {
    components.forEach((component) => component.traverse((object) => {
      if (!object.isMesh || !object.material?.emissive || object.userData.baseEmissive === undefined) return;
      object.material.emissive.setHex(object.userData.baseEmissive);
      object.material.emissiveIntensity = object.userData.baseIntensity;
    }));
  }

  function setSelectedPiece(id) {
    clearHighlights();
    components.get(id)?.traverse((object) => {
      if (!object.isMesh || !object.material?.emissive) return;
      if (object.userData.baseEmissive === undefined) {
        object.userData.baseEmissive = object.material.emissive.getHex();
        object.userData.baseIntensity = object.material.emissiveIntensity;
      }
      object.material.emissive.setHex(0x14996f);
      object.material.emissiveIntensity = Math.max(0.42, object.material.emissiveIntensity);
    });
  }

  function setFullAssembly() {
    animations.length = 0;
    components.forEach((component, id) => { restoreTransform(id); component.visible = true; });
    coldSolvent.userData.cap.visible = true;
    referenceVisuals.children.forEach((child) => { child.visible = false; });
    setSelectedPiece(null);
  }

  function setExploreView(view = "complete") {
    setFullAssembly();
    if (view === "apparatus") {
      ["cold-solvent", "mixture-flask", "glass-rod", "watch-glass"].forEach((id) => { components.get(id).visible = false; });
    }
    if (view === "supplies") {
      components.forEach((component, id) => { component.visible = ["bench", "cold-solvent", "mixture-flask", "glass-rod", "watch-glass", "filter-paper", "buchner"].includes(id); });
      components.get("buchner").position.set(0.55, -0.55, 0.15);
      components.get("filter-paper").position.set(0.55, -0.43, 0.15);
    }
  }

  function setAssemblyStep(index, { animate = true, includeBench = true } = {}) {
    const stepIndex = THREE.MathUtils.clamp(index, -1, STEP_PIECES.length - 1);
    animations.length = 0;
    components.forEach((_component, id) => restoreTransform(id));
    const stepPieces = stepIndex < 0 ? ["bench"] : STEP_PIECES[stepIndex];
    const visible = new Set(stepPieces);
    if (!includeBench) visible.delete("bench");
    components.forEach((component, id) => { component.visible = visible.has(id); });
    const previous = stepIndex > 0 ? STEP_PIECES[stepIndex - 1] : [];
    const introduced = stepIndex < 0 ? [] : STEP_PIECES[stepIndex].filter((id) => id !== "bench" && !previous.includes(id));
    if (animate && !reducedMotion) introduced.forEach((id, offsetIndex) => {
      const component = components.get(id);
      const target = snapshot(component);
      const start = snapshot(component);
      start.position.add(entryOffset(id, offsetIndex));
      start.scale.multiplyScalar(0.72);
      component.position.copy(start.position);
      component.scale.copy(start.scale);
      animations.push({ component, start, target, elapsed: 0, delay: offsetIndex * 0.12, duration: 0.5 });
    });
    introduced.forEach((id) => setSelectedPiece(id));
  }

  function setVacuum(enabled) {
    vacuumOn = Boolean(enabled);
    if (vacuumOn) ventOpen = false;
    flowParticles.visible = vacuumOn;
    aspirator.userData.water.visible = vacuumOn;
    vent.userData.openMark.visible = ventOpen;
  }

  function setVent(open) {
    ventOpen = Boolean(open);
    if (ventOpen) vacuumOn = false;
    flowParticles.visible = vacuumOn;
    aspirator.userData.water.visible = vacuumOn;
    vent.userData.openMark.visible = ventOpen;
  }

  function setPaperWet(wet) {
    paperWet = Boolean(wet);
    paper.userData.dry.visible = !paperWet;
    paper.userData.wet.visible = paperWet;
  }

  function setProcedureState(state) {
    procedureState = state;
    flask.userData.filtrate.visible = ["transfer", "vessel-rinse", "cake-rinse", "suction-dry", "complete"].includes(state);
    buchner.userData.cake.visible = ["transfer", "vessel-rinse", "cake-rinse", "suction-dry", "complete"].includes(state);
    mixture.userData.slurry.visible = !["vessel-rinse", "cake-rinse", "suction-dry", "complete"].includes(state);
    if (state === "cake-rinse" || state === "complete") setVent(true);
    if (state === "suction-dry") setVacuum(true);
  }

  function setReferenceView(view = "montagem") {
    setFullAssembly();
    setProcedureState("assembly");
    setPaperWet(false);
    setVent(true);

    if (view === "papel-molhado") {
      ["mixture-flask", "glass-rod", "watch-glass"].forEach((id) => { components.get(id).visible = false; });
      coldSolvent.position.set(-0.98, 1.95, 0.05);
      coldSolvent.rotation.z = -1.2;
      coldSolvent.userData.cap.visible = false;
      referenceVisuals.userData.solventStream.visible = true;
      referenceVisuals.userData.solventDrops.visible = true;
      setPaperWet(true);
      setVacuum(true);
    }

    if (view === "transferencia") {
      ["cold-solvent", "glass-rod", "watch-glass"].forEach((id) => { components.get(id).visible = false; });
      mixture.position.set(-1, 1.83, 0.05);
      mixture.rotation.z = -1.1;
      referenceVisuals.userData.slurryStream.visible = true;
      referenceVisuals.userData.slurryParticles.visible = true;
      setPaperWet(true);
      setProcedureState("transfer");
      setVacuum(true);
    }

    if (view === "encerramento") {
      ["cold-solvent", "mixture-flask", "glass-rod", "watch-glass"].forEach((id) => { components.get(id).visible = false; });
      setPaperWet(true);
      setProcedureState("complete");
      setVent(true);
      referenceVisuals.userData.ventArrows.visible = true;
    }
  }

  function setDiagnosticError(id) {
    setFullAssembly();
    setPaperWet(true);
    setVent(false);
    if (id === "missing-trap") {
      components.get("vacuum-trap").visible = false;
      components.get("vent-clamp").visible = false;
    }
    if (id === "paper-gap") paper.scale.setScalar(0.7);
    if (id === "dry-paper") setPaperWet(false);
    if (id === "wrong-flask") {
      flask.scale.set(0.84, 1, 0.84);
      components.get("clamp").visible = false;
    }
    if (id === "closed-shutdown") { setVacuum(false); setVent(false); }
  }

  function update(delta, elapsed) {
    for (let index = animations.length - 1; index >= 0; index -= 1) {
      const animation = animations[index];
      animation.elapsed += delta;
      if (animation.elapsed < animation.delay) continue;
      const progress = Math.min(1, (animation.elapsed - animation.delay) / animation.duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      animation.component.position.lerpVectors(animation.start.position, animation.target.position, eased);
      animation.component.scale.lerpVectors(animation.start.scale, animation.target.scale, eased);
      if (progress >= 1) animations.splice(index, 1);
    }
    if (vacuumOn) flowParticles.children.forEach((particle) => {
      const t = (elapsed * 0.35 + particle.userData.offset) % 1;
      if (t < 0.26) particle.position.lerpVectors(new THREE.Vector3(0.58, 0, 0.1), new THREE.Vector3(0.52, -0.26, 0.22), t / 0.26);
      else if (t < 0.5) particle.position.lerpVectors(new THREE.Vector3(0.52, -0.26, 0.22), new THREE.Vector3(1.26, 0.71, 0.22), (t - 0.26) / 0.24);
      else if (t < 0.72) particle.position.lerpVectors(new THREE.Vector3(1.26, 0.71, 0.22), new THREE.Vector3(1.56, 0.54, 0.22), (t - 0.5) / 0.22);
      else particle.position.lerpVectors(new THREE.Vector3(1.56, 0.54, 0.22), new THREE.Vector3(1.68, -0.12, 0.02), (t - 0.72) / 0.28);
    });
  }

  function getPieceFromObject(object) {
    let current = object;
    while (current && current !== root) {
      if (current.userData.pieceId && components.has(current.userData.pieceId)) return components.get(current.userData.pieceId);
      current = current.parent;
    }
    return null;
  }

  function getLabelAnchors() {
    return [...components].filter(([, component]) => component.visible).map(([id, component]) => ({
      id,
      name: component.userData.pieceName,
      object: component,
      offset: component.userData.labelOffset ?? new THREE.Vector3()
    }));
  }

  setFullAssembly();
  setPaperWet(false);
  setVent(true);

  return {
    root,
    components,
    bench,
    get selectableObjects() { return [...components.values()]; },
    get pieceIds() { return [...components.keys()]; },
    get vacuumOn() { return vacuumOn; },
    get ventOpen() { return ventOpen; },
    get paperWet() { return paperWet; },
    get procedureState() { return procedureState; },
    setFullAssembly,
    setExploreView,
    setAssemblyStep,
    setSelectedPiece,
    setVacuum,
    setVent,
    setPaperWet,
    setProcedureState,
    setReferenceView,
    setDiagnosticError,
    update,
    getPieceFromObject,
    getLabelAnchors,
    setReducedMotion(value) { reducedMotion = Boolean(value); }
  };
}
