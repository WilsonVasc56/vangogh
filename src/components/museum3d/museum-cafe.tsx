"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

/**
 * Café do museu na ala leste do átrio de vidro (x ≈ 2.5..8, z ≈ 7.5..14).
 * A borda curva do átrio segue a elipse (rx 8.1, rz 7.4, centro z 7.4); todo
 * o mobiliário fica dentro dela. A área atrás do balcão (z < 8.55) não é
 * alcançável pelo visitante, por isso o barista fica ali sem colisão extra.
 */

type Point = [number, number, number];

const WOOD_LIGHT = "#cfae80";
const WOOD_DARK = "#6e5a45";
const STONE = "#ece8df";
const METAL = "#2b2d2f";
const PLASTER = "#bdb8a8";

const TABLES: [number, number][] = [
  [4.2, 10.4],
  [6.55, 9.6],
  [4.0, 12.5],
  [5.9, 11.3],
];
/** Colunas estruturais inclinadas do átrio (definidas em museum-exterior). */
const ATRIUM_COLUMNS: [number, number][] = [
  [-3.4, 10.1],
  [5.5, 10.1],
];
const PLANTERS: [number, number][] = [
  [7.5, 9.3],
  [3.1, 13.7],
];
const COUNTER = { minX: 3.2, maxX: 7.6, front: 8.75, depth: 0.6, height: 0.95 };

export interface CafePerson {
  position: Point;
  rotationY: number;
  tint: string;
  hair: string;
  scale: number;
}

/** Barista atrás do balcão (voltado para +Z) e clientes em pé. */
export const CAFE_PEOPLE: CafePerson[] = [
  { position: [5.4, 0, 7.85], rotationY: 0, tint: "#3b3d42", hair: "#2f271f", scale: 1 },
  { position: [5.0, 0, 9.6], rotationY: Math.PI, tint: "#6f5b4a", hair: "#715e4b", scale: 0.98 },
  { position: [6.9, 0, 10.6], rotationY: -Math.PI / 2, tint: "#4a6174", hair: "#c4bfb6", scale: 0.96 },
];

export const CAFE_COLLISION_BOXES = [
  { minX: COUNTER.minX - 0.1, maxX: COUNTER.maxX + 0.1, minZ: 7.5, maxZ: COUNTER.front + 0.05 },
  ...TABLES.map(([x, z]) => ({ minX: x - 0.95, maxX: x + 0.95, minZ: z - 0.48, maxZ: z + 0.48 })),
  ...PLANTERS.map(([x, z]) => ({ minX: x - 0.4, maxX: x + 0.4, minZ: z - 0.4, maxZ: z + 0.4 })),
  ...ATRIUM_COLUMNS.map(([x, z]) => ({ minX: x - 0.2, maxX: x + 0.2, minZ: z - 0.2, maxZ: z + 0.2 })),
  ...CAFE_PEOPLE.slice(1).map(({ position: [x, , z] }) => ({
    minX: x - 0.35, maxX: x + 0.35, minZ: z - 0.35, maxZ: z + 0.35,
  })),
];

function useMenuTexture() {
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 448;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#23262a";
    ctx.fillRect(0, 0, 768, 448);
    ctx.strokeStyle = "rgba(230,224,210,0.35)";
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, 732, 412);
    ctx.textAlign = "center";
    ctx.fillStyle = "#f1ece2";
    ctx.font = "600 54px Georgia, serif";
    ctx.fillText("MUSEUM CAFÉ", 384, 92);
    ctx.fillStyle = "rgba(230,224,210,0.55)";
    ctx.fillRect(184, 112, 400, 2);
    ctx.font = "italic 26px Georgia, serif";
    ctx.textAlign = "left";
    const items: [string, string][] = [
      ["Koffie · Espresso", "3,20"],
      ["Cappuccino · Latte", "4,10"],
      ["Thee · Verse munt", "3,40"],
      ["Appeltaart met slagroom", "5,50"],
      ["Stroopwafel", "2,80"],
    ];
    items.forEach(([name, price], i) => {
      const y = 170 + i * 50;
      ctx.fillStyle = "#e9e3d6";
      ctx.fillText(name, 92, y);
      ctx.textAlign = "right";
      ctx.fillStyle = "#e0b456";
      ctx.fillText(`€ ${price}`, 676, y);
      ctx.textAlign = "left";
    });
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    return map;
  }, []);
  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

