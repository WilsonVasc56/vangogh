import assert from "node:assert/strict";
import test from "node:test";
import { wrapText } from "./canvas-text.ts";

// Métrica determinística: uma unidade por caractere.
const measure = (text) => text.length;

test("quebra o texto respeitando a largura máxima", () => {
  const lines = wrapText(measure, "um dois tres quatro cinco seis", 11);
  assert.deepEqual(lines, ["um dois", "tres quatro", "cinco seis"]);
});

test("palavra maior que a largura não é cortada", () => {
  const lines = wrapText(measure, "extraordinariamente grande", 6);
  assert.deepEqual(lines, ["extraordinariamente", "grande"]);
});

test("texto vazio devolve nenhuma linha", () => {
  assert.deepEqual(wrapText(measure, "   ", 10), []);
  assert.deepEqual(wrapText(measure, "", 10), []);
});

test("nenhuma linha excede a largura máxima", () => {
  const text = "Período sombrio e terroso. Van Gogh retrata camponeses e tecelões.";
  for (const line of wrapText(measure, text, 24)) {
    assert.ok(measure(line) <= 24, `linha larga demais: "${line}"`);
  }
});
