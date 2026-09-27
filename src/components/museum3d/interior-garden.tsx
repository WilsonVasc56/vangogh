"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import {
  createInteriorGardenLayout, GARDEN_COLORS, GARDEN_SURFACE_Y,
  INTERIOR_GARDEN_BOUNDS, type GardenInstance, type GardenStem,
} from "@/data/interior-garden";

/** O componente é dono do canteiro e exporta o mesmo volume para as colisões. */
export const INTERIOR_GARDEN_COLLISION_BOXES = [INTERIOR_GARDEN_BOUNDS];

/** Folha lanceolada com dobra central e ponta curvada, sem imagens externas. */
function createLeafGeometry() {
  const vertices: number[] = [];
  const indices: number[] = [];
  const segments = 12;
  for (let row = 0; row <= segments; row += 1) {
    const t = row / segments;
    const width = Math.sin(Math.PI * t) * 0.48;
    const curve = t * t * 0.28;
    vertices.push(-width, t, curve, 0, t, curve + Math.sin(Math.PI * t) * 0.085, width, t, curve);
    if (row < segments) {
      const a = row * 3;
      indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4,
        a + 1, a + 4, a + 2, a + 2, a + 4, a + 5);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createInstances(geometry: THREE.BufferGeometry, material: THREE.MeshStandardMaterial, items: GardenInstance[]) {
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const transform = new THREE.Object3D();
  const color = new THREE.Color();
  items.forEach((item, index) => {
    transform.position.set(...item.position);
    transform.rotation.set(...item.rotation);
    transform.scale.set(...item.scale);
    transform.updateMatrix();
    mesh.setMatrixAt(index, transform.matrix);
    mesh.setColorAt(index, color.set(item.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  mesh.receiveShadow = true;
  return mesh;
}

function createStems(items: GardenStem[]) {
  const geometry = new THREE.CylinderGeometry(0.65, 1, 1, 5);
  const material = new THREE.MeshStandardMaterial({ color: GARDEN_COLORS.stem, roughness: 0.92 });
  const mesh = new THREE.InstancedMesh(geometry, material, items.length);
  const matrix = new THREE.Matrix4();
  const up = new THREE.Vector3(0, 1, 0);
  items.forEach((item, index) => {
    const start = new THREE.Vector3(...item.start);
    const end = new THREE.Vector3(...item.end);
    const direction = end.clone().sub(start);
    matrix.compose(start.add(end).multiplyScalar(0.5),
      new THREE.Quaternion().setFromUnitVectors(up, direction.clone().normalize()),
      new THREE.Vector3(item.radius, direction.length(), item.radius));
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
  return mesh;
}

function createGardenMeshes() {
  const layout = createInteriorGardenLayout();
  const leaves = createInstances(createLeafGeometry(), new THREE.MeshStandardMaterial({
    side: THREE.DoubleSide, roughness: 0.72, metalness: 0,
  }), layout.leaves);
  leaves.castShadow = true;
  const stones = createInstances(new THREE.IcosahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ roughness: 1 }), layout.stones);
  return [leaves, createStems(layout.stems), stones];
}

function GardenVegetation() {
  const meshes = useMemo(() => createGardenMeshes(), []);
  useEffect(() => () => {
    // Primitives não são descartados pelo R3F: liberar também buffers de instâncias.
    meshes.forEach((mesh) => {
      mesh.dispose();
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
  }, [meshes]);
  return <group name="folhagens-do-jardim-interno">
    {meshes.map((mesh) => <primitive key={mesh.uuid} object={mesh} />)}
  </group>;
}

export function InteriorGarden() {
  const { minX, maxX, minZ, maxZ } = INTERIOR_GARDEN_BOUNDS;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const x = (minX + maxX) / 2;
  const z = (minZ + maxZ) / 2;
  return <group name="jardim-interno-recuo-leste">
    {/* Base cobre o terreno aparente e começa abaixo dele, sem fresta inferior. */}
    <mesh position={[x, 0.055, z]} receiveShadow>
      <boxGeometry args={[width, 0.32, depth]} />
      <meshStandardMaterial color={GARDEN_COLORS.stone} roughness={0.95} />
    </mesh>
    <mesh position={[x, GARDEN_SURFACE_Y, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[width - 0.24, depth - 0.24]} />
      <meshStandardMaterial color={GARDEN_COLORS.gravel} roughness={1} />
    </mesh>
    {/* Borda de pedra baixa, com acabamento escuro embutido na face frontal. */}
    {[minZ + 0.07, maxZ - 0.07].map((edgeZ) => <mesh key={edgeZ} position={[x, 0.27, edgeZ]} receiveShadow>
      <boxGeometry args={[width, 0.14, 0.14]} />
      <meshStandardMaterial color={GARDEN_COLORS.stone} roughness={0.9} />
    </mesh>)}
    {[minX + 0.07, maxX - 0.07].map((edgeX) => <mesh key={edgeX} position={[edgeX, 0.27, z]} receiveShadow>
      <boxGeometry args={[0.14, 0.14, depth - 0.28]} />
      <meshStandardMaterial color={GARDEN_COLORS.stone} roughness={0.9} />
    </mesh>)}
    <mesh position={[x, 0.07, minZ - 0.001]}>
      <planeGeometry args={[width - 0.12, 0.045]} />
      <meshStandardMaterial color={GARDEN_COLORS.trim} side={THREE.DoubleSide} roughness={0.7} />
    </mesh>
    <GardenVegetation />
  </group>;
}