function CafeTable({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* Mesa redonda: pé central em metal e tampo claro */}
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[0.24, 0.26, 0.03, 24]} />
        <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.37, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.7, 12]} />
        <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.04, 32]} />
        <meshStandardMaterial color={STONE} roughness={0.45} />
      </mesh>
      {/* Xícara e pires */}
      <mesh position={[0.12, 0.765, -0.08]}>
        <cylinderGeometry args={[0.07, 0.07, 0.01, 16]} />
        <meshStandardMaterial color="#f7f4ee" roughness={0.3} />
      </mesh>
      <mesh position={[0.12, 0.8, -0.08]}>
        <cylinderGeometry args={[0.04, 0.032, 0.06, 16]} />
        <meshStandardMaterial color="#f7f4ee" roughness={0.3} />
      </mesh>
      {/* Duas cadeiras, uma de cada lado, voltadas para a mesa */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.68, 0, 0]} rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[0.42, 0.04, 0.42]} />
            <meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.72, -0.19]} rotation={[-0.08, 0, 0]} castShadow>
            <boxGeometry args={[0.42, 0.5, 0.035]} />
            <meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} />
          </mesh>
          {[[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].map(([lx, lz], i) => (
            <mesh key={i} position={[lx, 0.22, lz]}>
              <cylinderGeometry args={[0.014, 0.014, 0.44, 8]} />
              <meshStandardMaterial color={METAL} metalness={0.6} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Pendant({ x, z, railY }: { x: number; z: number; railY: number }) {
  const shadeY = 2.15;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, (railY + shadeY) / 2, 0]}>
        <cylinderGeometry args={[0.008, 0.008, railY - shadeY, 6]} />
        <meshStandardMaterial color="#141516" />
      </mesh>
      <mesh position={[0, shadeY, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.17, 0.18, 24, 1, true]} />
        <meshStandardMaterial color="#202224" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, shadeY - 0.04, 0]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color="#ffe6b8" toneMapped={false} />
      </mesh>
      <pointLight position={[0, shadeY - 0.1, 0]} intensity={2.6} distance={3.2} color="#ffd9a8" />
    </group>
  );
}

function Planter({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.26, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.26, 0.52, 24]} />
        <meshStandardMaterial color="#c8c2b6" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.51, 0]}>
        <cylinderGeometry args={[0.27, 0.27, 0.03, 24]} />
        <meshStandardMaterial color="#3c3128" roughness={1} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        const lean = 0.35 + (i % 3) * 0.12;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.12, 0.95, Math.sin(a) * 0.12]} rotation={[Math.sin(a) * lean, 0, -Math.cos(a) * lean]} castShadow>
            <boxGeometry args={[0.16, 0.9, 0.02]} />
            <meshStandardMaterial color={i % 2 ? "#3f6b3a" : "#4f7f45"} roughness={0.85} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

