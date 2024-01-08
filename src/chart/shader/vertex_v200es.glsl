attribute vec2 iPosition;
attribute vec2 iNormal;

uniform float uWidth;

void main() {
  vec2 p = iPosition + (normalize(iNormal) * uWidth / 2.0);
  gl_Position = vec4(p, 0.0, 1.0);
}
