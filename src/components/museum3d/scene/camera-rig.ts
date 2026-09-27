/**
 * Câmera do visitante em 1ª e 3ª pessoa. Funções puras, sem imports de
 * runtime, para serem testáveis por `node --test` (camera-rig.test.mjs).
 *
 * A posição do visitante é a fonte de verdade; a câmera deriva dela. Em
 * 3ª pessoa a câmera fica sobre o ombro direito e recua apenas até onde o
 * espaço livre permite: nunca atravessa paredes, portas fechadas, teto ou piso.
 */

export type ViewMode = "first-person" | "third-person";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Volume sólido alinhado aos eixos. */
export interface CameraBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

/** Cilindro elíptico vertical (do piso até `maxY`). */
export interface CameraEllipse {
  x: number;
  z: number;
  radiusX: number;
  radiusZ: number;
  maxY: number;
}

/** Parede fina vertical entre dois pontos da planta (do piso até `maxY`). */
export interface CameraWallSegment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
  maxY: number;
}

export interface CameraObstacles {
  boxes: readonly CameraBox[];
  ellipses: readonly CameraEllipse[];
  segments: readonly CameraWallSegment[];
}

export const FIRST_PERSON_EYE_HEIGHT = 1.7;

export const THIRD_PERSON_RIG = {
  /** Altura do ponto que a câmera acompanha (entre ombro e cabeça). */
  pivotHeight: 1.55,
  /** Deslocamento lateral para a direita: desobstrui o centro da tela. */
  shoulder: 0.45,
  /** Recuo nominal atrás do visitante. */
  distance: 2.1,
  /** Elevação relativa do recuo (a câmera sobe levemente ao recuar). */
  liftRatio: 0.1,
  /**
   * Folga mínima entre a câmera e qualquer superfície. Precisa ser menor que a
   * distância mínima do visitante a uma porta fechada (0.28 − 0.14 de meia
   * espessura), senão o pivô nasceria bloqueado.
   */
  clearance: 0.12,
  /** A câmera nunca desce abaixo desta altura. */
  floorClearance: 0.2,
  /** Abaixo desta distância do pivô, o avatar é ocultado para não tapar a tela. */
  avatarHideDistance: 0.65,
} as const;

const MARCH_STEP = 0.04;

function hitsBox(p: Vec3, box: CameraBox, clearance: number) {
  return (
    p.x > box.minX - clearance && p.x < box.maxX + clearance &&
    p.y > box.minY - clearance && p.y < box.maxY + clearance &&
    p.z > box.minZ - clearance && p.z < box.maxZ + clearance
  );
}

function hitsEllipse(p: Vec3, ellipse: CameraEllipse, clearance: number) {
  if (p.y > ellipse.maxY + clearance) return false;
  const nx = (p.x - ellipse.x) / (ellipse.radiusX + clearance);
  const nz = (p.z - ellipse.z) / (ellipse.radiusZ + clearance);
  return nx * nx + nz * nz < 1;
}

function hitsSegment(p: Vec3, segment: CameraWallSegment, clearance: number) {
  if (p.y > segment.maxY + clearance) return false;
  const abX = segment.bx - segment.ax;
  const abZ = segment.bz - segment.az;
  const lengthSquared = abX * abX + abZ * abZ;
  const t = lengthSquared === 0
    ? 0
    : Math.min(1, Math.max(0, ((p.x - segment.ax) * abX + (p.z - segment.az) * abZ) / lengthSquared));
  const dx = p.x - (segment.ax + abX * t);
  const dz = p.z - (segment.az + abZ * t);
  return dx * dx + dz * dz < clearance * clearance;
}

export function isCameraPointBlocked(
  p: Vec3,
  obstacles: CameraObstacles,
  clearance: number = THIRD_PERSON_RIG.clearance,
): boolean {
  if (p.y < THIRD_PERSON_RIG.floorClearance) return true;
  return (
    obstacles.boxes.some((box) => hitsBox(p, box, clearance)) ||
    obstacles.ellipses.some((ellipse) => hitsEllipse(p, ellipse, clearance)) ||
    obstacles.segments.some((segment) => hitsSegment(p, segment, clearance))
  );
}

function offset(origin: Vec3, direction: Vec3, distance: number): Vec3 {
  return {
    x: origin.x + direction.x * distance,
    y: origin.y + direction.y * distance,
    z: origin.z + direction.z * distance,
  };
}

