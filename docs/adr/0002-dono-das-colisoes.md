# ADR 0002 — Cada componente é dono das suas colisões

- **Status:** aceito
- **Contexto:** as caixas de colisão estavam sendo escritas à mão em
  `museum-scene.tsx`, longe do móvel que representavam. Ao mover uma mesa ou um
  vaso, a colisão ficava para trás e o visitante atravessava o objeto.

## Decisão

O arquivo que modela o objeto **exporta** os volumes de colisão que ele ocupa:

- `EXTERIOR_GARDEN_BOUNDS`, `EXTERIOR_TREE_TRUNKS` — `exterior-landscape.tsx`
- `CAFE_COLLISION_BOXES` — `museum-cafe.tsx`
- `EXTERIOR_GLASS_SEGMENTS` — `museum-exterior.tsx`

`museum-scene.tsx` apenas **agrega** essas listas.

## Consequências

- Mover mobiliário exige editar um arquivo só, e a colisão acompanha.
- A revisão fica trivial: se um objeto se moveu e a lista exportada não foi
  tocada, é bug.
- Regra derivada (ver `AGENTS.md`): não escrever caixa de colisão à mão em
  `museum-scene.tsx`.
