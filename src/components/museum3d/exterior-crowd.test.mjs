import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { AnimationMixer, Matrix4, Quaternion, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import {
  advanceCrowd, createCrowdMotion, createCrowdRoutes, headingFromDirection,
  sampleCrowdMotion, waitingVisitors, walkingGroups, walkingTimeScale,
  applyAgePose, createAgeAdjustments, restoreAnimatedPose,
} from "./exterior-crowd.ts";

function createMotions() {
  const routes = createCrowdRoutes();
  return walkingGroups.map((spec) => createCrowdMotion(spec, routes[spec.route]));
}

function memberPoint(motion, offset) {
  return new Vector3(motion.position.x + Math.cos(motion.yaw) * offset, 0,
    motion.position.z - Math.sin(motion.yaw) * offset);
}

test("+Z-facing character follows every cardinal direction, never backwards", () => {
  for (const [x, z] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, -1]]) {
    const yaw = headingFromDirection(x, z);
    const facing = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    assert.ok(facing.dot(new Vector3(x, 0, z).normalize()) > 0.99999);
  }
});

test("native asset's eyes face +Z; required clips have no translating Root", async () => {
  const bytes = await readFile(new URL("../../../public/models/exterior-visitor.glb", import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString("utf8"));
  const binaryStart = 20 + jsonLength + 8;
  const headIndex = gltf.meshes.findIndex((mesh) => mesh.name === "Casual2_Head");
  const head = gltf.meshes[headIndex];
  const node = gltf.nodes.find((item) => item.mesh === headIndex);
  const transform = new Matrix4().compose(new Vector3(...(node.translation ?? [0, 0, 0])),
    new Quaternion(...(node.rotation ?? [0, 0, 0, 1])), new Vector3(...(node.scale ?? [1, 1, 1])));
  function centroid(materialName) {
    const primitive = head.primitives.find((p) => gltf.materials[p.material].name === materialName);
    const accessor = gltf.accessors[primitive.attributes.POSITION];
    const view = gltf.bufferViews[accessor.bufferView];
    const start = binaryStart + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const mean = new Vector3();
    for (let i = 0; i < accessor.count; i++) {
      const offset = start + i * (view.byteStride ?? 12);
      mean.add(new Vector3(bytes.readFloatLE(offset), bytes.readFloatLE(offset + 4), bytes.readFloatLE(offset + 8)));
    }
    return mean.divideScalar(accessor.count).applyMatrix4(transform);
  }
  assert.ok(centroid("Eye").z > centroid("Hair").z, "asset's face must point to +Z");
  for (const name of ["Walk", "Idle_Neutral"]) {
    const clip = gltf.animations.find((animation) => animation.name.endsWith(`|${name}`));
    assert.ok(clip);
    assert.equal(clip.channels.some((channel) =>
      gltf.nodes[channel.target.node].name === "Root" && channel.target.path === "translation"), false);
  }
});

test("majority walks; children have companions and seniors have a slower pace", () => {
  const moving = walkingGroups.flatMap((group) => group.members);
  const all = [...moving, ...waitingVisitors];
  assert.equal(moving.length, 12);
  assert.equal(waitingVisitors.length, 3);
  assert.equal(all.filter((member) => member.age === "child").length, 3);
  assert.equal(all.filter((member) => member.age === "senior").length, 4);
  assert.equal(new Set(all.map((member) => member.id)).size, all.length);
  for (const group of walkingGroups) {
    if (group.members.some((member) => member.age === "child")) {
      assert.ok(group.members.some((member) => member.age === "adult"));
      assert.ok(group.members.every((member) => Math.abs(member.offset) <= 0.7));
    }
    if (group.members.every((member) => member.age === "senior")) assert.ok(group.speed < 0.7);
  }
  assert.ok(walkingTimeScale(0.75, 0.65) > walkingTimeScale(0.75, 1));
  assert.equal(walkingTimeScale(0, 1), 0);
});

test("entire curves and family offsets clear gardens, furniture, queue and arrival camera", () => {
  // Bounds of the existing exterior furniture/planting, including body clearance.
  const obstacles = [
    [6, 17, 22, 28], [-5.5, -3.5, 16, 17], [3.5, 5.5, 16, 17],
    [-12.9, -10.1, 18.5, 19.3], [12.4, 15.2, 18.5, 19.3],
    [-13.5, -11.5, 23.5, 29.3], [-14.08, -13.92, 20.42, 20.58],
    [17.72, 17.88, 20.42, 20.58], [1.8, 4.45, 17.1, 20.9],
  ];
  for (const motion of createMotions()) {
    for (let sample = 0; sample < 1000; sample++) {
      motion.distance = sample / 1000 * motion.length;
      sampleCrowdMotion(motion);
      for (const member of motion.spec.members) {
        const p = memberPoint(motion, member.offset);
        const radius = 0.25 * member.scale;
        assert.ok(p.z > 17.5, `entrant path: ${member.id}`);
        assert.ok(p.distanceTo(new Vector3(-1.5, 0, 32)) > 4, `camera: ${member.id}`);
        for (const [minX, maxX, minZ, maxZ] of obstacles) {
          const x = Math.max(minX, Math.min(p.x, maxX));
          const z = Math.max(minZ, Math.min(p.z, maxZ));
          assert.ok(Math.hypot(p.x - x, p.z - z) > radius,
            `${member.id} at ${p.x.toFixed(2)},${p.z.toFixed(2)} intersects ${minX},${minZ}`);
        }
      }
    }
  }
});

test("loops are continuous, and every family member travels in its facing direction", () => {
  for (const motion of createMotions()) {
    const start = motion.curve.getPointAt(0);
    assert.ok(start.distanceTo(motion.curve.getPointAt(1)) < 1e-6);
    assert.ok(motion.curve.getTangentAt(0).dot(motion.curve.getTangentAt(1)) > 0.999);
    for (let i = 0; i < 1000; i++) {
      motion.distance = i / 1000 * motion.length;
      sampleCrowdMotion(motion);
      const points = motion.spec.members.map((member) => memberPoint(motion, member.offset));
      const facing = motion.tangent.clone();
      motion.distance += motion.length / 100000;
      sampleCrowdMotion(motion);
      motion.spec.members.forEach((member, index) => {
        const movement = memberPoint(motion, member.offset).sub(points[index]).normalize();
        assert.ok(movement.dot(facing) > 0.98, `backwards or sideways: ${member.id}, phase ${i / 1000}, alignment ${movement.dot(facing)}`);
      });
    }
  }
});

test("five minutes of movement retains spacing and does not deadlock", () => {
  const motions = createMotions();
  const travelled = motions.map(() => 0);
  for (let frame = 0; frame < 60 * 300; frame++) {
    advanceCrowd(motions, 1 / 60);
    motions.forEach((motion, index) => {
      travelled[index] += motion.speed / 60;
      assert.ok(Number.isFinite(motion.yaw));
      for (const other of motions) {
        if (motion === other || motion.spec.route !== other.spec.route) continue;
        const gap = (other.distance - motion.distance + motion.length) % motion.length;
        assert.ok(gap > 1.4, `groups overlapping: ${motion.spec.id} / ${other.spec.id}`);
      }
    });
  }
  assert.ok(travelled.every((distance) => distance > 70));
});

test("child proportions and senior posture do not accumulate or deform the animated rig", async () => {
  const bytes = await readFile(new URL("../../../public/models/exterior-visitor.glb", import.meta.url));
  const asset = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
  for (const age of ["child", "senior"]) {
    for (const clipName of ["Walk", "Idle_Neutral"]) {
      const scene = cloneSkeleton(asset.scene);
      const reference = cloneSkeleton(asset.scene);
      const mixer = new AnimationMixer(scene);
      const referenceMixer = new AnimationMixer(reference);
      const adjustments = createAgeAdjustments(scene, age);
      assert.equal(adjustments.length, age === "child" ? 1 : 3);
      const clip = asset.animations.find((item) => item.name.endsWith(`|${clipName}`));
      mixer.clipAction(clip).play();
      referenceMixer.clipAction(clip).play();
      for (let frame = 0; frame < 300; frame++) {
        restoreAnimatedPose(adjustments);
        mixer.update(frame === 0 ? 0 : 1 / 60);
        referenceMixer.update(frame === 0 ? 0 : 1 / 60);
        applyAgePose(adjustments);
        for (const item of adjustments) {
          const bone = reference.getObjectByName(item.bone.name);
          const expectedRotation = bone.quaternion.clone().multiply(item.correction);
          assert.ok(item.bone.quaternion.angleTo(expectedRotation) < 0.001);
          assert.ok(item.bone.scale.distanceTo(bone.scale.clone().multiply(item.proportions)) < 0.00001);
        }
      }
      mixer.stopAllAction();
      referenceMixer.stopAllAction();
      mixer.uncacheRoot(scene);
      referenceMixer.uncacheRoot(reference);
    }
  }
});
