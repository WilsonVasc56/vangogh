"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export const EXTERIOR_TREE_TRUNKS = [
  { x: -18, z: 16, radius: 0.48 },
  { x: -22, z: 29, radius: 0.56 },
  { x: -18, z: 42, radius: 0.43 },
  { x: 20, z: 17, radius: 0.5 },
  { x: 24, z: 31, radius: 0.58 },
  { x: 20, z: 44, radius: 0.46 },
] as const;

export const EXTERIOR_GARDEN_BOUNDS = [
  { minX: 6, maxX: 17, minZ: 22, maxZ: 28 },
  { minX: -5.5, maxX: -3.5, minZ: 16, maxZ: 17 },
  { minX: 3.5, maxX: 5.5, minZ: 16, maxZ: 17 },
] as const;

type Instance = {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  color: THREE.Color;
};

type Tree = (typeof EXTERIOR_TREE_TRUNKS)[number] & {
  height: number;
  crownRadius: number;
  seed: number;
};

function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function ellipsePoint(rng: () => number, minX: number, maxX: number, minZ: number, maxZ: number) {
  const angle = rng() * Math.PI * 2;
  const radius = Math.sqrt(rng());
  return new THREE.Vector3(
    (minX + maxX) / 2 + Math.cos(angle) * radius * (maxX - minX) / 2,
    0,
    (minZ + maxZ) / 2 + Math.sin(angle) * radius * (maxZ - minZ) / 2,
  );
}

function createTrees(): Tree[] {
  const heights = [10.2, 12.4, 9.3, 10.8, 12.8, 9.8];
  const crowns = [3.8, 4.5, 3.5, 4.1, 4.7, 3.7];
  return EXTERIOR_TREE_TRUNKS.map((trunk, index) => ({
    ...trunk,
    height: heights[index],
    crownRadius: crowns[index],
    seed: 701 + index * 97,
  }));
}

const trees = createTrees();

function createLeaves(): Instance[] {
  return trees.flatMap((tree) => {
    const rng = random(tree.seed);
    const leaves: Instance[] = [];
    for (let index = 0; index < 3300; index += 1) {
      const angle = rng() * Math.PI * 2;
      const cluster = Math.floor(index / 165);
      const clusterAngle = cluster * 2.399 + rng() * 0.42;
      const clusterRadius = tree.crownRadius * (0.26 + (cluster % 5) * 0.13);
      const localX = Math.cos(clusterAngle) * clusterRadius + (rng() - 0.5) * 2.1;
      const localZ = Math.sin(clusterAngle) * clusterRadius * 0.86 + (rng() - 0.5) * 1.8;
      const radial = Math.sqrt(rng()) * tree.crownRadius;
      const x = tree.x + localX + Math.cos(angle) * radial * 0.48;
      const z = tree.z + localZ + Math.sin(angle) * radial * 0.43;
      const normalized = Math.min(1, (localX * localX + localZ * localZ) / (tree.crownRadius * tree.crownRadius));
      const y = tree.height * 0.57 + rng() * tree.height * 0.36 - normalized * 1.15;
      const tone = 0.23 + rng() * 0.21;
      leaves.push({
        position: new THREE.Vector3(x, y, z),
        rotation: new THREE.Euler((rng() - 0.5) * 2.7, rng() * Math.PI * 2, (rng() - 0.5) * 2.1),
        scale: new THREE.Vector3(0.22 + rng() * 0.19, 0.3 + rng() * 0.24, 0.25),
        color: new THREE.Color().setHSL(0.23 + rng() * 0.07, 0.26 + rng() * 0.23, tone, THREE.SRGBColorSpace),
      });
    }
    return leaves;
  });
}

