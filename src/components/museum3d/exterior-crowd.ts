import { Bone, CatmullRomCurve3, Quaternion, Vector3, type Object3D } from "three";

export type VisitorAge = "adult" | "child" | "senior";
export type RouteId = "left" | "right" | "rear";

export interface CrowdMember {
  id: string;
  age: VisitorAge;
  tint: string;
  hair: string;
  scale: number;
  /** Side-by-side spacing in the group's local X axis. */
  offset: number;
}

export interface WalkingGroupSpec {
  id: string;
  route: RouteId;
  phase: number;
  speed: number;
  members: readonly CrowdMember[];
}

export const walkingGroups: readonly WalkingGroupSpec[] = [
  {
    id: "family-left", route: "left", phase: 0.05, speed: 0.78,
    members: [
      { id: "parent-left", age: "adult", tint: "#627866", hair: "#403329", scale: 1.01, offset: 0 },
      { id: "child-left-a", age: "child", tint: "#ba874c", hair: "#654731", scale: 0.65, offset: -0.66 },
      { id: "child-left-b", age: "child", tint: "#678eac", hair: "#513e2e", scale: 0.73, offset: 0.66 },
    ],
  },
  {
    id: "senior-pair", route: "left", phase: 0.65, speed: 0.59,
    members: [
      { id: "senior-left-a", age: "senior", tint: "#8c7e71", hair: "#c1beb5", scale: 0.96, offset: -0.43 },
      { id: "senior-left-b", age: "senior", tint: "#77798a", hair: "#d4d0c6", scale: 0.93, offset: 0.43 },
    ],
  },
  {
    id: "adult-left", route: "left", phase: 0.35, speed: 1.06,
    members: [{ id: "adult-walker-left", age: "adult", tint: "#445d71", hair: "#342a24", scale: 1.03, offset: 0 }],
  },
  {
    id: "family-right", route: "right", phase: 0.08, speed: 0.75,
    members: [
      { id: "parent-right", age: "adult", tint: "#906c57", hair: "#392c24", scale: 0.99, offset: -0.39 },
      { id: "child-right", age: "child", tint: "#a36a76", hair: "#795c3e", scale: 0.61, offset: 0.39 },
    ],
  },
  {
    id: "adult-pair", route: "right", phase: 0.6, speed: 0.9,
    members: [
      { id: "adult-right-a", age: "adult", tint: "#596e80", hair: "#302722", scale: 1.02, offset: -0.4 },
      { id: "adult-right-b", age: "adult", tint: "#89704f", hair: "#886c4b", scale: 0.96, offset: 0.4 },
    ],
  },
  {
    id: "senior-rear", route: "rear", phase: 0.16, speed: 0.64,
    members: [{ id: "senior-walker-rear", age: "senior", tint: "#757c63", hair: "#aaa9a2", scale: 1, offset: 0 }],
  },
  {
    id: "adult-rear", route: "rear", phase: 0.68, speed: 1.03,
    members: [{ id: "adult-walker-rear", age: "adult", tint: "#72535e", hair: "#45362c", scale: 1.02, offset: 0 }],
  },
];

export const waitingVisitors: readonly (CrowdMember & { position: [number, number, number] })[] = [
  { id: "queue-adult-a", age: "adult", tint: "#466071", hair: "#584331", scale: 1, offset: 0, position: [2.9, 0, 17.8] },
  { id: "queue-senior", age: "senior", tint: "#7a685b", hair: "#c7c3bb", scale: 0.96, offset: 0, position: [3.1, 0, 18.9] },
  { id: "queue-adult-b", age: "adult", tint: "#626c54", hair: "#352b25", scale: 1.03, offset: 0, position: [3, 0, 20] },
];

export function createCrowdRoutes(): Record<RouteId, CatmullRomCurve3> {
  // A generous turning radius matters for side-by-side families: a child on
  // the inner side of a hairpin would otherwise move backwards while turning.
  const ellipse = (x: number, z: number, radiusX: number, radiusZ: number): [number, number][] =>
    Array.from({ length: 16 }, (_, i) => {
      const angle = i / 16 * Math.PI * 2;
      return [x + Math.cos(angle) * radiusX, z + Math.sin(angle) * radiusZ];
    });
  const points: Record<RouteId, [number, number][]> = {
    left: ellipse(-7, 23.2, 2.5, 4),
    right: ellipse(8.5, 19.45, 1.45, 1.25),
    rear: ellipse(10.6, 30.2, 3, 1.2),
  };
  const make = (id: RouteId) => {
    const curve = new CatmullRomCurve3(points[id].map(([x, z]) => new Vector3(x, 0, z)), true, "centripetal");
    curve.arcLengthDivisions = 512;
    curve.updateArcLengths();
    return curve;
  };
  return { left: make("left"), right: make("right"), rear: make("rear") };
}

