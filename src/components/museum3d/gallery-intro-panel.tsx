"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { artworks } from "@/data/artworks";
import { periods, type Period } from "@/data/periods";
import { wrapText } from "./scene/canvas-text";

/**
 * Painel interpretativo que abre a galeria.
 *
 * Fica na face interna oeste do corredor (`x = -2,28`), no trecho vazio entre o
 * portal do prédio (`z = 8,55`) e o primeiro mural (`z = 7,56`); por isso a largura
 * útil é de apenas ~0,99 m. Texto, anos e local vêm de `src/data/periods.ts`, e a
 * rota cronológica é montada a partir do mesmo arquivo — nada de conteúdo fixo aqui.
 *
 * Sem caixa de colisão: o painel é rente à parede, como o rodapé do corredor, e a
 * passagem já limita o visitante a `|x| <= 2,3 - PLAYER_RADIUS`.
 */

const PANEL_X = -2.28;
const PANEL_Z = 8.05;
const PANEL_ROTATION_Y = Math.PI / 2; // face frontal voltada para o corredor (+X)
const PANEL_CENTER_Y = 1.55; // linha de olhar de museu

const FRAME_WIDTH = 0.92;
const FRAME_HEIGHT = 2.36;
const FRAME_DEPTH = 0.05;

// Proporção 768 x 2048 (0,375) para o texto não ser esticado na parede.
const GRAPHIC_WIDTH = 0.84;
const GRAPHIC_HEIGHT = 2.24;

const CANVAS_WIDTH = 768;
const CANVAS_HEIGHT = 2048;
const CANVAS_PADDING = 56;

const INTRO_PERIOD_ID = "nuenen";

const GOLD = "#dfb455";
const GOLD_SOFT = "rgba(205, 168, 85, 0.4)";
const GOLD_RULE = "rgba(205, 168, 85, 0.28)";
const IVORY = "#f3ede3";
const MUTED = "rgba(205, 195, 180, 0.72)";
const BACKGROUND = "#181b1e";
const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = "'Segoe UI', Arial, sans-serif";

function drawDivider(ctx: CanvasRenderingContext2D, y: number) {
  ctx.strokeStyle = GOLD_RULE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CANVAS_PADDING, y);
  ctx.lineTo(CANVAS_WIDTH - CANVAS_PADDING, y);
  ctx.stroke();
}

