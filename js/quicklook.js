const PREVIEW_PIXEL = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const MODEL_DIRECTORY = "../assets/models/";

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function quickLookRelSupported() {
  const anchor = document.createElement("a");
  return Boolean(anchor.relList?.supports?.("ar"));
}

function normalizeStepIndex(index, stepCount) {
  return Math.max(0, Math.min(Number(index) || 0, stepCount - 1));
}

export function createQuickLookExperience({ stepCount = 8 } = {}) {
  const normalizedStepCount = Math.max(1, Number(stepCount) || 8);
  const supported = isIOSDevice();
  const relSupported = quickLookRelSupported();

  function modelURL(stepIndex) {
    const safeIndex = normalizeStepIndex(stepIndex, normalizedStepCount);
    return new URL(`${MODEL_DIRECTORY}filtracao-step-${safeIndex + 1}.usdz`, import.meta.url).href;
  }

  function createStepLink({ stepIndex = 0, title = "Etapa da montagem" } = {}) {
    const safeIndex = normalizeStepIndex(stepIndex, normalizedStepCount);
    const link = document.createElement("a");
    link.className = "quicklook-step-button";
    link.href = modelURL(safeIndex);
    link.dataset.step = String(safeIndex + 1).padStart(2, "0");
    link.dataset.title = title;
    link.setAttribute("aria-label", `Abrir em realidade aumentada: etapa ${safeIndex + 1}, ${title}`);
    if (relSupported) link.rel = "ar";

    // O AR Quick Look exige que o link contenha somente uma imagem ou picture.
    const image = document.createElement("img");
    image.alt = "";
    image.src = PREVIEW_PIXEL;
    link.append(image);
    return link;
  }

  return {
    supported,
    relSupported,
    modelURL,
    createStepLink
  };
}
