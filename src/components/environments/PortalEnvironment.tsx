import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending, DoubleSide, Group, InstancedMesh, MathUtils,
  Object3D, ShaderMaterial, Vector2,
} from 'three';

export interface PortalEnvironmentProps {
  progress: number;
  progressRef?: RefObject<number>;
  reducedMotion?: boolean;
  active?: boolean;
}

const membraneVertex = /* glsl */ `
  uniform float uTime;
  uniform float uCharge;
  uniform vec2 uPointer;
  varying vec2 vUv;
  varying float vDepth;
  void main() {
    vUv = uv;
    vec3 p = position;
    float r = length(p.xy) / 2.13;
    float envelope = 1.0 - smoothstep(.55, 1.0, r);
    float ripple = sin(r * 20.0 - uTime * 1.5) * .035;
    p.z += (ripple + sin(p.x * 2.2 + uTime * .4) * .024) * envelope * (.6 + uCharge);
    p.z -= exp(-length(p.xy - uPointer) * 1.2) * .11;
    vDepth = p.z;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const membraneFragment = /* glsl */ `
  uniform float uTime;
  uniform float uCharge;
  varying vec2 vUv;
  varying float vDepth;
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    vec3 a = fract(vec3(i.xyx) * vec3(.1031, .1030, .0973));
    a += dot(a, a.yxz + 33.33);
    float n00 = fract((a.x + a.y) * a.z);
    a = fract(vec3((i + vec2(1., 0.)).xyx) * vec3(.1031, .1030, .0973));
    a += dot(a, a.yxz + 33.33);
    float n10 = fract((a.x + a.y) * a.z);
    a = fract(vec3((i + vec2(0., 1.)).xyx) * vec3(.1031, .1030, .0973));
    a += dot(a, a.yxz + 33.33);
    float n01 = fract((a.x + a.y) * a.z);
    a = fract(vec3((i + vec2(1., 1.)).xyx) * vec3(.1031, .1030, .0973));
    a += dot(a, a.yxz + 33.33);
    float n11 = fract((a.x + a.y) * a.z);
    return mix(mix(n00, n10, f.x), mix(n01, n11, f.x), f.y);
  }
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = .5;
    for (int i = 0; i < 4; i++) {
      value += noise(p) * amplitude;
      p = mat2(1.6, 1.2, -1.2, 1.6) * p;
      amplitude *= .5;
    }
    return value;
  }
  void main() {
    vec2 p = (vUv - .5) * 2.0;
    float radius = length(p);
    float angle = atan(p.y, p.x);
    float turbulence = fbm(p * 4.5 + vec2(uTime * .045, -uTime * .035));
    float swirl = fbm(vec2(angle * 2.0 + radius * 5.0 - uTime * .09, radius * 9.0 - uTime * .12));
    float threads = pow(1.0 - abs(sin(radius * 31.0 - swirl * 9.0 - uTime * .42)), 12.0);
    float edge = pow(smoothstep(.65, 1.0, radius), 4.0);
    float innerGlow = exp(-abs(radius - (.78 + turbulence * .18)) * 31.0);
    float energy = (edge * .65 + innerGlow * .24 + threads * .075) * (.65 + uCharge * .8);
    vec3 dark = vec3(.005, .009, .014) + turbulence * .008;
    vec3 color = dark + vec3(.63, .77, .85) * energy;
    color += vec3(.17, .23, .27) * swirl * (1.0 - radius) * (.08 + uCharge * .16);
    float alpha = (.84 + edge * .15) * (1.0 - smoothstep(.988, 1.0, radius));
    gl_FragColor = vec4(color, alpha);
  }
