"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

export type GableType = "stepped" | "bell" | "neck" | "pointed";
export type BrickTone = "red" | "dark" | "brown" | "sand";

export interface CanalHouseSpec {
  x: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  rotationY: number;
  brickTone: BrickTone;
  gable: GableType;
  floors: number;
  bays: number;
}

/* ---------------------------------------------------------------------- */
/* Perímetro urbano contínuo: fileiras oeste, leste e fundo da praça       */
/* ---------------------------------------------------------------------- */

// Fachadas voltadas para a praça. As galerias internas ocupam x ∈ [-8.65, 8.65]
// para z < -1.5, por isso a fileira do fundo deixa esse eixo livre e nunca
// atravessa o interior do museu.
const WEST_FACADE_X = -26.5;
const EAST_FACADE_X = 28.5;
const BACK_FACADE_Z = -14;
// Fileira sul fecha a praça atrás do visitante (limite de caminhada z ≤ 42).
const FRONT_FACADE_Z = 56;
const SIDE_ROW_FROM_Z = -24;
const SIDE_ROW_TO_Z = 68;
const BACK_ROW_INNER_X = 11;
const BACK_ROW_OUTER_X = 40;

const GABLE_SEQUENCE: GableType[] = ["stepped", "bell", "neck", "stepped", "pointed", "bell", "neck"];
const TONE_SEQUENCE: BrickTone[] = ["red", "dark", "brown", "red", "sand", "brown", "dark"];

type RowKind = "west" | "east" | "back" | "front";

