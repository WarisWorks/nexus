"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, InstancedMesh, Object3D, PointLight } from "three";
import { createSegmentedRing, createSphericalPanel, damp, SculptureProps, useSculptureMaterials } from "./shared";

export interface MechanicalSphereProps extends SculptureProps {
  /** 0 is assembled; 1 separates the petals and exposes the reactor. */
  progress?: number;
  /** Optional scroll driver that updates without React renders. */
  progressRef?: RefObject<number>;
}

/** Procedurally machined, fully interactive hero sculpture. Radius approximately 2.2. */
export function MechanicalSphere({ progress = 0, progressRef, active = true, reducedMotion = false }: MechanicalSphereProps) {
  const root = useRef<Group>(null);
  const gimbal = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const petals = useRef<InstancedMesh>(null);
  const fasteners = useRef<InstancedMesh>(null);
  const braces = useRef<InstancedMesh>(null);
  const shards = useRef<InstancedMesh>(null);
  const coreLight = useRef<PointLight>(null);
  const hovered = useRef(false);
  const pulse = useRef(0);
  const elapsed = useRef(0);
  const object = useMemo(() => new Object3D(), []);
  const materials = useSculptureMaterials();
  const geometries = useMemo(() => ({
    petal: createSphericalPanel(1.78, 0.065, 0.48, 2.18, 0.46),
    outer: createSegmentedRing(1.94, 0.095, 40, 0.08),
    inner: createSegmentedRing(1.5, 0.045, 48, 0.12),
    core: createSegmentedRing(0.8, 0.055, 28, 0.08),
  }), []);
  useEffect(() => () => Object.values(geometries).forEach((geometry) => geometry.dispose()), [geometries]);

  useLayoutEffect(() => {
    if (!fasteners.current || !braces.current) return;
    for (let index = 0; index < 64; index++) {
      const theta = index / 64 * Math.PI * 2;
      object.position.set(Math.cos(theta) * 1.96, Math.sin(theta) * 1.96, 0.085);
      object.rotation.set(Math.PI / 2, 0, theta);
      object.scale.setScalar(index % 4 === 0 ? 1.4 : 1);
      object.updateMatrix();
      fasteners.current.setMatrixAt(index, object.matrix);
    }
    for (let index = 0; index < 24; index++) {
      const theta = index / 24 * Math.PI * 2;
      object.position.set(Math.cos(theta) * 1.13, Math.sin(theta) * 1.13, 0);
      object.rotation.set(0, 0, theta - Math.PI / 2);
      object.scale.set(0.025, 0.57, 0.06);
      object.updateMatrix();
      braces.current.setMatrixAt(index, object.matrix);
    }
    fasteners.current.instanceMatrix.needsUpdate = true;
    braces.current.instanceMatrix.needsUpdate = true;
  }, [object]);

  useFrame(({ pointer }, delta) => {
    if (!root.current || !active) return;
    const opening = progressRef?.current ?? progress;
    const speed = reducedMotion ? 0 : 1;
    elapsed.current += Math.min(delta, 0.05) * speed;
    const time = elapsed.current;
    pulse.current = damp(pulse.current, 0, 3.2, delta);
    const energy = pulse.current;
    root.current.rotation.x = damp(root.current.rotation.x, -0.12 + pointer.y * 0.13, 2.4, delta);
    root.current.rotation.y = damp(root.current.rotation.y, pointer.x * 0.2 + time * 0.035, 2.4, delta);
    root.current.position.y = Math.sin(time * 0.6) * 0.055;
    const scale = 1 + energy * 0.055;
    root.current.scale.setScalar(scale);
    if (gimbal.current) {
      gimbal.current.rotation.z = time * 0.045 + pointer.x * 0.04;
      gimbal.current.rotation.x = 0.42 + Math.sin(time * 0.2) * 0.1 + opening * 0.7;
    }
    if (inner.current) {
      inner.current.rotation.x = time * 0.12;
      inner.current.rotation.y = -time * (hovered.current ? 0.18 : 0.075);
    }
    if (coreLight.current) coreLight.current.intensity = 2.8 + energy * 4 + Math.sin(time * 2) * 0.25;
    if (petals.current) {
      for (let index = 0; index < 8; index++) {
        const angle = index / 8 * Math.PI * 2;
        const separation = Math.max(0, opening) * 1.45 + energy * 0.12;
        object.position.set(Math.sin(angle) * separation, (index % 2 ? -1 : 1) * separation * 0.18, Math.cos(angle) * separation);
        object.rotation.set(opening * 0.14, angle + opening * (index % 2 ? 0.15 : -0.15), 0);
        object.scale.setScalar(1);
        object.updateMatrix();
        petals.current.setMatrixAt(index, object.matrix);
      }
      petals.current.instanceMatrix.needsUpdate = true;
    }
    if (shards.current) {
      for (let index = 0; index < 18; index++) {
        const angle = index * 2.39996 + time * (index % 2 ? 0.025 : -0.02);
        const radius = 2.12 + Math.sin(index * 4.1) * 0.15 + opening * 0.55;
        object.position.set(Math.cos(angle) * radius, Math.sin(index * 7.7 + time * 0.1) * 1.45, Math.sin(angle) * radius);
        object.rotation.set(angle * 1.2 + time * 0.12, angle, angle * 0.8);
        const size = index % 3 === 0 ? 0.11 : 0.065;
        object.scale.set(size * 0.6, size * 2.2, size);
        object.updateMatrix();
        shards.current.setMatrixAt(index, object.matrix);
      }
      shards.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={root} onPointerOver={() => { hovered.current = true; }} onPointerOut={() => { hovered.current = false; }} onClick={() => { pulse.current = 1; }}>
      <instancedMesh ref={petals} args={[geometries.petal, materials.brushed, 8]} frustumCulled={false} />
      <group ref={gimbal} rotation={[0.42, 0, -0.16]}>
        <mesh geometry={geometries.outer} material={materials.chrome} />
        <mesh rotation={[0, Math.PI / 2.8, 0]} geometry={geometries.outer} material={materials.graphite} scale={0.96} />
        <mesh rotation={[Math.PI / 2.3, 0.18, 0]} geometry={geometries.outer} material={materials.chrome} scale={0.92} />
        <mesh material={materials.graphite}><torusGeometry args={[2.035, 0.018, 6, 128]} /></mesh>
        <mesh material={materials.warmMetal} position={[0, 0, 0.065]}><torusGeometry args={[1.845, 0.016, 6, 128]} /></mesh>
        <instancedMesh ref={fasteners} args={[undefined, materials.chrome, 64]}>
          <cylinderGeometry args={[0.021, 0.021, 0.043, 6]} />
        </instancedMesh>
        <instancedMesh ref={braces} args={[undefined, materials.graphite, 24]}><boxGeometry args={[1, 1, 1]} /></instancedMesh>
      </group>
      <group ref={inner} rotation={[0.4, 0.5, 0]}>
        <mesh geometry={geometries.inner} material={materials.chrome} />
        <mesh geometry={geometries.inner} material={materials.brushed} rotation={[Math.PI / 2, 0, 0]} />
        <mesh geometry={geometries.inner} material={materials.warmMetal} rotation={[0, Math.PI / 2, 0]} scale={0.94} />
        <mesh><icosahedronGeometry args={[1.1, 0]} /><meshPhysicalMaterial color="#252c35" metalness={1} roughness={0.28} wireframe /></mesh>
        <mesh material={materials.chrome}><icosahedronGeometry args={[1.14, 0]} /><meshPhysicalMaterial color="#9fa8b0" metalness={1} roughness={0.2} wireframe /></mesh>
        <mesh geometry={geometries.core} material={materials.chrome} rotation={[0.4, 0.7, 0]} />
        <mesh geometry={geometries.core} material={materials.chrome} rotation={[-0.5, 1.3, 0.6]} />
        <mesh material={materials.light}><icosahedronGeometry args={[0.52, 3]} /></mesh>
        <mesh material={materials.glass}><sphereGeometry args={[0.68, 40, 32]} /></mesh>
        <pointLight ref={coreLight} color="#dceeff" intensity={2.8} distance={5} decay={2} />
      </group>
      <instancedMesh ref={shards} args={[undefined, materials.brushed, 18]} frustumCulled={false}><boxGeometry args={[1, 1, 1]} /></instancedMesh>
    </group>
  );
}

export default MechanicalSphere;
