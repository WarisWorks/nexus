"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, InstancedMesh, Object3D, PointLight } from "three";
import { createSegmentedRing, damp, SculptureProps, useSculptureMaterials } from "./shared";

/** An open mechanical reactor: three gyroscopes surrounding an illuminated inner chamber. */
export function EnergyCore({ active = true, reducedMotion = false, activation = 0 }: SculptureProps & { activation?: number }) {
  const root = useRef<Group>(null);
  const rings = useRef<Group>(null);
  const blades = useRef<InstancedMesh>(null);
  const light = useRef<PointLight>(null);
  const hovered = useRef(false);
  const pulse = useRef(0);
  const exposureHold = useRef(0);
  const lastActivation = useRef(activation);
  useEffect(() => {
    if (activation > 0 && activation !== lastActivation.current) {
      pulse.current = 1;
      exposureHold.current = 1.2;
    }
    lastActivation.current = activation;
  }, [activation]);
  const activity = useRef(0);
  const elapsed = useRef(0);
  const materials = useSculptureMaterials();
  const object = useMemo(() => new Object3D(), []);
  const ring = useMemo(() => createSegmentedRing(1.12, 0.065, 36, 0.1), []);
  useEffect(() => () => ring.dispose(), [ring]);

  useLayoutEffect(() => {
    if (!blades.current) return;
    for (let index = 0; index < 24; index++) {
      const angle = index / 24 * Math.PI * 2;
      object.position.set(Math.cos(angle) * 0.75, Math.sin(angle) * 0.75, 0);
      object.rotation.set(0.16, 0.1, angle);
      object.scale.set(0.24, 0.055, 0.22);
      object.updateMatrix();
      blades.current.setMatrixAt(index, object.matrix);
    }
    blades.current.instanceMatrix.needsUpdate = true;
  }, [object]);

  useFrame(({ pointer }, delta) => {
    if (!active) return;
    exposureHold.current = Math.max(0, exposureHold.current - Math.min(delta, 0.1));
    pulse.current = damp(pulse.current, exposureHold.current > 0 ? 1 : 0, 2.8, delta);
    activity.current = damp(activity.current, hovered.current ? 1 : 0, 3, delta);
    if (!reducedMotion) elapsed.current += Math.min(delta, 0.05) * (1 + activity.current * 1.3);
    const time = elapsed.current;
    if (root.current) {
      root.current.rotation.x = damp(root.current.rotation.x, 0.25 + pointer.y * 0.1 + pulse.current * 0.35, 3, delta);
      root.current.rotation.y = time * 0.12 + pointer.x * 0.1;
      root.current.scale.setScalar(1 + pulse.current * 0.12);
    }
    if (rings.current) rings.current.children.forEach((child, index) => {
      child.rotation.x = time * 0.09 * (index % 2 ? -1 : 1) + index * 0.78;
      child.rotation.y = time * 0.12 + index * 0.6;
      child.rotation.z = time * 0.13 * (index % 2 ? -1 : 1);
      child.scale.setScalar(1 + activity.current * index * 0.04 + pulse.current * (0.08 + index * 0.13));
      child.position.z = damp(child.position.z, (index - 1) * pulse.current * 0.38, 5, delta);
    });
    if (blades.current) blades.current.rotation.z = -time * 0.2;
    if (light.current) light.current.intensity = 1.3 + activity.current * 1.3 + pulse.current * 2.5;
    materials.light.emissiveIntensity = 0.8 + activity.current * 0.7 + pulse.current * 1.5;
  });

  return (
    <group ref={root} rotation={[0.25, 0.2, 0]} onPointerOver={() => { hovered.current = true; }} onPointerOut={() => { hovered.current = false; }} onClick={() => { pulse.current = 1; exposureHold.current = 1.2; }}>
      <group ref={rings}>
        <mesh geometry={ring} material={materials.chrome} />
        <mesh geometry={ring} material={materials.brushed} rotation={[0.78, 0.6, 0]} />
        <mesh geometry={ring} material={materials.chrome} rotation={[1.56, 1.2, 0]} />
      </group>
      <instancedMesh ref={blades} args={[undefined, materials.graphite, 24]}><boxGeometry args={[1, 1, 1]} /></instancedMesh>
      <mesh material={materials.chrome}><torusGeometry args={[0.63, 0.043, 8, 70]} /></mesh>
      <mesh material={materials.light}><torusGeometry args={[0.49, 0.018, 8, 70]} /></mesh>
      <mesh material={materials.glass}><icosahedronGeometry args={[0.45, 1]} /></mesh>
      <mesh material={materials.light}><icosahedronGeometry args={[0.3, 2]} /></mesh>
      <pointLight ref={light} color="#e5efff" intensity={1.3} distance={3.5} decay={2} />
    </group>
  );
}

export default EnergyCore;
