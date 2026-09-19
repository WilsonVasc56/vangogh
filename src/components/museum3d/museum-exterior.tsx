"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useCubeCamera } from "@react-three/drei";
import * as THREE from "three";

type Point = [number, number, number];
type Surface = "stone" | "paving" | "brick" | "masonry";

// Architectural interpretation of Museumplein, not a surveyed digital twin.
// The existing portal remains at x=0 so the indoor route is unchanged.
const PANEL_COUNT = 26;
const ATRIUM_RADIUS_X = 8.1;
const ATRIUM_RADIUS_Z = 7.4;
const ATRIUM_BACK_Z = 7.4;
const ATRIUM_MIN_X = -4.35;
const ATRIUM_MIN_ANGLE = Math.asin(ATRIUM_MIN_X / ATRIUM_RADIUS_X);
const OPENING_ANGLE = Math.asin(1.85 / ATRIUM_RADIUS_X);
const panelAngles = Array.from({ length: PANEL_COUNT + 1 }, (_, i) =>
  ATRIUM_MIN_ANGLE + (i / PANEL_COUNT) * (Math.PI / 2 - ATRIUM_MIN_ANGLE),
).filter((angle) => Math.abs(angle) > OPENING_ANGLE);
panelAngles.push(-OPENING_ANGLE, OPENING_ANGLE);
panelAngles.sort((a, b) => a - b);

function facadePoint(angle: number): Point {
  return [Math.sin(angle) * ATRIUM_RADIUS_X, 0, ATRIUM_BACK_Z + Math.cos(angle) * ATRIUM_RADIUS_Z];
}

const curvedGlassSegments = panelAngles.slice(0, -1).flatMap((angle, i) => {
  const next = panelAngles[i + 1];
  if (angle === -OPENING_ANGLE && next === OPENING_ANGLE) return [];
  const a = facadePoint(angle);
  const b = facadePoint(next);
  return [{ ax: a[0], az: a[2], bx: b[0], bz: b[2] }];
});
export const EXTERIOR_GLASS_SEGMENTS = [
  ...curvedGlassSegments,
  { ax: ATRIUM_MIN_X, az: ATRIUM_BACK_Z, bx: ATRIUM_MIN_X, bz: facadePoint(ATRIUM_MIN_ANGLE)[2] },
];

function roofHeight(x: number, z: number) {
  return 11.7 - x * 0.14 + (14.8 - z) * 0.06;
}

// Bake the actual trees, sky and plaza into exterior reflections. Two initial
// captures only; neither the gallery environment nor per-frame cost is changed.
function useExteriorReflection() {
  const reflector = useRef<THREE.Group>(null);
  const frames = useRef(0);
  // Sky is a 4,000-unit dome; a short far plane would bake black reflections.
  const { fbo, camera, update } = useCubeCamera({ resolution: 256, near: 0.2, far: 10000 });
  useEffect(() => { frames.current = 0; }, [update]);
  useFrame(() => {
    const group = reflector.current;
    if (!group || frames.current >= 2) return;
    camera.position.set(0, 6, 17);
    group.visible = false;
    try {
      update();
      frames.current += 1;
    } finally {
      group.visible = true;
    }
  });
  return { reflection: fbo.texture, reflector };
}

function useSurface(kind: Surface, repeatX = 1, repeatY = 1) {
  const textures = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const brickwork = kind === "brick" || kind === "masonry";
    const colors = kind === "brick" ? [137, 101, 83] : kind === "masonry" ? [166, 163, 152] : kind === "paving" ? [173, 169, 158] : [188, 187, 184];
    ctx.fillStyle = brickwork ? "#a6a299" : "#9c9b96";
    ctx.fillRect(0, 0, 512, 512);
    const rows = brickwork ? 24 : kind === "stone" ? 4 : 8;
    const cols = brickwork ? 8 : 4;
    const w = 512 / cols;
    const h = 512 / rows;
    for (let row = 0; row < rows; row++) {
      for (let col = -1; col <= cols; col++) {
        const variation = Math.sin(row * 12.7 + col * 78.3) * (kind === "stone" || kind === "masonry" ? 2 : 7);
        ctx.fillStyle = `rgb(${colors.map((c) => c + variation).join(",")})`;
        ctx.fillRect(col * w + (kind !== "stone" && row % 2 ? w / 2 : 0) + 0.7, row * h + 0.7, w - 1.4, h - 1.4);
      }
    }
    for (let i = 0; i < 28000; i++) {
      ctx.fillStyle = i % 3 ? "rgba(42,40,32,.055)" : "rgba(255,255,245,.12)";
      ctx.fillRect((i * 137.31) % 512, (i * 71.79) % 512, 1.4, 1.4);
    }
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.repeat.set(repeatX, repeatY);
    map.anisotropy = 8;
    const bump = map.clone();
    bump.colorSpace = THREE.NoColorSpace;
    return { map, bump };
  }, [kind, repeatX, repeatY]);
  useEffect(() => () => {
    textures?.map.dispose();
    textures?.bump.dispose();
  }, [textures]);
  return textures;
}

