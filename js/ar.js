import * as THREE from "../vendor/three.module.js";
import {
  AR_SCALE_LIMITS,
  initialScaleForHeight,
  pointerDistance,
  rotationFacingCamera,
  rotationFromDrag,
  scaleFromPinch,
  supportOffsetForMinY
} from "./gestures.js";

const SURFACE_CLEARANCE = 0.004;
const PREVIEW_OPACITY = 0.38;
const STABLE_HIT_FRAMES = 8;
const FIND_SURFACE_MESSAGE = "Mova o celular lentamente para encontrar uma superfície.";
const PLACE_MESSAGE = "Toque para posicionar a montagem.";
const GESTURE_MESSAGE = "Arraste com um dedo para girar · faça pinça para redimensionar.";

function isVisibleInside(object, root) {
  let current = object;
  while (current && current !== root) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return root.visible;
}

export function measureVisibleBounds(root, target = new THREE.Box3()) {
  target.makeEmpty();
  root.updateWorldMatrix(true, true);
  const inverseRoot = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const relativeMatrix = new THREE.Matrix4();
  const objectBox = new THREE.Box3();
  root.traverse((object) => {
    if (!object.isMesh || !object.geometry || !isVisibleInside(object, root)) return;
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    if (!object.geometry.boundingBox) return;
    relativeMatrix.multiplyMatrices(inverseRoot, object.matrixWorld);
    objectBox.copy(object.geometry.boundingBox).applyMatrix4(relativeMatrix);
    target.union(objectBox);
  });
  return target;
}

