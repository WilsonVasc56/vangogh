# Sistema de coordenadas da cena 3D

Referência para mover, adicionar ou auditar geometria no museu. Todos os valores
abaixo foram conferidos no código em `src/components/museum3d/`.

## Eixos e sentido

- **Y é para cima.** Piso em `y = 0`.
- **−Z é o fundo do museu** (galerias). **+Z é a praça, atrás do visitante.**
- **−X é a ala oeste**, **+X é a ala leste**.
- A câmera inicial fica em `[-1.5, 1.7, 32]` olhando para −Z.
- Convenção de olhar: `yaw` gira em torno de Y e `pitch` em torno de X, aplicados
  como `camera.rotation.set(pitch, yaw, 0, "YXZ")`. `yaw = 0` olha para −Z;
  `yaw = +π/2` olha para −X; `yaw = -π/2` olha para +X.

## Constantes-chave (museum-scene.tsx)

| Constante | Valor | Significado |
|---|---|---|
| `ENTRANCE_DOOR_Z` | `14.8` | Plano da porta de vidro da entrada |
| `BUILDING_PORTAL_Z` | `8.55` | Parede do prédio; único vão de passagem para o corredor |
| `FIRST_ROOM_Z` | `-1.5` | Início da primeira galeria |
| `ROOM_HALF_WIDTH` | `8.5` | Meia-largura útil de cada sala |
| `ROOM_HEIGHT` | `6.5` | Pé-direito das galerias |
| `DOOR_HALF_WIDTH` | `1.65` | Meio-vão das portas internas entre salas |
| `INTERNAL_DOORWAY_HEIGHT` | `4` | Altura livre do vão das portas internas (verga acima) |
| `SIDE_WALL_THICKNESS` | `0.3` | Espessura das paredes laterais das galerias |
| `PARTITION_THICKNESS` | `0.28` | Espessura das divisórias (frente de Nuenen, entre salas, fundo) |
| `CORRIDOR_HALF_WIDTH` | `2.3` | Meia-largura livre do corredor e do vão para Nuenen |
| `CORRIDOR_WALL_THICKNESS` | `0.3` | Espessura das paredes do corredor |
| `CORRIDOR_HEIGHT` | `4.6` | Pé-direito do corredor e altura do vão para Nuenen |
| `DOOR_PANEL_WIDTH` × `DOOR_PANEL_HEIGHT` × `DOOR_PANEL_DEPTH` | `1.8 × 3.8 × 0.13` | Folha das portas deslizantes |
| `PLAYER_RADIUS` | `0.42` | Raio de colisão do visitante |
| `ROOM_LENGTHS` | Nuenen `12`, Paris `13.5`, Arles `24.75`, Saint-Rémy `15.75`, Auvers `18` | Comprimento fixo de cada sala ao longo de −Z |
| `SIDE_ARTWORK_FIRST_OFFSET` | `2.7` | Distância do início da sala até a primeira tela lateral |
| `SIDE_ARTWORK_PITCH` | `2.25` | Espaçamento entre telas numa parede lateral |
| `SIDE_ARTWORK_END_CLEARANCE` | `2.0` | Folga mínima entre a última tela lateral e a parede de fundo |

## Distribuição das obras nas salas (`scene/room-layout.ts`)

- O comprimento da sala **não depende** do número de obras (`ROOM_LENGTHS`).
  Acrescentar telas não desloca portas, bancos, policiais nem colisões.
- **Parede de fundo:** recebe as últimas obras (cronologicamente) da época —
  4 posições nas salas com porta, 6 na última sala (Auvers).
- **Paredes laterais:** recebem as obras restantes, em ordem cronológica,
  alternando esquerda/direita, até `floor((comprimento − 2.7 − 2.0) / 2.25) + 1`
  telas por parede: Nuenen 4, Paris 4, Arles 9, Saint-Rémy 5, Auvers 6.
- **Nenhuma obra se repete.** Se uma época tiver mais obras do que paredes, o
  excedente fica fora da cena (aviso no console em desenvolvimento). Para as
  paredes ficarem cheias, cada época precisa de capacidade lateral + fundo:
  Nuenen 12, Paris 12, Arles 22, Saint-Rémy 14, Auvers 18 — conferido por
  `scene/rooms.test.mjs`.

## Faixas proibidas (invariantes)

1. **Corredor livre:** `|x| < 2.3` para `-1.5 < z < 8.55`. É o único caminho entre a
   entrada e as galerias; nada de mobiliário ou colisão aqui.
2. **Galerias livres de cenário externo:** nada de geometria externa em
   `x ∈ [-8.65, 8.65]` com `z < -1.5`. O interior é um espaço fechado; qualquer
   prédio, árvore ou piso colocado nessa faixa atravessa as paredes das salas.
3. **Limites de caminhada do visitante:** `x ∈ [-18, 18]` e `z ≤ 42` na praça.
4. **Eixo da entrada livre:** nada pode bloquear `|x| < 1.85` na faixa da porta
   (`z` entre 12.3 e 14.8), senão o visitante não consegue entrar.
