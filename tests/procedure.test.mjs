import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DiagnosticController, FiltrationProcedureController } from "../js/procedure.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const json = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));

test("a mistura é bloqueada até a montagem e o papel molhado serem validados", () => {
  const controller = new FiltrationProcedureController(json("data/operating-steps.json"));
  assert.equal(controller.canTransfer, false);
  assert.equal(controller.advance().ok, false);
  controller.validateAssembly();
  assert.equal(controller.canTransfer, false);
  assert.equal(controller.wetPaper(), true);
  assert.equal(controller.canTransfer, true);
  assert.equal(controller.advance().ok, true);
  assert.equal(controller.current.state, "transfer");
});

test("lavagem exige vácuo desfeito, secagem exige sucção e desligamento exige ventilação", () => {
  const controller = new FiltrationProcedureController(json("data/operating-steps.json"));
  controller.validateAssembly(); controller.wetPaper();
  controller.advance(); controller.advance(); controller.advance();
  assert.equal(controller.current.state, "cake-rinse");
  assert.equal(controller.advance().ok, false);
  controller.setVent(true);
  assert.equal(controller.advance().ok, true);
  assert.equal(controller.current.state, "suction-dry");
  assert.equal(controller.advance().ok, false);
  controller.setVacuum(true);
  assert.equal(controller.advance().ok, true);
  assert.equal(controller.current.state, "complete");
  assert.equal(controller.advance().ok, false);
  controller.setVent(true);
  assert.equal(controller.advance().ok, true);
});

test("o diagnóstico não avança antes da tentativa", () => {
  const controller = new DiagnosticController(json("data/diagnostic-errors.json"));
  assert.equal(controller.next(), false);
  const correctIndex = controller.current.choices.findIndex((choice) => choice.correct);
  assert.equal(controller.answer(correctIndex).correct, true);
  assert.equal(controller.next(), true);
  assert.equal(controller.index, 1);
});
