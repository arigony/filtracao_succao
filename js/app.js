import { createApparatus } from "./apparatus.js";
import { createARExperience } from "./ar.js";
import { GuidedAssemblyController } from "./assembly.js";
import { createInteractions } from "./interactions.js";
import { DiagnosticController, FiltrationProcedureController } from "./procedure.js";
import { createLabelManager, createScene } from "./scene.js";
import { ARButton } from "../vendor/addons/webxr/ARButton.js";

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

function supportsWebGL() {
  try {
    const probe = document.createElement("canvas");
    const context = probe.getContext("webgl2", { failIfMajorPerformanceCaveat: true })
      || probe.getContext("webgl", { failIfMajorPerformanceCaveat: true });
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(context);
  } catch {
    return false;
  }
}

function createFallbackApparatus({ pieces, steps, operatingSteps, diagnosticErrors }) {
  let vacuumOn = false;
  let ventOpen = true;
  let paperWet = false;
  let procedureState = "assembly";
  const pieceById = new Map(pieces.map((piece) => [piece.id, piece]));
  const procedureTitles = new Map(operatingSteps.map((step) => [step.state, step.title]));
  const diagnosticById = new Map(diagnosticErrors.map((error) => [error.id, error]));
  const title = $("#fallback-title");
  const description = $("#fallback-description");

  function present(nextTitle, nextDescription) {
    title.textContent = nextTitle;
    description.textContent = nextDescription;
  }

  return {
    components: new Map(),
    get vacuumOn() { return vacuumOn; },
    get ventOpen() { return ventOpen; },
    get paperWet() { return paperWet; },
    get procedureState() { return procedureState; },
    setFullAssembly() { present("Montagem completa", "Kitassato → armadilha com respiro → aspirador de água."); },
    setExploreView(view) {
      const copy = {
        complete: ["Montagem completa", "Observe o circuito e selecione uma peça para ler sua função."],
        apparatus: ["Circuito de vácuo", "A mangueira espessa conecta o kitassato à armadilha e ao aspirador."],
        supplies: ["Materiais auxiliares", "Papel-filtro, solvente frio, bastão, suspensão e vidro de relógio."]
      };
      present(...(copy[view] ?? copy.complete));
    },
    setAssemblyStep(index) {
      if (index < 0) present("Bancada preparada", "Escolha o primeiro componente para iniciar a montagem.");
      else present(`Etapa ${index + 1} montada`, steps[index]?.title ?? "Montagem guiada");
    },
    setSelectedPiece(id) {
      const piece = pieceById.get(id);
      if (piece) present(piece.name, piece.function);
    },
    setVacuum(enabled) {
      vacuumOn = Boolean(enabled);
      if (vacuumOn) ventOpen = false;
      present(vacuumOn ? "Sucção ativa" : "Sucção desligada", vacuumOn
        ? "O ar segue do kitassato para a armadilha e então para o aspirador."
        : "O circuito não está sob sucção.");
    },
    setVent(open) {
      ventOpen = Boolean(open);
      if (ventOpen) vacuumOn = false;
      present(ventOpen ? "Sistema ventilado" : "Circuito fechado", ventOpen
        ? "A pressão foi igualada à atmosfera."
        : "Feche o respiro somente quando for necessário aplicar sucção.");
    },
    setPaperWet(wet) { paperWet = Boolean(wet); },
    setProcedureState(state) {
      procedureState = state;
      present(procedureTitles.get(state) ?? "Procedimento seguro", "Siga a instrução e confirme as condições no painel.");
    },
    setDiagnosticError(id) {
      const error = diagnosticById.get(id);
      if (error) present(error.title, error.observation);
    },
    setReducedMotion() {},
    update() {}
  };
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
  const hasWebGL = supportsWebGL();
  let sceneApi;
  let apparatus;
  let labels;

  if (hasWebGL) {
    sceneApi = createScene(canvas, sceneWrap);
    apparatus = createApparatus();
    sceneApi.scene.add(apparatus.root);
    sceneApi.addFrameCallback((delta, elapsed) => apparatus.update(delta, elapsed));
    labels = createLabelManager($("#scene-labels"), sceneApi.camera, apparatus);
    sceneApi.addFrameCallback(() => labels.update());
  } else {
    apparatus = createFallbackApparatus({ pieces, steps, operatingSteps, diagnosticErrors });
    sceneApi = { setView() {}, focus() {}, setReducedMotion() {}, setXRFrameHandler() {} };
    labels = { setVisible() {} };
    sceneWrap.classList.add("is-fallback");
    canvas.hidden = true;
    $("#scene-fallback").hidden = false;
    $("#webgl-notice").hidden = false;
  }
  let activeMode = "explore";
  let vacuumDemo = false;
  let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const completedGuidedSteps = new Set();

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
    if (!piece) return;
    apparatus.setSelectedPiece(id);
    $("#piece-name").textContent = piece.name;
    $("#piece-alternative").textContent = piece.alternativeName;
    $("#piece-function").textContent = piece.function;
    $("#piece-position").textContent = piece.correctPosition;
    $("#piece-error").textContent = piece.commonError;
    if (hasWebGL && object && focus && activeMode === "explore") {
      const target = object.getWorldPosition(new sceneApi.camera.position.constructor());
      sceneApi.focus(target, id === "aspirator" ? 4.8 : 4.1);
    }
  }

  if (hasWebGL) createInteractions({ canvas, camera: sceneApi.camera, apparatus, onSelect: (id) => selectPiece(id) });
  selectPiece("filter-flask", { focus: false });

  function assemblyGroupLabel(step) {
    return step.pieceIds.map((id) => pieceById.get(id)?.name ?? id).join(" + ");
  }

  function renderAssemblyOptions() {
    const options = $("#assembly-options");
    const isComplete = completedGuidedSteps.has(guided.index);
    const candidateIndexes = [guided.index, (guided.index + 3) % steps.length, (guided.index + 5) % steps.length]
      .sort((a, b) => ((a * 7 + guided.index * 3) % 11) - ((b * 7 + guided.index * 3) % 11));
    options.replaceChildren(...candidateIndexes.map((stepIndex) => {
      const button = document.createElement("button");
      const correct = stepIndex === guided.index;
      button.type = "button";
      button.className = `assembly-option${isComplete && correct ? " is-correct" : ""}`;
      button.textContent = assemblyGroupLabel(steps[stepIndex]);
      button.disabled = isComplete;
      button.addEventListener("click", () => {
        if (!correct) {
          button.classList.add("is-error");
          setFeedback($("#assembly-feedback"), "Esse componente pertence a outra etapa. Compare sua função com a instrução e tente novamente.", "error");
          return;
        }
        completedGuidedSteps.add(guided.index);
        renderGuided({ animate: true });
        setFeedback($("#assembly-feedback"), "Componente correto: ele foi encaixado na montagem.", "success");
      });
      return button;
    }));
  }

  function renderGuided({ animate = false } = {}) {
    const step = guided.current;
    const isComplete = completedGuidedSteps.has(guided.index);
    apparatus.setAssemblyStep(isComplete ? guided.index : guided.index - 1, { animate: animate && isComplete });
    $("#step-counter").textContent = `Etapa ${guided.index + 1} de ${steps.length}`;
    $("#progress-bar").style.width = `${guided.progress * 100}%`;
    $("#step-title").textContent = step.title;
    $("#step-instruction").textContent = step.instruction;
    $("#step-principle").textContent = step.principle;
    $("#previous-step").disabled = guided.isFirst;
    $("#next-step").disabled = !isComplete || guided.isLast;
    $("#next-step").textContent = guided.isLast && isComplete ? "Montagem concluída" : "Próxima etapa";
    const checks = $("#guided-checks");
    checks.hidden = !(guided.isLast && isComplete);
    $("#guided-check-list").replaceChildren(...(step.checks ?? []).map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    }));
    renderAssemblyOptions();
    if (!animate) setFeedback($("#assembly-feedback"));
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
    $("#diagnostic-panel").classList.remove("showing-result");
    $("#diagnostic-result").hidden = true;
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
    $("#diagnostic-next").textContent = diagnostic.isLast ? "Ver resultado" : "Próximo erro";
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

  function showDiagnosticResult() {
    const score = diagnostic.score;
    const incorrect = diagnostic.incorrectErrors;
    $("#diagnostic-panel").classList.add("showing-result");
    $("#diagnostic-result").hidden = false;
    $("#diagnostic-result-title").textContent = `${score} de ${diagnosticErrors.length} decisões seguras`;
    $("#diagnostic-result-copy").textContent = score === diagnosticErrors.length
      ? "Excelente: você identificou corretamente todas as barreiras críticas na primeira tentativa."
      : "Revise abaixo os pontos que merecem atenção antes de operar uma filtração por sucção.";
    const review = $("#diagnostic-review-list");
    review.replaceChildren(...(incorrect.length ? incorrect : diagnosticErrors).map((error) => {
      const item = document.createElement("li");
      if (incorrect.length) {
        const strong = document.createElement("strong");
        strong.textContent = error.title;
        const span = document.createElement("span");
        span.textContent = error.correction;
        item.append(strong, span);
      } else {
        item.textContent = error.title;
      }
      return item;
    }));
  }

  function setMode(mode) {
    activeMode = mode;
    $("#experience").dataset.activeMode = mode;
    $("#mobile-view-stage").textContent = mode === "guided" ? "Ver montagem 3D desta etapa ↓" : "Ver bancada 3D ↓";
    if (mode !== "explore" && vacuumDemo) {
      vacuumDemo = false;
      $("#vacuum-demo").textContent = "Mostrar o caminho do vácuo";
      $("#vacuum-demo").setAttribute("aria-expanded", "false");
      $("#vacuum-explanation").hidden = true;
    }
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
      completedGuidedSteps.clear();
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
  $("#mobile-view-stage").addEventListener("click", () => $(".stage-column").scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" }));
  $("#mobile-back-panel").addEventListener("click", () => $(`#${activeMode}-panel`).scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" }));
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
    $("#vacuum-demo").setAttribute("aria-expanded", String(vacuumDemo));
    $("#vacuum-explanation").hidden = !vacuumDemo;
    updateSafetyState();
  });
  $("#vacuum-demo").setAttribute("aria-controls", "vacuum-explanation");
  $("#vacuum-demo").setAttribute("aria-expanded", "false");
  $("#reset-view").addEventListener("click", () => sceneApi.setView("default"));
  $("#labels-toggle").addEventListener("click", (event) => {
    const visible = event.currentTarget.getAttribute("aria-pressed") !== "true";
    event.currentTarget.setAttribute("aria-pressed", String(visible));
    event.currentTarget.textContent = visible ? "Ocultar rótulos" : "Mostrar rótulos";
    labels.setVisible(visible);
  });

  $("#retry-3d").addEventListener("click", () => window.location.reload());
  const fullscreenButton = $("#fullscreen-toggle");
  if (!sceneWrap.requestFullscreen) fullscreenButton.hidden = true;
  fullscreenButton.addEventListener("click", async () => {
    if (document.fullscreenElement === sceneWrap) await document.exitFullscreen();
    else await sceneWrap.requestFullscreen();
  });
  document.addEventListener("fullscreenchange", () => {
    const active = document.fullscreenElement === sceneWrap;
    fullscreenButton.setAttribute("aria-pressed", String(active));
    fullscreenButton.textContent = active ? "Sair da tela cheia" : "Tela cheia";
  });

  $("#previous-step").addEventListener("click", () => { guided.previous(); renderGuided(); });
  $("#next-step").addEventListener("click", () => {
    if (!completedGuidedSteps.has(guided.index) || guided.isLast) return;
    guided.next();
    renderGuided();
  });

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
    if (diagnostic.isLast && diagnostic.isComplete) {
      showDiagnosticResult();
      return;
    }
    diagnostic.next();
    renderDiagnostic();
  });
  $("#diagnostic-restart").addEventListener("click", () => {
    diagnostic.reset();
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
  const ar = hasWebGL ? createARExperience({
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
    }) : {
      async start() { return false; },
      async exit() {},
      previousStep() {},
      nextStep() {},
      resumeGuided() {},
      showComplete() {},
      restore() {},
      reposition() {},
      setReducedMotion() {},
      get lastError() { return null; }
    };

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

  if (hasWebGL) {
    const arButton = ARButton.createButton(sceneApi.renderer, {
      requiredFeatures: ["hit-test"],
      optionalFeatures: ["dom-overlay"],
      domOverlay: { root: overlay }
    });
    const localizeARButton = () => {
      const labels = {
        "START AR": "ABRIR EM REALIDADE AUMENTADA",
        "STOP AR": "SAIR DA REALIDADE AUMENTADA",
        "AR NOT SUPPORTED": "RA NÃO COMPATÍVEL",
        "AR NOT ALLOWED": "RA NÃO AUTORIZADA",
        "WEBXR NOT AVAILABLE": "WEBXR NÃO DISPONÍVEL",
        "WEBXR NEEDS HTTPS": "A RA PRECISA DE HTTPS"
      };
      const current = arButton.textContent.trim();
      const label = labels[current];
      if (label) arButton.textContent = label;
      if (current === "START AR") {
        $("#ar-support-message").textContent = "RA compatível: mova o celular lentamente e toque na superfície para posicionar a montagem.";
      }
      if (["AR NOT SUPPORTED", "AR NOT ALLOWED", "WEBXR NOT AVAILABLE"].includes(current)) {
        $("#ar-support-message").textContent = "Este aparelho ou navegador não oferece WebXR imersivo. A experiência 3D continua disponível.";
      }
    };
    new MutationObserver(localizeARButton).observe(arButton, { childList: true, subtree: true, characterData: true });
    localizeARButton();
    $("#webxr-options").append(arButton);
    sceneApi.renderer.xr.addEventListener("sessionstart", async () => {
      const started = await ar.start({ mode: "complete", stepIndex: guided.index });
      if (!started) {
        $("#ar-support-message").textContent = "Não foi possível preparar a superfície de RA. Encerre a sessão e tente novamente.";
        await sceneApi.renderer.xr.getSession()?.end();
      }
    });
  } else {
    $("#webxr-options").hidden = true;
    $("#ar-support-message").textContent = "WebGL e WebXR não estão disponíveis neste navegador. Continue pelo esquema visual.";
  }

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
