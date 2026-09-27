# Onde mexer para cada mudança

Mapa rápido para reduzir o tempo de alteração. Combine com
`docs/scene-coordinates.md` (geometria) e `AGENTS.md` (regras de código).

| Quero mudar… | Vá para |
|---|---|
| Contéudo das obras, períodos, biografia, livro | `src/data/` |
| Rotas e páginas (`/`, `/biografia`, `/livro`, `/museu`) | `src/app/` |
| Colisor do visitante, sequência de salas, portas internas | `src/components/museum3d/museum-scene.tsx` |
| Piso, paredes, teto e rodapés das galerias | `museum-scene.tsx` (`Room`) + `interior-materials.ts` (textura) |
| Fachada, átrio de vidro, praça, sinalização | `museum-exterior.tsx` |
| Árvores, gramados, canteiros | `exterior-landscape.tsx` |
| Multidão da praça (crianças, idosos, trajetos) | `exterior-visitors.tsx` + `exterior-crowd.ts` |
| Visitantes dentro das salas | `museum-scene.tsx` (`Visitor`, `RoamingVisitor`) |
| Bancos e policial de cada sala | `scene/room-furniture.ts` |
| Vasos e esculturas sobre plintos | `museum-vases.tsx` |
| Murais com retratos e citações no corredor | `corridor-murals.tsx` |
| Painel interpretativo de abertura da galeria (corredor, parede oeste) | `gallery-intro-panel.tsx` |
| Jardim interno no recuo ao lado da primeira sala | `interior-garden.tsx` + `src/data/interior-garden.ts` |
| Quebra de texto em texturas de canvas | `scene/canvas-text.ts` |
| Café do átrio (balcão, mesas, pessoas) | `museum-cafe.tsx` |
| Casario tradicional de Amsterdã | `amsterdam-buildings.tsx` |
| Enquadramento inicial da câmera / DPR | `museum-experience.tsx` |
| Quadro renderizado na parede (moldura, plaqueta, luz) | `gallery-artwork.tsx` |
| Carrossel/fotos das obras na vitrine do site | `src/components/` (fora de `museum3d/`) |

## Fluxo de verificação

```bash
npm run verify   # tsc + eslint (0 avisos) + testes
npm run build    # obrigatório se mexeu na cena 3D
```

O CI roda os dois em todo push para `main` e em todo PR.

## Dívida técnica conhecida

- `museum-scene.tsx` (~1.150 linhas) concentra salas, colisões, controles, portas e
  visitantes. Está em extração gradual para `src/components/museum3d/scene/`.
  Enquanto isso, ao editá-lo, mantenha as seções separadas por comentários.
- `docs/scene-coordinates.md` é a fonte de verdade para coordenadas: se mudar uma
  constante listada lá, atualize o documento no mesmo commit.