function Beam({ from, to, radius = 0.035, color = "#a7b2af" }: {
  from: Point; to: Point; radius?: number; color?: string;
}) {
  const { midpoint, rotation, length } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const direction = b.clone().sub(a);
    return {
      midpoint: a.add(b).multiplyScalar(0.5),
      rotation: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()),
      length: direction.length(),
    };
  }, [from, to]);
  return <mesh position={midpoint} quaternion={rotation} castShadow>
    <cylinderGeometry args={[radius, radius, length, 8]} />
    <meshStandardMaterial color={color} metalness={0.65} roughness={0.36} />
  </mesh>;
}

function GlassEntrance({ reflection }: { reflection: THREE.CubeTexture | null }) {
  const glazing = useMemo(() => {
    const vertices: number[] = [];
    const doorwayA = facadePoint(-OPENING_ANGLE);
    const doorwayB = facadePoint(OPENING_ANGLE);
    const panels = [
      ...EXTERIOR_GLASS_SEGMENTS.map((segment) => ({ ...segment, base: 0.06 })),
      { ax: doorwayA[0], az: doorwayA[2], bx: doorwayB[0], bz: doorwayB[2], base: 4.34 },
    ];
    for (const s of panels) {
      const ay = roofHeight(s.ax, s.az);
      const by = roofHeight(s.bx, s.bz);
      vertices.push(s.ax,s.base,s.az, s.bx,s.base,s.bz, s.bx,by,s.bz,
        s.ax,s.base,s.az, s.bx,by,s.bz, s.ax,ay,s.az);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  const roof = useMemo(() => {
    const vertices: number[] = [];
    const edge = facadePoint(ATRIUM_MIN_ANGLE);
    vertices.push(0, roofHeight(0, ATRIUM_BACK_Z), ATRIUM_BACK_Z,
      ATRIUM_MIN_X, roofHeight(ATRIUM_MIN_X, ATRIUM_BACK_Z), ATRIUM_BACK_Z,
      edge[0], roofHeight(edge[0], edge[2]), edge[2]);
    for (let i = 0; i < 48; i++) {
      const a = facadePoint(ATRIUM_MIN_ANGLE + i / 48 * (Math.PI / 2 - ATRIUM_MIN_ANGLE));
      const b = facadePoint(ATRIUM_MIN_ANGLE + (i + 1) / 48 * (Math.PI / 2 - ATRIUM_MIN_ANGLE));
      vertices.push(0, roofHeight(0, ATRIUM_BACK_Z), ATRIUM_BACK_Z, a[0], roofHeight(a[0], a[2]), a[2], b[0], roofHeight(b[0], b[2]), b[2]);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  useEffect(() => () => { roof.dispose(); glazing.dispose(); }, [roof, glazing]);

  return <group>
    <mesh geometry={glazing}>
      <meshPhysicalMaterial color="#f4f8f5" envMap={reflection} transmission={0.94} thickness={0.012} ior={1.45} roughness={0.025} metalness={0} envMapIntensity={1.2} side={THREE.DoubleSide} />
    </mesh>
    {EXTERIOR_GLASS_SEGMENTS.map((s, i) => {
      const z = (s.az + s.bz) / 2;
      const x = (s.ax + s.bx) / 2;
      const height = roofHeight(x, z);
      const width = Math.hypot(s.bx - s.ax, s.bz - s.az);
      return <group key={i} position={[(s.ax + s.bx) / 2, height / 2, z]} rotation={[0, -Math.atan2(s.bz - s.az, s.bx - s.ax), 0]}>
        <mesh position={[-width / 2, 0, -0.1]}>
          <boxGeometry args={[0.042, height, 0.16]} />
          <meshStandardMaterial color="#737e7e" envMap={reflection} metalness={0.78} roughness={0.28} />
        </mesh>
        {[0.12, 2.7, 5.4, 8.1, 10.8].filter((y) => y <= height).map((y) => <mesh key={y} position={[0, y - height / 2, 0.03]}>
          <boxGeometry args={[width, 0.032, 0.065]} />
          <meshStandardMaterial color="#a1aba7" metalness={0.7} roughness={0.3} />
        </mesh>)}
        {[2.7, 5.4, 8.1, 10.8].filter((y) => y < height).map((y) => <mesh key={`fixing-${y}`} position={[-width / 2 + 0.09, y - height / 2, 0.075]}>
          <boxGeometry args={[0.19, 0.055, 0.09]} />
          <meshStandardMaterial color="#c7cecb" metalness={0.85} roughness={0.24} />
        </mesh>)}
      </group>;
    })}
    {EXTERIOR_GLASS_SEGMENTS.map((s, i) => <Beam key={`capping-${i}`} from={[s.ax, roofHeight(s.ax, s.az), s.az]} to={[s.bx, roofHeight(s.bx, s.bz), s.bz]} radius={0.027} color="#929f9f" />)}
    <Beam from={[-1.85, roofHeight(-1.85, 14.6), 14.6]} to={[1.85, roofHeight(1.85, 14.6), 14.6]} radius={0.027} color="#929f9f" />
    <mesh geometry={roof}>
      <meshPhysicalMaterial color="#dce9eb" envMap={reflection} transparent opacity={0.22} roughness={0.08} metalness={0.2} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    {Array.from({ length: 23 }, (_, i) => {
      const x = ATRIUM_MIN_X + i * (7.95 - ATRIUM_MIN_X) / 22;
      const z = ATRIUM_BACK_Z + Math.sqrt(1 - (x / ATRIUM_RADIUS_X) ** 2) * ATRIUM_RADIUS_Z;
      return <Beam key={i} from={[x, roofHeight(x, ATRIUM_BACK_Z) - 0.1, ATRIUM_BACK_Z]} to={[x, roofHeight(x, z) - 0.1, z]} radius={0.045} color="#bdc4c0" />;
    })}
    {[10, 11.5, 13].map((z) => {
      const x = ATRIUM_RADIUS_X * Math.sqrt(1 - ((z - ATRIUM_BACK_Z) / ATRIUM_RADIUS_Z) ** 2);
      const left = Math.max(ATRIUM_MIN_X, -x);
      return <Beam key={z} from={[left, roofHeight(left, z) - 0.2, z]} to={[x, roofHeight(x, z) - 0.2, z]} radius={0.065} color="#bbc2bd" />;
    })}
    {[-3.4, 5.5].map((x) => <Beam key={x} from={[x, 0.1, 10.1]} to={[x - 0.65, roofHeight(x - 0.65, 10.1) - 0.2, 10.1]} radius={0.13} color="#d4d5c9" />)}
    {[5.4, 8.1, 10.8].map((y) => <Beam key={y} from={[-1.85, y, 14.65]} to={[1.85, y, 14.65]} radius={0.017} />)}
    {/* Round stainless-steel vestibule silhouette, with a clear central route. */}
    <mesh position={[0, 4.12, 13.55]} scale={[2.5, 1, 1.32]} castShadow>
      <cylinderGeometry args={[1, 1, 0.26, 64]} />
      <meshStandardMaterial color="#9da4a3" envMap={reflection} metalness={0.82} roughness={0.27} />
    </mesh>
    {[-1, 1].map((side) => <group key={side}>
      <Beam from={[side * 2.35, 0.03, 13.55]} to={[side * 2.35, 4, 13.55]} radius={0.05} />
      <mesh position={[side * 2.32, 1.96, 13.22]}>
        <boxGeometry args={[0.035, 3.85, 1.8]} />
        <meshPhysicalMaterial color="#ebefec" envMap={reflection} transparent opacity={0.18} roughness={0.05} metalness={0.1} depthWrite={false} />
      </mesh>
    </group>)}
    {/* Warm back wall and suspended upper landing, all outside the gallery. */}
    <mesh position={[0, 8.2, 7.45]} castShadow>
      <boxGeometry args={[16, 7.2, 0.22]} />
      <meshStandardMaterial color="#bdb8a8" roughness={0.83} />
    </mesh>
    <mesh position={[0, 5.6, 8.65]} castShadow>
      <boxGeometry args={[14.5, 0.28, 2.5]} />
      <meshStandardMaterial color="#cecac0" roughness={0.78} />
    </mesh>
    <mesh position={[0, 6.4, 9.84]}>
      <boxGeometry args={[14.4, 1.3, 0.035]} />
      <meshPhysicalMaterial color="#bdd1cb" transparent opacity={0.18} depthWrite={false} roughness={0.08} />
    </mesh>
    <Beam from={[-7.2, 7.05, 9.86]} to={[7.2, 7.05, 9.86]} radius={0.025} />
    {[-5, -2.7, 2.7, 5].map((x) => <mesh key={x} position={[x, 5.43, 9.3]} rotation={[Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.09, 12]} /><meshBasicMaterial color="#fff0c8" toneMapped={false} />
    </mesh>)}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 12]} receiveShadow>
      <planeGeometry args={[16.2, 6]} />
      <meshStandardMaterial color="#b8b5a9" roughness={0.7} />
    </mesh>
  </group>;
}

function MuseumSign({ position, rotation = 0, scale = 1 }: { position: Point; rotation?: number; scale?: number }) {
  const map = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#383b3b";
    ctx.fillRect(0, 0, 768, 512);
    ctx.fillStyle = "#e3e1db";
    ctx.textAlign = "center";
    ctx.font = "300 57px Arial, sans-serif";
    ctx.fillText("V A N  G O G H", 384, 223);
    ctx.fillText("M U S E U M", 384, 316);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }, []);
  useEffect(() => () => map?.dispose(), [map]);
  return <group position={position} rotation={[0, rotation, 0]} scale={scale}>
    <mesh castShadow><boxGeometry args={[3.35, 2.35, 0.09]} /><meshStandardMaterial color="#424441" roughness={0.7} /></mesh>
    <mesh position={[0, 0, 0.051]}><planeGeometry args={[3.28, 2.28]} /><meshBasicMaterial map={map} toneMapped={false} /></mesh>
  </group>;
}

function MuseumVolumes({ reflection }: { reflection: THREE.CubeTexture | null }) {
  const stone = useSurface("stone", 4, 2);
  const masonry = useSurface("masonry", 5, 3);
  return <group>
    {/* Tall curved stone wing and the deep, dark roof reveal in the reference. */}
    <group position={[-8.8, 0, 5.5]}>
      <mesh position={[0, 6, 0]} scale={[6.5, 1, 5.8]} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 12, 128]} />
        <meshStandardMaterial map={stone?.map} bumpMap={stone?.bump} bumpScale={0.024} color="#ebe8e5" roughness={0.87} />
      </mesh>
      <mesh position={[0, 12.47, 0]} scale={[6.42, 1, 5.72]}>
        <cylinderGeometry args={[1, 1, 0.94, 128, 1, true]} />
        <meshStandardMaterial color="#354542" envMap={reflection} metalness={0.6} roughness={0.21} />
      </mesh>
      <mesh position={[0, 12.95, 0]} scale={[7.25, 1, 6.45]} castShadow receiveShadow>
        <cylinderGeometry args={[1, 1, 0.36, 128]} />
        <meshStandardMaterial map={stone?.map} color="#d4d3cf" roughness={0.7} />
      </mesh>
      <mesh position={[0, 12.76, 0]} scale={[7.2, 1, 6.4]}>
        <cylinderGeometry args={[1, 1, 0.025, 128]} />
        <meshStandardMaterial color="#615f56" roughness={0.9} />
      </mesh>
      <MuseumSign position={[0, 8.45, 5.84]} />
    </group>
    {/* One offset masonry wing, never a mirrored block behind the atrium. */}
    <group position={[14.1, 0, 0]}>
      <mesh position={[0, 5.7, 4]} castShadow receiveShadow>
        <boxGeometry args={[11.8, 11.4, 9.8]} />
        <meshStandardMaterial map={masonry?.map} bumpMap={masonry?.bump} bumpScale={0.028} color="#d1cec5" roughness={0.91} />
      </mesh>
      <mesh position={[-2.5, 12.25, 1.5]} castShadow>
        <boxGeometry args={[5.9, 1.7, 6.5]} />
        <meshStandardMaterial color="#a8aaa1" roughness={0.75} />
      </mesh>
      {[2.35, 5.45].map((y) => <group key={y} position={[0, y, 8.93]}>
        <mesh><boxGeometry args={[11.65, 1.85, 0.045]} /><meshStandardMaterial envMap={reflection} color="#566460" metalness={0.65} roughness={0.17} /></mesh>
        {Array.from({ length: 10 }, (_, i) => <mesh key={i} position={[-5.65 + i * 1.26, 0, 0.045]}>
          <boxGeometry args={[0.1, 1.92, 0.18]} /><meshStandardMaterial color="#c1c0b7" metalness={0.4} roughness={0.4} />
        </mesh>)}
        <mesh position={[0, 1.04, 0.12]}><boxGeometry args={[11.9, 0.2, 0.3]} /><meshStandardMaterial color="#c3c2b9" roughness={0.8} /></mesh>
      </group>)}
      <mesh position={[0, 11.48, 4]} castShadow><boxGeometry args={[12, 0.16, 10]} /><meshStandardMaterial color="#acb0a9" roughness={0.65} metalness={0.2} /></mesh>
      <MuseumSign position={[2.5, 8.9, 9.04]} scale={0.84} />
    </group>
    <group position={[9.1, 7, 7.65]}>
      <mesh><boxGeometry args={[3.1, 13.25, 0.08]} /><meshStandardMaterial color="#57696b" envMap={reflection} metalness={0.68} roughness={0.13} /></mesh>
      {[-1.53, 0, 1.53].map((x) => <Beam key={x} from={[x, -6.65, 0.1]} to={[x, 6.65, 0.1]} radius={0.035} />)}
      {[-6.6, -4.4, -2.2, 0, 2.2, 4.4, 6.6].map((y) => <Beam key={y} from={[-1.56, y, 0.1]} to={[1.56, y, 0.1]} radius={0.035} />)}
    </group>
  </group>;
}