/** Quaternius' civil rig faces +Z. A -Z convention makes it moonwalk. */
export function headingFromDirection(x: number, z: number) {
  return Math.atan2(x, z);
}

export interface CrowdMotion {
  spec: WalkingGroupSpec;
  curve: CatmullRomCurve3;
  length: number;
  distance: number;
  speed: number;
  nextSpeed: number;
  position: Vector3;
  tangent: Vector3;
  yaw: number;
}

export function sampleCrowdMotion(motion: CrowdMotion) {
  const phase = motion.distance / motion.length;
  motion.curve.getPointAt(phase, motion.position);
  motion.curve.getTangentAt(phase, motion.tangent);
  motion.yaw = headingFromDirection(motion.tangent.x, motion.tangent.z);
}

export function createCrowdMotion(spec: WalkingGroupSpec, curve: CatmullRomCurve3): CrowdMotion {
  const length = curve.getLength();
  const motion = {
    spec, curve, length, distance: spec.phase * length,
    speed: spec.speed, nextSpeed: spec.speed,
    position: new Vector3(), tangent: new Vector3(), yaw: 0,
  };
  sampleCrowdMotion(motion);
  return motion;
}

export function advanceCrowd(motions: readonly CrowdMotion[], frameDelta: number) {
  const delta = Math.min(Math.max(frameDelta, 0), 0.08);
  // Read every group's previous position before updating any of them. Slower
  // families retain their space and faster walkers follow, rather than overlap.
  for (const motion of motions) {
    let targetSpeed = motion.spec.speed;
    for (const other of motions) {
      if (other === motion || other.spec.route !== motion.spec.route) continue;
      const gap = (other.distance - motion.distance + motion.length) % motion.length;
      if (gap < 2.8) {
        targetSpeed = Math.min(targetSpeed, other.speed * Math.max(0, (gap - 1.65) / 1.15));
      }
    }
    motion.nextSpeed = motion.speed + (targetSpeed - motion.speed) * (1 - Math.exp(-5 * delta));
  }
  for (const motion of motions) {
    motion.speed = motion.nextSpeed;
    motion.distance = (motion.distance + motion.speed * delta) % motion.length;
    sampleCrowdMotion(motion);
  }
}

/** Keep the animation's step length in proportion to character height. */
export function walkingTimeScale(speed: number, characterScale: number) {
  return speed / (1.05 * characterScale);
}

interface BoneAdjustment {
  bone: Bone;
  animatedRotation: Quaternion;
  animatedScale: Vector3;
  correction: Quaternion;
  proportions: Vector3;
}

export function createAgeAdjustments(scene: Object3D, age: VisitorAge): BoneAdjustment[] {
  scene.updateMatrixWorld(true);
  const specs = age === "child"
    ? [{ name: "Head", tilt: 0, proportions: new Vector3(1.18, 1.12, 1.16) }]
    : age === "senior"
      ? [
          { name: "Torso", tilt: 0.07, proportions: new Vector3(1, 1, 1) },
          { name: "Chest", tilt: 0.025, proportions: new Vector3(1, 1, 1) },
          { name: "Neck", tilt: -0.04, proportions: new Vector3(1, 1, 1) },
        ]
      : [];
  return specs.flatMap(({ name, tilt, proportions }) => {
    const bone = scene.getObjectByName(name);
    if (!(bone instanceof Bone)) return [];
    // This rig already has Blender's -90° conversion. Convert the lateral
    // character axis to bone space rather than assuming a local rotation axis.
    const localAxis = new Vector3(1, 0, 0).applyQuaternion(bone.getWorldQuaternion(new Quaternion()).invert());
    return [{
      bone, animatedRotation: bone.quaternion.clone(), animatedScale: bone.scale.clone(),
      correction: new Quaternion().setFromAxisAngle(localAxis, tilt), proportions,
    }];
  });
}

export function restoreAnimatedPose(adjustments: readonly BoneAdjustment[]) {
  for (const item of adjustments) {
    item.bone.quaternion.copy(item.animatedRotation);
    item.bone.scale.copy(item.animatedScale);
  }
}

export function applyAgePose(adjustments: readonly BoneAdjustment[]) {
  for (const item of adjustments) {
    item.animatedRotation.copy(item.bone.quaternion);
    item.animatedScale.copy(item.bone.scale);
    item.bone.quaternion.multiply(item.correction);
    item.bone.scale.multiply(item.proportions);
  }
}
