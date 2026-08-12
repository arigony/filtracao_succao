import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

test("a página oferece os cinco modos e controle de movimento", () => {
  const html = read("index.html");
  ["explore", "guided", "procedure", "diagnostic", "ar"].forEach((mode) => assert.match(html, new RegExp(`data-mode="${mode}"`)));
  assert.match(html, /id="motion-toggle"/);
  assert.match(html, /id="scene-canvas"/);
  assert.match(html, /referencia\/filtracao-succao\.html/);
});

test("a interface inclui a liberação explícita do papel molhado", () => {
  const html = read("index.html");
  const app = read("js/app.js");
  assert.match(html, /Aplicar sucção e molhar o papel/);
  assert.match(app, /procedure\.wetPaper\(\)/);
  assert.match(app, /Papel molhado e assentado/);
});

test("o projeto permanece estático e usa caminhos relativos", () => {
  const html = read("index.html");
  assert.doesNotMatch(html, /react|vue|angular/i);
  assert.doesNotMatch(html, /src="\//);
  assert.doesNotMatch(html, /href="\//);
  assert.match(html, /application\.type = "module"/);
  assert.match(html, /application\.src = "\.\/js\/app\.js\?v=\d{8}-\d+"/);
  assert.match(html, /location\.protocol === "file:"/);
});

test("a cena expõe controles equivalentes para mouse, toque e teclado", () => {
  const scene = read("js/scene.js");
  const interactions = read("js/interactions.js");
  const css = read("css/main.css");
  assert.match(scene, /controls\.touches\.ONE = THREE\.TOUCH\.ROTATE/);
  assert.match(scene, /controls\.touches\.TWO = THREE\.TOUCH\.DOLLY_PAN/);
  assert.match(interactions, /pointerdown/);
  assert.match(interactions, /pointerup/);
  assert.match(interactions, /canvas\.tabIndex = 0/);
  assert.match(interactions, /event\.key !== "Enter".*event\.key !== " "/s);
  assert.match(css, /#scene-canvas[^}]*touch-action:\s*none/s);
});

test("a experiência preserva os módulos quando WebGL não está disponível", () => {
  const html = read("index.html");
  const app = read("js/app.js");
  assert.match(html, /id="scene-fallback"/);
  assert.match(html, /id="webgl-notice"/);
  assert.match(app, /function supportsWebGL\(\)/);
  assert.match(app, /createFallbackApparatus/);
  assert.match(app, /hasWebGL \? createARExperience/);
});

test("montagem, vácuo e diagnóstico oferecem feedback ativo", () => {
  const html = read("index.html");
  const app = read("js/app.js");
  assert.match(html, /id="assembly-options"/);
  assert.match(html, /id="vacuum-explanation"/);
  assert.match(html, /id="diagnostic-result"/);
  assert.match(html, /id="fullscreen-toggle"/);
  assert.match(app, /completedGuidedSteps/);
  assert.match(app, /showDiagnosticResult/);
  assert.match(app, /requestFullscreen/);
});

test("o celular alterna entre instruções e bancada sem reiniciar o modo", () => {
  const html = read("index.html");
  const app = read("js/app.js");
  const responsive = read("css/responsive.css");
  assert.match(html, /id="mobile-view-stage"/);
  assert.match(html, /id="mobile-back-panel"/);
  assert.match(app, /dataset\.activeMode = mode/);
  assert.match(app, /scrollIntoView/);
  assert.match(responsive, /data-active-mode="explore"/);
  assert.match(responsive, /\.info-column \{ order: -1; \}/);
});

test("a sessão WebXR começa diretamente a partir do toque", () => {
  const ar = read("js/ar.js");
  const start = ar.slice(ar.indexOf("async function start"), ar.indexOf("async function exit"));
  assert.match(start, /navigator\.xr\.requestSession\("immersive-ar"/);
  assert.doesNotMatch(start, /await checkSupport\(\)/);
  assert.match(start, /catch \(error\)/);
});

test("o guia visual credita a fonte e não se apresenta como tradução", () => {
  const html = read("referencia/filtracao-succao.html");
  assert.match(html, /Não constitui tradução nem reprodução/);
  assert.match(html, /Chemistry LibreTexts/);
  assert.match(html, /molhar e assentar o papel/i);
  assert.match(html, /ventilar primeiro; desligar o aspirador depois/i);
  ["montagem", "papel-molhado", "transferencia", "encerramento"].forEach((name) => {
    assert.match(html, new RegExp(`img/${name}\\.svg`));
    const image = fs.readFileSync(path.join(ROOT, "referencia", "img", `${name}.svg`), "utf8");
    assert.match(image, /^<svg[^>]+viewBox="0 0 1440 1080"/);
    assert.match(image, /role="img" aria-labelledby="title desc"/);
    assert.doesNotMatch(image, /<image\b/);
  });
});
