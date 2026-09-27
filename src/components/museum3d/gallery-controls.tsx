"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import type { Artwork } from "@/data/artworks";
import type { PeriodId } from "@/data/periods";
import { PlayerAvatar, type PlayerPose } from "./player-avatar";
import {
  THIRD_PERSON_RIG,
  buildArchitectureObstacles,
  computeCameraRig,
  placeCamera,
  smoothBackDistance,
  type CameraObstacles,
  type ViewMode,
} from "./scene/camera-rig";
import { ATRIUM_BACK_Z } from "./museum-exterior";
import { EAST_WING_MIN_X, EXTERIOR_CAMERA_OBSTACLES } from "./scene/collisions";
import {
  BUILDING_PORTAL_Z,
  CORRIDOR_HALF_WIDTH,
  CORRIDOR_HEIGHT,
  CORRIDOR_WALL_THICKNESS,
  DOOR_HALF_WIDTH,
  DOOR_PANEL_DEPTH,
  DOOR_PANEL_HEIGHT,
  DOOR_PANEL_WIDTH,
  ENTRANCE_DOOR_Z,
  FIRST_ROOM_Z,
  INTERNAL_DOORWAY_HEIGHT,
  PARTITION_THICKNESS,
  ROOM_HALF_WIDTH,
  ROOM_HEIGHT,
  SIDE_WALL_THICKNESS,
} from "./scene/constants";
import { resolvePlayerStep } from "./scene/player-movement";
import { internalDoorBoundaries, rooms } from "./scene/rooms";

export interface MobileInput {
  forward: number;
  strafe: number;
  lookX: number;
  lookY: number;
}

// Ferramenta de QA: abrir /museu#debug-walk permite caminhar sem pointer lock
// (útil em ambientes headless/automação, onde o navegador bloqueia o lock).
const debugFreeRoam =
  typeof window !== "undefined" && window.location.hash === "#debug-walk";

const WALK_SPEED = 4.2;
const ARTWORK_REACH = 9;
const DOOR_REACH = 35;
/** Mesmo ponto de chegada do enquadramento inicial do Canvas. */
const START_POSITION = { x: -1.5, z: 32 };
const RETICLE = new THREE.Vector2(0, 0);

interface ReticleTargets {
  doorRegistry: MutableRefObject<Set<THREE.Object3D>>;
  registry: MutableRefObject<Map<THREE.Object3D, Artwork>>;
}

/** Porta e obra sob a mira. O avatar nunca está nos registros, então não bloqueia. */
function pickAtReticle(
  raycaster: THREE.Raycaster,
  camera: THREE.Camera,
  { doorRegistry, registry }: ReticleTargets,
  cameraDistance: number,
) {
  raycaster.setFromCamera(RETICLE, camera);
  const doorHit = raycaster.intersectObjects([...doorRegistry.current], false)[0];
  // Em 3ª pessoa a câmera está atrás do visitante: o alcance soma o recuo
  // para preservar a mesma distância útil a partir do corpo.
  const hit = raycaster.intersectObjects([...registry.current.keys()], false)[0];
  return {
    door: Boolean(doorHit && doorHit.distance < DOOR_REACH),
    artwork: hit && hit.distance < ARTWORK_REACH + cameraDistance ? registry.current.get(hit.object) : undefined,
  };
}

function dampAngle(current: number, target: number, lambda: number, delta: number) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * delta));
}

