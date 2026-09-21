# Modelos 3D

Todo arquivo desta pasta precisa de **origem, licença e data de download** declaradas
aqui. Sem isso, o asset não pode entrar no repositório.

| Arquivo | Uso | Origem | Licença |
|---|---|---|---|
| `exterior-visitor.glb` | Visitantes civis (exterior, salas e café). "Casual Character" por Quaternius | https://poly.pizza/m/kZ3DmIoGip | CC0 1.0 (domínio público) — texto em `exterior-visitor-license.txt` |
| `chibi-woman.glb`, `pixar.glb`, `girl.glb`, `teen.glb`, `elderly.glb`, `elderly-woman.glb` | Banco alternativo de personagens (não usados na cena atual) | — | **pendente de registro** |

## Contrato do personagem principal (`exterior-visitor.glb`)

- **Frente nativa: +Z.** Para olhar na direção `(dx, dz)`: `yaw = Math.atan2(dx, dz)`.
- Materiais recoloríveis: `LightBrown` (roupa), `Hair`, `Eyebrows`, `Red_Dark` (calça).
- Clipes: `CharacterArmature|Idle_Neutral` (parado) e `CharacterArmature|Walk` (andar).
- **Sem root motion**: a locomoção é feita por código em `exterior-crowd.ts`.
- Altura ≈ 1,86 m na escala 1.

## Pendência

Os seis modelos do banco alternativo estão sem licença registrada. Enquanto isso,
o código deve continuar usando apenas `exterior-visitor.glb`.
