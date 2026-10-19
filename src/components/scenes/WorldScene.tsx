"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Edges } from "@react-three/drei";
import * as THREE from "three";

export interface WorldSceneProps {
  active: boolean;
  onInspect?: (name: string) => void;
  reducedMotion?: boolean;
  resetKey?: number;
}

interface BuildingData {
  name: string;
  position: [number, number, number];
  width: number;
  depth: number;
  height: number;
  type: "tower" | "spire" | "habitat";
}

type PointerCaptureTarget = EventTarget & {
  setPointerCapture?: (pointerId: number) => void;
  releasePointerCapture?: (pointerId: number) => void;
};

const BUILDINGS: BuildingData[] = [
  { name: "The Nexus Spire", position: [0, -0.58, -0.15], width: 0.43, depth: 0.43, height: 2.2, type: "spire" },
  { name: "Quantum Observatory", position: [-0.77, -0.58, -0.35], width: 0.39, depth: 0.4, height: 1.32, type: "tower" },
  { name: "Cloud Habitat 01", position: [0.75, -0.58, -0.37], width: 0.5, depth: 0.44, height: 0.96, type: "habitat" },
  { name: "Archive of Tomorrow", position: [-0.53, -0.58, 0.48], width: 0.46, depth: 0.46, height: 0.75, type: "habitat" },
  { name: "Orbital Communication Hub", position: [0.52, -0.58, 0.49], width: 0.33, depth: 0.34, height: 1.43, type: "tower" },
  { name: "Energy Core", position: [-1.22, -0.58, 0.12], width: 0.24, depth: 0.3, height: 0.54, type: "tower" },
  { name: "Research Pavilion", position: [1.19, -0.58, 0.02], width: 0.32, depth: 0.4, height: 0.66, type: "habitat" },
  { name: "Arrival Terminal", position: [0.04, -0.58, 1.04], width: 0.6, depth: 0.25, height: 0.34, type: "habitat" },
];