function Neighbourhood({ reflection }: { reflection: THREE.CubeTexture | null }) {
  const brick = useSurface("brick", 2, 3);
  return <group>
    {/* Museum-quarter street wall: close setbacks, masonry, tall sash windows. */}
    {[-1, 1].map((side) => <group key={side} position={[side * 35, 0, 1]} rotation={[0, side * -0.3, 0]}>
      {Array.from({ length: 4 }, (_, i) => {
        const height = 12.3 + (i % 3) * 1.1;
        return <group key={i} position={[(i - 1.5) * 7.1, 0, -Math.abs(i - 1.5) * 0.8]}>
          <mesh position={[0, height / 2, 0]} castShadow receiveShadow><boxGeometry args={[6.9, height, 8]} /><meshStandardMaterial map={brick?.map} bumpMap={brick?.bump} bumpScale={0.035} color={i % 2 ? "#c4b9a9" : "#a2988e"} roughness={0.94} /></mesh>
          {[0.45, 3.5, 6.8, 10.1, height].map((y) => <mesh key={y} position={[0, y, 4.12]}><boxGeometry args={[7.05, 0.2, 0.3]} /><meshStandardMaterial color="#c9c1b2" roughness={0.9} /></mesh>)}
          {[2, 5.2, 8.5, 11.2].filter((y) => y < height - 1).map((y) => [-2.15, 0, 2.15].map((x) => <group key={`${x}-${y}`} position={[x, y, 4.08]}>
            <mesh><boxGeometry args={[1.4, 2.15, 0.18]} /><meshStandardMaterial color="#d2c9b7" roughness={0.75} /></mesh>
            <mesh position={[0, 0.02, 0.11]}><planeGeometry args={[1.16, 1.92]} /><meshStandardMaterial envMap={reflection} color={i % 2 ? "#6a7a77" : "#5c6c64"} metalness={0.7} roughness={0.2} /></mesh>
            <mesh position={[0, 0, 0.14]}><boxGeometry args={[0.045, 1.95, 0.06]} /><meshStandardMaterial color="#cfcabc" /></mesh>
            <mesh position={[0, 0.18, 0.14]}><boxGeometry args={[1.2, 0.06, 0.06]} /><meshStandardMaterial color="#cfcabc" /></mesh>
          </group>))}
          <mesh position={[0, height + 1.25, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 1.16]} castShadow><coneGeometry args={[4.95, 2.5, 4]} /><meshStandardMaterial color="#535956" roughness={0.85} /></mesh>
          <mesh position={[2, height + 1.7, -1.5]} castShadow><boxGeometry args={[0.6, 2.1, 0.8]} /><meshStandardMaterial color="#8e7666" roughness={1} /></mesh>
        </group>;
      })}
    </group>)}
    {/* Low white Stedelijk-inspired neighbour, away from the entrance axis. */}
    <group position={[28, 0, -11]}>
      <mesh position={[0, 3.1, 0]} castShadow><boxGeometry args={[21, 6.2, 14]} /><meshStandardMaterial color="#58615d" metalness={0.4} roughness={0.28} /></mesh>
      <mesh position={[0, 7, 1]} castShadow><boxGeometry args={[25, 2.1, 17]} /><meshStandardMaterial color="#e0ded2" roughness={0.5} /></mesh>
    </group>
  </group>;
}