export function createARExperience({
  renderer,
  scene,
  apparatus,
  setXRFrameHandler,
  overlay,
  stepCount = 8,
  onStatus,
  onViewChange,
  onExit
}) {
  const anchor = new THREE.Group();
  anchor.name = "ar-anchor";
  scene.add(anchor);
  anchor.add(apparatus.root);

  const contactShadow = new THREE.Mesh(
    new THREE.CircleGeometry(1, 48),
    new THREE.ShadowMaterial({ color: 0x071713, opacity: 0.16, transparent: true, depthWrite: false })
  );
  contactShadow.name = "ar-contact-shadow";
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.002;
  contactShadow.renderOrder = -1;
  contactShadow.visible = false;
  anchor.add(contactShadow);

  const reticleMaterial = new THREE.MeshBasicMaterial({
    color: 0x35bcd7,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.62,
    depthTest: false,
    depthWrite: false
  });
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.055, 0.072, 40).rotateX(-Math.PI / 2),
    reticleMaterial
  );
  reticle.name = "ar-reticle";
  reticle.matrixAutoUpdate = false;
  reticle.renderOrder = 30;
  reticle.visible = false;
  scene.add(reticle);

  const instruction = overlay.querySelector("#ar-instruction");
  const pointers = new Map();
  const previewMaterials = new Map();
  const visibleBounds = new THREE.Box3();
  const boundsSize = new THREE.Vector3();
  const surfacePosition = new THREE.Vector3();
  const surfaceQuaternion = new THREE.Quaternion();
  const ignoredScale = new THREE.Vector3();
  const lastHitPosition = new THREE.Vector3(Number.POSITIVE_INFINITY, 0, 0);
  const cameraPosition = new THREE.Vector3();
  const localCameraPosition = new THREE.Vector3();

  let session = null;
  let supportPromise = null;
  let lastError = null;
  let viewerSpace = null;
  let hitTestSource = null;
  let placed = false;
  let previewActive = false;
  let reducedMotion = false;
  let scale = AR_SCALE_LIMITS.initial;
  let initialScale = AR_SCALE_LIMITS.initial;
  let initialRotationY = 0;
  let contentMinY = 0;
  let guidedIndex = 0;
  let lastGuidedIndex = 0;
  let viewMode = "complete";
  let lastPinchDistance = 0;
  let lastGestureAt = 0;
  let stableHitFrames = 0;
  let instructionTimer = null;
  let currentInstruction = "";

  function checkSupport() {
    if (!window.isSecureContext || !navigator.xr) return Promise.resolve(false);
    if (!supportPromise) {
      supportPromise = navigator.xr.isSessionSupported("immersive-ar").catch(() => false);
    }
    return supportPromise;
  }

  function setInstruction(message, { duration = 0 } = {}) {
    if (instructionTimer) clearTimeout(instructionTimer);
    instructionTimer = null;
    if (message !== currentInstruction) {
      currentInstruction = message;
      instruction.textContent = message;
      onStatus?.(message);
    }
    instruction.classList.remove("is-hidden");
    if (duration > 0) {
      instructionTimer = setTimeout(() => {
        instruction.classList.add("is-hidden");
        instructionTimer = null;
      }, duration);
    }
  }

  function setPreviewAppearance(enabled) {
    if (enabled === previewActive) return;
    previewActive = enabled;
    if (!enabled) {
      previewMaterials.forEach((state, material) => {
        material.color?.copy(state.color);
        material.emissive?.copy(state.emissive);
        material.emissiveIntensity = state.emissiveIntensity;
        material.opacity = state.opacity;
        material.transparent = state.transparent;
        material.depthWrite = state.depthWrite;
        material.needsUpdate = true;
      });
      previewMaterials.clear();
      return;
    }
    apparatus.root.traverse((object) => {
      if (!object.isMesh) return;
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      objectMaterials.forEach((material) => {
        if (!material || previewMaterials.has(material)) return;
        previewMaterials.set(material, {
          color: material.color?.clone(),
          emissive: material.emissive?.clone(),
          emissiveIntensity: material.emissiveIntensity,
          opacity: material.opacity,
          transparent: material.transparent,
          depthWrite: material.depthWrite
        });
        material.color?.lerp(new THREE.Color(0x55cbb4), 0.34);
        if (material.emissive) {
          material.emissive.lerp(new THREE.Color(0x0e755f), 0.42);
          material.emissiveIntensity = Math.max(material.emissiveIntensity, 0.18);
        }
        material.opacity = Math.min(material.opacity, PREVIEW_OPACITY);
        material.transparent = true;
        material.depthWrite = false;
        material.needsUpdate = true;
      });
    });
  }

  function refreshVisibleBounds() {
    apparatus.root.position.set(0, 0, 0);
    measureVisibleBounds(apparatus.root, visibleBounds);
    if (visibleBounds.isEmpty()) {
      contentMinY = 0;
      contactShadow.scale.set(1, 1, 1);
      return visibleBounds;
    }
    visibleBounds.getSize(boundsSize);
    contentMinY = visibleBounds.min.y;
    contactShadow.scale.set(Math.max(0.55, boundsSize.x * 0.48), Math.max(0.45, boundsSize.z * 0.58), 1);
    return visibleBounds;
  }

  function syncSurfaceSupport() {
    apparatus.root.position.set(0, supportOffsetForMinY(contentMinY, scale, SURFACE_CLEARANCE), 0);
  }

  function applyGuidedStep(index, { animate = false } = {}) {
    const previousIndex = guidedIndex;
    guidedIndex = Math.max(0, Math.min(index, stepCount - 1));
    lastGuidedIndex = guidedIndex;
    viewMode = "guided";
    setPreviewAppearance(false);
    apparatus.setAssemblyStep(guidedIndex, { animate: animate && guidedIndex > previousIndex, includeBench: false });
    apparatus.bench.visible = false;
    refreshVisibleBounds();
    syncSurfaceSupport();
    if (!placed) setPreviewAppearance(true);
    onViewChange?.({ mode: viewMode, stepIndex: guidedIndex });
    return guidedIndex;
  }

  function showComplete() {
    if (viewMode === "guided") lastGuidedIndex = guidedIndex;
    viewMode = "complete";
    setPreviewAppearance(false);
    apparatus.setFullAssembly();
    apparatus.bench.visible = false;
    refreshVisibleBounds();
    syncSurfaceSupport();
    if (!placed) setPreviewAppearance(true);
    onViewChange?.({ mode: viewMode, stepIndex: guidedIndex });
    return viewMode;
  }

  function resumeGuided() {
    return applyGuidedStep(lastGuidedIndex, { animate: false });
  }

  function calculateInitialScale() {
    setPreviewAppearance(false);
    apparatus.setFullAssembly();
    apparatus.bench.visible = false;
    refreshVisibleBounds();
    visibleBounds.getSize(boundsSize);
    initialScale = initialScaleForHeight(boundsSize.y);
    scale = initialScale;
  }

  function updatePreviewFromPose(pose, time) {
    reticle.matrix.fromArray(pose.transform.matrix);
    reticle.matrix.decompose(surfacePosition, surfaceQuaternion, ignoredScale);
    const stable = surfacePosition.distanceTo(lastHitPosition) < 0.015;
    stableHitFrames = stable ? Math.min(STABLE_HIT_FRAMES, stableHitFrames + 1) : 0;
    lastHitPosition.copy(surfacePosition);
    reticleMaterial.color.setHex(stableHitFrames >= STABLE_HIT_FRAMES ? 0x32d39b : 0x35bcd7);
    reticleMaterial.opacity = reducedMotion ? 0.72 : 0.64 + Math.sin(time * 0.004) * 0.1;
    reticle.visible = true;
    anchor.position.copy(surfacePosition);
    anchor.quaternion.copy(surfaceQuaternion);
    anchor.scale.setScalar(scale);
    syncSurfaceSupport();
    anchor.visible = true;
    apparatus.root.visible = true;
    contactShadow.visible = false;
    setPreviewAppearance(true);
    setInstruction(PLACE_MESSAGE);
  }

  function faceUser() {
    const xrCamera = renderer.xr.getCamera();
    xrCamera.getWorldPosition(cameraPosition);
    anchor.updateWorldMatrix(true, false);
    localCameraPosition.copy(cameraPosition);
    anchor.worldToLocal(localCameraPosition);
    initialRotationY = rotationFacingCamera(new THREE.Vector3(), localCameraPosition, 0);
    apparatus.root.rotation.set(0, initialRotationY, 0);
  }

  function placeAtReticle() {
    if (!reticle.visible) return false;
    setPreviewAppearance(false);
    anchor.scale.setScalar(scale);
    syncSurfaceSupport();
    faceUser();
    anchor.visible = true;
    apparatus.root.visible = true;
    contactShadow.visible = true;
    placed = true;
    reticle.visible = false;
    setInstruction(GESTURE_MESSAGE, { duration: 2500 });
    return true;
  }

  function onSelect() {
    if (!placed && performance.now() - lastGestureAt > 350) placeAtReticle();
  }

  function onXRFrame(time, frame) {
    if (!session || placed || !hitTestSource) return;
    const referenceSpace = renderer.xr.getReferenceSpace();
    const results = frame.getHitTestResults(hitTestSource);
    if (results.length) {
      const pose = results[0].getPose(referenceSpace);
      if (pose) updatePreviewFromPose(pose, time);
      return;
    }
    reticle.visible = false;
    anchor.visible = false;
    stableHitFrames = 0;
    lastHitPosition.set(Number.POSITIVE_INFINITY, 0, 0);
    setInstruction(FIND_SURFACE_MESSAGE);
  }

  function isInterfaceTarget(target) {
    return typeof Element !== "undefined" && target instanceof Element && Boolean(target.closest("button, [data-ar-interface]"));
  }

  function onPointerDown(event) {
    if (!session || !placed || isInterfaceTarget(event.target)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY, moved: false });
    try { overlay.setPointerCapture?.(event.pointerId); } catch { /* captura indisponível no overlay */ }
    if (pointers.size === 2) lastPinchDistance = pointerDistance(...pointers.values());
    event.preventDefault();
  }

  function onPointerMove(event) {
    const previous = pointers.get(event.pointerId);
    if (!previous || !placed) return;
    const deltaX = event.clientX - previous.x;
    const deltaY = event.clientY - previous.y;
    const current = { x: event.clientX, y: event.clientY, moved: previous.moved || Math.hypot(deltaX, deltaY) > 2 };
    pointers.set(event.pointerId, current);

    if (pointers.size === 1) {
      apparatus.root.rotation.y += rotationFromDrag(deltaX);
    } else if (pointers.size === 2) {
      const distance = pointerDistance(...pointers.values());
      scale = scaleFromPinch(scale, distance, lastPinchDistance);
      anchor.scale.setScalar(scale);
      syncSurfaceSupport();
      lastPinchDistance = distance;
    }
    if (current.moved) lastGestureAt = performance.now();
    event.preventDefault();
  }

  function onPointerEnd(event) {
    const pointer = pointers.get(event.pointerId);
    if (pointer?.moved) lastGestureAt = performance.now();
    pointers.delete(event.pointerId);
    try {
      if (!overlay.hasPointerCapture || overlay.hasPointerCapture(event.pointerId)) overlay.releasePointerCapture?.(event.pointerId);
    } catch { /* ponteiro já liberado */ }
    if (pointers.size < 2) lastPinchDistance = 0;
  }

  overlay.addEventListener("beforexrselect", (event) => {
    if (isInterfaceTarget(event.target)) event.preventDefault();
  });
  overlay.addEventListener("pointerdown", onPointerDown);
  overlay.addEventListener("pointermove", onPointerMove);
  overlay.addEventListener("pointerup", onPointerEnd);
  overlay.addEventListener("pointercancel", onPointerEnd);
  overlay.addEventListener("lostpointercapture", onPointerEnd);

  async function start({ mode = "complete", stepIndex = 0 } = {}) {
    if (session) return true;
    if (!window.isSecureContext || !navigator.xr) {
      lastError = new Error("WebXR indisponível neste navegador.");
      lastError.name = "NotSupportedError";
      return false;
    }
    lastError = null;
    try {
      // requestSession precisa ser chamado diretamente durante o toque do usuário.
      session = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["hit-test"],
        optionalFeatures: ["dom-overlay", "local-floor"],
        domOverlay: { root: overlay }
      });
      session.addEventListener("end", onSessionEnd, { once: true });
      session.addEventListener("select", onSelect);
      viewerSpace = await session.requestReferenceSpace("viewer");
      hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
      await renderer.xr.setSession(session);
      setXRFrameHandler(onXRFrame);

      placed = false;
      pointers.clear();
      stableHitFrames = 0;
      lastHitPosition.set(Number.POSITIVE_INFINITY, 0, 0);
      calculateInitialScale();
      if (mode === "guided") {
        guidedIndex = Math.max(0, Math.min(stepIndex, stepCount - 1));
        lastGuidedIndex = guidedIndex;
        applyGuidedStep(guidedIndex, { animate: false });
      } else {
        showComplete();
      }
      anchor.scale.setScalar(scale);
      syncSurfaceSupport();
      anchor.visible = false;
      contactShadow.visible = false;
      reticle.visible = false;
      overlay.hidden = false;
      document.body.classList.add("xr-active");
      setInstruction(FIND_SURFACE_MESSAGE);
      return true;
    } catch (error) {
      lastError = error;
      if (session) {
        try { await session.end(); } catch { onSessionEnd(); }
      }
      return false;
    }
  }

  async function exit() {
    if (session) await session.end();
  }

  function onSessionEnd() {
    hitTestSource?.cancel?.();
    if (instructionTimer) clearTimeout(instructionTimer);
    instructionTimer = null;
    setPreviewAppearance(false);
    session = null;
    viewerSpace = null;
    hitTestSource = null;
    placed = false;
    pointers.clear();
    lastPinchDistance = 0;
    reticle.visible = false;
    contactShadow.visible = false;
    overlay.hidden = true;
    instruction.classList.remove("is-hidden");
    document.body.classList.remove("xr-active");
    setXRFrameHandler(null);
    anchor.position.set(0, 0, 0);
    anchor.rotation.set(0, 0, 0);
    anchor.scale.setScalar(1);
    anchor.visible = true;
    apparatus.root.position.set(0, 0, 0);
    apparatus.root.rotation.set(0, 0, 0);
    apparatus.root.visible = true;
    apparatus.setFullAssembly();
    onStatus?.("Sessão de realidade aumentada encerrada.");
    onExit?.();
  }

  function reposition() {
    if (!session) return;
    placed = false;
    pointers.clear();
    lastPinchDistance = 0;
    stableHitFrames = 0;
    anchor.visible = false;
    contactShadow.visible = false;
    reticle.visible = false;
    setPreviewAppearance(true);
    setInstruction(FIND_SURFACE_MESSAGE);
  }

  function restore() {
    if (!session || !placed) return;
    scale = initialScale;
    anchor.scale.setScalar(scale);
    apparatus.root.rotation.set(0, initialRotationY, 0);
    syncSurfaceSupport();
    setInstruction("Escala e orientação restauradas.", { duration: 1500 });
  }

  function setGuidedStep(index, options = {}) {
    return applyGuidedStep(index, options);
  }

  return {
    checkSupport,
    start,
    exit,
    reposition,
    restore,
    showComplete,
    resumeGuided,
    setGuidedStep,
    previousStep() { return setGuidedStep(guidedIndex - 1, { animate: false }); },
    nextStep() { return setGuidedStep(guidedIndex + 1, { animate: true }); },
    setReducedMotion(value) { reducedMotion = Boolean(value); },
    get active() { return Boolean(session); },
    get isPlaced() { return placed; },
    get guidedIndex() { return guidedIndex; },
    get mode() { return viewMode; },
    get scale() { return scale; },
    get initialScale() { return initialScale; },
    get lastError() { return lastError; }
  };
}