function drawKicker(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: CanvasTextAlign,
) {
  ctx.save();
  ctx.textAlign = align;
  ctx.fillStyle = GOLD;
  ctx.font = `600 24px ${SANS}`;
  ctx.letterSpacing = "4px";
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawPanel(ctx: CanvasRenderingContext2D, period: Period, workCount: number) {
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.strokeStyle = GOLD_SOFT;
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, CANVAS_WIDTH - 48, CANVAS_HEIGHT - 48);

  // Cabeçalho: período, nome da sala e anos
  drawKicker(ctx, "INTRODUÇÃO", CANVAS_WIDTH / 2, 122, "center");
  ctx.textAlign = "center";
  ctx.fillStyle = IVORY;
  ctx.font = `600 92px ${SERIF}`;
  ctx.fillText(period.nome, CANVAS_WIDTH / 2, 224);
  ctx.fillStyle = GOLD;
  ctx.font = `500 40px ${SANS}`;
  ctx.fillText(period.anos, CANVAS_WIDTH / 2, 284);
  ctx.textAlign = "left";

  drawDivider(ctx, 336);

  const textWidth = CANVAS_WIDTH - CANVAS_PADDING * 2;
  let cursor = 394;

  drawKicker(ctx, "O PERÍODO", CANVAS_PADDING, cursor, "left");
  cursor += 62;
  ctx.fillStyle = IVORY;
  ctx.font = `italic 34px ${SERIF}`;
  const descriptionLines = wrapText(
    (value) => ctx.measureText(value).width,
    period.descricao,
    textWidth,
  );
  for (const line of descriptionLines) {
    ctx.fillText(line, CANVAS_PADDING, cursor);
    cursor += 48;
  }

  cursor += 32;
  drawKicker(ctx, "LOCAL", CANVAS_PADDING, cursor, "left");
  cursor += 52;
  ctx.fillStyle = MUTED;
  ctx.font = `400 34px ${SERIF}`;
  ctx.fillText(period.local, CANVAS_PADDING, cursor);

  cursor += 66;
  drawDivider(ctx, cursor);

  cursor += 60;
  drawKicker(ctx, "A ROTA DE VAN GOGH", CANVAS_PADDING, cursor, "left");

  // Rota cronológica vertical: a lista de períodos é a própria fonte da verdade.
  const routeX = 118;
  const labelX = routeX + 46;
  const step = 162;
  const firstY = Math.max(cursor + 84, 1090);
  const lastY = firstY + step * (periods.length - 1);
  const introIndex = periods.findIndex((item) => item.id === INTRO_PERIOD_ID);

  ctx.strokeStyle = "rgba(205, 168, 85, 0.32)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(routeX, firstY);
  ctx.lineTo(routeX, lastY);
  ctx.stroke();

  periods.forEach((item, index) => {
    const y = firstY + index * step;
    const highlight = index === introIndex;

    ctx.beginPath();
    ctx.arc(routeX, y, 16, 0, Math.PI * 2);
    ctx.fillStyle = highlight ? GOLD : BACKGROUND;
    ctx.fill();
    ctx.strokeStyle = highlight ? GOLD : GOLD_SOFT;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = highlight ? GOLD : IVORY;
    ctx.font = `600 38px ${SERIF}`;
    ctx.fillText(item.nome, labelX, y + 6);

    ctx.fillStyle = MUTED;
    ctx.font = `400 26px ${SANS}`;
    ctx.fillText(item.anos, labelX, y + 42);

    if (highlight) {
      drawKicker(ctx, "VOCÊ COMEÇA AQUI", labelX, y + 76, "left");
    }
  });

  const footerY = lastY + 96;
  drawDivider(ctx, footerY);
  drawKicker(ctx, `${workCount} OBRAS DESTE PERÍODO`, CANVAS_WIDTH / 2, footerY + 56, "center");
  drawKicker(ctx, "VAN GOGH MUSEUM", CANVAS_WIDTH / 2, footerY + 108, "center");
}

function createIntroPanelTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const period = periods.find((item) => item.id === INTRO_PERIOD_ID);
  if (!period) return null;

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const workCount = artworks.filter((artwork) => artwork.periodo === period.id).length;
  drawPanel(ctx, period, workCount);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function GalleryIntroPanel() {
  const texture = useMemo(() => createIntroPanelTexture(), []);

  useEffect(() => () => texture?.dispose(), [texture]);

  return (
    <group
      name="gallery-intro-panel"
      position={[PANEL_X, 0, PANEL_Z]}
      rotation={[0, PANEL_ROTATION_Y, 0]}
    >
      {/* Moldura fina em latão, na mesma família dos murais do corredor */}
      <mesh position={[0, PANEL_CENTER_Y, 0]} castShadow>
        <boxGeometry args={[FRAME_WIDTH, FRAME_HEIGHT, FRAME_DEPTH]} />
        <meshStandardMaterial color="#c09d52" metalness={0.75} roughness={0.35} />
      </mesh>

      {/* Superfície gráfica: texto do período e rota cronológica */}
      <mesh position={[0, PANEL_CENTER_Y, 0.026]}>
        <planeGeometry args={[GRAPHIC_WIDTH, GRAPHIC_HEIGHT]} />
        <meshStandardMaterial
          map={texture ?? undefined}
          roughness={0.7}
          metalness={0.05}
        />
      </mesh>

      {/* Spot dedicado: o corredor tem pouca luz nesta altura */}
      <pointLight position={[0, PANEL_CENTER_Y, 0.9]} intensity={22} distance={4.4} color="#fff1d6" />
    </group>
  );
}