5. **Mobília das salas:** dois bancos em `x = ±4.15`, `z = centerZ`, comprimento ao
   longo de Z. O policial fica em `x = -2.5`, `z = startZ − 1.4`, na entrada de cada
   porta do lado esquerdo, fora do vão da porta (`|x| < 1.65`), olhando para o fundo da sala.
   Posição e colisão saem de `scene/room-furniture.ts`.

## Átrio de vidro

Forma elíptica em planta: `radiusX = 8.1`, `radiusZ = 7.4`, centro em `z = 7.4`,
parede de fundo em `z = 7.4`, recorte oeste em `x = -4.35`. A altura da cobertura
cai de `x = -4.35` para `x = +8.1` (mais alta à esquerda, mais baixa à direita).

**Regra:** todo mobiliário do átrio precisa caber dentro da elipse. Teste o ponto
`z = 7.4 + 7.4·√(1 − (x/8.1)²)` para a borda do vidro.

## Café (ala leste do átrio)

### Jardim interno do recuo leste

- À esquerda de quem olha de dentro da primeira sala para a entrada (+Z).
- Canteiro em `x ∈ [2.64, 8.16]`, `z ∈ [-1.44, 7.32]`, entre a face externa
  do corredor (`x = 2.6`), a alvenaria (`x = 8.2`) e o fundo do café (`z = 7.4`).
- Base própria cobre o terreno aparente; borda a 0.34 m, folhagens volumosas
  abaixo de 4.6 m e integralmente contidas no recuo. Não avança sobre o parquet.
- `InteriorGarden` exporta `INTERIOR_GARDEN_COLLISION_BOXES`, derivadas dos
  mesmos limites da base. Testadas antes do corte de colisão do exterior, pois o
  raio do visitante alcança a borda enquanto ele ainda está na primeira sala.

### Mobiliário do café

- Balcão: `x ∈ [3.2, 7.6]`, recuo em `z = 8.75`, profundidade `0.6`.
- Mesas: `(4.2, 10.4)`, `(6.55, 9.6)`, `(4.0, 12.5)`, `(5.9, 11.3)`.
- Vasos: `(7.5, 9.3)` e `(3.1, 13.7)`.
- Barista atrás do balcão em `z < 8.55` (área não alcançável pelo visitante).
- Colisões exportadas em `CAFE_COLLISION_BOXES` (`museum-cafe.tsx`).

## Visitantes

- O modelo civil (`public/models/exterior-visitor.glb`) tem **frente nativa para +Z**.
  Para fazê-lo olhar na direção `(dx, dz)`, use `yaw = Math.atan2(dx, dz)`.
  Com `atan2(-dx, -dz)` ele caminha de costas.
- Contrato do asset: materiais `LightBrown`, `Hair`, `Eyebrows`, `Red_Dark`;
  clipes `CharacterArmature|Idle_Neutral` e `CharacterArmature|Walk`;
  **sem root motion** (a locomoção é feita por código).
- Sentido de caminhada calibrado para `timeScale ≈ 0.75` a ~0.75 m/s.

## Câmera em 1ª e 3ª pessoa (`scene/camera-rig.ts`)

- A **posição do visitante** (`x`, `z`) é a fonte de verdade para colisões, salas,
  portas e mira; a câmera deriva dela a cada quadro.
- 1ª pessoa: olho em `y = 1.7` sobre o visitante.
- 3ª pessoa (sobre o ombro): pivô em `y = 1.55`, ombro `0.45` à direita, recuo
  nominal `2.1` com leve elevação. Alterna com o botão do HUD ou a tecla `V`.
- O recuo marcha em passos de `0.04` e para a `0.12` de qualquer volume
  (paredes, tetos, divisórias, portas fechadas, fundo do átrio, alas do prédio,
  vidros e troncos). A folga precisa ficar abaixo de `0.28 − 0.14` para o pivô
  nunca nascer bloqueado junto a uma porta fechada.
- Abaixo de `0.65` entre câmera e pivô, o avatar é ocultado.
- Os volumes externos saem de `EXTERIOR_CAMERA_OBSTACLES` (`scene/collisions.ts`),
  derivados dos mesmos dados das colisões do visitante.
- Os volumes internos (`buildArchitectureObstacles`) recebem as medidas por
  `MuseumCameraLayout`, montado em `gallery-controls.tsx` a partir das constantes
  acima, de `ATRIUM_BACK_Z` (`museum-exterior.tsx`) e de `EAST_WING_MIN_X`
  (`scene/collisions.ts`) — as mesmas que desenham paredes, vãos e portas.

## Casario de Amsterdã

- Fachada oeste em `x = -26.5`, leste em `x = +28.5`, fundo em `z = -14`,
  fileira sul em `z = 56`.
- As fileiras laterais vão de `z = -24` a `z = 68`; o fundo só ocupa
  `|x| ≥ 11` para não invadir as galerias.
- Convenção da fachada: a face detalhada fica em **z local = 0** e o corpo cresce
  para **−z local**. Empenas oeste `+π/2`, leste `−π/2`, fundo `0`, sul `π`.
