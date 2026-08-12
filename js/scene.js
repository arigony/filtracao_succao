import * as THREE from "../vendor/three.module.js";
import { OrbitControls } from "../vendor/addons/controls/OrbitControls.js";

const CAMERA_VIEWS = {
  default: { position: [5.15, 2.85, 6.1], target: [0, 0.25, 0] },
  glassware: { position: [4.65, 2.1, 5.8], target: [0, 0.65, 0] },
  front: { position: [0, 1.2, 7.4], target: [0, 0.2, 0] },
  side: { position: [7.2, 1.2, 0.05], target: [0, 0.2, 0] },
  top: { position: [0.01, 7.8, 0.01], target: [0, -0.25, 0] }
};

export function createScene(canvas, container) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xe7eeeb, 10, 18);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 60);
  camera.position.fromArray(CAMERA_VIEWS.default.position);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0xffffff, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.xr.enabled = true;

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.target.fromArray(CAMERA_VIEWS.default.target);
  controls.minDistance = 3.4;
  controls.maxDistance = 12;
  controls.minPolarAngle = 0.12;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.screenSpacePanning = false;
  controls.panSpeed = 0.5;
  controls.touches.ONE = THREE.TOUCH.ROTATE;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
  controls.update();

  scene.add(new THREE.HemisphereLight(0xf7fffc, 0x6f817b, 2.25));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(4, 7, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1536, 1536);
  keyLight.shadow.camera.left = -5;
  keyLight.shadow.camera.right = 5;
  keyLight.shadow.camera.top = 5;
  keyLight.shadow.camera.bottom = -5;
  keyLight.shadow.bias = -0.00025;
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xb9e0d4, 1.4);
  fillLight.position.set(-5, 3, -3);
  scene.add(fillLight);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(8, 64),
    new THREE.ShadowMaterial({ color: 0x49645b, opacity: 0.09 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -3.08;
  floor.receiveShadow = true;
  scene.add(floor);

  const frameCallbacks = new Set();
  const clock = new THREE.Clock();
  let cameraAnimation = null;
  let xrFrameHandler = null;
  let reducedMotion = false;

  function resize() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    const pixelRatio = Math.min(window.devicePixelRatio || 1, width < 600 ? 1.5 : 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  function animateCamera(position, target, duration = 0.55) {
    if (reducedMotion) {
      camera.position.copy(position);
      controls.target.copy(target);
      controls.update();
      return;
    }
    cameraAnimation = {
      startPosition: camera.position.clone(),
      startTarget: controls.target.clone(),
      endPosition: position.clone(),
      endTarget: target.clone(),
      elapsed: 0,
      duration
    };
  }

  function setView(name = "default") {
    const view = CAMERA_VIEWS[name] ?? CAMERA_VIEWS.default;
    animateCamera(new THREE.Vector3(...view.position), new THREE.Vector3(...view.target));
  }

  function focus(target, distance = 4.1) {
    const direction = camera.position.clone().sub(controls.target).normalize();
    animateCamera(target.clone().add(direction.multiplyScalar(distance)), target);
  }

  renderer.setAnimationLoop((time, frame) => {
    const delta = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;
    if (!renderer.xr.isPresenting) controls.update();
    if (cameraAnimation) {
      cameraAnimation.elapsed += delta;
      const progress = Math.min(1, cameraAnimation.elapsed / cameraAnimation.duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      camera.position.lerpVectors(cameraAnimation.startPosition, cameraAnimation.endPosition, eased);
      controls.target.lerpVectors(cameraAnimation.startTarget, cameraAnimation.endTarget, eased);
      if (progress >= 1) cameraAnimation = null;
    }
    if (frame && xrFrameHandler) xrFrameHandler(time, frame);
    frameCallbacks.forEach((callback) => callback(delta, elapsed));
    renderer.render(scene, camera);
  });

  return {
    scene,
    camera,
    renderer,
    controls,
    floor,
    setView,
    focus,
    addFrameCallback(callback) { frameCallbacks.add(callback); return () => frameCallbacks.delete(callback); },
    setXRFrameHandler(handler) { xrFrameHandler = handler; },
    setReducedMotion(value) { reducedMotion = Boolean(value); },
    dispose() {
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      controls.dispose();
      renderer.dispose();
    }
  };
}

export function createLabelManager(layer, camera, apparatus) {
  const entries = new Map();
  let visible = true;
  const projected = new THREE.Vector3();
  const world = new THREE.Vector3();

  function syncEntries() {
    apparatus.getLabelAnchors().forEach((anchor) => {
      if (entries.has(anchor.id)) return;
      const element = document.createElement("span");
      element.className = "scene-label";
      element.textContent = anchor.name;
      layer.append(element);
      entries.set(anchor.id, { element, anchor });
    });
  }

  function update() {
    if (!visible) return;
    syncEntries();
    const width = layer.clientWidth;
    const height = layer.clientHeight;
    entries.forEach(({ element, anchor }) => {
      if (!anchor.object.visible) {
        element.hidden = true;
        return;
      }
      anchor.object.getWorldPosition(world);
      world.add(anchor.offset);
      projected.copy(world).project(camera);
      const isVisible = projected.z > -1 && projected.z < 1;
      element.hidden = !isVisible;
      if (!isVisible) return;
      element.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
      element.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
    });
  }

  function setVisible(value) {
    visible = Boolean(value);
    layer.hidden = !visible;
    if (visible) syncEntries();
  }

  syncEntries();
  return { update, setVisible, get visible() { return visible; } };
}
