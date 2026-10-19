import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BoxGeometry, EdgesGeometry, ExtrudeGeometry, Group, MathUtils,
  Path, Shape,
} from 'three';

export interface DimensionEnvironmentProps {
  progress: number;
  progressRef?: RefObject<number>;
  reducedMotion?: boolean;
  active?: boolean;
}

function framePath(width: number, height: number, corner: number) {
  return [
    [-width / 2 + corner, -height / 2], [width / 2 - corner, -height / 2],
    [width / 2, -height / 2 + corner], [width / 2, height / 2 - corner],
    [width / 2 - corner, height / 2], [-width / 2 + corner, height / 2],
    [-width / 2, height / 2 - corner], [-width / 2, -height / 2 + corner],
  ];
}

function createFrame() {
  const outer = framePath(6.1, 4.8, .5);
  const shape = new Shape();
  outer.forEach(([x, y], i) => i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y));
  shape.closePath();
  const inner = new Path();
  framePath(5.7, 4.4, .4).reverse().forEach(([x, y], i) => i === 0 ? inner.moveTo(x, y) : inner.lineTo(x, y));
  inner.closePath();
  shape.holes.push(inner);
  return new ExtrudeGeometry(shape, {
    depth: .22, bevelEnabled: true, bevelSegments: 2,
    steps: 1, bevelSize: .045, bevelThickness: .045,
  });
}

interface PaneProps {
  index: number;
  geometry: BoxGeometry;
  edges: EdgesGeometry;
  selected: boolean;
  onSelect: () => void;
  reducedMotion: boolean;
  active: boolean;
}