/**
 * Maior distância livre ao longo de `direction` (unitário) a partir de `origin`,
 * até `maxDistance`. Avança em passos curtos, então paredes finas não são puladas.
 */
export function freeDistanceAlong(
  origin: Vec3,
  direction: Vec3,
  maxDistance: number,
  obstacles: CameraObstacles,
): number {
  let free = 0;
  for (let travelled = MARCH_STEP; free < maxDistance; travelled += MARCH_STEP) {
    const distance = Math.min(travelled, maxDistance);
    if (isCameraPointBlocked(offset(origin, direction, distance), obstacles)) return free;
    free = distance;
  }
  return free;
}

export interface CameraRig {
  /** Ponto que a câmera acompanha (cabeça do visitante). */
  pivot: Vec3;
  /** Ponto do ombro de onde a câmera recua. */
  shoulderPoint: Vec3;
  /** Direção unitária do recuo (oposta ao olhar, levemente elevada). */
  backDirection: Vec3;
  /** Recuo livre máximo neste quadro. */
  maxBack: number;
}

/**
 * Calcula o enquadramento. `blend` vai de 0 (1ª pessoa) a 1 (3ª pessoa) e
 * permite a transição suave entre os modos.
 */
export function computeCameraRig(
  player: { x: number; z: number },
  yaw: number,
  pitch: number,
  blend: number,
  obstacles: CameraObstacles,
): CameraRig {
  const t = Math.min(1, Math.max(0, blend));
  const pivot: Vec3 = {
    x: player.x,
    y: FIRST_PERSON_EYE_HEIGHT + (THIRD_PERSON_RIG.pivotHeight - FIRST_PERSON_EYE_HEIGHT) * t,
    z: player.z,
  };
  const back: Vec3 = {
    x: Math.sin(yaw) * Math.cos(pitch),
    y: -Math.sin(pitch) + THIRD_PERSON_RIG.liftRatio,
    z: Math.cos(yaw) * Math.cos(pitch),
  };
  const backLength = Math.hypot(back.x, back.y, back.z);
  const backDirection: Vec3 = { x: back.x / backLength, y: back.y / backLength, z: back.z / backLength };
  if (t === 0) return { pivot, shoulderPoint: pivot, backDirection, maxBack: 0 };

  const right: Vec3 = { x: Math.cos(yaw), y: 0, z: -Math.sin(yaw) };
  const shoulder = freeDistanceAlong(pivot, right, THIRD_PERSON_RIG.shoulder * t, obstacles);
  const shoulderPoint = offset(pivot, right, shoulder);
  const maxBack = freeDistanceAlong(shoulderPoint, backDirection, THIRD_PERSON_RIG.distance * t, obstacles);
  return { pivot, shoulderPoint, backDirection, maxBack };
}

export function placeCamera(rig: CameraRig, back: number): Vec3 {
  return offset(rig.shoulderPoint, rig.backDirection, Math.max(0, Math.min(back, rig.maxBack)));
}

/**
 * Suaviza o recuo: aproxima imediatamente quando surge um obstáculo (nunca
 * atravessa a parede) e só se afasta de forma amortecida.
 */
export function smoothBackDistance(current: number, target: number, delta: number, lambda = 6): number {
  if (target <= current) return target;
  return current + (target - current) * (1 - Math.exp(-lambda * delta));
}

/**
 * Medidas da arquitetura que bloqueiam a câmera. Todas vêm das fontes que
 * desenham a cena (`scene/constants.ts`, `museum-exterior.tsx`, `collisions.ts`),
 * então visual e colisão da câmera não divergem.
 */
export interface MuseumCameraLayout {
  roomHalfWidth: number;
  roomHeight: number;
  sideWallThickness: number;
  partitionThickness: number;
  doorHalfWidth: number;
  internalDoorwayHeight: number;
  firstRoomZ: number;
  galleryEndZ: number;
  corridorHalfWidth: number;
  corridorWallThickness: number;
  corridorHeight: number;
  buildingPortalZ: number;
  atriumBackZ: number;
  eastWingMinX: number;
  entranceDoorZ: number;
  doorPanelWidth: number;
  doorPanelHeight: number;
  doorPanelDepth: number;
}

/** Topo dos volumes sem teto próprio: acima de qualquer posição da câmera. */
const HIGH = 14;
/** Meia espessura das lajes de teto (galerias 0.22, corredor 0.2). */
const CEILING_HALF = 0.1;
/** Profundidade do fundo do átrio (base do jardim interno e alvenaria). */
const ATRIUM_BACK_DEPTH = 0.25;

