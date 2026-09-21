"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { Component, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  advanceCrowd,
  applyAgePose,
  createAgeAdjustments,
  createCrowdMotion,
  createCrowdRoutes,
  restoreAnimatedPose,
  waitingVisitors,
  walkingGroups,
  walkingTimeScale,
  type CrowdMember,
  type CrowdMotion,
} from "./exterior-crowd";

const VISITOR_MODEL = "/models/exterior-visitor.glb";

function memberPosition(motion: CrowdMotion, offset: number, target: THREE.Vector3) {
  return target.set(
    motion.position.x + Math.cos(motion.yaw) * offset,
    0,
    motion.position.z - Math.sin(motion.yaw) * offset,
  );
}

class VisitorAssetBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  override render() { return this.state.failed ? null : this.props.children; }
}

function ExteriorVisitor({ spec, motion, reducedMotion }: {
  spec: CrowdMember;
  motion?: CrowdMotion;
  reducedMotion: boolean;
}) {
  const gltf = useGLTF(VISITOR_MODEL);
  const prepared = useMemo(() => {
    const scene = cloneSkeleton(gltf.scene);
    const materials = new Map<THREE.Material, THREE.Material>();
    const skeletons = new Set<THREE.Skeleton>();
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = object.receiveShadow = true;
      if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
      const originalMaterials = Array.isArray(object.material) ? object.material : [object.material];
      const changed = originalMaterials.map((material) => {
        // The body mesh also contains hands: change clothing by MATERIAL name,
        // never by mesh name, so the skin retains the asset's natural color.
        if (!["LightBrown", "Hair", "Eyebrows", "Red_Dark"].includes(material.name)) return material;
        const existing = materials.get(material);
        if (existing) return existing;
        const clone = material.clone();
        if (clone instanceof THREE.MeshStandardMaterial) {
          if (material.name === "LightBrown") clone.color.set(spec.tint);
          if (material.name === "Hair" || material.name === "Eyebrows") clone.color.set(spec.hair);
          if (material.name === "Red_Dark") clone.color.set(spec.age === "child" ? "#bcbdac" : "#48433a");
          clone.roughness = 0.9;
        }
        materials.set(material, clone);
        return clone;
      });
      object.material = Array.isArray(object.material) ? changed : changed[0];
    });
    return {
      scene, materials: [...materials.values()], skeletons: [...skeletons],
      adjustments: createAgeAdjustments(scene, spec.age),
    };
  }, [gltf.scene, spec]);
  const mixer = useMemo(() => new THREE.AnimationMixer(prepared.scene), [prepared.scene]);
  const actions = useRef<{ idle: THREE.AnimationAction; walk: THREE.AnimationAction } | null>(null);
  const previousPosition = useRef(new THREE.Vector3());
  const currentPosition = useRef(new THREE.Vector3());

  useEffect(() => {
    const idleClip = gltf.animations.find((clip) => clip.name.endsWith("|Idle_Neutral"));
    const walkClip = gltf.animations.find((clip) => clip.name.endsWith("|Walk"));
    if (!idleClip || !walkClip) return;
    restoreAnimatedPose(prepared.adjustments);
    const idle = mixer.clipAction(idleClip);
    const walk = mixer.clipAction(walkClip);
    const walking = Boolean(motion) && !reducedMotion;
    idle.reset().setEffectiveWeight(walking ? 0 : 1).play();
    walk.reset().setEffectiveWeight(walking ? 1 : 0).play();
    // Independent animation phases avoid synchronized, marching-looking groups.
    const seed = [...spec.id].reduce((value, char) => value + char.charCodeAt(0), 0) * 0.137;
    idle.time = seed % idleClip.duration;
    walk.time = seed % walkClip.duration;
    actions.current = { idle, walk };
    if (motion) memberPosition(motion, spec.offset, previousPosition.current);
    mixer.update(0);
    applyAgePose(prepared.adjustments);
    return () => {
      restoreAnimatedPose(prepared.adjustments);
      actions.current = null;
      mixer.stopAllAction();
      mixer.uncacheRoot(prepared.scene);
    };
  }, [gltf.animations, mixer, motion, prepared, reducedMotion, spec]);

  useEffect(() => () => {
    prepared.materials.forEach((material) => material.dispose());
    prepared.skeletons.forEach((skeleton) => skeleton.dispose());
  }, [prepared]);

  useFrame((_, frameDelta) => {
    if (reducedMotion) return;
    const delta = Math.min(Math.max(frameDelta, 0), 0.08);
    let speed = 0;
    if (motion && delta > 0) {
      memberPosition(motion, spec.offset, currentPosition.current);
      speed = currentPosition.current.distanceTo(previousPosition.current) / delta;
      previousPosition.current.copy(currentPosition.current);
    }
    if (actions.current) {
      const walkingWeight = THREE.MathUtils.smoothstep(speed, 0.025, 0.2);
      actions.current.walk.setEffectiveWeight(walkingWeight).setEffectiveTimeScale(walkingTimeScale(speed, spec.scale));
      actions.current.idle.setEffectiveWeight(1 - walkingWeight);
    }
    // Undo our previous additive offsets before the mixer. Some unchanged
    // animation tracks are not rewritten each frame; skipping this causes drift.
    restoreAnimatedPose(prepared.adjustments);
    mixer.update(delta);
    applyAgePose(prepared.adjustments);
  });

  return <group name={`exterior-visitor:${spec.id}:${spec.age}`} position={[spec.offset, 0, 0]}
    scale={[spec.scale * (spec.age === "child" ? 0.94 : 1), spec.scale, spec.scale]}>
    <primitive object={prepared.scene} />
  </group>;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function ExteriorCrowd() {
  const reducedMotion = useReducedMotion();
  const roots = useRef(new Map<string, THREE.Group>());
  const motions = useMemo(() => {
    const routes = createCrowdRoutes();
    return walkingGroups.map((spec) => createCrowdMotion(spec, routes[spec.route]));
  }, []);
  // Capture initial JSX transforms separately: subsequent parent renders must
  // not reset a moving family back to its starting point.
  const initial = useMemo(() => motions.map((motion) => ({
    position: motion.position.toArray() as [number, number, number], yaw: motion.yaw,
  })), [motions]);

  useFrame((_, delta) => {
    if (reducedMotion) return;
    advanceCrowd(motions, delta);
    for (const motion of motions) {
      const group = roots.current.get(motion.spec.id);
      if (!group) continue;
      group.position.copy(motion.position);
      group.rotation.y = motion.yaw;
    }
  }, -1);

  return <group name="exterior-crowd">
    {motions.map((motion, index) => <group key={motion.spec.id} name={`walking-group:${motion.spec.id}`}
      position={initial[index].position} rotation={[0, initial[index].yaw, 0]}
      ref={(group) => {
        if (group) roots.current.set(motion.spec.id, group);
        else roots.current.delete(motion.spec.id);
      }}>
      {motion.spec.members.map((member) => <ExteriorVisitor key={member.id} spec={member} motion={motion} reducedMotion={reducedMotion} />)}
    </group>)}
    {waitingVisitors.map((spec) => <group key={spec.id} position={spec.position} rotation={[0, Math.PI, 0]}>
      <ExteriorVisitor spec={spec} reducedMotion={reducedMotion} />
    </group>)}
  </group>;
}

/** Exterior only; the separate gallery visitors and their asset stay intact. */
export function ExteriorVisitors() {
  return <VisitorAssetBoundary><ExteriorCrowd /></VisitorAssetBoundary>;
}