export function GalleryControls({
  active,
  isMobile,
  mobileInput,
  interactionToken,
  viewMode,
  entranceOpen,
  internalDoorsOpen,
  doorRegistry,
  registry,
  onEntranceClick,
  onInternalDoorApproach,
  onArtworkSelect,
  onPointerLockChange,
  onRoomChange,
}: {
  active: boolean;
  isMobile: boolean;
  mobileInput: MutableRefObject<MobileInput>;
  interactionToken: number;
  viewMode: ViewMode;
  entranceOpen: boolean;
  internalDoorsOpen: boolean[];
  doorRegistry: MutableRefObject<Set<THREE.Object3D>>;
  registry: MutableRefObject<Map<THREE.Object3D, Artwork>>;
  onEntranceClick: () => void;
  onInternalDoorApproach: (index: number) => void;
  onArtworkSelect: (artwork: Artwork) => void;
  onPointerLockChange: (locked: boolean) => void;
  onRoomChange: (period: PeriodId | null) => void;
}) {
  const { camera, gl } = useThree();
  const keys = useRef(new Set<string>());
  // Arrival framing follows the tall, asymmetric entrance reference.
  const yaw = useRef(-0.055);
  const pitch = useRef(0.1);
  const raycaster = useRef(new THREE.Raycaster());
  const currentRoom = useRef<PeriodId | null>(null);
  const processedInteraction = useRef(interactionToken);
  // Última leitura do "olhar" do toque, para consumir apenas as deltas.
  const consumedLook = useRef({ x: 0, y: 0 });
  // Posição do visitante: fonte de verdade para colisões, salas e portas.
  const pose = useRef<PlayerPose>({
    ...START_POSITION,
    bodyYaw: Math.PI,
    speed: 0,
    avatarVisible: false,
  });
  const view = useRef({ blend: 0, back: 0, cameraDistance: 0 });

  const obstacles = useMemo<CameraObstacles>(() => ({
    boxes: [
      ...buildArchitectureObstacles(
        {
          roomHalfWidth: ROOM_HALF_WIDTH,
          roomHeight: ROOM_HEIGHT,
          sideWallThickness: SIDE_WALL_THICKNESS,
          partitionThickness: PARTITION_THICKNESS,
          doorHalfWidth: DOOR_HALF_WIDTH,
          internalDoorwayHeight: INTERNAL_DOORWAY_HEIGHT,
          firstRoomZ: FIRST_ROOM_Z,
          galleryEndZ: rooms.at(-1)?.endZ ?? FIRST_ROOM_Z,
          corridorHalfWidth: CORRIDOR_HALF_WIDTH,
          corridorWallThickness: CORRIDOR_WALL_THICKNESS,
          corridorHeight: CORRIDOR_HEIGHT,
          buildingPortalZ: BUILDING_PORTAL_Z,
          atriumBackZ: ATRIUM_BACK_Z,
          eastWingMinX: EAST_WING_MIN_X,
          entranceDoorZ: ENTRANCE_DOOR_Z,
          doorPanelWidth: DOOR_PANEL_WIDTH,
          doorPanelHeight: DOOR_PANEL_HEIGHT,
          doorPanelDepth: DOOR_PANEL_DEPTH,
        },
        internalDoorBoundaries,
        internalDoorsOpen,
        entranceOpen,
      ),
      ...EXTERIOR_CAMERA_OBSTACLES.boxes,
    ],
    ellipses: EXTERIOR_CAMERA_OBSTACLES.ellipses,
    segments: EXTERIOR_CAMERA_OBSTACLES.segments,
  }), [entranceOpen, internalDoorsOpen]);

  useEffect(() => {
    const canvas = gl.domElement;
    const interactAtReticle = () => {
      const target = pickAtReticle(
        raycaster.current,
        camera,
        { doorRegistry, registry },
        view.current.cameraDistance,
      );
      if (target.door && !entranceOpen) onEntranceClick();
      if (target.artwork) onArtworkSelect(target.artwork);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      keys.current.add(event.code);
      if (document.pointerLockElement === canvas && event.code.startsWith("Arrow")) {
        event.preventDefault();
      }
    };
    const onKeyUp = (event: KeyboardEvent) => keys.current.delete(event.code);
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== canvas) return;
      yaw.current -= event.movementX * 0.0022;
      pitch.current = THREE.MathUtils.clamp(pitch.current - event.movementY * 0.0022, -1.2, 1.2);
    };
    const onPointerLock = () => onPointerLockChange(document.pointerLockElement === canvas);
    const onClick = () => {
      interactAtReticle();
      if (!isMobile && document.pointerLockElement !== canvas) canvas.requestPointerLock();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onPointerLock);
    canvas.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onPointerLock);
      canvas.removeEventListener("click", onClick);
    };
  }, [camera, doorRegistry, entranceOpen, gl, onArtworkSelect, onEntranceClick, onPointerLockChange, isMobile, registry]);

  useFrame((state, frameDelta) => {
    // O estado do frame é a fonte mutável correta: `useThree()` devolve valor de
    // hook, que o React Compiler trata como imutável.
    const camera = state.camera;
    const canvas = state.gl.domElement;
    const delta = Math.min(Math.max(frameDelta, 0), 0.1);
    const player = pose.current;

    if (isMobile) {
      // Consome as deltas do buffer compartilhado sem escrever de volta: mobileInput
      // é um prop, e mutá-lo é proibido pelas regras de hooks do React Compiler.
      const look = mobileInput.current;
      yaw.current -= (look.lookX - consumedLook.current.x) * 0.003;
      pitch.current = THREE.MathUtils.clamp(
        pitch.current - (look.lookY - consumedLook.current.y) * 0.003,
        -1.2,
        1.2,
      );
      consumedLook.current.x = look.lookX;
      consumedLook.current.y = look.lookY;
    }
    if (debugFreeRoam && document.pointerLockElement !== canvas) {
      // Olhar sem pointer lock em automação/QA.
      if (keys.current.has("KeyQ")) yaw.current += delta * 1.8;
      if (keys.current.has("KeyE")) yaw.current -= delta * 1.8;
    }

    // Movimento do visitante (nunca da câmera).
    const canMove = active && (isMobile || debugFreeRoam || document.pointerLockElement === canvas);
    const direction = new THREE.Vector2();
    if (canMove) {
      const forward = new THREE.Vector2(-Math.sin(yaw.current), -Math.cos(yaw.current));
      const strafe = new THREE.Vector2(Math.cos(yaw.current), -Math.sin(yaw.current));
      if (keys.current.has("KeyW") || keys.current.has("ArrowUp")) direction.add(forward);
      if (keys.current.has("KeyS") || keys.current.has("ArrowDown")) direction.sub(forward);
      if (keys.current.has("KeyD") || keys.current.has("ArrowRight")) direction.add(strafe);
      if (keys.current.has("KeyA") || keys.current.has("ArrowLeft")) direction.sub(strafe);
      if (isMobile) {
        direction.addScaledVector(forward, mobileInput.current.forward);
        direction.addScaledVector(strafe, mobileInput.current.strafe);
      }
    }
    let movedX = 0;
    let movedZ = 0;
    if (direction.lengthSq() > 0) {
      direction.normalize().multiplyScalar(frameDelta * WALK_SPEED);
      const next = resolvePlayerStep(player, { x: direction.x, z: direction.y }, entranceOpen, internalDoorsOpen);
      movedX = next.x - player.x;
      movedZ = next.z - player.z;
      player.x = next.x;
      player.z = next.z;
    }
    const moved = Math.hypot(movedX, movedZ);
    player.speed = delta > 0 ? moved / Math.max(frameDelta, 1e-4) : 0;
    if (moved > 1e-4) player.bodyYaw = dampAngle(player.bodyYaw, Math.atan2(movedX, movedZ), 10, delta);

    internalDoorBoundaries.forEach((boundary, index) => {
      if (!internalDoorsOpen[index] && Math.abs(player.z - boundary) < 4.4) {
        onInternalDoorApproach(index);
      }
    });

    const room = rooms.find((item) => player.z <= item.startZ && player.z > item.endZ);
    const nextRoom = room?.id ?? null;
    if (nextRoom !== currentRoom.current) {
      currentRoom.current = nextRoom;
      onRoomChange(nextRoom);
    }

    // Câmera: 1ª pessoa no olho; 3ª pessoa sobre o ombro, recuando só até o espaço livre.
    const camView = view.current;
    const targetBlend = viewMode === "third-person" ? 1 : 0;
    camView.blend = THREE.MathUtils.damp(camView.blend, targetBlend, 7, delta);
    if (Math.abs(camView.blend - targetBlend) < 0.002) camView.blend = targetBlend;
    const rig = computeCameraRig(player, yaw.current, pitch.current, camView.blend, obstacles);
    camView.back = smoothBackDistance(camView.back, rig.maxBack, delta);
    const position = placeCamera(rig, camView.back);
    camera.position.set(position.x, position.y, position.z);
    camera.rotation.set(pitch.current, yaw.current, 0, "YXZ");

    camView.cameraDistance = Math.hypot(
      position.x - rig.pivot.x,
      position.y - rig.pivot.y,
      position.z - rig.pivot.z,
    );
    player.avatarVisible =
      camView.blend > 0.5 && camView.cameraDistance > THIRD_PERSON_RIG.avatarHideDistance;

    if (isMobile && interactionToken !== processedInteraction.current) {
      processedInteraction.current = interactionToken;
      const target = pickAtReticle(raycaster.current, camera, { doorRegistry, registry }, camView.cameraDistance);
      if (target.door && !entranceOpen) onEntranceClick();
      if (target.artwork) onArtworkSelect(target.artwork);
    }
  });

  return <PlayerAvatar pose={pose} />;
}
