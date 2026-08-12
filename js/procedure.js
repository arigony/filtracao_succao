export const PROCEDURE_STATES = Object.freeze([
  "sealed",
  "transfer",
  "vessel-rinse",
  "cake-rinse",
  "suction-dry",
  "complete"
]);

export class FiltrationProcedureController {
  constructor(steps) {
    if (!Array.isArray(steps) || steps.length !== PROCEDURE_STATES.length) {
      throw new Error(`O procedimento precisa ter exatamente ${PROCEDURE_STATES.length} fases.`);
    }
    this.steps = [...steps].sort((a, b) => a.id - b.id);
    this.index = 0;
    this.assemblyValidated = false;
    this.paperWetted = false;
    this.ventOpen = true;
    this.vacuumOn = false;
  }

  get current() { return this.steps[this.index]; }
  get progress() { return (this.index + 1) / this.steps.length; }
  get isFirst() { return this.index === 0; }
  get isLast() { return this.index === this.steps.length - 1; }
  get canTransfer() { return this.assemblyValidated && this.paperWetted && this.vacuumOn && !this.ventOpen; }

  validateAssembly() {
    this.assemblyValidated = true;
    return this.assemblyValidated;
  }

  wetPaper() {
    if (!this.assemblyValidated) return false;
    this.ventOpen = false;
    this.vacuumOn = true;
    this.paperWetted = true;
    return true;
  }

  advance() {
    if (this.index === 0 && !this.canTransfer) {
      return { ok: false, message: "Antes da mistura: valide a montagem, aplique sucção e molhe o papel com solvente frio compatível." };
    }
    if (this.index === 3 && !this.ventOpen) {
      return { ok: false, message: "Abra o respiro e desfaça o vácuo antes de adicionar solvente à torta." };
    }
    if (this.index === 4 && (this.ventOpen || !this.vacuumOn)) {
      return { ok: false, message: "Feche o respiro e reaplique a sucção para secar a torta." };
    }
    if (this.index === 5 && !this.ventOpen) {
      return { ok: false, message: "Abra o sistema para a atmosfera antes de desligar o aspirador." };
    }
    this.index = Math.min(this.index + 1, this.steps.length - 1);
    return { ok: true, step: this.current };
  }

  previous() {
    this.index = Math.max(0, this.index - 1);
    return this.current;
  }

  setVent(open) {
    this.ventOpen = Boolean(open);
    if (this.ventOpen) this.vacuumOn = false;
    return this.ventOpen;
  }

  setVacuum(on) {
    if (on) this.ventOpen = false;
    this.vacuumOn = Boolean(on);
    return this.vacuumOn;
  }

  reset() {
    this.index = 0;
    this.assemblyValidated = false;
    this.paperWetted = false;
    this.ventOpen = true;
    this.vacuumOn = false;
  }
}

export class DiagnosticController {
  constructor(errors) {
    if (!Array.isArray(errors) || errors.length !== 5) {
      throw new Error("O diagnóstico precisa apresentar exatamente cinco erros.");
    }
    this.errors = errors;
    this.index = 0;
    this.answered = new Map();
  }

  get current() { return this.errors[this.index]; }
  get progress() { return `${this.index + 1} de ${this.errors.length}`; }
  get isLast() { return this.index === this.errors.length - 1; }
  get score() { return [...this.answered.values()].filter(Boolean).length; }
  get isComplete() { return this.answered.size === this.errors.length; }
  get incorrectErrors() { return this.errors.filter((error) => this.answered.get(error.id) === false); }

  answer(choiceIndex) {
    const choice = this.current.choices[choiceIndex];
    if (!choice) return { correct: false, revealed: false };
    if (!this.answered.has(this.current.id)) this.answered.set(this.current.id, Boolean(choice.correct));
    return { correct: Boolean(choice.correct), revealed: true, error: this.current };
  }

  next() {
    if (!this.answered.has(this.current.id)) return false;
    this.index = Math.min(this.index + 1, this.errors.length - 1);
    return true;
  }

  reset() {
    this.index = 0;
    this.answered.clear();
  }
}