function pseudoRandom(seed: number, index: number) {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function buildRow(kind: RowKind, from: number, to: number, seed: number): CanalHouseSpec[] {
  const specs: CanalHouseSpec[] = [];
  const isBack = kind === "back";
  const alongX = kind === "back" || kind === "front";
  let cursor = from;
  let index = 0;
  while (to - cursor > 3.5) {
    const r1 = pseudoRandom(seed, index);
    const r2 = pseudoRandom(seed + 7, index);
    const width = Math.min(5.8 + r1 * 2.6, to - cursor);
    const height = (isBack ? 19 : 15.5) + r2 * (isBack ? 6.5 : 6);
    const floors = Math.max(4, Math.round(height / 3.6));
    const center = cursor + width / 2;
    specs.push({
      x: kind === "west" ? WEST_FACADE_X : kind === "east" ? EAST_FACADE_X : center,
      z: alongX ? (isBack ? BACK_FACADE_Z : FRONT_FACADE_Z) : center,
      width,
      height,
      depth: 10 + Math.floor(r1 * 3),
      rotationY: kind === "west" ? Math.PI / 2 : kind === "east" ? -Math.PI / 2 : kind === "front" ? Math.PI : 0,
      brickTone: TONE_SEQUENCE[(seed + index) % TONE_SEQUENCE.length],
      gable: GABLE_SEQUENCE[(seed * 3 + index) % GABLE_SEQUENCE.length],
      floors,
      bays: width > 7.2 ? 3 : 2 + Math.round(r2),
    });
    cursor += width;
    index += 1;
  }
  return specs;
}

const CANAL_HOUSES: CanalHouseSpec[] = [
  ...buildRow("west", SIDE_ROW_FROM_Z, SIDE_ROW_TO_Z, 3),
  ...buildRow("east", SIDE_ROW_FROM_Z, SIDE_ROW_TO_Z, 11),
  ...buildRow("back", -BACK_ROW_OUTER_X, -BACK_ROW_INNER_X, 5),
  ...buildRow("back", BACK_ROW_INNER_X, BACK_ROW_OUTER_X, 9),
  ...buildRow("front", -BACK_ROW_OUTER_X, BACK_ROW_OUTER_X, 13),
];

/* ---------------------------------------------------------------------- */
/* Texturas procedurais: tijolo holandês e fachadas completas              */
/* ---------------------------------------------------------------------- */

const BRICK_RGB: Record<BrickTone, [number, number, number]> = {
  red: [136, 68, 56],
  dark: [78, 74, 70],
  brown: [112, 84, 66],
  sand: [170, 152, 128],
};
const STONE_COLOR = "#e6e2d8";
const FRAME_COLOR = "#f4f1e8";
const ROOF_COLOR = "#2c3033";

function drawBricks(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  w: number,
  h: number,
  tone: BrickTone,
  brickH: number,
) {
  const base = BRICK_RGB[tone];
  const clamp = (v: number) => Math.round(THREE.MathUtils.clamp(v, 0, 255));
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  ctx.fillStyle = `rgb(${base[0] - 22},${base[1] - 20},${base[2] - 18})`;
  ctx.fillRect(x0, y0, w, h);
  const brickW = brickH * 2.2;
  const rows = Math.ceil(h / brickH) + 1;
  const cols = Math.ceil(w / brickW) + 2;
  for (let r = 0; r < rows; r++) {
    const shift = r % 2 ? brickW / 2 : 0;
    for (let c = -1; c < cols; c++) {
      const v = Math.sin(r * 13.7 + c * 47.1) * 9;
      ctx.fillStyle = `rgb(${clamp(base[0] + v)},${clamp(base[1] + v * 0.8)},${clamp(base[2] + v * 0.7)})`;
      ctx.fillRect(x0 + c * brickW + shift + 0.6, y0 + r * brickH + 0.6, brickW - 1.2, brickH - 1.2);
    }
  }
  for (let i = 0; i < (w * h) / 12; i++) {
    ctx.fillStyle = i % 2 ? "rgba(220,215,205,0.05)" : "rgba(20,18,16,0.07)";
    ctx.fillRect(x0 + ((i * 157.3) % w), y0 + ((i * 89.1) % h), 1.3, 1.3);
  }
  ctx.restore();
}

function createBrickTexture(tone: BrickTone) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) drawBricks(ctx, 0, 0, 256, 512, tone, 8);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function drawWindow(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number) {
  // Caixilho branco
  ctx.fillStyle = FRAME_COLOR;
  ctx.fillRect(cx - w / 2 - 5, cy - h / 2 - 5, w + 10, h + 10);
  // Vidro escuro com leve reflexo do céu no topo
  const glass = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2);
  glass.addColorStop(0, "#5b6f78");
  glass.addColorStop(0.35, "#34434a");
  glass.addColorStop(1, "#242f34");
  ctx.fillStyle = glass;
  ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  // Travessas em cruz (kruiskozijn)
  ctx.fillStyle = FRAME_COLOR;
  ctx.fillRect(cx - 2, cy - h / 2, 4, h);
  ctx.fillRect(cx - w / 2, cy - h * 0.12, w, 4);
  // Peitoril de pedra com sombra
  ctx.fillStyle = STONE_COLOR;
  ctx.fillRect(cx - w / 2 - 9, cy + h / 2 + 5, w + 18, 6);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(cx - w / 2 - 9, cy + h / 2 + 11, w + 18, 3);
}

function drawDoor(ctx: CanvasRenderingContext2D, cx: number, bottomY: number, w: number, h: number) {
  ctx.fillStyle = FRAME_COLOR;
  ctx.fillRect(cx - w / 2 - 5, bottomY - h - 5, w + 10, h + 5);
  ctx.fillStyle = "#1e2b26";
  ctx.fillRect(cx - w / 2, bottomY - h, w, h);
  // Bandeira envidraçada sobre a porta
  ctx.fillStyle = "#4e5f66";
  ctx.fillRect(cx - w / 2 + 3, bottomY - h + 3, w - 6, h * 0.22);
  // Almofadas da porta e maçaneta
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(cx - w / 2 + 6, bottomY - h * 0.7, w / 2 - 9, h * 0.58);
  ctx.fillRect(cx + 3, bottomY - h * 0.7, w / 2 - 9, h * 0.58);
  ctx.fillStyle = "#c9a45c";
  ctx.fillRect(cx + w / 2 - 12, bottomY - h * 0.45, 4, 4);
  // Degraus de pedra
  ctx.fillStyle = STONE_COLOR;
  ctx.fillRect(cx - w / 2 - 12, bottomY, w + 24, 6);
  ctx.fillStyle = "#c8c3b8";
  ctx.fillRect(cx - w / 2 - 18, bottomY + 6, w + 36, 6);
}