function Bicycle({ position, color }: { position: Point; color: string }) {
  const spokes = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!spokes.current) return;
    const dummy = new THREE.Object3D();
    let index = 0;
    for (const x of [-0.55, 0.55]) {
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2;
        dummy.position.set(x + Math.sin(a) * 0.17, 0.38 + Math.cos(a) * 0.17, 0);
        dummy.rotation.set(0, 0, -a);
        dummy.updateMatrix();
        spokes.current.setMatrixAt(index++, dummy.matrix);
      }
    }
    spokes.current.instanceMatrix.needsUpdate = true;
    spokes.current.computeBoundingSphere();
  }, []);
  return <group position={position} rotation={[0, 0.45, -0.08]}>
    {[-0.55, 0.55].map((x) => <group key={x} position={[x, 0.38, 0]}>
      <mesh castShadow><torusGeometry args={[0.35, 0.025, 8, 40]} /><meshStandardMaterial color="#292c29" roughness={0.9} /></mesh>
      <mesh><torusGeometry args={[0.322, 0.009, 6, 40]} /><meshStandardMaterial color="#9eaaa6" metalness={0.8} roughness={0.3} /></mesh>
    </group>)}
    <instancedMesh ref={spokes} args={[undefined, undefined, 32]}><cylinderGeometry args={[0.003, 0.003, 0.34, 4]} /><meshStandardMaterial color="#a3adaa" metalness={0.75} roughness={0.4} /></instancedMesh>
    {([
      [[-0.55, 0.38, 0], [-0.2, 0.89, 0]], [[-0.2, 0.89, 0], [0, 0.36, 0]],
      [[0, 0.36, 0], [-0.55, 0.38, 0]], [[-0.2, 0.89, 0], [0.37, 0.92, 0]],
      [[0.37, 0.92, 0], [0, 0.36, 0]], [[0.55, 0.38, 0], [0.32, 1.12, 0]],
      [[-0.2, 0.89, 0], [-0.24, 1.03, 0]], [[0.32, 1.12, -0.2], [0.32, 1.12, 0.2]],
    ] as [Point, Point][]).map(([from, to], i) => <Beam key={i} from={from} to={to} color={color} radius={0.018} />)}
    <mesh position={[-0.24, 1.035, 0]}><boxGeometry args={[0.25, 0.055, 0.16]} /><meshStandardMaterial color="#493d33" roughness={0.9} /></mesh>
  </group>;
}

