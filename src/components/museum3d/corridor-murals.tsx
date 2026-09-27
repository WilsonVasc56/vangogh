"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { wrapText } from "./scene/canvas-text";

interface MuralSpec {
  imageSrc: string;
  quote: string;
  author: string;
  source: string;
  position: [number, number, number];
  rotationY: number;
}

const MURAL_SPECS: readonly MuralSpec[] = [
  {
    imageSrc: "/artworks/autorretrato-com-chapeu-de-palha.jpg",
    quote: "O que seria da vida se não tivéssemos coragem de tentar coisa alguma?",
    author: "VINCENT VAN GOGH",
    source: "Carta a Theo, 1881",
    position: [-2.28, 2.15, 6.4],
    rotationY: Math.PI / 2, // Volta-se para o corredor (+X)
  },
  {
    imageSrc: "/artworks/autorretrato-1889.jpg",
    quote: "Eu sonho com a minha pintura e então pinto o meu sonho.",
    author: "VINCENT VAN GOGH",
    source: "Carta a Theo",
    position: [2.28, 2.15, 6.4],
    rotationY: -Math.PI / 2, // Volta-se para o corredor (-X)
  },
  {
    imageSrc: "/artworks/autorretrato-com-orelha-enfaixada.jpg",
    quote: "Não há nada mais verdadeiramente artístico do que amar as pessoas.",
    author: "VINCENT VAN GOGH",
    source: "Carta a Theo, 1888",
    position: [-2.28, 2.15, 3.5],
    rotationY: Math.PI / 2,
  },
  {
    imageSrc: "/artworks/autorretrato-1889.jpg",
    quote: "Eu ponho o meu coração e a minha alma no meu trabalho, e perdi a minha razão no processo.",
    author: "VINCENT VAN GOGH",
    source: "Carta a Theo",
    position: [2.28, 2.15, 3.5],
    rotationY: -Math.PI / 2,
  },
  {
    imageSrc: "/artworks/autorretrato-com-chapeu-de-palha.jpg",
    quote: "Prefiro morrer de paixão do que de tédio.",
    author: "VINCENT VAN GOGH",
    source: "Carta a Theo, 1884",
    position: [-2.28, 2.15, 0.6],
    rotationY: Math.PI / 2,
  },
  {
    imageSrc: "/artworks/autorretrato-com-orelha-enfaixada.jpg",
    quote: "Grandes coisas não são feitas por impulso, mas pela soma de pequenas coisas reunidas.",
    author: "VINCENT VAN GOGH",
    source: "Carta a Theo, 1882",
    position: [2.28, 2.15, 0.6],
    rotationY: -Math.PI / 2,
  },
];