function createFacadeTexture(tone: BrickTone, floors: number, bays: number) {
  const floorPx = 170;
  const W = 384;
  const H = floors * floorPx + 24;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  if (!ctx) return texture;

  drawBricks(ctx, 0, 0, W, H, tone, 9);

  // Embasamento em pedra escura
  ctx.fillStyle = "#3a3a38";
  ctx.fillRect(0, H - 24, W, 24);

  const bayW = W / (bays + 1);
  const doorBay = bays >= 3 ? 1 : 0;

  for (let f = 0; f < floors; f++) {
    const bottomY = H - 24 - f * floorPx;
    const topY = bottomY - floorPx;
    // Faixa de pedra (speklaag) entre andares
    if (f > 0) {
      ctx.fillStyle = STONE_COLOR;
      ctx.fillRect(0, bottomY - 4, W, 7);
    }
    const isGround = f === 0;
    const winH = floorPx * (isGround ? 0.64 : 0.58);
    const winW = bayW * 0.62;
    for (let b = 0; b < bays; b++) {
      const cx = (b + 1) * bayW;
      if (isGround && b === doorBay) {
        drawDoor(ctx, cx, bottomY - 8, winW * 0.78, floorPx * 0.7);
      } else {
        const cy = topY + floorPx * (isGround ? 0.5 : 0.5);
        drawWindow(ctx, cx, cy, winW, winH);
      }
    }
  }

  // Cornija superior
  ctx.fillStyle = STONE_COLOR;
  ctx.fillRect(0, 0, W, 9);
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(0, 9, W, 4);

  // Oclusão ambiente junto ao solo
  const ao = ctx.createLinearGradient(0, H * 0.82, 0, H);
  ao.addColorStop(0, "rgba(0,0,0,0)");
  ao.addColorStop(1, "rgba(0,0,0,0.28)");
  ctx.fillStyle = ao;
  ctx.fillRect(0, H * 0.82, W, H * 0.18);

  texture.needsUpdate = true;
  return texture;
}

interface BuildingMaterials {
  brick: Record<BrickTone, THREE.MeshStandardMaterial>;
  roof: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  facades: Map<string, THREE.MeshStandardMaterial>;
}

const facadeKey = (spec: CanalHouseSpec) => `${spec.brickTone}-${spec.floors}-${spec.bays}`;

function useBuildingMaterials(): BuildingMaterials | null {
  const materials = useMemo(() => {
    if (typeof document === "undefined") return null;
    const brick = {} as Record<BrickTone, THREE.MeshStandardMaterial>;
    (Object.keys(BRICK_RGB) as BrickTone[]).forEach((tone) => {
      brick[tone] = new THREE.MeshStandardMaterial({ map: createBrickTexture(tone), roughness: 0.94 });
    });
    const facades = new Map<string, THREE.MeshStandardMaterial>();
    CANAL_HOUSES.forEach((spec) => {
      const key = facadeKey(spec);
      if (facades.has(key)) return;
      facades.set(key, new THREE.MeshStandardMaterial({
        map: createFacadeTexture(spec.brickTone, spec.floors, spec.bays),
        roughness: 0.9,
      }));
    });
    return {
      brick,
      roof: new THREE.MeshStandardMaterial({ color: ROOF_COLOR, roughness: 0.88 }),
      stone: new THREE.MeshStandardMaterial({ color: STONE_COLOR, roughness: 0.8 }),
      facades,
    };
  }, []);

  useEffect(() => {
    return () => {
      if (!materials) return;
      Object.values(materials.brick).forEach((m) => { m.map?.dispose(); m.dispose(); });
      materials.facades.forEach((m) => { m.map?.dispose(); m.dispose(); });
      materials.roof.dispose();
      materials.stone.dispose();
    };
  }, [materials]);

  return materials;
}

