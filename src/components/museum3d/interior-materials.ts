"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

export const MUSEUM_WALL_COLOR = "#2d3034"; // Cinza-escuro museológico elegante (como na foto real)
export const MUSEUM_CEILING_COLOR = "#222528";
export const MUSEUM_BASEBOARD_COLOR = "#9c764e"; // Rodapé de madeira em tom carvalho

function drawChevronParquet(ctx: CanvasRenderingContext2D, size: number) {
  // Fundo base em tom carvalho claro
  ctx.fillStyle = "#cca97c";
  ctx.fillRect(0, 0, size, size);

  // Cores de pranchas de carvalho com variações térmicas naturais
  const plankTones = [
    "#dfc299",
    "#d5b487",
    "#caa577",
    "#e5caa6",
    "#d9bc92",
    "#cead7f",
    "#c4a070",
    "#debfa0",
  ];

  const columns = 4; // 4 colunas de chevron (V alternados)
  const colWidth = size / columns;
  const plankHeight = colWidth * 0.42; // altura vertical da régua
  const rows = Math.ceil(size / plankHeight) + 4;

  for (let c = 0; c < columns; c++) {
    const colLeft = c * colWidth;
    const isEvenCol = c % 2 === 0;

    for (let r = -2; r < rows; r++) {
      const topY = r * plankHeight;
      // Variação pseudo-aleatória determinística por régua
      const hash = ((c * 7919 + r * 104729) ^ (c * 31)) % 1000;
      const tone = plankTones[Math.abs(hash) % plankTones.length];

      ctx.save();
      ctx.beginPath();

      if (isEvenCol) {
        // Espinha inclinada descendo para a direita
        ctx.moveTo(colLeft, topY);
        ctx.lineTo(colLeft + colWidth, topY + plankHeight);
        ctx.lineTo(colLeft + colWidth, topY + plankHeight * 2);
        ctx.lineTo(colLeft, topY + plankHeight);
      } else {
        // Espinha inclinada descendo para a esquerda
        ctx.moveTo(colLeft, topY + plankHeight);
        ctx.lineTo(colLeft + colWidth, topY);
        ctx.lineTo(colLeft + colWidth, topY + plankHeight);
        ctx.lineTo(colLeft + colWidth, topY + plankHeight * 2);
      }
      ctx.closePath();
      ctx.fillStyle = tone;
      ctx.fill();

      // Veios longitudinais sutis da madeira
      ctx.clip();
      ctx.lineWidth = 1;
      const grainCount = 10;
      for (let g = 0; g < grainCount; g++) {
        const grainOffset = (g / grainCount) * colWidth;
        ctx.strokeStyle = g % 2 === 0 ? "rgba(75, 52, 30, 0.05)" : "rgba(255, 245, 225, 0.07)";
        ctx.beginPath();
        if (isEvenCol) {
          ctx.moveTo(colLeft + grainOffset, topY - 10);
          ctx.lineTo(colLeft + grainOffset + colWidth, topY + plankHeight + 10);
        } else {
          ctx.moveTo(colLeft + grainOffset, topY + plankHeight + 10);
          ctx.lineTo(colLeft + grainOffset + colWidth, topY - 10);
        }
        ctx.stroke();
      }

      // Junta fina de bisotê / fresta entre réguas
      ctx.strokeStyle = "rgba(48, 35, 22, 0.28)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
  }

  // Textura microscópica tátil da madeira
  for (let i = 0; i < 24000; i++) {
    const x = (i * 137.5) % size;
    const y = (i * 269.3) % size;
    ctx.fillStyle = i % 3 === 0 ? "rgba(255, 255, 240, 0.05)" : "rgba(35, 25, 15, 0.04)";
    ctx.fillRect(x, y, 1.2, 1.2);
  }
}

export function useChevronParquet(repeatX = 7, repeatY = 9) {
  const textures = useMemo(() => {
    if (typeof document === "undefined") return null;
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    drawChevronParquet(ctx, size);

    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(repeatX, repeatY);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;

    // Bump map correspondente com contraste nas juntas
    const bumpCanvas = document.createElement("canvas");
    bumpCanvas.width = bumpCanvas.height = size;
    const bumpCtx = bumpCanvas.getContext("2d");
    if (bumpCtx) {
      bumpCtx.drawImage(canvas, 0, 0);
      bumpCtx.fillStyle = "rgba(0,0,0,0.12)";
      bumpCtx.fillRect(0, 0, size, size);
    }
    const bumpMap = new THREE.CanvasTexture(bumpCanvas);
    bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
    bumpMap.repeat.set(repeatX, repeatY);
    bumpMap.colorSpace = THREE.NoColorSpace;
    bumpMap.anisotropy = 8;

    return { map, bumpMap };
  }, [repeatX, repeatY]);

  useEffect(() => {
    return () => {
      textures?.map.dispose();
      textures?.bumpMap.dispose();
    };
  }, [textures]);

  return textures;
}
