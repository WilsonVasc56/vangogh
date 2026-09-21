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
| `PLAYER_RADIUS` | `0.42` | Raio de colisão do visitante |

## Faixas proibidas (invariantes)

1. **Corredor livre:** `|x| < 2.3` para `-1.5 < z < 8.55`. É o único caminho entre a
   entrada e as galerias; nada de mobiliário ou colisão aqui.
2. **Galerias livres de cenário externo:** nada de geometria externa em
   `x ∈ [-8.65, 8.65]` com `z < -1.5`. O interior é um espaço fechado; qualquer
   prédio, árvore ou piso colocado nessa faixa atravessa as paredes das salas.
3. **Limites de caminhada do visitante:** `x ∈ [-18, 18]` e `z ≤ 42` na praça.
4. **Eixo da entrada livre:** nada pode bloquear `|x| < 1.85` na faixa da porta
   (`z` entre 12.3 e 14.8), senão o visitante não consegue entrar.

## Átrio de vidro

Forma elíptica em planta: `radiusX = 8.1`, `radiusZ = 7.4`, centro em `z = 7.4`,
parede de fundo em `z = 7.4`, recorte oeste em `x = -4.35`. A altura da cobertura
cai de `x = -4.35` para `x = +8.1` (mais alta à esquerda, mais baixa à direita).

**Regra:** todo mobiliário do átrio precisa caber dentro da elipse. Teste o ponto
`z = 7.4 + 7.4·√(1 − (x/8.1)²)` para a borda do vidro.

## Café (ala leste do átrio)

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

## Casario de Amsterdã

- Fachada oeste em `x = -26.5`, leste em `x = +28.5`, fundo em `z = -14`,
  fileira sul em `z = 56`.
- As fileiras laterais vão de `z = -24` a `z = 68`; o fundo só ocupa
  `|x| ≥ 11` para não invadir as galerias.
- Convenção da fachada: a face detalhada fica em **z local = 0** e o corpo cresce
  para **−z local**. Empenas oeste `+π/2`, leste `−π/2`, fundo `0`, sul `π`.
