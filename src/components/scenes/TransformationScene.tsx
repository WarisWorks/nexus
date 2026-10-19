"use client";

import { useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export interface TransformationSceneProps {
  /** Local chapter progress. Every transition is deterministic and reversible. */
  progress: number;
  progressRef?: RefObject<number>;
  active?: boolean;
  reducedMotion?: boolean;
}

const SHARD_COUNT = 320;
const PARTICLE_COUNT = 2400;
const TAU = Math.PI * 2;
const smoothstep = (a: number, b: number, value: number) => {
  const t = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const noise = (index: number) => {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
};

const vertexShader = /* glsl */ `
  attribute vec3 aSeed;
  uniform float uTime;
  uniform float uProgress;
  uniform float uMotion;
  varying float vAlpha;
  varying float vHeat;
  const float PI = 3.141592653589793;
  void main() {
    float p = clamp(uProgress, 0., 1.);
    float morph = smoothstep(.25, .92, p);
    float burst = sin(p * PI);
    float theta = aSeed.x * PI * 2.;
    float phi = aSeed.y * PI * 2.;
    vec3 sphere = normalize(position) * (1.5 + aSeed.z * .6);
    vec3 torus = vec3((1.36 + .46 * cos(phi)) * cos(theta),
      .46 * sin(phi), (1.36 + .46 * cos(phi)) * sin(theta));
    vec3 pos = mix(sphere, torus, morph);
    pos += normalize(position) * burst * (1.1 + aSeed.z * 1.8);
    float t = uTime * .18 * uMotion;
    pos += vec3(sin(t + theta * 3.), cos(t * .7 + phi), sin(t + phi * 2.)) * (.035 + burst * .18);
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = clamp((1.3 + aSeed.z * 2.3) * (16. / -mvPosition.z), 1.5, 7.);
    vAlpha = .22 + burst * .7;
    vHeat = aSeed.z;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vHeat;
  void main() {
    float radius = length(gl_PointCoord - .5);
    float alpha = smoothstep(.5, .07, radius) * vAlpha;
    if (alpha < .015) discard;
    vec3 color = mix(vec3(.20, .48, .67), vec3(.77, .94, 1.), vHeat);
    gl_FragColor = vec4(color, alpha);
  }
`;

export function TransformationScene({
  progress,
  progressRef,
  active = true,
  reducedMotion = false,
}: TransformationSceneProps) {
  const sculpture = useRef<THREE.Group>(null);
  const shards = useRef<THREE.InstancedMesh>(null);
  const innerShell = useRef<THREE.Mesh>(null);
  const innerMaterial = useRef<THREE.MeshPhysicalMaterial>(null);
  const finalCore = useRef<THREE.Mesh>(null);
  const finalMaterial = useRef<THREE.MeshPhysicalMaterial>(null);
  const shardMaterial = useRef<THREE.MeshPhysicalMaterial>(null);
  const currentProgress = useRef(progress);

  const resources = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.165, -0.095);
    shape.lineTo(0.165, -0.095);
    shape.lineTo(0, 0.19);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.035,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.009,
      bevelThickness: 0.009,
    });
    geometry.center();
    const zAxis = new THREE.Vector3(0, 0, 1);
    const data = Array.from({ length: SHARD_COUNT }, (_, i) => {
      const y = 1 - (i / (SHARD_COUNT - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = i * Math.PI * (3 - Math.sqrt(5));
      const normal = new THREE.Vector3(Math.cos(theta) * radius, y, Math.sin(theta) * radius);
      const source = normal.clone().multiplyScalar(1.34);
      const u = (Math.floor(i / 8) / 40) * TAU;
      const v = ((i % 8) / 8) * TAU;
      const target = new THREE.Vector3(
        (1.3 + 0.43 * Math.cos(v)) * Math.cos(u),
        0.43 * Math.sin(v),
        (1.3 + 0.43 * Math.cos(v)) * Math.sin(u),
      );
      const targetNormal = new THREE.Vector3(Math.cos(v) * Math.cos(u), Math.sin(v), Math.cos(v) * Math.sin(u));
      return {
        source,
        target,
        normal,
        sourceRotation: new THREE.Quaternion().setFromUnitVectors(zAxis, normal),
        targetRotation: new THREE.Quaternion().setFromUnitVectors(zAxis, targetNormal),
        spin: new THREE.Euler(noise(i + 7) * 8, noise(i + 51) * 8, noise(i + 97) * 8),
        offset: 0.7 + noise(i + 13) * 1.5,
      };
    });
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const seeds = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const z = noise(i * 3 + 1) * 2 - 1;
      const theta = noise(i * 3 + 2) * TAU;
      const radius = Math.sqrt(1 - z * z);
      positions.set([radius * Math.cos(theta), z, radius * Math.sin(theta)], i * 3);
      seeds.set([noise(i + 700), noise(i + 1200), noise(i + 1900)], i * 3);
    }
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 3));
    const uniforms = {
      uTime: { value: 0 },
      uProgress: { value: progress },
      uMotion: { value: reducedMotion ? 0 : 1 },
    };
    return { geometry, data, particleGeometry, uniforms, dummy: new THREE.Object3D(), spinQuaternion: new THREE.Quaternion(), spinEuler: new THREE.Euler() };
    // All geometry is deterministic; progress is updated through uniforms below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame(({ clock, pointer }, delta) => {
    if (!active) return;
    const targetProgress = THREE.MathUtils.clamp(progressRef?.current ?? progress, 0, 1);
    currentProgress.current = reducedMotion
      ? targetProgress
      : THREE.MathUtils.damp(currentProgress.current, targetProgress, 9, delta);
    const p = currentProgress.current;
    if (shardMaterial.current) shardMaterial.current.opacity = 1 - smoothstep(0.28, 0.43, p) + smoothstep(0.64, 0.88, p);
    const morph = smoothstep(0.26, 0.94, p);
    const burst = Math.sin(p * Math.PI);
    const { dummy, spinQuaternion, spinEuler } = resources;
    if (shards.current) {
      resources.data.forEach((shard, i) => {
        dummy.position.copy(shard.source).lerp(shard.target, morph);
        dummy.position.addScaledVector(shard.normal, burst * shard.offset);
        dummy.quaternion.copy(shard.sourceRotation).slerp(shard.targetRotation, morph);
        spinEuler.set(shard.spin.x * burst, shard.spin.y * burst, shard.spin.z * burst);
        spinQuaternion.setFromEuler(spinEuler);
        dummy.quaternion.multiply(spinQuaternion);
        const scale = 1 + burst * 0.13;
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        shards.current!.setMatrixAt(i, dummy.matrix);
      });
      shards.current.instanceMatrix.needsUpdate = true;
    }
    const time = reducedMotion ? 0 : clock.elapsedTime;
    if (sculpture.current) {
      sculpture.current.rotation.y = time * 0.075 + pointer.x * 0.13;
      sculpture.current.rotation.x = -0.15 + pointer.y * 0.06 + morph * 0.54;
      sculpture.current.rotation.z = morph * -0.3;
    }
    if (innerShell.current) innerShell.current.scale.setScalar(Math.max(0.001, 1 - smoothstep(0, 0.5, p)));
    if (innerMaterial.current) innerMaterial.current.opacity = (1 - smoothstep(0.05, 0.45, p)) * 0.74;
    if (finalCore.current) finalCore.current.scale.setScalar(Math.max(0.001, smoothstep(0.64, 1, p)));
    if (finalMaterial.current) finalMaterial.current.opacity = smoothstep(0.58, 0.98, p) * 0.64;
    resources.uniforms.uTime.value = time;
    resources.uniforms.uProgress.value = p;
    resources.uniforms.uMotion.value = reducedMotion ? 0 : 1;
  });

  return (
    <group>
      <pointLight position={[2.8, 2.3, 3.5]} color="#b4d6ec" intensity={16} distance={10} />
      <pointLight position={[-3, -0.8, 1]} color="#477a9d" intensity={7} distance={8} />
      <group ref={sculpture}>
        <instancedMesh ref={shards} args={[resources.geometry, undefined, SHARD_COUNT]} frustumCulled={false}>
          <meshPhysicalMaterial ref={shardMaterial} color="#b9c4cb" metalness={1} roughness={0.17} clearcoat={1} clearcoatRoughness={0.12} envMapIntensity={2.4} side={THREE.DoubleSide} transparent opacity={1} depthWrite={false} />
        </instancedMesh>
        <mesh ref={innerShell}>
          <icosahedronGeometry args={[1.25, 2]} />
          <meshPhysicalMaterial ref={innerMaterial} color="#1d2b33" metalness={0.95} roughness={0.23} transparent opacity={0.74} wireframe />
        </mesh>
        <mesh ref={finalCore} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.3, 0.355, 24, 96]} />
          <meshPhysicalMaterial ref={finalMaterial} color="#a5d7e7" roughness={0.06} metalness={0.25} transparent opacity={0} transmission={0.5} thickness={0.8} envMapIntensity={2.5} />
        </mesh>
        <points geometry={resources.particleGeometry} frustumCulled={false}>
          <shaderMaterial uniforms={resources.uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        </points>
      </group>
    </group>
  );
}
