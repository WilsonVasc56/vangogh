"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

export type VaseVariant = 0 | 1 | 2 | 3;

/** Textura procedural de mármore claro polido para o plinto cilíndrico */
function useMarbleTexture() {
  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Fundo mármore branco/marfim
    ctx.fillStyle = "#f6f4ee";
    ctx.fillRect(0, 0, size, size);

    // Nuances sutis de calcário
    for (let i = 0; i < 18000; i++) {
      const x = (i * 97) % size;
      const y = (i * 193) % size;
      ctx.fillStyle = i % 2 === 0 ? "rgba(225, 220, 212, 0.04)" : "rgba(255, 255, 255, 0.05)";
      ctx.fillRect(x, y, 2.5, 2.5);
    }

    // Veios orgânicos de mármore cinza/taupe
    const veins = [
      { startX: 40, startY: 0, endX: 380, endY: 512, width: 2.2, color: "rgba(135, 130, 122, 0.22)" },
      { startX: 180, startY: 0, endX: 490, endY: 512, width: 1.5, color: "rgba(150, 144, 136, 0.18)" },
      { startX: 0, startY: 120, endX: 512, endY: 340, width: 1.8, color: "rgba(140, 135, 127, 0.16)" },
      { startX: 280, startY: 0, endX: 90, endY: 512, width: 1.2, color: "rgba(160, 155, 148, 0.15)" },
    ];

    veins.forEach((vein) => {
      ctx.beginPath();
      ctx.moveTo(vein.startX, vein.startY);
      let cx = vein.startX;
      let cy = vein.startY;
      const steps = 16;
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        const targetX = vein.startX + (vein.endX - vein.startX) * t;
        const targetY = vein.startY + (vein.endY - vein.startY) * t;
        const jitterX = Math.sin(t * 14.5 + vein.width) * 22;
        cx = targetX + jitterX;
        cy = targetY;
        ctx.lineTo(cx, cy);
      }
      ctx.strokeStyle = vein.color;
      ctx.lineWidth = vein.width;
      ctx.stroke();
    });

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(1.5, 2);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    return map;
  }, []);

  useEffect(() => {
    return () => texture?.dispose();
  }, [texture]);

  return texture;
}

/** Plinto cilíndrico de mármore branco de museu (como na referência) */
function MarblePlinth({ children }: { children?: React.ReactNode }) {
  const marble = useMarbleTexture();
  return (
    <group>
      {/* Base chanfrada do plinto */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.46, 0.48, 0.04, 36]} />
        <meshStandardMaterial map={marble ?? undefined} color="#f4f1ea" roughness={0.34} metalness={0.06} />
      </mesh>
      {/* Coluna cilíndrica principal */}
      <mesh position={[0, 0.43, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.43, 0.45, 0.78, 36]} />
        <meshStandardMaterial map={marble ?? undefined} color="#f4f1ea" roughness={0.32} metalness={0.06} />
      </mesh>
      {/* Topo com borda suave */}
      <mesh position={[0, 0.83, 0]} receiveShadow>
        <cylinderGeometry args={[0.445, 0.435, 0.02, 36]} />
        <meshStandardMaterial map={marble ?? undefined} color="#f8f5ee" roughness={0.28} metalness={0.08} />
      </mesh>
      {/* Objeto artístico apoiado no plinto */}
      <group position={[0, 0.84, 0]}>{children}</group>
    </group>
  );
}

/**
 * Exemplo 1: Vaso Bicolor com Mãos Esculpidas
 * Vaso canelado em cerâmica preta acetinada, abraçado por mãos esculpidas em porcelana marfim,
 * com galhos secos finos emergindo do topo.
 */