function StreetFurniture() {
  return <group>
    {[-11.5, 13.8].map((x) => <group key={x} position={[x, 0, 18.9]}>
      {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[0, 0.47, -0.32 + i * 0.125]} castShadow><boxGeometry args={[2.8, 0.09, 0.1]} /><meshStandardMaterial color={i % 2 ? "#8f7959" : "#9b8461"} roughness={0.85} /></mesh>)}
      {[-1, 1].map((a) => <mesh key={a} position={[a, 0.22, 0]} castShadow><boxGeometry args={[0.085, 0.44, 0.63]} /><meshStandardMaterial color="#454943" metalness={0.5} roughness={0.5} /></mesh>)}
    </group>)}
    {[-14, 17.8].map((x) => <group key={x} position={[x, 0, 20.5]}>
      <mesh position={[0, 2.9, 0]} castShadow><cylinderGeometry args={[0.045, 0.085, 5.8, 12]} /><meshStandardMaterial color="#626a61" metalness={0.7} roughness={0.5} /></mesh>
      <mesh position={[0, 5.8, 0.2]}><boxGeometry args={[0.28, 0.08, 0.75]} /><meshStandardMaterial color="#555f57" metalness={0.6} roughness={0.4} /></mesh>
    </group>)}
    {Array.from({ length: 5 }, (_, i) => <group key={i} position={[-12.5, 0, 24 + i * 1.15]}>
      <Beam from={[-0.5, 0, 0]} to={[-0.5, 0.75, 0]} radius={0.026} />
      <Beam from={[0.5, 0, 0]} to={[0.5, 0.75, 0]} radius={0.026} />
      <Beam from={[-0.5, 0.75, 0]} to={[0.5, 0.75, 0]} radius={0.026} />
      {i !== 2 && <Bicycle position={[0, 0, 0.15]} color={i % 2 ? "#4f5b53" : "#654c3d"} />}
    </group>)}
    {[2.1, 4.15].map((x) => <group key={x}>
      {[17.4, 19, 20.6].map((z) => <group key={z} position={[x, 0, z]}>
        <mesh position={[0, 0.04, 0]}><cylinderGeometry args={[0.16, 0.18, 0.08, 16]} /><meshStandardMaterial color="#4d514b" metalness={0.6} roughness={0.45} /></mesh>
        <Beam from={[0, 0.08, 0]} to={[0, 0.9, 0]} radius={0.025} color="#5d645d" />
      </group>)}
      <mesh position={[x, 0.83, 19]}><boxGeometry args={[0.018, 0.065, 3.2]} /><meshStandardMaterial color="#444b42" roughness={0.95} /></mesh>
    </group>)}
    <mesh position={[0, 0.014, 16]} receiveShadow><boxGeometry args={[6, 0.025, 0.14]} /><meshStandardMaterial color="#686b60" roughness={0.9} /></mesh>
  </group>;
}

