"use client";

import { useEffect, useMemo } from "react";
import { BufferGeometry, DoubleSide, Float32BufferAttribute, MeshPhysicalMaterial, TorusGeometry } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export interface SculptureProps {
  active?: boolean;
  reducedMotion?: boolean;
}

export function useSculptureMaterials() {
  const materials = useMemo(() => ({
    chrome: new MeshPhysicalMaterial({ color: "#aeb3ba", metalness: 1, roughness: 0.19, clearcoat: 0.55, clearcoatRoughness: 0.16 }),
    brushed: new MeshPhysicalMaterial({ color: "#5d626b", metalness: 0.98, roughness: 0.31, clearcoat: 0.3 }),
    graphite: new MeshPhysicalMaterial({ color: "#171a20", metalness: 0.91, roughness: 0.28 }),
    warmMetal: new MeshPhysicalMaterial({ color: "#b8aaa0", metalness: 1, roughness: 0.25 }),
    light: new MeshPhysicalMaterial({ color: "#e4f2ff", emissive: "#b7d7f3", emissiveIntensity: 1.15, metalness: 0.25, roughness: 0.12 }),
    glass: new MeshPhysicalMaterial({ color: "#c5dfeb", transmission: 0.93, thickness: 0.6, roughness: 0.06, ior: 1.48, metalness: 0.05, transparent: true, opacity: 0.65, side: DoubleSide, envMapIntensity: 1.5 }),
  }), []);
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);
  return materials;
}

/** A genuinely curved, closed metal panel with a visible inner shell and bevel-like border. */
export function createSphericalPanel(radius: number, thickness: number, thetaStart: number, thetaLength: number, phiLength: number): BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const uSegments = 12;
  const vSegments = 28;
  for (let layer = 0; layer < 2; layer++) {
    const r = radius - layer * thickness;
    for (let v = 0; v <= vSegments; v++) {
      const theta = thetaStart + (v / vSegments) * thetaLength;
      for (let u = 0; u <= uSegments; u++) {
        const phi = (u / uSegments - 0.5) * phiLength;
        positions.push(r * Math.sin(theta) * Math.sin(phi), r * Math.cos(theta), r * Math.sin(theta) * Math.cos(phi));
      }
    }
  }
  const stride = uSegments + 1;
  const layerSize = stride * (vSegments + 1);
  for (let layer = 0; layer < 2; layer++) {
    for (let v = 0; v < vSegments; v++) {
      for (let u = 0; u < uSegments; u++) {
        const a = layer * layerSize + v * stride + u;
        const b = a + 1;
        const c = a + stride;
        const d = c + 1;
        if (layer === 0) indices.push(a, c, b, b, c, d);
        else indices.push(a, b, c, b, d, c);
      }
    }
  }
  const join = (a: number, b: number) => indices.push(a, b, a + layerSize, b, b + layerSize, a + layerSize);
  for (let u = 0; u < uSegments; u++) {
    join(u + 1, u);
    join(vSegments * stride + u, vSegments * stride + u + 1);
  }
  for (let v = 0; v < vSegments; v++) {
    join(v * stride, (v + 1) * stride);
    join((v + 1) * stride + uSegments, v * stride + uSegments);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Merges the ring's individual machined sections into a single draw call. */
export function createSegmentedRing(radius: number, tube: number, segments = 32, gap = 0.055): BufferGeometry {
  const geometries = Array.from({ length: segments }, (_, index) => {
    const geometry = new TorusGeometry(radius, tube, 7, 7, (Math.PI * 2 / segments) * (1 - gap));
    geometry.rotateZ(index * Math.PI * 2 / segments);
    return geometry;
  });
  const merged = mergeGeometries(geometries);
  geometries.forEach((geometry) => geometry.dispose());
  return merged ?? new TorusGeometry(radius, tube, 8, 80);
}

export function damp(current: number, target: number, rate: number, delta: number) {
  return current + (target - current) * (1 - Math.exp(-rate * Math.min(delta, 0.1)));
}
