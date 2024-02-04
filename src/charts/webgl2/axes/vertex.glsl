#version 300 es
layout (location = 0) in vec2 iFrom;
layout (location = 1) in vec2 iTo;

struct Viewport {
    float width;
    float height;
};

uniform Viewport uViewport;
uniform float uLineWidth;

float aspectRatio() {
  return uViewport.width / uViewport.height;
}

vec2 toScreenCoords(vec2 point) {
    return vec2(point.x * aspectRatio(), point.y);
}

vec2 fromScreenCoords(vec2 point) {
    return vec2(point.x / uViewport.width, point.y / uViewport.height);
}

vec2 getNormal(vec2 point1, vec2 point2) {
    return normalize(vec2(point1.y - point2.y, point2.x - point1.x));
}

void main() {
    vec2 screenFrom = toScreenCoords(iFrom);
    vec2 screenTo = toScreenCoords(iTo);

    vec2 normal = getNormal(screenFrom, screenTo);
    normal = fromScreenCoords(normal * (uLineWidth / 2.0));

    gl_Position = vec4(iFrom + normal, 0.0, 1.0);
}