"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { Artwork } from "@/data/artworks";

export interface ArtworkSlot {
  artwork: Artwork;
  position: [number, number, number];
  rotation: [number, number, number];
}

// Linha de olhar de museu: centro da tela pendurado a 1,55 m do piso.
const CANVAS_CENTER_Y = 1.55;
const FALLBACK_LONG_SIDE = 1.35;
const MIN_LONG_SIDE = 0.9;
const MAX_LONG_SIDE = 1.55;
const MAT_MARGIN = 0.05;
const FRAME_MARGIN = 0.08;
const FRAME_DEPTH = 0.11;
// Face interna da parede em coordenadas locais do grupo da obra.
const WALL_FACE_Z = -0.13;

function resolveArtworkSize(artwork: Artwork, texture: THREE.Texture) {
  let aspect = 0.82; // retrato leve até a imagem informar a proporção real
  const image = texture.image as { width?: number; height?: number } | undefined;
  if (image?.width && image?.height) aspect = image.width / image.height;

  if (artwork.larguraCm && artwork.alturaCm) {
    let width = artwork.larguraCm / 100;
    let height = artwork.alturaCm / 100;
    const longest = Math.max(width, height);
    const factor = THREE.MathUtils.clamp(longest, MIN_LONG_SIDE, MAX_LONG_SIDE) / longest;
    width *= factor;
    height *= factor;
    return { width, height };
  }

  return aspect >= 1
    ? { width: FALLBACK_LONG_SIDE, height: FALLBACK_LONG_SIDE / aspect }
    : { width: FALLBACK_LONG_SIDE * aspect, height: FALLBACK_LONG_SIDE };
}

// Plaquinha de parede no padrão de museu: título em itálico, autor e ano.
function makePlaqueTexture(titulo: string, ano: number) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 176;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#ece5d5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(96, 84, 62, 0.4)";
  ctx.lineWidth = 3;
  ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);

  ctx.textAlign = "center";
  ctx.fillStyle = "#332e25";
  let title = titulo;
  let fontSize = 40;
  const setTitleFont = () => {
    ctx.font = `italic 600 ${fontSize}px Georgia, "Times New Roman", serif`;
  };
  setTitleFont();
  while (fontSize > 24 && ctx.measureText(title).width > canvas.width - 56) {
    fontSize -= 2;
    setTitleFont();
  }
  if (ctx.measureText(title).width > canvas.width - 56) {
    while (title.length > 4 && ctx.measureText(`${title}…`).width > canvas.width - 56) {
      title = title.slice(0, -1).trimEnd();
    }
    title = `${title}…`;
  }
  ctx.fillText(title, canvas.width / 2, 76);

  ctx.font = '400 30px Georgia, "Times New Roman", serif';
  ctx.fillStyle = "#6a604c";
  ctx.fillText(`Vincent van Gogh, ${ano}`, canvas.width / 2, 130);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function GalleryArtwork({
  slot,
  registry,
}: {
  slot: ArtworkSlot;
  registry: MutableRefObject<Map<THREE.Object3D, Artwork>>;
}) {
  // TextureLoader usa o arquivo estático diretamente. Montar /_next/image
  // manualmente funciona localmente, mas a Vercel rejeita a URL com 400.
  const texture = useTexture(slot.artwork.imagem);
  const image = useRef<THREE.Mesh>(null);

  const { width, height } = useMemo(
    () => resolveArtworkSize(slot.artwork, texture),
    [slot.artwork, texture],
  );
  const plaqueTexture = useMemo(
    () => makePlaqueTexture(slot.artwork.titulo, slot.artwork.ano),
    [slot.artwork.titulo, slot.artwork.ano],
  );

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    const mesh = image.current;
    if (!mesh) return;
    registry.current.set(mesh, slot.artwork);
    return () => {
      registry.current.delete(mesh);
    };
  }, [registry, slot.artwork, texture]);

  const matWidth = width + MAT_MARGIN * 2;
  const matHeight = height + MAT_MARGIN * 2;
  const frameWidth = matWidth + FRAME_MARGIN * 2;
  const frameHeight = matHeight + FRAME_MARGIN * 2;
  const frameTop = CANVAS_CENTER_Y + frameHeight / 2;
  const plaqueY = CANVAS_CENTER_Y - frameHeight / 2 - 0.16;
  const lightLength = THREE.MathUtils.clamp(width * 0.55, 0.26, 0.72);

  return <group position={slot.position} rotation={slot.rotation}>
    {/* Moldura de madeira escura, fundo rente à parede */}
    <mesh position={[0, CANVAS_CENTER_Y, WALL_FACE_Z + FRAME_DEPTH / 2 - 0.01]} castShadow>
      <boxGeometry args={[frameWidth, frameHeight, FRAME_DEPTH]} />
      <meshStandardMaterial color="#4c2e13" roughness={0.45} metalness={0.25} />
    </mesh>
    {/* Passe-partout dourado */}
    <mesh position={[0, CANVAS_CENTER_Y, -0.022]}>
      <planeGeometry args={[matWidth, matHeight]} />
      <meshStandardMaterial color="#d9a749" roughness={0.5} metalness={0.35} />
    </mesh>
    {/* Tela: material unlit preserva a fidelidade de cor da digitalização */}
    <mesh ref={image} position={[0, CANVAS_CENTER_Y, -0.012]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>

    {/* Luminária de quadro (apenas visual, sem luz real por obra) */}
    <mesh position={[0, frameTop + 0.075, -0.02]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.018, 0.018, lightLength, 10]} />
      <meshStandardMaterial color="#b08d3f" metalness={0.85} roughness={0.3} />
    </mesh>
    <mesh position={[0, frameTop + 0.075, -0.075]}>
      <boxGeometry args={[0.025, 0.025, 0.11]} />
      <meshStandardMaterial color="#8a6c30" metalness={0.8} roughness={0.35} />
    </mesh>
    <mesh position={[0, frameTop + 0.056, -0.022]} rotation={[0.35, 0, 0]}>
      <boxGeometry args={[lightLength, 0.014, 0.055]} />
      <meshStandardMaterial color="#ffdf9e" emissive="#ffd88a" emissiveIntensity={1.6} toneMapped={false} />
    </mesh>

    {/* Plaquinha de identificação sob a obra */}
    <mesh position={[0, plaqueY, -0.13]}>
      <boxGeometry args={[0.38, 0.145, 0.016]} />
      <meshStandardMaterial color="#ddd5c2" roughness={0.6} />
    </mesh>
    <mesh position={[0, plaqueY, -0.114]}>
      <planeGeometry args={[0.36, 0.125]} />
      {plaqueTexture
        ? <meshBasicMaterial map={plaqueTexture} toneMapped={false} />
        : <meshStandardMaterial color="#ece5d5" roughness={0.7} />}
    </mesh>
  </group>;
}
