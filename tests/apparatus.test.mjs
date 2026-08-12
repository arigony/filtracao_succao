import assert from "node:assert/strict";
import test from "node:test";
import { createApparatus } from "../js/apparatus.js";

test("o modelo procedural expõe todas as peças críticas e pontos de substituição", () => {
  const apparatus = createApparatus();
  ["filter-flask", "vacuum-trap", "vent-clamp", "adapter", "buchner", "filter-paper", "aspirator"].forEach((id) => assert.ok(apparatus.components.has(id), id));
  assert.equal(apparatus.root.name, "filtracao-por-succao");
  assert.equal(typeof apparatus.setAssemblyStep, "function");
  assert.equal(typeof apparatus.setProcedureState, "function");
  assert.equal(typeof apparatus.setReferenceView, "function");
  assert.deepEqual(apparatus.components.get("vacuum-trap").userData.ports, { apparatus: "side-arm", vacuumSource: "top", vent: "tee" });
});

test("o estado visual respeita papel, vácuo e ventilação", () => {
  const apparatus = createApparatus();
  apparatus.setPaperWet(true);
  assert.equal(apparatus.paperWet, true);
  apparatus.setVacuum(true);
  assert.equal(apparatus.vacuumOn, true);
  assert.equal(apparatus.ventOpen, false);
  apparatus.setVent(true);
  assert.equal(apparatus.ventOpen, true);
  assert.equal(apparatus.vacuumOn, false);
});

test("as vistas científicas diferenciam papel molhado, transferência e ventilação", () => {
  const apparatus = createApparatus();
  apparatus.setReferenceView("papel-molhado");
  assert.equal(apparatus.paperWet, true);
  assert.equal(apparatus.vacuumOn, true);
  assert.equal(apparatus.components.get("cold-solvent").userData.cap.visible, false);

  apparatus.setReferenceView("transferencia");
  assert.equal(apparatus.procedureState, "transfer");
  assert.equal(apparatus.components.get("cold-solvent").visible, false);

  apparatus.setReferenceView("encerramento");
  assert.equal(apparatus.ventOpen, true);
  assert.equal(apparatus.vacuumOn, false);
});
