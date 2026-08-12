import fs from "node:fs/promises";
import * as THREE from "../vendor/three.module.js";
import { USDZExporter } from "../vendor/addons/exporters/USDZExporter.js";
import { createApparatus } from "../js/apparatus.js";

const TARGET_HEIGHT_METERS = 0.48;
const STEP_COUNT = 8;
const OUTPUT_DIR = new URL("../assets/models/", import.meta.url);

const GUIDED_TARGETS = Object.freeze([
  Object.freeze(["stand"]),
  Object.freeze(["filter-flask", "clamp"]),
  Object.freeze(["vacuum-hose-in", "vacuum-trap", "vent-clamp"]),
  Object.freeze(["vacuum-hose-out", "aspirator"]),
  Object.freeze(["adapter"]),
  Object.freeze(["buchner"]),
  Object.freeze(["filter-paper"]),
  Object.freeze(["cold-solvent"])
]);

function findNamedObject(root, name) {
  let match = null;
  root.traverse((object) => {
    if (!match && object.name === name) match = object;
  });
  return match;
}

function createGuidedArrow(model, stepIndex) {
  const targetBounds = new THREE.Box3().makeEmpty();
  const targetNames = GUIDED_TARGETS[stepIndex] ?? [];

  targetNames.forEach((name) => {
    const object = findNamedObject(model, name);
    if (!object?.visible) return;
    const bounds = new THREE.Box3().setFromObject(object);
    if (!bounds.isEmpty()) targetBounds.union(bounds);
  });

  if (targetBounds.isEmpty()) return null;

  const targetCenter = targetBounds.getCenter(new THREE.Vector3());
  const targetSize = targetBounds.getSize(new THREE.Vector3());
  const arrowHeight = Math.max(0.5, Math.min(0.9, targetSize.y * 0.55 + 0.42));
  const shaftLength = arrowHeight * 0.62;
  const headLength = arrowHeight * 0.38;
  const group = new THREE.Group();
  group.name = "guided-arrow";

  const material = new THREE.MeshStandardMaterial({
    color: 0x00a881,
    emissive: 0x00644d,
    emissiveIntensity: 0.55,
    roughness: 0.32,
    metalness: 0.05
  });

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, shaftLength, 20),
    material
  );
  shaft.position.y = headLength + shaftLength * 0.5;
  group.add(shaft);

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.105, headLength, 24),
    material
  );
  head.rotation.z = Math.PI;
  head.position.y = headLength * 0.5;
  group.add(head);

  group.position.set(
    targetCenter.x,
    targetBounds.max.y + Math.max(0.16, targetSize.y * 0.08),
    targetCenter.z
  );
  return group;
}

function prepareStepForExport(stepIndex) {
  const apparatus = createApparatus();
  apparatus.setReducedMotion(true);
  apparatus.setAssemblyStep(stepIndex, { animate: false, includeBench: false });
  apparatus.bench.visible = false;
  apparatus.root.updateWorldMatrix(true, true);

  const model = apparatus.root.clone(true);
  model.traverse((object) => {
    if (!object.isMesh) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.filter(Boolean).forEach((material) => {
      if (material.side === THREE.DoubleSide) material.side = THREE.FrontSide;
    });
  });
  const scene = new THREE.Scene();
  scene.add(model);
  scene.updateMatrixWorld(true);

  const arrow = createGuidedArrow(model, stepIndex);
  if (arrow) scene.add(arrow);
  scene.updateMatrixWorld(true);

  let bounds = new THREE.Box3().setFromObject(scene);
  const size = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.y) || size.y <= 0) {
    throw new Error(`Não foi possível calcular a altura da etapa ${stepIndex + 1}.`);
  }

  scene.scale.multiplyScalar(TARGET_HEIGHT_METERS / size.y);
  scene.updateMatrixWorld(true);

  bounds = new THREE.Box3().setFromObject(scene);
  const center = bounds.getCenter(new THREE.Vector3());
  scene.position.x -= center.x;
  scene.position.z -= center.z;
  scene.position.y -= bounds.min.y;
  scene.updateMatrixWorld(true);
  return scene;
}

async function exportStep(stepIndex) {
  const scene = prepareStepForExport(stepIndex);
  const exporter = new USDZExporter();
  const data = await exporter.parseAsync(scene, {
    includeAnchoringProperties: true,
    quickLookCompatible: true,
    maxTextureSize: 512,
    ar: {
      anchoring: { type: "plane" },
      planeAnchoring: { alignment: "horizontal" }
    }
  });

  const filename = `filtracao-step-${stepIndex + 1}.usdz`;
  const outputURL = new URL(filename, OUTPUT_DIR);
  await fs.writeFile(outputURL, Buffer.from(data));
  const stat = await fs.stat(outputURL);
  if (stat.size < 1024) throw new Error(`${filename} foi gerado com tamanho inválido.`);
  console.log(`${filename}: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });

for (let index = 0; index < STEP_COUNT; index += 1) {
  await exportStep(index);
}

console.log("Oito modelos USDZ do iPhone gerados com sucesso.");
