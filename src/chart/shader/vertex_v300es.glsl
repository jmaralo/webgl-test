#version 300 es
layout (location = 0) in vec2 iPosition;
layout (location = 1) in vec2 iPositionNext;

uniform float uWidth;
uniform float uMinValue;
uniform float uMaxValue;
uniform float uCurrentTime;
uniform float uTimeWindow;

vec2 getNormal(vec2 a, vec2 b) {
  return normalize(vec2(a.y - b.y, b.x - a.x));
}

vec2 mapPoint(vec2 point, float currentTime, float timeWindow, float minValue, float maxValue) {
  return vec2(
    (((point.x - currentTime + timeWindow) / timeWindow) * 2.0) - 1.0,
    (((point.y - minValue) / (maxValue - minValue)) * 2.0) - 1.0
  );
}

void main() {
  vec2 a = mapPoint(iPosition, uCurrentTime, uTimeWindow, uMinValue, uMaxValue);
  vec2 b = mapPoint(iPositionNext, uCurrentTime, uTimeWindow, uMinValue, uMaxValue);
  vec2 p = a + (getNormal(a, b) * uWidth / 2.0);
  gl_Position = vec4(p, 0.0, 1.0);
}