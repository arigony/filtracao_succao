import { createApparatus } from "./apparatus.js";
import { createARExperience } from "./ar.js";
import { GuidedAssemblyController } from "./assembly.js";
import { createInteractions } from "./interactions.js";
import { createQuickLookExperience } from "./quicklook.js";
import { DiagnosticController, FiltrationProcedureController } from "./procedure.js";
import { createLabelManager, createScene } from "./scene.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

async function loadJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Não foi possível carregar ${path}.`);
  return response.json();
}

function setFeedback(element, message = "", type = "") {
  element.textContent = message;
  element.classList.toggle("is-success", type === "success");
  element.classList.toggle("is-error", type === "error");
}

async function bootstrap() {
  const [pieces, steps, operatingSteps, diagnosticErrors] = await Promise.all([
    loadJSON("./data/pieces.json"),
    loadJSON("./data/assembly-steps.json"),
    loadJSON("./data/operating-steps.json"),
    loadJSON("./data/diagnostic-errors.json")
  ]);
  const pieceById = new Map(pieces.map((piece) => [piece.id, piece]));
  const guided = new GuidedAssemblyController(steps);
  const procedure = new FiltrationProcedureController(operatingSteps);
  const diagnostic = new DiagnosticController(diagnosticErrors);

  const canvas = $("#scene-canvas");
  const sceneWrap = $("#scene-wrap");
  const sceneApi = createScene(canvas, sceneWrap);
  const apparatus = createApparatus();
  sceneApi.scene.add(apparatus.root);
  sceneApi.addFrameCallback((delta, elapsed) => apparatus.update(delta, elapsed));

  const labels = createLabelManager($("#scene-labels"), sceneApi.camera, apparatus);
  sceneApi.addFrameCallback(() => labels.update());
  let activeMode = "explore";
  let vacuumDemo = false;
  let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const modeContent = {
    explore: ["Explorar", "Montagem completa"],
    guided: ["Montagem guiada", "Oito etapas essenciais"],
    procedure: ["Procedimento", "Filtrar, lavar e encerrar"],
    diagnostic: ["Diagnóstico", "Encontre cinco erros"],
    ar: ["Realidade aumentada", "Montagem na sua bancada"]
  };

  function updateSafetyState() {
    const state = $("#safety-state");
    if (apparatus.vacuumOn) {
      state.className = "state-chip is-vacuum";
      state.innerHTML = '<span aria-hidden="true">●</span> Sucção ativa';
    } else if (!apparatus.ventOpen) {
      state.className = "state-chip is-warning";
      state.innerHTML = '<span aria-hidden="true">●</span> Circuito fechado';
    } else {
      state.className = "state-chip";
      state.innerHTML = '<span aria-hidden="true">●</span> Sistema ventilado';
    }
  }

  function selectPiece(id, { focus = true } = {}) {
    const piece = pieceById.get(id);
    const object = apparatus.components.get(id);
    if (!piece || !object) return;
    apparatus.setSelectedPiece(id);
    $("#piece-name").textContent = piece.name;
    $("#piece-alternative").textContent = piece.alternativeName;
    $("#piece-function").textContent = piece.function;
    $("#piece-position").textContent = piece.correctPosition;
    $("#piece-error").textContent = piece.commonError;
    if (focus && activeMode === "explore") {
      const target = object.getWorldPosition(new sceneApi.camera.position.constructor());
      sceneApi.focus(target, id === "aspirator" ? 4.8 : 4.1);
    }
  }

  createInteractions({ canvas, camera: sceneApi.camera, apparatus, onSelect: (id) => selectPiece(id) });
  selectPiece("filter-flask", { focus: false });

  function renderGuided({ animate = false } = {}) {
    const step = guided.current;
    apparatus.setAssemblyStep(guided.index, { animate });
    $("#step-counter").textContent = `Etapa ${guided.index + 1} de ${steps.length}`;
    $("#progress-bar").style.width = `${guided.progress * 100}%`;
    $("#step-title").textContent = step.title;
    $("#step-instruction").textContent = step.instruction;
    $("#step-principle").textContent = step.principle;
    $("#previous-step").disabled = guided.isFirst;
    $("#next-step").disabled = guided.isLast;
    $("#next-step").textContent = guided.isLast ? "Montagem conferida" : "Próxima etapa";
    const checks = $("#guided-checks");
    checks.hidden = !guided.isLast;
    $("#guided-check-list").replaceChildren(...(step.checks ?? []).map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    }));
  }

  function renderProcedure() {
    const step = procedure.current;
    apparatus.setFullAssembly();
    apparatus.setPaperWet(procedure.paperWetted);
    apparatus.setVent(procedure.ventOpen);
    if (procedure.vacuumOn) apparatus.setVacuum(true);
    apparatus.setProcedureState(step.state);
    $("#procedure-counter").textContent = `Fase ${procedure.index + 1} de ${operatingSteps.length}`;
    $("#procedure-progress").style.width = `${procedure.progress * 100}%`;
    $("#procedure-title").textContent = step.title;
    $("#procedure-instruction").textContent = step.instruction;
    $("#procedure-principle").textContent = step.principle;
    $("#procedure-safety").textContent = step.safety;
    $("#procedure-previous").disabled = procedure.isFirst;
    $("#procedure-next").textContent = procedure.isLast ? "Confirmar encerramento" : "Avançar com segurança";
    $("#procedure-gate").hidden = procedure.index !== 0;
    $("#vent-control").setAttribute("aria-pressed", String(procedure.ventOpen));
    $("#vent-control").textContent = procedure.ventOpen ? "Respiro aberto" : "Respiro fechado";
    $("#vacuum-control").setAttribute("aria-pressed", String(procedure.vacuumOn));
    $("#vacuum-control").textContent = procedure.vacuumOn ? "Sucção ativa" : "Sucção desligada";
    updateSafetyState();
  }

  function renderDiagnostic() {
    const error = diagnostic.current;
    apparatus.setDiagnosticError(error.id);
    $("#diagnostic-counter").textContent = `Erro ${diagnostic.index + 1} de ${diagnosticErrors.length}`;
    $("#diagnostic-progress").style.width = `${((diagnostic.index + 1) / diagnosticErrors.length) * 100}%`;
    $("#diagnostic-title").textContent = error.title;
    $("#diagnostic-observation").textContent = error.observation;
    const choices = $("#diagnostic-choices");
    choices.querySelectorAll(".choice-button").forEach((button) => button.remove());
    error.choices.forEach((choice, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice-button";
      button.textContent = choice.label;
      button.addEventListener("click", () => answerDiagnostic(index));
      choices.append(button);
    });
    $("#diagnostic-explanation").hidden = true;
    $("#diagnostic-next").disabled = true;
    $("#diagnostic-next").textContent = diagnostic.isLast ? "Reiniciar diagnóstico" : "Próximo erro";
    setFeedback($("#diagnostic-feedback"));
    updateSafetyState();
  }

  function answerDiagnostic(index) {
    const result = diagnostic.answer(index);
    if (!result.revealed) return;
    $("#diagnostic-risk").textContent = result.error.risk;
    $("#diagnostic-principle").textContent = result.error.principle;
    $("#diagnostic-correction").textContent = result.error.correction;
    $("#diagnostic-explanation").hidden = false;
    $("#diagnostic-next").disabled = false;
    $$(".choice-button", $("#diagnostic-choices")).forEach((button) => { button.disabled = true; });
    setFeedback($("#diagnostic-feedback"), result.correct ? "Boa análise: a correção elimina o risco identificado." : "Reveja o princípio abaixo e compare com a montagem.", result.correct ? "success" : "error");
    apparatus.setSelectedPiece(result.error.pieceId);
  }

  function setMode(mode) {
    activeMode = mode;
    $$(".mode-button").forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    ["explore", "guided", "procedure", "diagnostic", "ar"].forEach((name) => {
      $(`#${name}-panel`).hidden = name !== mode;
    });
    $("#explore-toolbar").hidden = mode !== "explore";
    $("#mode-kicker").textContent = modeContent[mode][0];
    $("#stage-title").textContent = modeContent[mode][1];
    labels.setVisible(false);
    $("#labels-toggle").setAttribute("aria-pressed", "false");
    if (mode === "explore") {
      apparatus.setFullAssembly();
      apparatus.setPaperWet(false);
      apparatus.setVent(true);
      sceneApi.setView("default");
    } else if (mode === "guided") {
      guided.reset();
      renderGuided();
      sceneApi.setView("default");
    } else if (mode === "procedure") {
      procedure.reset();
      $("#check-trap").checked = false;
      $("#check-paper").checked = false;
      setFeedback($("#procedure-feedback"));
      renderProcedure();
      sceneApi.setView("default");
    } else if (mode === "diagnostic") {
      diagnostic.reset();
      renderDiagnostic();
      sceneApi.setView("default");
    } else {
      apparatus.setFullAssembly();
      apparatus.setPaperWet(true);
      apparatus.setVent(true);
      sceneApi.setView("default");
    }
    updateSafetyState();
  }

  $$(".mode-button").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.mode)));
  $$("[data-view]").forEach((button) => button.addEventListener("click", () => {
    $$("[data-view]").forEach((candidate) => candidate.setAttribute("aria-pressed", String(candidate === button)));
    apparatus.setExploreView(button.dataset.view);
    labels.setVisible(false);
    $("#labels-toggle").setAttribute("aria-pressed", "false");
    sceneApi.setView(button.dataset.view === "supplies" ? "glassware" : "default");
  }));
  $$("[data-piece]").forEach((button) => button.addEventListener("click", () => selectPiece(button.dataset.piece)));

  $("#vacuum-demo").addEventListener("click", () => {
    vacuumDemo = !vacuumDemo;
    apparatus.setVent(!vacuumDemo);
    apparatus.setVacuum(vacuumDemo);
    $("#vacuum-demo").textContent = vacuumDemo ? "Interromper demonstração" : "Mostrar o caminho do vácuo";
    updateSafetyState();
  });
  $("#reset-view").addEventListener("click", () => sceneApi.setView("default"));
  $("#labels-toggle").addEventListener("click", (event) => {
    const visible = event.currentTarget.getAttribute("aria-pressed") !== "true";
    event.currentTarget.setAttribute("aria-pressed", String(visible));
    event.currentTarget.textContent = visible ? "Ocultar rótulos" : "Mostrar rótulos";
    labels.setVisible(visible);
  });

  $("#previous-step").addEventListener("click", () => { guided.previous(); renderGuided(); });
  $("#next-step").addEventListener("click", () => { guided.next(); renderGuided({ animate: true }); });

  $("#wet-paper").addEventListener("click", () => {
    if (!$("#check-trap").checked || !$("#check-paper").checked) {
      setFeedback($("#procedure-feedback"), "Confirme a armadilha e o posicionamento do papel antes de aplicar sucção.", "error");
      return;
    }
    procedure.validateAssembly();
    procedure.wetPaper();
    apparatus.setFullAssembly();
    apparatus.setPaperWet(true);
    apparatus.setVacuum(true);
    renderProcedure();
    setFeedback($("#procedure-feedback"), "Papel molhado e assentado: a mistura pode ser transferida.", "success");
  });
  $("#vent-control").addEventListener("click", () => {
    procedure.setVent(!procedure.ventOpen);
    renderProcedure();
    setFeedback($("#procedure-feedback"), procedure.ventOpen ? "Pressão igualada à atmosfera." : "Respiro fechado; confirme a sucção quando necessário.", "success");
  });
  $("#vacuum-control").addEventListener("click", () => {
    procedure.setVacuum(!procedure.vacuumOn);
    renderProcedure();
    setFeedback($("#procedure-feedback"), procedure.vacuumOn ? "Sucção aplicada através da armadilha." : "Sucção interrompida.", "success");
  });
  $("#procedure-previous").addEventListener("click", () => { procedure.previous(); renderProcedure(); setFeedback($("#procedure-feedback")); });
  $("#procedure-next").addEventListener("click", () => {
    const result = procedure.advance();
    if (!result.ok) {
      setFeedback($("#procedure-feedback"), result.message, "error");
      return;
    }
    renderProcedure();
    setFeedback($("#procedure-feedback"), procedure.isLast ? "Antes de desligar: abra o sistema para a atmosfera." : "Condição aceita. Continue observando o circuito.", "success");
  });

  $("#diagnostic-next").addEventListener("click", () => {
    if (diagnostic.isLast) diagnostic.reset();
    else diagnostic.next();
    renderDiagnostic();
  });

  function applyReducedMotion(value) {
    reducedMotion = Boolean(value);
    apparatus.setReducedMotion(reducedMotion);
    sceneApi.setReducedMotion(reducedMotion);
    ar.setReducedMotion(reducedMotion);
    document.documentElement.classList.toggle("reduced-motion", reducedMotion);
    $("#motion-toggle").setAttribute("aria-pressed", String(reducedMotion));
    $("#motion-toggle").lastChild.textContent = reducedMotion ? " Animações reduzidas" : " Reduzir animações";
  }

  const overlay = $("#ar-overlay");
  const ar = createARExperience({
    renderer: sceneApi.renderer,
    scene: sceneApi.scene,
    apparatus,
    setXRFrameHandler: sceneApi.setXRFrameHandler,
    overlay,
    stepCount: steps.length,
    onStatus: (message) => { $("#scene-status").textContent = message; },
    onViewChange: ({ mode, stepIndex }) => {
      const guidedMode = mode === "guided";
      const step = steps[stepIndex] ?? steps[0];
      $("#ar-step-count").textContent = guidedMode ? `Etapa ${stepIndex + 1} de ${steps.length}` : "Visão geral";
      $("#ar-step-title").textContent = guidedMode ? step.title : "Montagem completa";
      $("#ar-step-description").textContent = guidedMode ? step.instruction : "Circuito completo de filtração por sucção.";
      $("[data-ar-action='previous']").disabled = !guidedMode || stepIndex === 0;
      $("[data-ar-action='next']").disabled = !guidedMode || stepIndex === steps.length - 1;
      $("[data-ar-action='guided']").hidden = guidedMode;
      $("[data-ar-action='complete']").hidden = !guidedMode;
    },
    onExit: () => { $("#scene-status").hidden = true; setMode("ar"); }
  });

  async function startAR(mode) {
    const started = await ar.start({ mode, stepIndex: guided.index });
    if (!started) $("#ar-support-message").textContent = "Este dispositivo não oferece WebXR imersivo. A experiência 3D permanece totalmente disponível.";
  }
  $$("[data-start-ar]").forEach((button) => button.addEventListener("click", () => startAR(button.dataset.startAr)));
  const arActions = {
    previous: () => ar.previousStep(),
    next: () => ar.nextStep(),
    guided: () => ar.resumeGuided(),
    complete: () => ar.showComplete(),
    restore: () => ar.restore(),
    reposition: () => ar.reposition(),
    exit: () => ar.exit()
  };
  $$("[data-ar-action]").forEach((button) => button.addEventListener("click", () => arActions[button.dataset.arAction]?.()));

  const quickLook = createQuickLookExperience({ stepCount: steps.length });
  if (quickLook.supported) {
    $("#quicklook-area").hidden = false;
    steps.forEach((step, stepIndex) => $("#quicklook-step-grid").append(quickLook.createStepLink({ stepIndex, title: step.title })));
  }
  const webXRSupported = await ar.checkSupport();
  $("#ar-support-message").textContent = webXRSupported
    ? "RA compatível: procure uma superfície horizontal bem iluminada."
    : "WebXR imersivo indisponível neste dispositivo; use a experiência 3D ou o Visualizador de RA no iPhone.";
  $("#webxr-options").hidden = !webXRSupported;

  $("#motion-toggle").addEventListener("click", () => applyReducedMotion(!reducedMotion));
  applyReducedMotion(reducedMotion);
  setMode("explore");
  $("#scene-status").hidden = true;
}

bootstrap().catch((error) => {
  console.error(error);
  const status = $("#scene-status");
  status.hidden = false;
  status.textContent = "Não foi possível iniciar a experiência. Recarregue a página ou use o guia científico.";
});
