<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Regras do projeto (Van Gogh 3D)

Aplicativo Next.js 16 (App Router) + React 19 + React Three Fiber. Conteúdo, nomes e
comentários em **português**. Leia também `docs/`.

## Antes de concluir qualquer alteração

1. Rode `npm run verify` (tipos + lint sem avisos + testes). Se mexeu em cena, rode também `npm run build`.
2. Nunca entregue com `tsc`, lint ou testes falhando. Não use `eslint-disable` para contornar;
   corrija a causa.
3. Não commite por conta própria: apenas quando o usuário pedir.

## Regras de código

- **TypeScript estrito.** Proibido `any` e `as` para silenciar erros. Tipos vêm de `@/data/*`.
- **Regras do React Compiler (eslint-config-next v16)** — as quatro que mais quebram aqui:
  - Não mute *props* nem valores devolvidos por hooks. Para mover a câmera, use `useFrame((state) => state.camera)`, não `useThree()`.
  - Não leia nem escreva `ref.current` durante o render. Para alvos de luz, crie o `Object3D` em `useMemo` e monte com `<primitive>`.
  - Não chame `setState` sincronamente em `useEffect`. Ajuste o estado durante o render (`if (anterior !== prop) setAnterior(prop)`) ou use `key`.
  - Configure texturas/objetos imperativos em funções de módulo ou no loader, nunca dentro de efeito sobre valor de hook.
- **Limpeza obrigatória** no unmount: `geometry.dispose()`, `material.dispose()`, `texture.dispose()`, `skeleton.dispose()`, `mixer.stopAllAction()`.
- **Aleatoriedade determinística** com semente fixa: a cena deve ficar idêntica a cada carregamento.
- **Sem assets externos novos sem licença.** Todo arquivo em `public/models/` precisa de origem e licença declaradas em `public/models/README.md`.
- Prefira **texturas procedurais** (CanvasTexture) a baixar imagens. Veja `docs/adr/`.

## Colisões e geometria

- **Cada componente é dono das suas colisões e as exporta** (`CAFE_COLLISION_BOXES`, `EXTERIOR_GARDEN_BOUNDS`, `EXTERIOR_TREE_TRUNKS`). Não escreva caixas de colisão à mão em `museum-scene.tsx`.
- Ao mover mobiliário, ajuste a caixa exportada no mesmo commit — o par visual/colisão não pode divergir.
- Antes de mover qualquer coisa, confira as invariantes em `docs/scene-coordinates.md`.
- **Não invada o corredor**: `|x| < 2.3` entre `z = -1.5` e `z = 8.55` precisa ficar livre.
- **Não invada as galerias**: o interior ocupa `x ∈ [-8.65, 8.65]` para `z < -1.5`. Nada de cenário externo nessa faixa.

## Estrutura

- `src/components/museum3d/` — um arquivo por domínio (exterior, paisagismo, multidão, interiores, vasos, murais, café, casario).
- `src/data/` — conteúdo (obras, períodos, biografia, livro). Nada de conteúdo fixo em componente.
- `src/app/` — rotas: `/`, `/biografia`, `/livro`, `/museu`.
- Limite prático: **arquivos de até ~300 linhas**. `museum-scene.tsx` é a exceção legada em processo de extração.
- Testes: `*.test.mjs` ao lado do arquivo testado, rodados por `npm test`.

## Referências

- `docs/scene-coordinates.md` — sistema de coordenadas, limites e invariantes da cena 3D.
- `docs/architecture.md` — mapa de "onde mexer para cada mudança".
- `docs/adr/` — decisões arquiteturais e o porquê delas.