function Building({ data, highlighted, onHover, onInspect }: {
  data: BuildingData;
  highlighted: boolean;
  onHover: (name: string | null) => void;
  onInspect: (name: string) => void;
}) {
  const floors = Math.max(3, Math.floor(data.height * 10));
  const windowGeometry = useMemo(() => {
    const vertices: number[] = [];
    const indices: number[] = [];
    const halfWidth = data.width * 0.35;
    const z = data.depth / 2 + 0.002;
    for (let floor = 0; floor < floors; floor++) {
      const y = 0.07 + floor * (data.height - 0.09) / floors;
      vertices.push(-halfWidth, y - 0.007, z, halfWidth, y - 0.007, z, halfWidth, y + 0.007, z, -halfWidth, y + 0.007, z);
      const index = floor * 4;
      indices.push(index, index + 1, index + 2, index, index + 2, index + 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    return geometry;
  }, [data.depth, data.height, data.width, floors]);
  return (
    <group position={data.position}>
      <mesh
        position={[0, data.height / 2, 0]}
        onPointerOver={(event) => { event.stopPropagation(); onHover(data.name); }}
        onPointerOut={() => onHover(null)}
        onClick={(event) => { event.stopPropagation(); onInspect(data.name); }}
      >
        <boxGeometry args={[data.width, data.height, data.depth]} />
        <meshPhysicalMaterial color={highlighted ? "#a7dbea" : "#566876"} metalness={0.88} roughness={0.2} clearcoat={1} emissive={highlighted ? "#315a6b" : "#07131c"} emissiveIntensity={highlighted ? 0.9 : 0.15} envMapIntensity={2.2} />
        <Edges color={highlighted ? "#ddf9ff" : "#8ba9b9"} threshold={20} />
      </mesh>
      <mesh geometry={windowGeometry}>
        <meshBasicMaterial color={highlighted ? "#c0f3ff" : "#6296ae"} transparent opacity={highlighted ? 1 : 0.62} />
      </mesh>
      {data.type === "spire" && (
        <>
          <mesh position={[0, data.height + 0.2, 0]}>
            <coneGeometry args={[0.18, 0.44, 4]} />
            <meshPhysicalMaterial color="#b4c7d3" metalness={1} roughness={0.13} />
          </mesh>
          <mesh position={[0, data.height * 0.71, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.35, 0.014, 8, 64]} />
            <meshBasicMaterial color="#8ac9e3" />
          </mesh>
        </>
      )}
      {data.type === "tower" && (
        <mesh position={[0, data.height + 0.08, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.2, 6]} />
          <meshBasicMaterial color="#b7ddec" />
        </mesh>
      )}
      {data.type === "habitat" && (
        <mesh position={[0, data.height + 0.03, 0]}>
          <boxGeometry args={[data.width * 1.12, 0.06, data.depth * 1.12]} />
          <meshStandardMaterial color="#a9bdc8" metalness={0.92} roughness={0.22} />
        </mesh>
      )}
    </group>
  );
}

/** Drag the city itself to rotate. Wheel gestures remain available for chapter scrolling. */
export function WorldScene({ active, onInspect, reducedMotion = false, resetKey = 0 }: WorldSceneProps) {
  const city = useRef<THREE.Group>(null);
  const satellite = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const drag = useRef({ active: false, pointerId: -1, x: 0, y: 0, moved: false });
  const rotation = useRef({ x: 0.3, y: -0.4 });
  const lastActive = useRef(active);
  useEffect(() => {
    rotation.current = { x: 0.3, y: -0.4 };
    drag.current.active = false;
    drag.current.moved = false;
    if (city.current) city.current.rotation.set(0.3, -0.4, 0);
    setHovered(null);
    setSelected(null);
  }, [resetKey]);
  const stars = useMemo(() => {
    const positions = new Float32Array(130 * 3);
    for (let i = 0; i < 130; i++) {
      const theta = i * 2.399963;
      const radius = 2.3 + ((i * 37) % 101) / 101 * 0.9;
      positions.set([Math.cos(theta) * radius, (((i * 41) % 103) / 103 - 0.5) * 2.8, Math.sin(theta) * radius], i * 3);
    }
    return positions;
  }, []);

  useFrame(({ clock }, delta) => {
    if (lastActive.current && !active) {
      drag.current.active = false;
    }
    lastActive.current = active;
    if (!active) return;
    const time = reducedMotion ? 0 : clock.elapsedTime;
    if (city.current) {
      const idleRotation = active && !drag.current.active && !reducedMotion ? delta * 0.035 : 0;
      rotation.current.y += idleRotation;
      city.current.rotation.x = THREE.MathUtils.damp(city.current.rotation.x, rotation.current.x, 10, delta);
      city.current.rotation.y = THREE.MathUtils.damp(city.current.rotation.y, rotation.current.y, 10, delta);
      city.current.position.y = Math.sin(time * 0.65) * 0.045;
    }
    if (satellite.current) satellite.current.rotation.y = time * 0.18;
    if (orbit.current) orbit.current.rotation.z = time * 0.055;
  });

  function pointerDown(event: ThreeEvent<PointerEvent>) {
    if (!active || event.button !== 0) return;
    event.stopPropagation();
    (event.target as PointerCaptureTarget | null)?.setPointerCapture?.(event.pointerId);
    drag.current = { active: true, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  }

  function pointerMove(event: ThreeEvent<PointerEvent>) {
    if (!drag.current.active || event.pointerId !== drag.current.pointerId) return;
    event.stopPropagation();
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) drag.current.moved = true;
    rotation.current.y += dx * 0.008;
    rotation.current.x = THREE.MathUtils.clamp(rotation.current.x + dy * 0.004, 0.1, 0.7);
    drag.current.x = event.clientX;
    drag.current.y = event.clientY;
  }

  function pointerUp(event: ThreeEvent<PointerEvent>) {
    if (!drag.current.active) return;
    event.stopPropagation();
    (event.target as PointerCaptureTarget | null)?.releasePointerCapture?.(event.pointerId);
    drag.current.active = false;
  }

  function inspect(name: string) {
    if (!active || drag.current.moved) return;
    setSelected(name);
    onInspect?.(name);
  }

  return (
    <group>
      <pointLight position={[3, 4, 4]} color="#d0edff" intensity={23} distance={11} />
      <pointLight position={[-3, 0, -1]} color="#4c92bc" intensity={10} distance={9} />
      <group ref={city} rotation={[0.3, -0.4, 0]} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp}>
        <group position={[0, -0.76, 0]}>
          <mesh>
            <cylinderGeometry args={[1.94, 1.74, 0.28, 8]} />
            <meshPhysicalMaterial color="#31414c" metalness={0.98} roughness={0.23} clearcoat={1} />
            <Edges color="#7693a7" />
          </mesh>
          <mesh position={[0, 0.145, 0]}>
            <cylinderGeometry args={[1.84, 1.84, 0.025, 8]} />
            <meshPhysicalMaterial color="#344a58" metalness={0.9} roughness={0.23} />
          </mesh>
          <mesh position={[0, -0.2, 0]}>
            <cylinderGeometry args={[1.44, 0.35, 0.35, 8]} />
            <meshStandardMaterial color="#15212a" metalness={0.95} roughness={0.28} />
            <Edges color="#4a687b" />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <torusGeometry args={[1.98, 0.017, 8, 100]} />
            <meshBasicMaterial color="#80bedb" />
          </mesh>
          <mesh position={[0, -0.39, 0]}>
            <sphereGeometry args={[0.23, 24, 16]} />
            <meshPhysicalMaterial color="#b9ecff" metalness={0.2} roughness={0.12} emissive="#4d8aa5" emissiveIntensity={1.2} />
          </mesh>
        </group>
        <gridHelper args={[3.15, 12, "#648a9d", "#405b6c"]} position={[0, -0.598, 0]} />
        {BUILDINGS.map((building) => (
          <Building key={building.name} data={building} highlighted={hovered === building.name || selected === building.name} onHover={setHovered} onInspect={inspect} />
        ))}
        <group ref={orbit} rotation={[0.16, 0.02, -0.2]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
            <torusGeometry args={[2.36, 0.012, 6, 160]} />
            <meshStandardMaterial color="#9fc8dc" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
            <torusGeometry args={[2.42, 0.004, 4, 160]} />
            <meshBasicMaterial color="#52798f" transparent opacity={0.65} />
          </mesh>
        </group>
        <group ref={satellite}>
          <group position={[2.3, 0.24, 0]} rotation={[0.3, 0, 0.15]}>
            <mesh>
              <octahedronGeometry args={[0.12]} />
              <meshPhysicalMaterial color="#d1e7f0" metalness={1} roughness={0.1} />
            </mesh>
            <mesh position={[-0.21, 0, 0]}>
              <boxGeometry args={[0.23, 0.015, 0.17]} />
              <meshStandardMaterial color="#31556d" metalness={0.8} roughness={0.2} />
              <Edges color="#98c7de" />
            </mesh>
            <mesh position={[0.21, 0, 0]}>
              <boxGeometry args={[0.23, 0.015, 0.17]} />
              <meshStandardMaterial color="#31556d" metalness={0.8} roughness={0.2} />
              <Edges color="#98c7de" />
            </mesh>
          </group>
        </group>
        <points>
          <bufferGeometry><bufferAttribute attach="attributes-position" args={[stars, 3]} /></bufferGeometry>
          <pointsMaterial color="#9bc6dc" size={0.018} transparent opacity={0.6} sizeAttenuation depthWrite={false} />
        </points>
      </group>
    </group>
  );
}
