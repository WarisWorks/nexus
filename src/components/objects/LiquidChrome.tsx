"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group, MeshPhysicalMaterial, Vector2 } from "three";
import { liquidDeformation } from "../../shaders/liquid/deformation";
import { damp, SculptureProps, useSculptureMaterials } from "./shared";

/** Living chrome: GPU vertex deformation with recalculated normals and physical lighting. */
export function LiquidChrome({ active = true, reducedMotion = false, activation = 0 }: SculptureProps & { activation?: number }) {
  const root = useRef<Group>(null);
  const halo = useRef<Group>(null);
  const hovered = useRef(false);
  const pulse = useRef(0);
  const lastActivation = useRef(activation);
  useEffect(() => {
    if (activation > 0 && activation !== lastActivation.current) pulse.current = 1;
    lastActivation.current = activation;
  }, [activation]);
  const materials = useSculptureMaterials();
  const uniforms = useMemo(() => ({
    time: { value: 0 },
    activity: { value: 0 },
    pointer: { value: new Vector2() },
  }), []);
  const liquidMaterial = useMemo(() => {
    const material = new MeshPhysicalMaterial({ color: "#aab2bd", metalness: 1, roughness: 0.13, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.5 });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uNexusTime = uniforms.time;
      shader.uniforms.uNexusActivity = uniforms.activity;
      shader.uniforms.uNexusPointer = uniforms.pointer;
      shader.vertexShader = liquidDeformation + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <beginnormal_vertex>", /* glsl */ `
        #include <beginnormal_vertex>
        vec3 nexusN = normalize(normal);
        vec3 nexusT = normalize(cross(nexusN, abs(nexusN.y) > 0.95 ? vec3(1., 0., 0.) : vec3(0., 1., 0.)));
        vec3 nexusB = normalize(cross(nexusN, nexusT));
        vec3 nexusP = nexusDeform(position);
        vec3 nexusDT = nexusDeform(position + nexusT * 0.006) - nexusP;
        vec3 nexusDB = nexusDeform(position + nexusB * 0.006) - nexusP;
        objectNormal = normalize(cross(nexusDT, nexusDB));
      `).replace("#include <begin_vertex>", "vec3 transformed = nexusDeform(position);");
    };
    material.customProgramCacheKey = () => "nexus-liquid-chrome-v1";
    return material;
  }, [uniforms]);
  useEffect(() => () => liquidMaterial.dispose(), [liquidMaterial]);

  useFrame(({ pointer }, delta) => {
    if (!active) return;
    if (!reducedMotion) uniforms.time.value += Math.min(delta, 0.05);
    pulse.current = damp(pulse.current, 0, 3, delta);
    uniforms.activity.value = damp(uniforms.activity.value, (hovered.current ? 1 : 0.15) + pulse.current * 1.2, 3, delta);
    uniforms.pointer.value.lerp(pointer, 1 - Math.exp(-delta * 3));
    if (root.current) {
      root.current.rotation.y = uniforms.time.value * 0.12 + pointer.x * 0.08;
      root.current.rotation.z = Math.sin(uniforms.time.value * 0.2) * 0.1;
      root.current.scale.setScalar(1 + pulse.current * 0.12);
    }
    if (halo.current) {
      halo.current.rotation.y = -uniforms.time.value * 0.1;
      halo.current.rotation.x = 1.18 + pointer.y * 0.05;
    }
  });

  return (
    <group ref={root} onPointerOver={() => { hovered.current = true; }} onPointerOut={() => { hovered.current = false; }} onClick={() => { pulse.current = 1; }}>
      <mesh material={liquidMaterial} scale={[0.89, 1.12, 0.89]}><sphereGeometry args={[1, 96, 64]} /></mesh>
      <group ref={halo} rotation={[1.18, 0.2, -0.2]}>
        <mesh material={materials.chrome}><torusGeometry args={[1.37, 0.012, 6, 100]} /></mesh>
        <mesh material={materials.graphite}><torusGeometry args={[1.41, 0.005, 5, 100]} /></mesh>
        {[0, Math.PI, Math.PI / 2, Math.PI * 1.5].map((angle) => <mesh key={angle} position={[Math.cos(angle) * 1.37, Math.sin(angle) * 1.37, 0]} material={materials.light}><sphereGeometry args={[0.026, 10, 10]} /></mesh>)}
      </group>
    </group>
  );
}

export default LiquidChrome;