/* ---------------------------------------------------------------------- */
/* Empenas clássicas: degraus, sino, pescoço e triangular                  */
/* ---------------------------------------------------------------------- */

/** Prisma triangular extrudado (base no y=0, ápice em y=height, frente em +z) */
function TriangularPrism({
  base,
  height,
  depth,
  material,
  position,
}: {
  base: number;
  height: number;
  depth: number;
  material: THREE.Material;
  position: [number, number, number];
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-base / 2, 0);
    shape.lineTo(base / 2, 0);
    shape.lineTo(0, height);
    shape.closePath();
    const extruded = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    // UVs em metros para que o tijolo mantenha a escala das outras faces
    const uv = extruded.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3.2, uv.getY(i) / 3.2);
    return extruded;
  }, [base, height, depth]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} position={position} castShadow />;
}

function CanalHouseGable({
  type,
  width,
  roofY,
  brick,
  stone,
}: {
  type: GableType;
  width: number;
  roofY: number;
  brick: THREE.Material;
  stone: THREE.Material;
}) {
  switch (type) {
    case "stepped": {
      const steps = 4;
      const stepH = 0.85;
      return (
        <group position={[0, roofY, 0]}>
          {Array.from({ length: steps }).map((_, i) => {
            const stepW = width * (1 - i * 0.22);
            return (
              <group key={i} position={[0, i * stepH + stepH / 2, 0]}>
                <mesh castShadow material={brick} position={[0, 0, -0.2]}>
                  <boxGeometry args={[stepW, stepH, 0.4]} />
                </mesh>
                <mesh material={stone} position={[0, stepH / 2 + 0.04, -0.18]}>
                  <boxGeometry args={[stepW + 0.12, 0.08, 0.5]} />
                </mesh>
              </group>
            );
          })}
          <mesh material={stone} position={[0, steps * stepH + 0.22, -0.18]} castShadow>
            <boxGeometry args={[0.72, 0.36, 0.5]} />
          </mesh>
        </group>
      );
    }
    case "bell": {
      const gableH = 3.2;
      return (
        <group position={[0, roofY, 0]}>
          <mesh material={brick} position={[0, gableH / 2, -0.2]} castShadow>
            <boxGeometry args={[width * 0.68, gableH, 0.4]} />
          </mesh>
          {[-1, 1].map((dir) => (
            <group key={dir} position={[dir * (width * 0.34 + 0.18), 1.2, -0.16]}>
              <mesh material={stone} rotation={[0, 0, dir * 0.35]}>
                <boxGeometry args={[0.36, 2.2, 0.44]} />
              </mesh>
              <mesh material={stone} position={[dir * 0.12, 1.1, 0]}>
                <sphereGeometry args={[0.22, 10, 10]} />
              </mesh>
            </group>
          ))}
          <mesh material={stone} position={[0, gableH + 0.22, -0.16]} castShadow>
            <cylinderGeometry args={[0.42, 0.55, 0.38, 16]} />
          </mesh>
        </group>
      );
    }
    case "neck": {
      const neckH = 2.8;
      const neckW = width * 0.52;
      return (
        <group position={[0, roofY, 0]}>
          <mesh material={brick} position={[0, neckH / 2, -0.2]} castShadow>
            <boxGeometry args={[neckW, neckH, 0.4]} />
          </mesh>
          {[-1, 1].map((dir) => (
            <mesh key={dir} material={stone} position={[dir * (neckW / 2 + 0.28), 0.75, -0.18]} rotation={[0, 0, dir * 0.5]}>
              <boxGeometry args={[0.45, 1.6, 0.44]} />
            </mesh>
          ))}
          <TriangularPrism base={neckW + 0.5} height={neckW * 0.42} depth={0.44} material={stone} position={[0, neckH, -0.42]} />
        </group>
      );
    }
    case "pointed":
    default: {
      // Tuitgevel: prisma triangular em tijolo com molduras de pedra nas águas
      const triH = 2.9;
      const half = width / 2;
      const slope = Math.hypot(half, triH);
      const tilt = Math.atan2(half, triH);
      return (
        <group position={[0, roofY, 0]}>
          <TriangularPrism base={width} height={triH} depth={0.4} material={brick} position={[0, 0, -0.4]} />
          {[-1, 1].map((dir) => (
            <mesh key={dir} material={stone} position={[dir * half / 2, triH / 2, -0.18]} rotation={[0, 0, -dir * tilt]}>
              <boxGeometry args={[0.16, slope, 0.46]} />
            </mesh>
          ))}
          <mesh material={stone} position={[0, triH + 0.26, -0.18]} castShadow>
            <cylinderGeometry args={[0.16, 0.24, 0.45, 8]} />
          </mesh>
        </group>
      );
    }
  }
}