function FloatingPane({ index, geometry, edges, selected, onSelect, reducedMotion, active }: PaneProps) {
  const group = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);
  const elapsed = useRef(index * .7);
  const side = index % 2 === 0 ? -1 : 1;
  const baseX = side * (1.45 + (index % 3) * .28);
  const baseY = ((index % 3) - 1) * 1.06;
  const baseZ = -.4 - index * 1.25;

  useFrame((_, delta) => {
    if (!active || !group.current) return;
    const amount = 1 - Math.exp(-Math.min(delta, .06) * 4);
    if (!reducedMotion) elapsed.current += delta;
    const time = elapsed.current;
    group.current.position.x = MathUtils.lerp(group.current.position.x, selected ? side * .6 : baseX, amount);
    group.current.position.y = MathUtils.lerp(group.current.position.y, selected ? 0 : baseY + Math.sin(time * .4) * .1, amount);
    group.current.position.z = MathUtils.lerp(group.current.position.z, selected ? 1.8 : baseZ, amount);
    group.current.rotation.x = MathUtils.lerp(group.current.rotation.x, selected ? 0 : Math.sin(time * .23) * .1, amount);
    group.current.rotation.y = MathUtils.lerp(group.current.rotation.y, selected ? 0 : side * .43 + Math.sin(time * .31) * .08, amount);
    group.current.rotation.z = MathUtils.lerp(group.current.rotation.z, selected ? 0 : side * .08, amount);
    group.current.scale.setScalar(MathUtils.lerp(group.current.scale.x, selected ? 1.28 : hovered ? 1.06 : 1, amount));
  });

  return (
    <group ref={group} position={[baseX, baseY, baseZ]}>
      <group scale={[.75 + (index % 3) * .13, 1.18, .045]}>
        <mesh
          geometry={geometry}
          onPointerOver={(event) => { event.stopPropagation(); setHovered(true); }}
          onPointerOut={() => setHovered(false)}
          onClick={(event) => { event.stopPropagation(); onSelect(); }}
        >
          <meshPhysicalMaterial
            color={selected || hovered ? '#c6dce7' : '#8b9eab'}
            metalness={.6} roughness={.12} transmission={.3}
            thickness={.25} ior={1.45} transparent opacity={.66}
            envMapIntensity={1.6}
          />
        </mesh>
        <lineSegments geometry={edges} raycast={() => undefined}>
          <lineBasicMaterial color={selected || hovered ? '#eefaff' : '#8d9ba3'} transparent opacity={selected ? .9 : .45} />
        </lineSegments>
      </group>
      <mesh position={[-.22, -.38, .031]} raycast={() => undefined}>
        <boxGeometry args={[.2, .014, .012]} />
        <meshBasicMaterial color={selected ? '#ffffff' : '#a9c4d1'} toneMapped={false} />
      </mesh>
      <mesh position={[-.06, -.38, .031]} raycast={() => undefined}>
        <boxGeometry args={[.045, .014, .012]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** A traversable, chamfered chrome tunnel with independently inspectable glass panels. */
export function DimensionEnvironment({ progress, progressRef, reducedMotion = false, active = true }: DimensionEnvironmentProps) {
  const root = useRef<Group>(null);
  const frames = useRef<Group>(null);
  const [selectedPane, setSelectedPane] = useState<number | null>(null);
  const geometry = useMemo(createFrame, []);
  const paneGeometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const paneEdges = useMemo(() => new EdgesGeometry(paneGeometry), [paneGeometry]);
  const time = useRef(0);
  const disposal = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (disposal.current !== null) clearTimeout(disposal.current);
    return () => {
      // Strict Mode reconnects effects immediately; dispose only after a real unmount.
      disposal.current = setTimeout(() => {
        geometry.dispose();
        paneEdges.dispose();
        paneGeometry.dispose();
      }, 0);
    };
  }, [geometry, paneGeometry, paneEdges]);

  useFrame(({ pointer }, delta) => {
    if (!active || !root.current || !frames.current) return;
    const amount = 1 - Math.exp(-Math.min(delta, .06) * 3);
    if (!reducedMotion) time.current += delta;
    root.current.rotation.y = MathUtils.lerp(root.current.rotation.y, pointer.x * .055, amount);
    root.current.rotation.x = MathUtils.lerp(root.current.rotation.x, -pointer.y * .035, amount);
    const currentProgress = progressRef?.current ?? progress;
    frames.current.position.z = MathUtils.lerp(frames.current.position.z, MathUtils.clamp(currentProgress, 0, 1) * 2.1, amount);
    frames.current.rotation.z = MathUtils.lerp(frames.current.rotation.z, Math.sin(time.current * .08) * .018, amount);
  });

  return (
    <group ref={root}>
      <group ref={frames}>
        {Array.from({ length: 8 }, (_, i) => (
          <group key={i} position={[0, 0, -i * 2.1]} rotation={[0, 0, i * .023]}>
            <mesh geometry={geometry}>
              <meshStandardMaterial color="#9aa1a7" metalness={1} roughness={.18} envMapIntensity={1.8} />
            </mesh>
            {[-1, 1].map((side) => (
              <group key={side}>
                <mesh position={[side * 2.835, 0, .14]}>
                  <boxGeometry args={[.018, 3.36, .025]} />
                  <meshBasicMaterial color="#d9ecf7" toneMapped={false} />
                </mesh>
                <mesh position={[0, side * 2.19, .14]}>
                  <boxGeometry args={[4.6, .014, .025]} />
                  <meshBasicMaterial color="#b4c7d1" toneMapped={false} />
                </mesh>
              </group>
            ))}
          </group>
        ))}
        {Array.from({ length: 8 }, (_, index) => (
          <FloatingPane
            key={index} index={index} geometry={paneGeometry} edges={paneEdges}
            selected={selectedPane === index} reducedMotion={reducedMotion || !active} active={active}
            onSelect={() => setSelectedPane((current) => current === index ? null : index)}
          />
        ))}
        <mesh position={[0, 0, -17]}>
          <planeGeometry args={[6.4, 5]} />
          <meshBasicMaterial color="#010204" />
        </mesh>
        <pointLight position={[0, 1.5, -3]} color="#d8eaf5" intensity={12} distance={12} decay={2} />
        <pointLight position={[0, -1.5, 1]} color="#f4f8ff" intensity={9} distance={10} decay={2} />
      </group>
    </group>
  );
}