`;

const particleVertex = /* glsl */ `
  uniform float uTime;
  uniform float uCharge;
  uniform float uPixelRatio;
  uniform vec2 uPointer;
  attribute float aSeed;
  varying float vAlpha;
  void main() {
    float angle = uTime * (.025 + aSeed * .045);
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec3 p = position;
    p.xy = rotation * p.xy;
    p.z += sin(uTime * .3 + aSeed * 55.0) * .12;
    vec2 difference = p.xy - uPointer;
    p.xy += normalize(difference + .001) * exp(-length(difference) * 2.0) * .16;
    vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp((.5 + aSeed) * uPixelRatio * 13.0 / max(2.0, -viewPosition.z), .5, 3.0);
    vAlpha = (.14 + aSeed * .36) * (.7 + uCharge * .5);
  }
`;

const particleFragment = /* glsl */ `
  varying float vAlpha;
  void main() {
    float glow = 1.0 - smoothstep(.0, .5, length(gl_PointCoord - .5));
    gl_FragColor = vec4(.8, .9, 1.0, glow * vAlpha);
  }
`;

function RadialBlocks({ count, radius, small = false }: { count: number; radius: number; small?: boolean }) {
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const transform = new Object3D();
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      transform.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      transform.rotation.set(0, 0, angle + (small ? 0 : .16));
      transform.updateMatrix();
      mesh.current.setMatrixAt(i, transform.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [count, radius, small]);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <boxGeometry args={small ? [.045, .012, .035] : [.29, .105, .21]} />
      <meshStandardMaterial color={small ? '#d3dde4' : '#a3aab1'} metalness={1} roughness={small ? .23 : .17} envMapIntensity={2.2} />
    </instancedMesh>
  );
}

function PortalDust({ charge, reducedMotion, active }: { charge: number; reducedMotion: boolean; active: boolean }) {
  const material = useRef<ShaderMaterial>(null);
  const attributes = useMemo(() => {
    let seed = 16547;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const count = 2400;
    const position = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 2.12 + Math.pow(random(), 2) * 1.06;
      position[i * 3] = Math.cos(angle) * radius;
      position[i * 3 + 1] = Math.sin(angle) * radius;
      position[i * 3 + 2] = (random() - .5) * 1.1;
      seeds[i] = random();
    }
    return { position, seeds };
  }, []);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uCharge: { value: 0 },
    uPixelRatio: { value: 1 }, uPointer: { value: new Vector2() },
  }), []);
  useFrame(({ pointer, gl }, delta) => {
    if (!active || !material.current) return;
    const values = material.current.uniforms;
    if (!reducedMotion) values.uTime.value += Math.min(delta, .06) * (1 + charge);
    values.uCharge.value = MathUtils.lerp(values.uCharge.value, charge, 1 - Math.exp(-delta * 3));
    values.uPointer.value.set(pointer.x * 3.5, pointer.y * 3.5);
    values.uPixelRatio.value = gl.getPixelRatio();
  });
  return (
    <points raycast={() => undefined} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[attributes.position, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[attributes.seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={particleVertex} fragmentShader={particleFragment}
        transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </points>
  );
}

/** Concentric, machined chrome portal with an interactive procedural energy membrane. */
export function PortalEnvironment({ progress, progressRef, reducedMotion = false, active = true }: PortalEnvironmentProps) {
  const root = useRef<Group>(null);
  const outer = useRef<Group>(null);
  const inner = useRef<Group>(null);
  const membrane = useRef<ShaderMaterial>(null);
  const [charged, setCharged] = useState(false);
  const [hovered, setHovered] = useState(false);
  const elapsed = useRef(0);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uCharge: { value: 0 }, uPointer: { value: new Vector2() },
  }), []);
  const charge = charged ? 1 : hovered ? .45 : .12;

  useFrame(({ pointer }, delta) => {
    if (!active) return;
    const dt = Math.min(delta, .06);
    const amount = 1 - Math.exp(-dt * 3);
    if (!reducedMotion) elapsed.current += dt * (charged ? 2 : 1);
    if (root.current) {
      root.current.rotation.x = MathUtils.lerp(root.current.rotation.x, -pointer.y * .12, amount);
      root.current.rotation.y = MathUtils.lerp(root.current.rotation.y, pointer.x * .16, amount);
    }
    const currentProgress = progressRef?.current ?? progress;
    if (outer.current) outer.current.rotation.z = elapsed.current * .035 + currentProgress * .2;
    if (inner.current) inner.current.rotation.z = -elapsed.current * .055 - currentProgress * .3;
    if (membrane.current) {
      membrane.current.uniforms.uTime.value = elapsed.current;
      membrane.current.uniforms.uCharge.value = MathUtils.lerp(membrane.current.uniforms.uCharge.value, charge, amount);
      membrane.current.uniforms.uPointer.value.set(pointer.x * 2, pointer.y * 2);
    }
  });

  return (
    <group ref={root}>
      <group ref={outer}>
        <mesh>
          <torusGeometry args={[2.76, .105, 16, 144]} />
          <meshStandardMaterial color="#808991" metalness={1} roughness={.16} envMapIntensity={2.1} />
        </mesh>
        <mesh position={[0, 0, -.09]}>
          <torusGeometry args={[2.52, .21, 12, 144]} />
          <meshStandardMaterial color="#1d252d" metalness={.95} roughness={.28} envMapIntensity={1.5} />
        </mesh>
        <mesh position={[0, 0, .06]}>
          <torusGeometry args={[2.95, .024, 8, 144]} />
          <meshStandardMaterial color="#c1c9cf" metalness={1} roughness={.16} envMapIntensity={2} />
        </mesh>
        <RadialBlocks count={56} radius={2.71} />
        <group position={[0, 0, .155]}><RadialBlocks count={112} radius={2.95} small /></group>
        {Array.from({ length: 8 }, (_, i) => (
          <group key={i} rotation={[0, 0, i * Math.PI / 4]}>
            <mesh position={[2.53, 0, .225]}>
              <boxGeometry args={[.09, .15, .045]} />
              <meshStandardMaterial color="#ccd3d8" metalness={1} roughness={.13} />
            </mesh>
            <mesh position={[2.536, 0, .253]}>
              <boxGeometry args={[.015, .085, .01]} />
              <meshBasicMaterial color="#e2f3fc" toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>
      <group ref={inner} position={[0, 0, .11]}>
        <mesh>
          <torusGeometry args={[2.29, .105, 20, 144]} />
          <meshStandardMaterial color="#b6c1c8" metalness={1} roughness={.12} envMapIntensity={2.4} />
        </mesh>
        <mesh position={[0, 0, .055]}>
          <torusGeometry args={[2.155, .019, 8, 144]} />
          <meshBasicMaterial color={charged ? '#ffffff' : '#cce9fa'} toneMapped={false} />
        </mesh>
        {Array.from({ length: 6 }, (_, i) => (
          <mesh key={i} rotation={[0, 0, i * Math.PI / 3]} position={[0, 0, .125]}>
            <torusGeometry args={[2.43, .017, 8, 24, Math.PI * .235]} />
            <meshBasicMaterial color="#b4c8d4" toneMapped={false} />
          </mesh>
        ))}
        <group position={[0, 0, .125]}><RadialBlocks count={96} radius={2.36} small /></group>
      </group>
      <mesh
        position={[0, 0, .115]}
        onClick={(event) => { event.stopPropagation(); setCharged((value) => !value); }}
        onPointerOver={(event) => { event.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        <circleGeometry args={[2.15, 128]} />
        <shaderMaterial ref={membrane} uniforms={uniforms} vertexShader={membraneVertex}
          fragmentShader={membraneFragment} transparent side={DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <PortalDust charge={charge} reducedMotion={reducedMotion || !active} active={active} />
      <pointLight position={[0, 1, 2]} color="#e7f4ff" intensity={charged ? 15 : 7} distance={7} decay={2} />
      <pointLight position={[-2, -2, .8]} color="#b3ccdc" intensity={5} distance={6} decay={2} />
    </group>
  );
}