function Counter() {
  const width = COUNTER.maxX - COUNTER.minX;
  const cx = (COUNTER.minX + COUNTER.maxX) / 2;
  const cz = COUNTER.front - COUNTER.depth / 2;
  const topY = COUNTER.height;
  return (
    <group>
      {/* Corpo do balcão em madeira escura com ripas verticais claras na frente */}
      <mesh position={[cx, topY / 2, cz]} castShadow receiveShadow>
        <boxGeometry args={[width, topY, COUNTER.depth]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
      </mesh>
      {Array.from({ length: Math.floor(width / 0.16) }, (_, i) => (
        <mesh key={i} position={[COUNTER.minX + 0.1 + i * 0.16, topY / 2 - 0.02, COUNTER.front + 0.012]}>
          <boxGeometry args={[0.07, topY - 0.08, 0.024]} />
          <meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} />
        </mesh>
      ))}
      <mesh position={[cx, topY + 0.03, cz]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.12, 0.06, COUNTER.depth + 0.14]} />
        <meshStandardMaterial color={STONE} roughness={0.35} />
      </mesh>

      {/* Máquina de espresso */}
      <group position={[COUNTER.minX + 0.75, topY + 0.06, cz]}>
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.72, 0.4, 0.46]} />
          <meshStandardMaterial color="#35383b" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.43, 0]}>
          <boxGeometry args={[0.74, 0.06, 0.48]} />
          <meshStandardMaterial color="#c9ccd0" metalness={0.85} roughness={0.25} />
        </mesh>
        {[-0.2, 0.2].map((ox) => (
          <group key={ox} position={[ox, 0.14, 0.26]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 0.08, 12]} />
              <meshStandardMaterial color="#bfc3c7" metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0, -0.03, 0.06]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.012, 0.012, 0.14, 8]} />
              <meshStandardMaterial color="#1b1c1d" roughness={0.6} />
            </mesh>
          </group>
        ))}
        {[-0.22, -0.08, 0.06, 0.2].map((ox) => (
          <mesh key={ox} position={[ox, 0.5, -0.1]}>
            <cylinderGeometry args={[0.04, 0.032, 0.07, 14]} />
            <meshStandardMaterial color="#f7f4ee" roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* Vitrine de doces em vidro */}
      <group position={[COUNTER.maxX - 0.75, topY + 0.06, cz]}>
        <mesh position={[0, 0.24, 0]}>
          <boxGeometry args={[1.1, 0.48, 0.5]} />
          <meshPhysicalMaterial color="#eef4f3" transparent opacity={0.22} roughness={0.05} metalness={0.05} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.005, 0]}>
          <boxGeometry args={[1.12, 0.012, 0.52]} />
          <meshStandardMaterial color="#c9ccd0" metalness={0.8} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[1.06, 0.012, 0.46]} />
          <meshStandardMaterial color="#dfe3e4" transparent opacity={0.5} roughness={0.1} />
        </mesh>
        {/* Doces: appeltaart, stroopwafels e croissants */}
        {[-0.38, -0.13, 0.13, 0.38].map((ox, i) => (
          <group key={ox}>
            <mesh position={[ox, 0.05, 0.05]} castShadow>
              {i % 2 === 0
                ? <cylinderGeometry args={[0.09, 0.1, 0.06, 6]} />
                : <torusGeometry args={[0.06, 0.02, 8, 16]} />}
              <meshStandardMaterial color={i % 2 === 0 ? "#c58a4a" : "#a9773f"} roughness={0.85} />
            </mesh>
            <mesh position={[ox, 0.295, -0.06]} castShadow>
              <capsuleGeometry args={[0.035, 0.1, 6, 10]} />
              <meshStandardMaterial color="#d9a463" roughness={0.8} />
            </mesh>
          </group>
        ))}
        <pointLight position={[0, 0.42, 0]} intensity={0.9} distance={1.4} color="#fff0d2" />
      </group>

      {/* Prateleira na parede do fundo com xícaras e garrafas */}
      <mesh position={[cx, 1.95, 7.78]} castShadow>
        <boxGeometry args={[3.4, 0.05, 0.32]} />
        <meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} />
      </mesh>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[cx - 1.35 + i * 0.45, 2.02, 7.78]}>
          <cylinderGeometry args={[0.045, 0.036, 0.08, 14]} />
          <meshStandardMaterial color="#f7f4ee" roughness={0.3} />
        </mesh>
      ))}
      {[-1.15, 1.25].map((ox) => (
        <mesh key={ox} position={[cx + ox, 2.13, 7.78]}>
          <cylinderGeometry args={[0.04, 0.045, 0.3, 12]} />
          <meshStandardMaterial color="#3e5a3a" roughness={0.2} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

export function MuseumCafe() {
  const menu = useMenuTexture();
  const railY = 4.45;
  return (
    <group name="museum-cafe">
      {/* Fecha o fundo do átrio abaixo do patamar suspenso (antes ficava aberto para o terreno) */}
      <mesh position={[5.325, 2.35, 7.5]} receiveShadow>
        <boxGeometry args={[5.75, 4.7, 0.2]} />
        <meshStandardMaterial color={PLASTER} roughness={0.85} />
      </mesh>
      <mesh position={[-3.4, 2.35, 7.5]} receiveShadow>
        <boxGeometry args={[1.9, 4.7, 0.2]} />
        <meshStandardMaterial color={PLASTER} roughness={0.85} />
      </mesh>
      <mesh position={[5.325, 0.06, 7.62]}>
        <boxGeometry args={[5.75, 0.12, 0.04]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
      </mesh>

      {/* Quadro-menu sobre o balcão */}
      <mesh position={[5.4, 3.05, 7.6]}>
        <boxGeometry args={[2.72, 1.62, 0.05]} />
        <meshStandardMaterial color={WOOD_LIGHT} roughness={0.7} />
      </mesh>
      <mesh position={[5.4, 3.05, 7.63]}>
        <planeGeometry args={[2.6, 1.5]} />
        <meshStandardMaterial map={menu ?? undefined} color={menu ? "#ffffff" : "#23262a"} roughness={0.85} />
      </mesh>
      <pointLight position={[5.4, 4.0, 8.4]} intensity={6} distance={4.5} color="#fff1d6" />

      <Counter />

      {TABLES.map(([x, z]) => <CafeTable key={`${x}-${z}`} x={x} z={z} />)}
      {PLANTERS.map(([x, z]) => <Planter key={`${x}-${z}`} x={x} z={z} />)}

      {/* Trilhos pretos fixados à parede do fundo, de onde descem os pendentes */}
      {[
        { x: 4.1, endZ: 13.0 },
        { x: 6.1, endZ: 11.8 },
      ].map(({ x, endZ }) => (
        <mesh key={x} position={[x, railY, (7.6 + endZ) / 2]}>
          <boxGeometry args={[0.06, 0.06, endZ - 7.6]} />
          <meshStandardMaterial color="#141516" roughness={0.5} />
        </mesh>
      ))}
      {TABLES.map(([x, z]) => <Pendant key={`p-${x}-${z}`} x={x < 5 ? 4.1 : 6.1} z={z} railY={railY} />)}
    </group>
  );
}