function createGardenInstances() {
  const rng = random(112358);
  const grass: Instance[] = [];
  const flowers: Instance[] = [];
  const beds = EXTERIOR_GARDEN_BOUNDS;
  for (const bed of beds) {
    const amount = bed.maxX - bed.minX > 5 ? 5800 : 650;
    for (let index = 0; index < amount; index += 1) {
      const point = ellipsePoint(rng, bed.minX + 0.15, bed.maxX - 0.15, bed.minZ + 0.12, bed.maxZ - 0.12);
      grass.push({
        position: new THREE.Vector3(point.x, 0.08 + rng() * 0.05, point.z),
        rotation: new THREE.Euler(0, rng() * Math.PI, (rng() - 0.5) * 0.38),
        scale: new THREE.Vector3(0.045 + rng() * 0.055, 0.26 + rng() * 0.54, 1),
        color: new THREE.Color().setHSL(0.23 + rng() * 0.08, 0.18 + rng() * 0.2, 0.25 + rng() * 0.18, THREE.SRGBColorSpace),
      });
      if (index % 18 === 0) {
        flowers.push({
          position: new THREE.Vector3(point.x, 0.45 + rng() * 0.22, point.z),
          rotation: new THREE.Euler(0, 0, (rng() - 0.5) * 0.4),
          scale: new THREE.Vector3(0.026, 0.06 + rng() * 0.055, 0.026),
          color: new THREE.Color(index % 3 ? "#8d7da4" : "#d0c49b"),
        });
      }
    }
  }
  return { grass, flowers };
}

function useInstances(ref: React.RefObject<THREE.InstancedMesh | null>, instances: Instance[]) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    for (let index = 0; index < instances.length; index += 1) {
      const instance = instances[index];
      quaternion.setFromEuler(instance.rotation);
      matrix.compose(instance.position, quaternion, instance.scale);
      mesh.setMatrixAt(index, matrix);
      mesh.setColorAt(index, instance.color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }, [instances, ref]);
}

