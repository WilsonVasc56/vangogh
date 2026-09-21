# ADR 0001 — Texturas procedurais em vez de imagens baixadas

- **Status:** aceito
- **Contexto:** a cena precisa de tijolo holandês, mármore, parquet, folhagem,
  placas e sinalização. Baixar imagens externas adiciona peso, licenças e
  requisições de rede.

## Decisão

Gerar texturas em tempo de execução com `CanvasTexture` a partir de funções
determinísticas (semente fixa), em `useMemo`, com `dispose()` no unmount.

## Consequências

- Cena idêntica a cada carregamento e sem dependência de rede.
- Cada textura custa CPU na primeira renderização; por isso as texturas de
  fachada são **compartilhadas por chave** (tom + andares + vãos) em
  `amsterdam-buildings.tsx`, e não uma por prédio.
- Exceções documentadas: os arquivos de obra em `public/artworks/` (conteúdo real)
  e os modelos em `public/models/` (com licença declarada).
