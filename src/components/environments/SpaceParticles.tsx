import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, ShaderMaterial } from 'three';

export interface SpaceParticlesProps {
  count?: number;
  reducedMotion?: boolean;
}

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform vec2 uPointer;
  attribute float aScale;
  attribute float aSeed;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * .075 + aSeed * 23.0) * .11;
    p.y += cos(uTime * .055 + aSeed * 15.0) * .09;
    vec2 difference = p.xy - uPointer;
    float distanceToPointer = length(difference);
    float influence = exp(-distanceToPointer * distanceToPointer * .65);
    p.xy += normalize(difference + vec2(.001)) * influence * .6;
    vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = clamp(aScale * uPixelRatio * 19.0 / max(2.0, -viewPosition.z), .65, 4.0);
    vAlpha = (.25 + aSeed * .4) * (.8 + sin(uTime * .3 + aSeed * 31.0) * .2);
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(.5));
    float glow = smoothstep(.5, .06, d);
    gl_FragColor = vec4(vec3(.83, .9, .96), glow * vAlpha);
  }
`;

/** GPU animated point field. It does not allocate or update particle arrays per frame. */
export function SpaceParticles({ count = 1400, reducedMotion = false }: SpaceParticlesProps) {
  const material = useRef<ShaderMaterial>(null);
  const attributes = useMemo(() => {
    let seed = 9347;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const position = new Float32Array(count * 3);
    const scale = new Float32Array(count);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      position[i * 3] = (random() - .5) * 22;
      position[i * 3 + 1] = (random() - .5) * 14;
      position[i * 3 + 2] = random() * -22 + 2;
      scale[i] = .4 + random() * 1.1;
      seeds[i] = random();
    }
    return { position, scale, seeds };
  }, [count]);
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: 1 },
    uPointer: { value: [0, 0] },
  }), []);

  useFrame(({ pointer, gl }, delta) => {
    if (!material.current) return;
    const values = material.current.uniforms;
    if (!reducedMotion) values.uTime.value += Math.min(delta, .06);
    values.uPixelRatio.value = gl.getPixelRatio();
    values.uPointer.value[0] = pointer.x * 8;
    values.uPointer.value[1] = pointer.y * 5;
  });

  return (
    <points frustumCulled={false} raycast={() => undefined}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[attributes.position, 3]} />
        <bufferAttribute attach="attributes-aScale" args={[attributes.scale, 1]} />
        <bufferAttribute attach="attributes-aSeed" args={[attributes.seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