/* ---------------------------------------------------------------------- */
/* Um edifício (grachtenpand): fachada em textura, empena e telhado 3D     */
/* ---------------------------------------------------------------------- */

function AmsterdamCanalHouse({ spec, materials }: { spec: CanalHouseSpec; materials: BuildingMaterials }) {
  const brick = materials.brick[spec.brickTone];
  const facade = materials.facades.get(facadeKey(spec)) ?? brick;
  // Ordem das faces do BoxGeometry: +x, -x, +y, -y, +z (fachada), -z
  const body = useMemo(
    () => [brick, brick, materials.roof, brick, facade, brick],
    [brick, facade, materials.roof],
  );
  const gableTop = spec.height + (spec.gable === "stepped" ? 3.3 : 2.7);

  return (
    <group position={[spec.x, 0, spec.z]} rotation={[0, spec.rotationY, 0]}>
      {/* Corpo: fachada detalhada voltada para a praça, tijolo nas demais faces */}
      <mesh material={body} position={[0, spec.height / 2, -spec.depth / 2]} castShadow receiveShadow>
        <boxGeometry args={[spec.width, spec.height, spec.depth]} />
      </mesh>

      <CanalHouseGable type={spec.gable} width={spec.width} roofY={spec.height} brick={brick} stone={materials.stone} />

      {/* Hijsbalk: viga de elevação com gancho no topo da empena */}
      <group position={[0, gableTop, 0]}>
        <mesh position={[0, 0, 0.3]} castShadow>
          <boxGeometry args={[0.08, 0.1, 0.82]} />
          <meshStandardMaterial color="#2d2926" roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.12, 0.66]}>
          <torusGeometry args={[0.045, 0.012, 8, 16, Math.PI * 1.5]} />
          <meshStandardMaterial color="#1a1c1d" metalness={0.8} roughness={0.4} />
        </mesh>
      </group>

      {/* Telhado de ardósia inclinado atrás da empena */}
      <mesh material={materials.roof} position={[0, spec.height + 1.6, -spec.depth * 0.45]} rotation={[0.42, 0, 0]} castShadow>
        <boxGeometry args={[spec.width - 0.1, spec.depth * 0.7, 0.2]} />
      </mesh>

      {/* Chaminé */}
      <group position={[spec.width * 0.3, spec.height + 3.0, -spec.depth * 0.4]}>
        <mesh material={brick} castShadow>
          <boxGeometry args={[0.65, 1.4, 0.65]} />
        </mesh>
        <mesh position={[0, 0.75, 0]}>
          <cylinderGeometry args={[0.12, 0.14, 0.28, 12]} />
          <meshStandardMaterial color="#884838" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

/** Casario tradicional de Amsterdã cercando as laterais e o fundo da praça */
export function AmsterdamBuildings() {
  const materials = useBuildingMaterials();
  if (!materials) return null;
  return (
    <group name="amsterdam-traditional-buildings">
      {CANAL_HOUSES.map((spec, idx) => (
        <AmsterdamCanalHouse key={idx} spec={spec} materials={materials} />
      ))}
    </group>
  );
}
