#version 300 es
precision highp float;

out vec4 FragColor;

uniform vec4 uColor;

void main() {
  FragColor = vec4(uColor);
}
