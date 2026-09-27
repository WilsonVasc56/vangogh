"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  Component,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from "react";
import * as THREE from "three";

const VISITOR_MODEL = "/models/exterior-visitor.glb";

/** Cores exclusivas do visitante, distintas das pessoas da cena. */
const PLAYER_COLORS = {
  LightBrown: "#2a4d69",
  Hair: "#231c16",
  Eyebrows: "#231c16",
  Red_Dark: "#968a78",
} as const satisfies Record<string, string>;

function isRecolorable(name: string): name is keyof typeof PLAYER_COLORS {
  return name in PLAYER_COLORS;
}

/** Pose do visitante escrita pelos controles a cada quadro (somente leitura aqui). */
export interface PlayerPose {
  x: number;
  z: number;
  /** Direção do corpo; o modelo tem frente nativa para +Z. */
  bodyYaw: number;
  /** Velocidade efetiva em m/s (zero quando parado ou bloqueado). */
  speed: number;
  avatarVisible: boolean;
}

// Animação calibrada para timeScale ≈ 0.75 a ~0.75 m/s. O visitante anda a
// 4.2 m/s; o limite evita pernas frenéticas, aceitando leve deslizamento.
const WALK_TIME_SCALE_PER_SPEED = 1;
const MAX_WALK_TIME_SCALE = 2.2;

class PlayerAssetBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? null : this.props.children; }
}

function PlayerModel({ pose }: { pose: MutableRefObject<PlayerPose> }) {
  const gltf = useGLTF(VISITOR_MODEL);
  const root = useRef<THREE.Group>(null);
  const prepared = useMemo(() => {
    const scene = cloneSkeleton(gltf.scene);
    const materials = new Map<THREE.Material, THREE.Material>();
    const skeletons = new Set<THREE.Skeleton>();
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = object.receiveShadow = true;
      if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
      const originals = Array.isArray(object.material) ? object.material : [object.material];
      const changed = originals.map((material) => {
        // O corpo também contém as mãos: recolorir por MATERIAL preserva a pele.
        const name = material.name;
        if (!isRecolorable(name)) return material;
        const existing = materials.get(material);
        if (existing) return existing;
        const clone = material.clone();
        if (clone instanceof THREE.MeshStandardMaterial) {
          clone.color.set(PLAYER_COLORS[name]);
          clone.roughness = 0.9;
        }
        materials.set(material, clone);
        return clone;
      });
      object.material = Array.isArray(object.material) ? changed : changed[0];
    });
    return { scene, materials: [...materials.values()], skeletons: [...skeletons] };
  }, [gltf.scene]);
  const mixer = useMemo(() => new THREE.AnimationMixer(prepared.scene), [prepared.scene]);
  const actions = useRef<{ idle: THREE.AnimationAction; walk: THREE.AnimationAction } | null>(null);

  useEffect(() => {
    const idleClip = gltf.animations.find((clip) => clip.name.endsWith("|Idle_Neutral"));
    const walkClip = gltf.animations.find((clip) => clip.name.endsWith("|Walk"));
    if (!idleClip || !walkClip) return;
    const idle = mixer.clipAction(idleClip);
    const walk = mixer.clipAction(walkClip);
    idle.reset().setEffectiveWeight(1).play();
    walk.reset().setEffectiveWeight(0).play();
    actions.current = { idle, walk };
    mixer.update(0);
    return () => {
      actions.current = null;
      mixer.stopAllAction();
      mixer.uncacheRoot(prepared.scene);
    };
  }, [gltf.animations, mixer, prepared.scene]);

  useEffect(() => () => {
    prepared.materials.forEach((material) => material.dispose());
    prepared.skeletons.forEach((skeleton) => skeleton.dispose());
  }, [prepared]);

  useFrame((_, frameDelta) => {
    const group = root.current;
    if (!group) return;
    const current = pose.current;
    group.visible = current.avatarVisible;
    group.position.set(current.x, 0, current.z);
    group.rotation.y = current.bodyYaw;
    if (!current.avatarVisible) return;

    const delta = Math.min(Math.max(frameDelta, 0), 0.08);
    if (actions.current) {
      const walking = THREE.MathUtils.smoothstep(current.speed, 0.05, 0.4);
      actions.current.walk
        .setEffectiveWeight(walking)
        .setEffectiveTimeScale(Math.min(MAX_WALK_TIME_SCALE, Math.max(0.6, current.speed * WALK_TIME_SCALE_PER_SPEED)));
      actions.current.idle.setEffectiveWeight(1 - walking);
    }
    mixer.update(delta);
  });

  return <group ref={root} name="player-avatar" visible={false}>
    <primitive object={prepared.scene} />
  </group>;
}

/**
 * Corpo do visitante para a 3ª pessoa. Nunca é registrado para raycast (obras
 * ou portas), então não intercepta a mira. Falha no carregamento do modelo não
 * afeta a exploração em 1ª pessoa.
 */
export function PlayerAvatar({ pose }: { pose: MutableRefObject<PlayerPose> }) {
  return <PlayerAssetBoundary>
    <Suspense fallback={null}>
      <PlayerModel pose={pose} />
    </Suspense>
  </PlayerAssetBoundary>;
}
