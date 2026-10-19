export const chapters = [
  { id: 'awakening', title: 'The awakening', label: 'Awakening' },
  { id: 'dimension', title: 'Enter the dimension', label: 'Dimension' },
  { id: 'artifacts', title: 'The artifact collection', label: 'Artifacts' },
  { id: 'transformation', title: 'Nothing stays the same', label: 'Metamorphosis' },
  { id: 'world', title: 'A world within', label: 'The world' },
  { id: 'portal', title: 'The final portal', label: 'The portal' },
] as const;

export const artifacts = [
  { name: 'Liquid chrome', category: 'MATERIAL STUDY', text: 'A living surface. Light bends across an ever-changing metallic form, shaped by your presence.', action: 'Move around the sculpture to reshape its surface.' },
  { name: 'Glass dimension', category: 'OPTICAL EXPERIMENT', text: 'A structure of almost nothing. Nested glass geometries scatter light and reveal a world inside.', action: 'Hover to separate the layers and expose the inner geometry.' },
  { name: 'Particle intelligence', category: 'COLLECTIVE BEHAVIOR', text: 'Thousands of individuals. One evolving intelligence. A field that disperses, remembers, and returns.', action: 'Select again to disperse the particles into a new formation.' },
  { name: 'Infinite core', category: 'KINETIC SCULPTURE', text: 'Energy made visible. Independent mechanical layers orbit a luminous heart in perpetual balance.', action: 'Select again to orbit the reactor and open its mechanical layers.' },
] as const;

export interface JourneyState { current: number; local: number; reduced: boolean; hidden: boolean }
export const sceneSpacing = 32;