function HandsEmbraceVase() {
  const branchGeometry = useMemo(() => {
    const points: [THREE.Vector3, THREE.Vector3][] = [
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.04, 0.35, -0.02)],
      [new THREE.Vector3(0.04, 0.35, -0.02), new THREE.Vector3(0.12, 0.58, 0.04)],
      [new THREE.Vector3(0.04, 0.35, -0.02), new THREE.Vector3(-0.06, 0.52, -0.05)],
      [new THREE.Vector3(0.12, 0.58, 0.04), new THREE.Vector3(0.18, 0.74, 0.08)],
      [new THREE.Vector3(0.12, 0.58, 0.04), new THREE.Vector3(0.08, 0.69, -0.02)],
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.06, 0.32, 0.03)],
      [new THREE.Vector3(-0.06, 0.32, 0.03), new THREE.Vector3(-0.16, 0.55, 0.07)],
      [new THREE.Vector3(-0.06, 0.32, 0.03), new THREE.Vector3(-0.02, 0.62, -0.04)],
      [new THREE.Vector3(-0.16, 0.55, 0.07), new THREE.Vector3(-0.22, 0.72, 0.12)],
    ];
    return points;
  }, []);

  return (
    <group scale={0.72}>
      {/* Corpo canelado do vaso em cerâmica preta acetinada */}
      <group position={[0.02, 0, 0]}>
        {Array.from({ length: 14 }).map((_, i) => {
          const angle = (i / 14) * Math.PI * 1.3 - 0.2;
          const radius = 0.18 + Math.sin((i / 14) * Math.PI) * 0.05;
          return (
            <mesh
              key={i}
              position={[Math.cos(angle) * radius, 0.28, Math.sin(angle) * radius]}
              rotation={[0, -angle, 0.08]}
              castShadow
            >
              <capsuleGeometry args={[0.032, 0.44, 8, 16]} />
              <meshStandardMaterial color="#212326" roughness={0.88} metalness={0.12} />
            </mesh>
          );
        })}
        {/* Núcleo interno escuro */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.16, 0.56, 24]} />
          <meshStandardMaterial color="#191b1d" roughness={0.9} />
        </mesh>
      </group>

      {/* Mão e braço esculpidos em porcelana marfim envolvendo o vaso */}
      <group position={[-0.05, 0.32, 0.02]} rotation={[0, 0.25, 0.18]}>
        {/* Palma / dorso da mão */}
        <mesh position={[-0.08, 0, 0]} rotation={[0, 0.3, 0.15]} castShadow>
          <capsuleGeometry args={[0.065, 0.24, 10, 16]} />
          <meshStandardMaterial color="#f0ece4" roughness={0.65} metalness={0.05} />
        </mesh>
        {/* Dedos esculpidos abraçando a curva do vaso */}
        {[
          { y: 0.14, len: 0.26, rotZ: -0.65, rotY: 0.42, rad: 0.026 },
          { y: 0.07, len: 0.31, rotZ: -0.58, rotY: 0.48, rad: 0.027 },
          { y: -0.01, len: 0.29, rotZ: -0.52, rotY: 0.52, rad: 0.026 },
          { y: -0.08, len: 0.24, rotZ: -0.46, rotY: 0.54, rad: 0.023 },
        ].map((finger, idx) => (
          <group key={idx} position={[-0.02, finger.y, 0.06]} rotation={[0.1, finger.rotY, finger.rotZ]}>
            <mesh position={[finger.len * 0.48, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <capsuleGeometry args={[finger.rad, finger.len, 8, 12]} />
              <meshStandardMaterial color="#efece5" roughness={0.65} metalness={0.05} />
            </mesh>
            {/* Ponta da falange curvada */}
            <mesh position={[finger.len * 0.95, -0.02, -0.04]} rotation={[0, -0.4, Math.PI / 2]} castShadow>
              <sphereGeometry args={[finger.rad * 0.95, 8, 8]} />
              <meshStandardMaterial color="#eeeae2" roughness={0.65} metalness={0.05} />
            </mesh>
          </group>
        ))}
        {/* Polegar oposto */}
        <mesh position={[-0.04, -0.08, -0.1]} rotation={[-0.4, -0.6, 0.3]} castShadow>
          <capsuleGeometry args={[0.028, 0.16, 8, 12]} />
          <meshStandardMaterial color="#f0ede6" roughness={0.65} metalness={0.05} />
        </mesh>
      </group>

      {/* Boca do vaso em marfim */}
      <mesh position={[0.02, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.095, 0.08, 24]} />
        <meshStandardMaterial color="#f0ede6" roughness={0.68} />
      </mesh>

      {/* Galhos secos naturais saindo do vaso */}
      <group position={[0.02, 0.62, 0]}>
        {branchGeometry.map(([start, end], idx) => {
          const dir = end.clone().sub(start);
          const len = dir.length();
          const mid = start.clone().add(end).multiplyScalar(0.5);
          const orientation = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            dir.clone().normalize()
          );
          return (
            <mesh key={idx} position={mid} quaternion={orientation} castShadow>
              <cylinderGeometry args={[0.004, 0.007, len, 5]} />
              <meshStandardMaterial color="#4d3826" roughness={0.96} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

/**
 * Exemplo 2: Vaso Paramétrico Fluted Flame / Espiral
 * Escultura cerâmica branca fosca com aletas/nervuras paramétricas verticais
 * formando uma silhueta de chama com cavidade espiral orgânica.
 */
function ParametricFlameVase() {
  const finCount = 28;
  return (
    <group scale={0.75} position={[0, 0.04, 0]}>
      {/* Conjunto de aletas paramétricas radiais finas */}
      {Array.from({ length: finCount }).map((_, i) => {
        const u = i / finCount;
        const angle = u * Math.PI * 1.85 - 0.4;
        const height = 0.62 + Math.sin(u * Math.PI * 1.3) * 0.22;
        const taper = 0.12 + Math.sin(u * Math.PI) * 0.14;
        const twist = Math.sin(u * Math.PI * 2) * 0.25;

        return (
          <group key={i} rotation={[0, angle, 0]}>
            <mesh
              position={[taper, height / 2, twist * 0.15]}
              rotation={[twist * 0.3, 0, (u - 0.5) * 0.18]}
              castShadow
            >
              <boxGeometry args={[0.016, height, 0.075]} />
              <meshStandardMaterial color="#edeae2" roughness={0.78} metalness={0.04} />
            </mesh>
          </group>
        );
      })}

      {/* Parede interna da cavidade em espiral suave */}
      <mesh position={[-0.02, 0.38, 0]} rotation={[0.1, 0.4, -0.15]} castShadow>
        <cylinderGeometry args={[0.08, 0.16, 0.64, 28, 1, true]} />
        <meshStandardMaterial color="#dfdbd2" side={THREE.DoubleSide} roughness={0.82} />
      </mesh>

      {/* Base chanfrada circular */}
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[0.18, 0.2, 0.03, 32]} />
        <meshStandardMaterial color="#e5e1d7" roughness={0.75} />
      </mesh>
    </group>
  );
}

/**
 * Exemplo 3: Vaso Lírio Orgânico com Folha de Ouro
 * Vaso escultural em porcelana marfim acetinada com boca sinuosa em pétala de lírio,
 * com fendas esculpidas e borda forradas em folha de ouro radiante.
 */
function CallaLilyGoldVase() {
  return (
    <group scale={0.74} position={[0, 0.02, 0]}>
      {/* Base de apoio arredondada */}
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.03, 32]} />
        <meshStandardMaterial color="#ece9e1" roughness={0.65} />
      </mesh>

      {/* Corpo bojudo fluído do vaso */}
      <mesh position={[0, 0.36, 0]} scale={[1, 1.35, 1]} castShadow>
        <sphereGeometry args={[0.2, 32, 24]} />
        <meshStandardMaterial color="#f7f5ee" roughness={0.52} metalness={0.06} />
      </mesh>

      {/* Pescoço e boca assimétrica estilo pétala de lírio / Calla Lily */}
      <mesh position={[0.03, 0.68, 0]} rotation={[0.15, 0, -0.22]} castShadow>
        <cylinderGeometry args={[0.13, 0.09, 0.34, 32, 1, true]} />
        <meshStandardMaterial color="#f8f6f0" side={THREE.DoubleSide} roughness={0.48} metalness={0.06} />
      </mesh>

      {/* Borda dourada curva do lábio do vaso */}
      <mesh position={[0.06, 0.84, 0]} rotation={[0.18, 0, -0.25]} castShadow>
        <torusGeometry args={[0.132, 0.012, 12, 36]} />
        <meshStandardMaterial color="#e5b84c" metalness={0.88} roughness={0.22} />
      </mesh>

      {/* Fendas orgânicas em folha de ouro ao redor do corpo */}
      {Array.from({ length: 6 }).map((_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        const y = 0.28 + (i % 2) * 0.14;
        const height = 0.22 + (i % 3) * 0.06;
        return (
          <group key={i} position={[0, y, 0]} rotation={[0, angle, 0.08]}>
            {/* Relevo em fenda folheada a ouro */}
            <mesh position={[0.192, 0, 0]} rotation={[0, 0, 0.12]} castShadow>
              <capsuleGeometry args={[0.016, height, 8, 14]} />
              <meshStandardMaterial color="#e8bc52" metalness={0.88} roughness={0.24} />
            </mesh>
            {/* Moldura dourada saliente ao redor da fenda */}
            <mesh position={[0.198, 0, 0]} rotation={[0, 0, 0.12]}>
              <capsuleGeometry args={[0.024, height * 0.9, 6, 12]} />
              <meshStandardMaterial color="#dfb247" metalness={0.85} roughness={0.26} wireframe />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * Exemplo 4: Escultura de Gazela / Íbex Dourado
 * Estatueta estilizada em porcelana marfim com grande chifre circular canelado em ouro,
 * filigranas douradas em arabesco e pedestal orgânico fluido.
 */
function GoldenHornIbexSculpture() {
  return (
    <group scale={0.72} position={[0, 0.02, 0]}>
      {/* Pedestal fluido em onda esculpida */}
      <mesh position={[0, 0.12, 0]} rotation={[0, 0.2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.48, 0.22, 0.24]} />
        <meshStandardMaterial color="#ece7dc" roughness={0.84} />
      </mesh>
      <mesh position={[-0.08, 0.28, 0]} rotation={[0, 0, 0.35]} castShadow>
        <cylinderGeometry args={[0.14, 0.22, 0.26, 16]} />
        <meshStandardMaterial color="#ede8dd" roughness={0.82} />
      </mesh>

      {/* Corpo da gazela em postura altiva */}
      <group position={[0.02, 0.44, 0]}>
        {/* Tronco estilizado */}
        <mesh position={[0, 0, 0]} rotation={[0, 0, -0.32]} castShadow>
          <capsuleGeometry args={[0.1, 0.26, 10, 16]} />
          <meshStandardMaterial color="#efebe0" roughness={0.82} />
        </mesh>

        {/* Perna traseira apoiada */}
        <mesh position={[0.16, -0.16, 0.02]} rotation={[0, 0, 0.22]} castShadow>
          <cylinderGeometry args={[0.026, 0.034, 0.34, 8]} />
          <meshStandardMaterial color="#eee9de" roughness={0.82} />
        </mesh>

        {/* Perna dianteira erguida elegante */}
        <mesh position={[-0.14, -0.06, 0.04]} rotation={[0, 0, 0.95]} castShadow>
          <cylinderGeometry args={[0.022, 0.028, 0.28, 8]} />
          <meshStandardMaterial color="#eee9de" roughness={0.82} />
        </mesh>
        <mesh position={[-0.24, -0.18, 0.04]} rotation={[0, 0, 0.2]} castShadow>
          <cylinderGeometry args={[0.018, 0.022, 0.22, 8]} />
          <meshStandardMaterial color="#eee9de" roughness={0.82} />
        </mesh>

        {/* Pescoço gracioso erguido */}
        <mesh position={[-0.12, 0.22, 0]} rotation={[0, 0, 0.42]} castShadow>
          <cylinderGeometry args={[0.045, 0.075, 0.32, 12]} />
          <meshStandardMaterial color="#f0ece2" roughness={0.8} />
        </mesh>

        {/* Cabeça estilizada de gazela */}
        <mesh position={[-0.2, 0.38, 0]} rotation={[0, 0, -0.45]} castShadow>
          <coneGeometry args={[0.055, 0.16, 12]} />
          <meshStandardMaterial color="#f1ede4" roughness={0.78} />
        </mesh>
        {/* Orelha */}
        <mesh position={[-0.16, 0.44, 0.04]} rotation={[0.4, 0, 0.7]} castShadow>
          <coneGeometry args={[0.018, 0.08, 6]} />
          <meshStandardMaterial color="#f1ede4" roughness={0.78} />
        </mesh>

        {/* Cauda curva empinada */}
        <mesh position={[0.18, 0.12, 0]} rotation={[0, 0, 1.4]} castShadow>
          <coneGeometry args={[0.02, 0.16, 8]} />
          <meshStandardMaterial color="#f1ede4" roughness={0.78} />
        </mesh>

        {/* Filigranas douradas em relevo barroco sobre a anca e flanco */}
        <mesh position={[0.04, 0.03, 0.092]} rotation={[0, 0, 0.15]}>
          <ringGeometry args={[0.03, 0.065, 16]} />
          <meshStandardMaterial color="#e2b449" metalness={0.9} roughness={0.24} />
        </mesh>
        <mesh position={[-0.04, 0.14, 0.068]} rotation={[0, 0, 0.35]}>
          <ringGeometry args={[0.02, 0.05, 16]} />
          <meshStandardMaterial color="#e2b449" metalness={0.9} roughness={0.24} />
        </mesh>

        {/* Grande chifre circular canelado em ouro puro formando um arco triunfal */}
        <group position={[-0.13, 0.42, 0]} rotation={[0, 0, -0.6]}>
          <mesh castShadow>
            <torusGeometry args={[0.27, 0.034, 14, 48, Math.PI * 1.55]} />
            <meshStandardMaterial color="#e3b74c" metalness={0.9} roughness={0.22} />
          </mesh>
          {/* Anéis de caneluras do chifre de íbex */}
          {Array.from({ length: 18 }).map((_, i) => {
            const angle = (i / 18) * Math.PI * 1.55;
            const x = Math.cos(angle) * 0.27;
            const y = Math.sin(angle) * 0.27;
            return (
              <mesh key={i} position={[x, y, 0]} rotation={[0, 0, angle]}>
                <cylinderGeometry args={[0.038, 0.038, 0.014, 10]} />
                <meshStandardMaterial color="#f0cb64" metalness={0.92} roughness={0.2} />
              </mesh>
            );
          })}
        </group>
      </group>
    </group>
  );
}

/**
 * Componente Geral de Peça de Arte de Museu:
 * Renderiza um dos 4 modelos artísticos apoiados em plinto de mármore branco,
 * com spot de iluminação suave focado diretamente sobre a escultura.
 */
export function MuseumArtPiece({
  position,
  rotationY = 0,
  variant = 0,
}: {
  position: [number, number, number];
  rotationY?: number;
  variant?: VaseVariant;
}) {
  // Alvo do spot criado como objeto do próprio three: mutar .current de um ref
  // durante o render violaria as regras do React Compiler.
  const lightTarget = useMemo(() => new THREE.Object3D(), []);

  const piece = useMemo(() => {
    switch (variant) {
      case 0:
        return <HandsEmbraceVase />;
      case 1:
        return <ParametricFlameVase />;
      case 2:
        return <CallaLilyGoldVase />;
      case 3:
      default:
        return <GoldenHornIbexSculpture />;
    }
  }, [variant]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Alvo da iluminação pontual no topo da peça; precisa estar na cena */}
      <primitive object={lightTarget} position={[0, 1.2, 0]} />

      {/* Spot de destaque suave de museu */}
      <spotLight
        position={[0, 3.4, 0.3]}
        target={lightTarget}
        intensity={22}
        distance={4.8}
        angle={0.42}
        penumbra={0.78}
        color="#fff4d8"
      />

      {/* Plinto de mármore branco com a escultura apoiada */}
      <MarblePlinth>{piece}</MarblePlinth>
    </group>
  );
}
