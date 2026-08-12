import fs from "node:fs/promises";
import * as THREE from "../vendor/three.module.js";
import { GLTFExporter } from "../vendor/addons/exporters/GLTFExporter.js";
import { createApparatus } from "../js/apparatus.js";

const TARGET_HEIGHT_METERS = 0.48;
const OUTPUT_URL = new URL("../assets/models/filtracao-completa.glb", import.meta.url);

if (!globalThis.FileReader) {
  globalThis.FileReader = class FileReader {
    result = null;
    onloadend = null;
    onerror = null;

    async readAsArrayBuffer(blob) {
      try {
        this.result = await blob.arrayBuffer();
        this.onloadend?.({ target: this });
        return this.result;
      } catch (error) {
        this.onerror?.(error);
        throw error;
      }
    }

    async readAsDataURL(blob) {
      try {
        const data = Buffer.from(await blob.arrayBuffer()).toString("base64");
        this.result = `data:${blob.type || "application/octet-stream"};base64,${data}`;
        this.onloadend?.({ target: this });
        return this.result;
      } catch (error) {
        this.onerror?.(error);
        throw error;
      }
    }
  };
}

function sceneViewerMaterial(material) {
  const color = material.color?.clone() ?? new THREE.Color(0xffffff);
  const emissiveStrength = Math.min(1, Math.max(0, material.emissiveIntensity ?? 0));
  const emissive = (material.emissive?.clone() ?? new THREE.Color(0x000000)).multiplyScalar(emissiveStrength);
  return new THREE.MeshStandardMaterial({
    name: material.name,
    color,
    emissive,
    emissiveIntensity: 1,
    metalness: Math.min(1, material.metalness ?? 0),
    roughness: Math.max(0.08, material.roughness ?? 0.7),
    opacity: material.opacity ?? 1,
    transparent: Boolean(material.transparent || (material.opacity ?? 1) < 1),
    alphaTest: material.alphaTest ?? 0,
    side: THREE.FrontSide,
    depthWrite: material.depthWrite !== false
  });
}

function materialSignature(material) {
  const round = (value, fallback) => Number(value ?? fallback).toFixed(3);
  return [
    material.color?.getHexString() ?? "ffffff",
    material.emissive?.getHexString() ?? "000000",
    round(Math.min(1, Math.max(0, material.emissiveIntensity ?? 0)), 0),
    round(material.metalness, 0),
    round(Math.max(0.08, material.roughness ?? 0.7), 0.7),
    round(material.opacity, 1),
    Boolean(material.transparent || (material.opacity ?? 1) < 1),
    round(material.alphaTest, 0),
    material.depthWrite !== false
  ].join("|");
}

function prepareModel() {
  const apparatus = createApparatus();
  apparatus.setReducedMotion(true);
  apparatus.setExploreView("apparatus");
  apparatus.bench.visible = false;

  const model = apparatus.root.clone(true);
  const materialPool = new Map();
  model.traverse((object) => {
    if (!object.isMesh) return;
    const convert = (material) => {
      const signature = materialSignature(material);
      if (!materialPool.has(signature)) materialPool.set(signature, sceneViewerMaterial(material));
      return materialPool.get(signature);
    };
    object.material = Array.isArray(object.material) ? object.material.map(convert) : convert(object.material);
  });

  const scene = new THREE.Scene();
  scene.name = "Filtracao_por_succao";
  scene.add(model);
  scene.updateMatrixWorld(true);

  let bounds = new THREE.Box3().setFromObject(scene);
  const size = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.y) || size.y <= 0) throw new Error("Não foi possível calcular a altura da montagem.");

  scene.scale.setScalar(TARGET_HEIGHT_METERS / size.y);
  scene.updateMatrixWorld(true);
  bounds = new THREE.Box3().setFromObject(scene);
  const center = bounds.getCenter(new THREE.Vector3());
  scene.position.set(-center.x, -bounds.min.y, -center.z);
  scene.updateMatrixWorld(true);
  return scene;
}

const exporter = new GLTFExporter();
const result = await exporter.parseAsync(prepareModel(), {
  binary: true,
  onlyVisible: true,
  trs: false,
  maxTextureSize: 512
});

await fs.mkdir(new URL("../assets/models/", import.meta.url), { recursive: true });
await fs.writeFile(OUTPUT_URL, Buffer.from(result));
const stat = await fs.stat(OUTPUT_URL);
if (stat.size < 1024 || stat.size > 15 * 1024 * 1024) throw new Error("O GLB foi gerado com tamanho inválido.");
console.log(`filtracao-completa.glb: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
