export const AR_SCALE_LIMITS = Object.freeze({ min: 0.055, max: 0.3, initial: 0.1 });
export const AR_TARGET_HEIGHT = 0.48;

export function clampARScale(value, limits = AR_SCALE_LIMITS) {
  return Math.max(limits.min, Math.min(limits.max, value));
}

export function scaleFromPinch(currentScale, currentDistance, previousDistance, limits = AR_SCALE_LIMITS) {
  if (!Number.isFinite(previousDistance) || previousDistance <= 0 || !Number.isFinite(currentDistance)) return currentScale;
  return clampARScale(currentScale * (currentDistance / previousDistance), limits);
}

export function initialScaleForHeight(height, targetHeight = AR_TARGET_HEIGHT, limits = AR_SCALE_LIMITS) {
  if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(targetHeight) || targetHeight <= 0) return limits.initial;
  return clampARScale(targetHeight / height, limits);
}

export function supportOffsetForMinY(minY, scale, clearance = 0.004) {
  if (!Number.isFinite(minY) || !Number.isFinite(scale) || scale <= 0) return 0;
  return -minY + Math.max(0, clearance) / scale;
}

export function rotationFacingCamera(surfacePosition, cameraPosition, fallback = 0) {
  const deltaX = cameraPosition.x - surfacePosition.x;
  const deltaZ = cameraPosition.z - surfacePosition.z;
  return Math.hypot(deltaX, deltaZ) > 0.0001 ? Math.atan2(deltaX, deltaZ) : fallback;
}

export function rotationFromDrag(deltaX, sensitivity = 0.012) {
  return Number.isFinite(deltaX) ? deltaX * sensitivity : 0;
}

export function pointerDistance(first, second) {
  return Math.hypot(second.x - first.x, second.y - first.y);
}
