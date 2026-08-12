export const GUIDED_GROUPS = Object.freeze([
  Object.freeze(["stand"]),
  Object.freeze(["filter-flask", "clamp"]),
  Object.freeze(["vacuum-hose-in", "vacuum-trap", "vent-clamp"]),
  Object.freeze(["vacuum-hose-out", "aspirator"]),
  Object.freeze(["adapter"]),
  Object.freeze(["buchner"]),
  Object.freeze(["filter-paper"]),
  Object.freeze(["cold-solvent"])
]);

export class GuidedAssemblyController {
  constructor(steps) {
    if (!Array.isArray(steps) || steps.length !== GUIDED_GROUPS.length) {
      throw new Error(`A montagem guiada precisa ter exatamente ${GUIDED_GROUPS.length} etapas.`);
    }
    this.steps = [...steps].sort((a, b) => a.id - b.id);
    this.index = 0;
  }

  get current() { return this.steps[this.index]; }
  get progress() { return (this.index + 1) / this.steps.length; }
  get isFirst() { return this.index === 0; }
  get isLast() { return this.index === this.steps.length - 1; }

  next() {
    this.index = Math.min(this.index + 1, this.steps.length - 1);
    return this.current;
  }

  previous() {
    this.index = Math.max(this.index - 1, 0);
    return this.current;
  }

  goTo(index) {
    this.index = Math.max(0, Math.min(index, this.steps.length - 1));
    return this.current;
  }

  reset() { this.index = 0; }
}