function TreeStructure({ tree, bark }: { tree: Tree; bark: THREE.CanvasTexture | undefined }) {
  const rng = random(tree.seed + 4000);
  const branches = Array.from({ length: 15 }, (_, index) => {
    const angle = (index / 15) * Math.PI * 2 + (rng() - 0.5) * 0.38;
    const startY = tree.height * (0.34 + (index % 5) * 0.075);
    const length = tree.crownRadius * (0.65 + rng() * 0.38);
    const start = new THREE.Vector3(0, startY, 0);
    const end = new THREE.Vector3(Math.cos(angle) * length, startY + length * 0.68, Math.sin(angle) * length);
    const direction = end.clone().sub(start);
    return {
      midpoint: start.add(end).multiplyScalar(0.5),
      rotation: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()),
      length: direction.length(),
      radius: tree.radius * (0.16 + rng() * 0.13),
    };
  });
  return (
    <group position={[tree.x, 0, tree.z]}>
      <mesh castShadow receiveShadow position={[0, tree.height * 0.38, 0]}>
        <cylinderGeometry args={[tree.radius * 0.12, tree.radius, tree.height * 0.76, 12, 4]} />
        <meshStandardMaterial color="#8a8171" map={bark} bumpMap={bark} bumpScale={0.09} roughness={0.98} />
      </mesh>
      {branches.map((branch, index) => (
        <mesh
          castShadow
          key={`${tree.seed}-${index}`}
          position={branch.midpoint}
          quaternion={branch.rotation}
        >
          <cylinderGeometry args={[branch.radius * 0.08, branch.radius, branch.length, 7]} />
          <meshStandardMaterial color="#827662" map={bark} bumpMap={bark} bumpScale={0.05} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

function useBotanicalResources() {
  const resources = useMemo(() => {
    const leaf = new THREE.BufferGeometry();
    leaf.setAttribute("position", new THREE.Float32BufferAttribute([
      0,-0.5,0, -0.32,-0.12,0, 0,0,0.12,
      -0.32,-0.12,0, -0.25,0.22,0, 0,0,0.12,
      -0.25,0.22,0, 0,0.5,0, 0,0,0.12,
      0,0.5,0, 0.25,0.22,0, 0,0,0.12,
      0.25,0.22,0, 0.32,-0.12,0, 0,0,0.12,
      0.32,-0.12,0, 0,-0.5,0, 0,0,0.12,
    ], 3));
    leaf.computeVertexNormals();
    const blade = new THREE.BufferGeometry();
    blade.setAttribute("position", new THREE.Float32BufferAttribute([
      -0.24,0,0, 0.24,0,0, 0.2,0.45,0.1,
      -0.24,0,0, 0.2,0.45,0.1, -0.12,0.45,0.1,
      -0.12,0.45,0.1, 0.2,0.45,0.1, 0.4,1,0.3,
    ], 3));
    blade.computeVertexNormals();
    const maps: THREE.CanvasTexture[] = [];
    if (typeof document !== "undefined") {
      for (let type = 0; type < 2; type++) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 256;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        const rng = random(589 + type);
        ctx.fillStyle = type ? "#707854" : "#847b6b";
        ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 18000; i++) {
          ctx.fillStyle = i % 2 ? "rgba(23,32,14,.16)" : "rgba(203,198,145,.17)";
          ctx.fillRect(rng() * 256, rng() * 256, type ? 1 : 1 + rng() * 2, type ? 2 : 5 + rng() * 35);
        }
        const map = new THREE.CanvasTexture(canvas);
        map.colorSpace = THREE.SRGBColorSpace;
        map.wrapS = map.wrapT = THREE.RepeatWrapping;
        map.repeat.set(type ? 7 : 3, type ? 14 : 2);
        map.anisotropy = 8;
        maps.push(map);
      }
    }
    return { leaf, blade, maps };
  }, []);
  useEffect(() => () => {
    resources.leaf.dispose();
    resources.blade.dispose();
    resources.maps.forEach((map) => map.dispose());
  }, [resources]);
  return resources;
}

export function ExteriorLandscape() {
  const leafRef = useRef<THREE.InstancedMesh>(null);
  const grassRef = useRef<THREE.InstancedMesh>(null);
  const flowerRef = useRef<THREE.InstancedMesh>(null);
  const leaves = useMemo(() => createLeaves(), []);
  const garden = useMemo(() => createGardenInstances(), []);
  const resources = useBotanicalResources();

  useInstances(leafRef, leaves);
  useInstances(grassRef, garden.grass);
  useInstances(flowerRef, garden.flowers);

  return (
    <group>
      <mesh receiveShadow position={[-21, -0.01, 30]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 38, 1, 1]} />
        <meshStandardMaterial map={resources.maps[1]} color="#a6af85" roughness={1} />
      </mesh>
      <mesh receiveShadow position={[27, -0.01, 30]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[16, 38, 1, 1]} />
        <meshStandardMaterial map={resources.maps[1]} color="#a6af85" roughness={1} />
      </mesh>
      {EXTERIOR_GARDEN_BOUNDS.map((bed, index) => (
        <group key={`bed-${index}`}>
          <mesh receiveShadow position={[(bed.minX + bed.maxX) / 2, 0.012, (bed.minZ + bed.maxZ) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[bed.maxX - bed.minX, bed.maxZ - bed.minZ]} />
            <meshStandardMaterial color="#584e3c" roughness={1} />
          </mesh>
          <mesh receiveShadow position={[(bed.minX + bed.maxX) / 2, 0.045, bed.minZ]}>
            <boxGeometry args={[bed.maxX - bed.minX + 0.15, 0.09, 0.13]} />
            <meshStandardMaterial color="#817965" roughness={0.92} />
          </mesh>
          <mesh receiveShadow position={[(bed.minX + bed.maxX) / 2, 0.045, bed.maxZ]}>
            <boxGeometry args={[bed.maxX - bed.minX + 0.15, 0.09, 0.13]} />
            <meshStandardMaterial color="#817965" roughness={0.92} />
          </mesh>
          {[bed.minX, bed.maxX].map((x) => <mesh key={x} position={[x, 0.045, (bed.minZ + bed.maxZ) / 2]} receiveShadow>
            <boxGeometry args={[0.13, 0.09, bed.maxZ - bed.minZ]} />
            <meshStandardMaterial color="#817965" roughness={0.92} />
          </mesh>)}
        </group>
      ))}
      {trees.map((tree) => <TreeStructure key={tree.seed} tree={tree} bark={resources.maps[0]} />)}
      <instancedMesh ref={leafRef} args={[resources.leaf, undefined, leaves.length]} receiveShadow frustumCulled>
        <meshStandardMaterial side={THREE.DoubleSide} roughness={0.86} />
      </instancedMesh>
      <instancedMesh ref={grassRef} args={[resources.blade, undefined, garden.grass.length]} receiveShadow frustumCulled>
        <meshStandardMaterial side={THREE.DoubleSide} roughness={1} />
      </instancedMesh>
      <instancedMesh ref={flowerRef} args={[undefined, undefined, garden.flowers.length]} frustumCulled>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial side={THREE.DoubleSide} roughness={0.86} />
      </instancedMesh>
    </group>
  );
}
