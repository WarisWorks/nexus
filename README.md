# NEXUS — Beyond the Interface

A six-chapter interactive art installation built with Next.js App Router, TypeScript, Tailwind CSS, Three.js, React Three Fiber, Drei, React Three Postprocessing, GSAP, Lenis, and Motion.

The repository's original introduction is preserved in [the original README](docs/original-repository-readme.md).

## Run

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. For the production export:

```sh
npm run typecheck
npm run build
npm start
```

The `out/` directory can be served by any static host. Sites identity and static output configuration are in `.openai/hosting.json`. No API keys, external model files, image assets, or server database are required.

## Experience

1. **The awakening** — machined sphere with curved metal panels, segmented gimbals, glass core, rivets, and orbiting fragments. Pointer tilt, hover acceleration, and click pulse; scrolling opens the shell and advances the camera.
2. **The dimension** — architectural tunnel, light strips, reflective panels, and selectable glass structures.
3. **The collection** — deforming PBR chrome, refractive glass, 3,600 reactive particles, and an articulated energy reactor. Select a mesh or its label to focus and inspect. Detail controls activate each object; particle activation alternates formation.
4. **Metamorphosis** — 320 instanced shards and 2,400 shader particles transition from shell through fragmentation and dissolution to a new toroidal glass-and-metal form. Scroll position controls all stages reversibly.
5. **The micro universe** — drag to rotate, select named buildings, use the zoom buttons, and reset the view. Vertical touch scrolling remains available.
6. **The final portal** — layered mechanical rings, procedural energy membrane, charged pointer response, and a return-to-start control.

Sound is opt-in and generated locally with Web Audio. Settings provide balanced/high rendering and reduced motion. The OS reduced-motion preference is honored. Rendering pauses in hidden tabs; unsupported WebGL produces a readable fallback.

## Architecture

- `src/components/Nexus.tsx`: semantic chapter content, navigation, controls, scroll lifecycle.
- `src/components/canvas/Experience.tsx`: persistent canvas, camera path, studio reflections, lighting, scene visibility and gallery.
- `src/components/objects/`: reusable procedural sculptures and physical materials.
- `src/components/scenes/`: transformation and interactive city.
- `src/components/environments/`: tunnel, portal GLSL, GPU space particles.
- `src/shaders/`: physical-material deformation shader.
- `src/lib/journey.ts`: content and shared types.

Animation uses refs and uniforms, with React state reserved for UI interactions and chapter changes. Geometry instancing, stable memoized resources, adaptive pixel density, and visibility gates reduce work. No static image stands in for a 3D object.

## Reference and verification

The supplied attachment contained the written NEXUS brief; no concept image was available. The composition follows the written black/chrome cinematic direction. A pixel-level comparison to that missing image is therefore unverified.

Production build and strict TypeScript checks passed. Browser checks cover all six environments, 3D artifact selection, particle activation, reversible transformation stages, city inspection/drag/zoom/reset, portal return, desktop and narrow layouts. Actual performance depends on GPU, browser, resolution, and quality mode; a universal 60 FPS claim is not made.

All geometry and shaders are authored procedurally. Third-party packages retain their respective licenses.
