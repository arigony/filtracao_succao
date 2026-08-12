import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

test("o Quick Look usa links estáticos para as oito etapas", () => {
  const source = read("js/quicklook.js");
  assert.match(source, /filtracao-step-\$\{safeIndex \+ 1\}\.usdz/);
  assert.match(source, /filtracao-completa\.usdz/);
  assert.match(source, /link\.href = modelURL\(safeIndex\)/);
  assert.match(source, /createCompleteLink/);
  assert.doesNotMatch(source, /Blob|createObjectURL|jsdelivr/);
});

test("os oito modelos USDZ estão presentes e são arquivos ZIP válidos", () => {
  const directory = path.join(ROOT, "assets", "models");
  const names = fs.readdirSync(directory).filter((name) => name.startsWith("filtracao-step-") && name.endsWith(".usdz")).sort();
  const expected = Array.from({ length: 8 }, (_, index) => `filtracao-step-${index + 1}.usdz`);
  assert.deepEqual(names, expected);
  let previousSize = 0;
  for (const name of names) {
    const data = fs.readFileSync(path.join(directory, name));
    assert.equal(data.subarray(0, 2).toString("ascii"), "PK", `${name} precisa ser um arquivo ZIP/USDZ`);
    assert.ok(data.length > 1024, `${name} precisa conter geometria`);
    assert.ok(data.length >= previousSize, `${name} não deve remover a geometria cumulativa da etapa anterior`);
    previousSize = data.length;
  }
  const complete = fs.readFileSync(path.join(directory, "filtracao-completa.usdz"));
  assert.equal(complete.subarray(0, 2).toString("ascii"), "PK");
  assert.ok(complete.length > 1024);
});

test("o Android recebe um GLB válido e um link para o Scene Viewer", () => {
  const directory = path.join(ROOT, "assets", "models");
  const model = fs.readFileSync(path.join(directory, "filtracao-completa.glb"));
  const android = read("js/android-ar.js");
  assert.equal(model.subarray(0, 4).toString("ascii"), "glTF");
  assert.ok(model.length > 1024 && model.length < 15 * 1024 * 1024);
  assert.equal(model.readUInt32LE(4), 2);
  const jsonLength = model.readUInt32LE(12);
  const gltf = JSON.parse(model.subarray(20, 20 + jsonLength).toString("utf8").trim());
  assert.ok(gltf.materials.length <= 10, "o modelo móvel deve manter no máximo dez materiais");
  assert.deepEqual(gltf.extensionsRequired ?? [], []);
  assert.match(android, /arvr\.google\.com\/scene-viewer\/1\.0/);
  assert.match(android, /mode:\s*"ar_preferred"/);
  assert.match(android, /browser_fallback_url/);
  assert.match(android, /filtracao-completa\.glb/);
});

test("o gerador usa escala laboratorial, ancoragem horizontal e nomes próprios", () => {
  const source = read("scripts/generate-ios-usdz.mjs");
  assert.match(source, /TARGET_HEIGHT_METERS = 0\.48/);
  assert.match(source, /STEP_COUNT = 8/);
  assert.match(source, /includeBench: false/);
  assert.match(source, /alignment: "horizontal"/);
  assert.match(source, /filtracao-step-/);
  assert.match(source, /filtracao-completa\.usdz/);
  assert.doesNotMatch(source, /reflux-step-/);
});
