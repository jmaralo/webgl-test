#version 300 es
layout (location = 0) in vec2 iPrevious;
layout (location = 1) in vec2 iCurrent;
layout (location = 2) in vec2 iNext;

struct Viewport {
    float width;
    float height;
};

struct PointConstraints {
    float currentTime;
    float timeWindow;
    float valueLow;
    float valueHigh;
};

uniform Viewport uViewport;
uniform PointConstraints uPointConstraints;
uniform float uLineWidth;

const float scale = 1.0;
const float paralellThreshold = 0.9;

float aspectRatio() {
  return uViewport.width / uViewport.height;
}

float mapToRange(float original, float original_high, float original_low, float new_high, float new_low) {
    float original_range = original_high - original_low;
    float new_range = new_high - new_low;

    float range_ratio = new_range / original_range;

    return new_low + (range_ratio * (original - original_low));
}

vec2 mapToNormalized(vec2 point, PointConstraints constraints) {
    float x = mapToRange(point.x, constraints.currentTime, constraints.currentTime - constraints.timeWindow, scale, -scale);
    float y = mapToRange(point.y, constraints.valueHigh, constraints.valueLow, scale, -scale);
    return vec2(x, y);
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

vec2 getBisector(vec2 vector1, vec2 vector2) {
    return normalize((length(vector2) * vector1) + (length(vector1) * vector2));
}

vec2 scaleBisector(vec2 normal, vec2 bisector, float newLength) {
    float scaleFactor = abs(dot(normal, bisector));
    return bisector * (newLength / scaleFactor);
}

void main() {
    vec2 mappedPrevious = mapToNormalized(iPrevious, uPointConstraints);
    vec2 mappedCurrent = mapToNormalized(iCurrent, uPointConstraints);
    vec2 mappedNext = mapToNormalized(iNext, uPointConstraints);

    vec2 screenPrevious = toScreenCoords(mappedPrevious);
    vec2 screenCurrent = toScreenCoords(mappedCurrent);
    vec2 screenNext = toScreenCoords(mappedNext);

    vec2 currentToPrevious = screenPrevious - screenCurrent;
    vec2 currentToNext = screenNext - screenCurrent;
    float angle = dot(normalize(currentToPrevious), normalize(currentToNext));
    if (angle < -paralellThreshold) {
        vec2 normal = getNormal(screenPrevious, screenCurrent);
        normal = fromScreenCoords(normal * (uLineWidth / 2.0));

        gl_Position = vec4((mappedCurrent / scale) + normal, 0.0, 1.0);
    } else if (angle > paralellThreshold) {
        vec2 bisector = getBisector(currentToPrevious, currentToNext);
        bisector = fromScreenCoords(bisector * (uLineWidth / 2.0));

        gl_Position = vec4((mappedCurrent / scale) + bisector, 0.0, 1.0);
    } else {
        vec2 normal = getNormal(screenPrevious, screenCurrent);
        vec2 bisector = getBisector(currentToPrevious, currentToNext);
        bisector = scaleBisector(normal, bisector, uLineWidth / 2.0);
        bisector = fromScreenCoords(bisector);

        gl_Position = vec4((mappedCurrent / scale) + bisector, 0.0, 1.0);
    }
}