/**
 * Paredes, tetos, vãos e portas das galerias e do corredor. Os vãos das portas
 * internas e da entrada só ficam livres quando a porta está aberta.
 */
export function buildArchitectureObstacles(
  layout: MuseumCameraLayout,
  doorBoundaries: readonly number[],
  doorsOpen: readonly boolean[],
  entranceOpen: boolean,
): CameraBox[] {
  const w = layout.roomHalfWidth;
  const outer = w + 2;
  const galleryMinZ = layout.galleryEndZ - 2;
  const partitionHalf = layout.partitionThickness / 2;
  const sideWallHalf = layout.sideWallThickness / 2;
  const corridorOuter = layout.corridorHalfWidth + layout.corridorWallThickness;
  const divider = (z: number, gap: number, lintel: number, open: boolean): CameraBox[] => {
    const slab = { minZ: z - partitionHalf, maxZ: z + partitionHalf };
    const boxes: CameraBox[] = [
      { minX: -outer, maxX: -gap, minY: 0, maxY: HIGH, ...slab },
      { minX: gap, maxX: outer, minY: 0, maxY: HIGH, ...slab },
      { minX: -gap, maxX: gap, minY: lintel, maxY: HIGH, ...slab },
    ];
    if (!open) boxes.push({ minX: -gap, maxX: gap, minY: 0, maxY: lintel, ...slab });
    return boxes;
  };

  return [
    // Paredes laterais e teto das galerias
    { minX: -outer, maxX: -w + sideWallHalf, minY: 0, maxY: HIGH, minZ: galleryMinZ, maxZ: layout.firstRoomZ },
    { minX: w - sideWallHalf, maxX: outer, minY: 0, maxY: HIGH, minZ: galleryMinZ, maxZ: layout.firstRoomZ },
    {
      minX: -outer, maxX: outer, minY: layout.roomHeight - CEILING_HALF, maxY: HIGH,
      minZ: galleryMinZ, maxZ: layout.firstRoomZ,
    },
    // Parede de fundo da última sala
    { minX: -outer, maxX: outer, minY: 0, maxY: HIGH, minZ: galleryMinZ, maxZ: layout.galleryEndZ + partitionHalf },
    // Divisórias entre salas: porta fechada bloqueia o vão
    ...doorBoundaries.flatMap((z, index) =>
      divider(z, layout.doorHalfWidth, layout.internalDoorwayHeight, doorsOpen[index] ?? false)),
    // Parede frontal de Nuenen: vão sempre aberto para o corredor
    ...divider(layout.firstRoomZ, layout.corridorHalfWidth, layout.corridorHeight, true),
    // Corredor de transição: paredes laterais e teto
    ...[-1, 1].map((side): CameraBox => ({
      minX: side < 0 ? -corridorOuter : layout.corridorHalfWidth,
      maxX: side < 0 ? -layout.corridorHalfWidth : corridorOuter,
      minY: 0,
      maxY: layout.corridorHeight + CEILING_HALF,
      minZ: layout.firstRoomZ,
      maxZ: layout.buildingPortalZ,
    })),
    {
      minX: -corridorOuter, maxX: corridorOuter,
      minY: layout.corridorHeight - CEILING_HALF, maxY: layout.corridorHeight + CEILING_HALF,
      minZ: layout.firstRoomZ, maxZ: layout.buildingPortalZ,
    },
    // Fundo do átrio ao lado do portal (jardim interno e alvenaria)
    ...[-1, 1].map((side): CameraBox => ({
      minX: side < 0 ? -layout.eastWingMinX : layout.corridorHalfWidth,
      maxX: side < 0 ? -layout.corridorHalfWidth : layout.eastWingMinX,
      minY: 0,
      maxY: HIGH,
      minZ: layout.atriumBackZ - ATRIUM_BACK_DEPTH + 0.05,
      maxZ: layout.atriumBackZ + 0.05,
    })),
    // Porta de vidro da entrada, quando fechada: duas folhas lado a lado
    ...(entranceOpen ? [] : [{
      minX: -layout.doorPanelWidth, maxX: layout.doorPanelWidth,
      minY: 0, maxY: layout.doorPanelHeight,
      minZ: layout.entranceDoorZ - layout.doorPanelDepth / 2,
      maxZ: layout.entranceDoorZ + layout.doorPanelDepth / 2,
    }]),
  ];
}

