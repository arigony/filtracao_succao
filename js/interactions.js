import * as THREE from "../vendor/three.module.js";

export function createInteractions({ canvas, camera, apparatus, onSelect }) {
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let pointerStart = null;

  function findPiece(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(apparatus.selectableObjects, true);
    for (const hit of hits) {
      const piece = apparatus.getPieceFromObject(hit.object);
      if (piece?.visible) return piece;
    }
    return null;
  }

  function onPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    pointerStart = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event) {
    const moved = pointerStart ? Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) : Infinity;
    if (moved < 7) {
      const piece = findPiece(event.clientX, event.clientY);
      if (piece) onSelect?.(piece.userData.pieceId);
    }
    pointerStart = null;
  }

  function onKeyDown(event) {
    if ((event.key !== "Enter" && event.key !== " ") || document.activeElement !== canvas) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const piece = findPiece(rect.left + rect.width / 2, rect.top + rect.height / 2);
    if (piece) onSelect?.(piece.userData.pieceId);
  }

  canvas.tabIndex = 0;
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", () => { pointerStart = null; });
  canvas.addEventListener("keydown", onKeyDown);

  return {
    dispose() {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("keydown", onKeyDown);
    }
  };
}
