const MODEL_PATH = "../assets/models/filtracao-completa.glb";
const SCENE_VIEWER_HOST = "arvr.google.com/scene-viewer/1.0";
const GOOGLE_APP_PACKAGE = "com.google.android.googlequicksearchbox";

export function isAndroidDevice(userAgent = globalThis.navigator?.userAgent ?? "") {
  return /Android/i.test(userAgent);
}

export function createAndroidSceneViewerExperience({
  fallbackURL = globalThis.location?.href ?? "https://example.invalid/",
  modelURL = new URL(MODEL_PATH, import.meta.url).href
} = {}) {
  const supported = isAndroidDevice();

  function intentURL() {
    const parameters = new URLSearchParams({
      file: modelURL,
      mode: "ar_preferred",
      title: "Filtração por sucção",
      resizable: "true"
    });
    const fallback = encodeURIComponent(new URL(fallbackURL).href);
    return `intent://${SCENE_VIEWER_HOST}?${parameters.toString()}#Intent;scheme=https;package=${GOOGLE_APP_PACKAGE};action=android.intent.action.VIEW;S.browser_fallback_url=${fallback};end;`;
  }

  function configureLink(link) {
    link.href = intentURL();
    link.setAttribute("aria-label", "Abrir a montagem completa em realidade aumentada no Android");
    return link;
  }

  return { supported, modelURL, intentURL, configureLink };
}
