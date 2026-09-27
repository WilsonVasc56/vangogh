/**
 * Quebra de texto para texturas desenhadas em canvas.
 *
 * Recebe apenas a métrica de largura (em vez do `CanvasRenderingContext2D`) para
 * poder ser testado fora do navegador e reaproveitado por qualquer painel.
 * Veja `canvas-text.test.mjs`.
 */
export function wrapText(
  measure: (text: string) => number,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(" ").filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${currentLine} ${words[i]}`;
    if (measure(candidate) > maxWidth) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = candidate;
    }
  }

  lines.push(currentLine);
  return lines;
}