function createMuralTexture(spec: MuralSpec): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const width = 1024;
  const height = 640;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Fundo museológico escuro antracite
  ctx.fillStyle = "#181b1e";
  ctx.fillRect(0, 0, width, height);

  // Borda decorativa dourada fina interna
  ctx.strokeStyle = "rgba(205, 168, 85, 0.4)";
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, width - 36, height - 36);

  // Carrega e desenha o retrato de Van Gogh
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = spec.imageSrc;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  const drawContent = () => {
    // Fundo base
    ctx.fillStyle = "#181b1e";
    ctx.fillRect(0, 0, width, height);

    // Borda fina dourada
    ctx.strokeStyle = "rgba(205, 168, 85, 0.38)";
    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, width - 36, height - 36);

    // Retrato de Van Gogh (lado esquerdo do painel)
    const imgX = 36;
    const imgY = 36;
    const imgW = 400;
    const imgH = height - 72;

    if (img.complete && img.naturalWidth > 0) {
      ctx.save();
      // Moldura interna da foto
      ctx.beginPath();
      ctx.rect(imgX, imgY, imgW, imgH);
      ctx.clip();
      ctx.drawImage(img, imgX, imgY, imgW, imgH);
      // Vinheta sutil e acabamento quente
      const grad = ctx.createLinearGradient(imgX, imgY, imgX + imgW, imgY);
      grad.addColorStop(0, "rgba(24, 27, 30, 0.0)");
      grad.addColorStop(0.85, "rgba(24, 27, 30, 0.2)");
      grad.addColorStop(1, "rgba(24, 27, 30, 0.85)");
      ctx.fillStyle = grad;
      ctx.fillRect(imgX, imgY, imgW, imgH);
      ctx.restore();
    } else {
      ctx.fillStyle = "#262b30";
      ctx.fillRect(imgX, imgY, imgW, imgH);
    }

    // Filete divisório dourado vertical
    ctx.strokeStyle = "rgba(215, 178, 92, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(imgX + imgW + 28, 50);
    ctx.lineTo(imgX + imgW + 28, height - 50);
    ctx.stroke();

    // Lado direito: tipografia contemporânea com a frase inspiradora
    const textX = imgX + imgW + 65;
    const maxTextWidth = width - textX - 45;

    // Grande aspas decorativa dourada
    ctx.fillStyle = "rgba(220, 180, 88, 0.38)";
    ctx.font = "italic 78px Georgia, serif";
    ctx.fillText("“", textX - 8, 120);

    // Texto da citação em tom marfim claro
    ctx.fillStyle = "#f3ede3";
    ctx.font = "italic 33px Georgia, serif";
    const lines = wrapText((value) => ctx.measureText(value).width, spec.quote, maxTextWidth);
    const lineHeight = 46;
    const startY = 160;

    lines.forEach((line, idx) => {
      ctx.fillText(line, textX, startY + idx * lineHeight);
    });

    // Fechamento da aspas
    ctx.fillStyle = "rgba(220, 180, 88, 0.38)";
    ctx.font = "italic 48px Georgia, serif";
    ctx.fillText("”", textX + ctx.measureText(lines[lines.length - 1]).width + 6, startY + (lines.length - 1) * lineHeight + 4);

    // Linha de assinatura
    const authorY = height - 120;
    ctx.fillStyle = "#dfb455";
    ctx.font = "600 21px 'Segoe UI', Arial, sans-serif";
    ctx.letterSpacing = "2px";
    ctx.fillText(spec.author, textX, authorY);

    // Origem / carta histórica
    ctx.fillStyle = "rgba(205, 195, 180, 0.72)";
    ctx.font = "italic 18px Georgia, serif";
    ctx.fillText(spec.source, textX, authorY + 30);

    texture.needsUpdate = true;
  };

  img.onload = drawContent;
  drawContent();

  return texture;
}

function MuralPanel({ spec }: { spec: MuralSpec }) {
  const texture = useMemo(() => createMuralTexture(spec), [spec]);

  useEffect(() => {
    return () => texture?.dispose();
  }, [texture]);

  return (
    <group position={spec.position} rotation={[0, spec.rotationY, 0]}>
      {/* Moldura metálica externa em latão escovado / ouro envelhecido */}
      <mesh castShadow>
        <boxGeometry args={[2.32, 1.48, 0.045]} />
        <meshStandardMaterial color="#c09d52" metalness={0.75} roughness={0.35} />
      </mesh>

      {/* Painel gráfico frontal com imagem e citação */}
      <mesh position={[0, 0, 0.026]}>
        <planeGeometry args={[2.26, 1.42]} />
        <meshStandardMaterial
          map={texture ?? undefined}
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>

      {/* Spot de iluminação pontual sobre o mural */}
      <pointLight position={[0, 1.1, 0.85]} intensity={18} distance={3.8} color="#fff1d6" />
    </group>
  );
}

/**
 * Murais expositivos do corredor de entrada:
 * 6 painéis contemporâneos com retratos de Vincent van Gogh e citações inspiradoras.
 */
export function CorridorMurals() {
  return (
    <group name="corridor-murals">
      {MURAL_SPECS.map((spec, idx) => (
        <MuralPanel key={idx} spec={spec} />
      ))}
    </group>
  );
}
