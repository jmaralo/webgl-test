precision highp float;
varying vec4 FragColor;

uniform vec4 uColor;

void main() {
  gl_FragColor = vec4(uColor);
}
