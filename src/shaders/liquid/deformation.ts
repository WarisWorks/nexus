/** Injected into Three.js' physical vertex shader, preserving its PBR lighting. */
export const liquidDeformation = /* glsl */ `
uniform float uNexusTime;
uniform float uNexusActivity;
uniform vec2 uNexusPointer;

vec3 nexusDeform(vec3 p) {
  float t = uNexusTime;
  float a = 0.12 + uNexusActivity * 0.09;
  float f = sin(p.x * 3.1 + t * 0.67) * cos(p.y * 2.7 - t * 0.51)
    + sin(p.z * 3.6 - t * 0.34) * cos(p.x * 2.2 + t * 0.41) * 0.56;
  vec3 q = p + normalize(p) * f * a;
  float twist = p.y * 0.44 + sin(t * 0.24) * 0.22;
  float c = cos(twist);
  float s = sin(twist);
  q.xz = mat2(c, -s, s, c) * q.xz;
  q.x += sin(p.y * 2.2 + t * 0.42) * 0.12;
  q.y += cos(p.z * 2.6 - t * 0.33) * 0.08;
  q.xy += uNexusPointer * 0.045 * uNexusActivity * (0.5 + p.z * 0.5);
  return q;
}
`;
