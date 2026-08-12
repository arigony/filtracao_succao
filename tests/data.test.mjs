import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const json = (file) => JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));

test("a montagem guiada tem oito etapas ordenadas e termina molhando o papel", () => {
  const steps = json("data/assembly-steps.json");
  assert.equal(steps.length, 8);
  assert.deepEqual(steps.map((step) => step.id), [0,1,2,3,4,5,6,7]);
  assert.deepEqual(steps[2].pieceIds, ["vacuum-hose-in", "vacuum-trap", "vent-clamp"]);
  assert.match(steps[7].title, /sucção e molhar/i);
  assert.ok(steps[7].checks.some((check) => /papel molhado/i.test(check)));
});

test("o procedimento tem seis fases e a ordem de encerramento está explícita", () => {
  const steps = json("data/operating-steps.json");
  assert.equal(steps.length, 6);
  assert.deepEqual(steps.map((step) => step.state), ["sealed", "transfer", "vessel-rinse", "cake-rinse", "suction-dry", "complete"]);
  assert.match(steps[3].instruction, /abra o respiro/i);
  assert.match(steps[5].instruction, /atmosfera.*desligue/i);
});

test("o diagnóstico apresenta exatamente cinco erros com risco, princípio e correção", () => {
  const errors = json("data/diagnostic-errors.json");
  assert.equal(errors.length, 5);
  assert.deepEqual(errors.map((error) => error.id), ["wrong-flask", "missing-trap", "paper-gap", "dry-paper", "closed-shutdown"]);
  errors.forEach((error) => {
    assert.ok(error.risk && error.principle && error.correction);
    assert.equal(error.choices.filter((choice) => choice.correct).length, 1);
  });
});

test("o inventário contém as barreiras críticas de segurança", () => {
  const ids = new Set(json("data/pieces.json").map((piece) => piece.id));
  ["filter-flask", "vacuum-trap", "vent-clamp", "adapter", "buchner", "filter-paper", "cold-solvent"].forEach((id) => assert.ok(ids.has(id), id));
});