// Exterior-only light balance; restore the existing gallery lighting indoors.
export function ExteriorDaylight() {
  const ambient = useRef<THREE.AmbientLight>(null);
  const hemisphere = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  useFrame(({ camera }) => {
    const outside = THREE.MathUtils.smoothstep(camera.position.z, 0, 15);
    if (ambient.current) ambient.current.intensity = THREE.MathUtils.lerp(0.55, 0.48, outside);
    if (hemisphere.current) hemisphere.current.intensity = THREE.MathUtils.lerp(0.75, 1.15, outside);
    if (sun.current) sun.current.intensity = THREE.MathUtils.lerp(2.8, 2.15, outside);
  });
  return <>
    <ambientLight ref={ambient} intensity={0.48} color="#e5f3ff" />
    <hemisphereLight ref={hemisphere} intensity={1.15} color="#dff2ff" groundColor="#6d755a" />
    <directionalLight ref={sun} position={[-35, 42, 25]} intensity={2.15} color="#fff2d0" castShadow
      shadow-mapSize-width={2048} shadow-mapSize-height={2048}
      shadow-camera-left={-48} shadow-camera-right={48} shadow-camera-top={48} shadow-camera-bottom={-48}
      shadow-camera-far={145} shadow-normalBias={0.025} shadow-bias={-0.00015} shadow-radius={3} />
  </>;
}

export function MuseumExterior() {
  const paving = useSurface("paving", 18, 16);
  const { reflection, reflector } = useExteriorReflection();
  return <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.035, 27]} receiveShadow>
      <planeGeometry args={[120, 110]} /><meshStandardMaterial color="#7e8669" roughness={1} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.018, 22]} receiveShadow>
      <planeGeometry args={[33.6, 40]} /><meshStandardMaterial map={paving?.map} bumpMap={paving?.bump} bumpScale={0.025} color="#e3e0d6" roughness={0.93} />
    </mesh>
    <group ref={reflector}>
      <MuseumVolumes reflection={reflection} />
      <GlassEntrance reflection={reflection} />
    </group>
    <Neighbourhood reflection={null} />
    <StreetFurniture />
  </group>;
}
