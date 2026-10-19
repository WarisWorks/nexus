"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { EdgesGeometry, Group, OctahedronGeometry } from "three";
import { damp, SculptureProps, useSculptureMaterials } from "./shared";

/** Nested optical prisms, a suspended metallic skeleton, and separating crystal satellites. */
export function GlassStructure({ active = true, reducedMotion = false, activation = 0 }: SculptureProps & { activation?: number }) {
  const root = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const fragments = useRef<Group>(null);
  const hover = useRef(false);
  const activity = useRef(0);
  const pulse = useRef(0);
  const lastActivation = useRef(activation);
  useEffect(() => {
    if (activation > 0 && activation !== lastActivation.current) pulse.current = 1;
    lastActivation.current = activation;
  }, [activation]);
  const elapsed = useRef(0);
  const materials = useSculptureMaterials();
  const edges = useMemo(() => {
    const geometry = new OctahedronGeometry(1.1);
    const result = new EdgesGeometry(geometry);
    geometry.dispose();
    return result;
  }, []);
  useEffect(() => () => edges.dispose(), [edges]);

  useFrame(({ pointer }, delta) => {
    if (!active) return;
    if (!reducedMotion) elapsed.current += Math.min(delta, 0.05);
    const time = elapsed.current;
    pulse.current = damp(pulse.current, 0, 2.5, delta);
    activity.current = damp(activity.current, (hover.current ? 1 : 0) + pulse.current, 4, delta);
    if (root.current) {
      root.current.rotation.y = time * 0.11 + pointer.x * 0.12;
      root.current.rotation.z = 0.16 + pointer.y * 0.045;
      root.current.scale.setScalar(1 + pulse.current * 0.12);
    }
    if (inner.current) {
      inner.current.rotation.x = time * 0.17;
      inner.current.rotation.y = -time * (0.2 + activity.current * 0.12);
    }
    if (fragments.current) {
      fragments.current.rotation.y = -time * 0.08;
      fragments.current.children.forEach((child, index) => {
        const angle = index / 6 * Math.PI * 2;
        const radius = 1.21 + activity.current * 0.24;
        child.position.set(Math.cos(angle) * radius, Math.sin(angle * 2 + time * 0.22) * 0.42, Math.sin(angle) * radius);
        child.rotation.x = time * 0.1 + angle;
        child.rotation.z = time * 0.08;
      });
    }
  });

  return (
    <group ref={root} rotation={[0.12, 0, 0.16]} onPointerOver={() => { hover.current = true; }} onPointerOut={() => { hover.current = false; }} onClick={() => { pulse.current = 1; }}>
      <mesh material={materials.glass} scale={[0.83, 1.25, 0.83]}><octahedronGeometry args={[1.1]} /></mesh>
      <lineSegments geometry={edges} scale={[0.83, 1.25, 0.83]}><lineBasicMaterial color="#c4d2df" transparent opacity={0.48} /></lineSegments>
      <group ref={inner} rotation={[0.5, 0.6, 0]}>
        <mesh material={materials.chrome} scale={[0.56, 0.56, 0.56]}><octahedronGeometry args={[1]} /><meshPhysicalMaterial color="#aebbc7" metalness={1} roughness={0.16} wireframe /></mesh>
        <mesh material={materials.glass} scale={[0.48, 0.74, 0.48]}><octahedronGeometry args={[1]} /></mesh>
        <mesh material={materials.light}><octahedronGeometry args={[0.17]} /></mesh>
        <mesh material={materials.chrome} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.62, 0.018, 6, 64]} /></mesh>
      </group>
      <group ref={fragments}>
        {Array.from({ length: 6 }, (_, index) => (
          <mesh key={index} material={index % 2 ? materials.glass : materials.chrome} scale={[0.09, 0.22, 0.09]}><octahedronGeometry args={[1]} /></mesh>
        ))}
      </group>
    </group>
  );
}

export default GlassStructure;
