import { useCallback, useRef } from "react";
import ShaderProgram from "./webgl/shader";

const vertexSource = `#version 300 es
layout (location = 0) in vec2 iPosition;
layout (location = 1) in vec2 iNormal;

uniform float uWidth;

out vec4 oColor;

void main() {
  vec2 p = iPosition + (normalize(iNormal) * uWidth / 2.0);
  gl_Position = vec4(p, 0.0, 1.0);

  oColor = vec4((p.y + 1.0) / 2.0 , 1.0, 1.0, 1.0);
}
`

const fragmentSource = `#version 300 es
precision highp float;
in vec4 oColor;

out vec4 FragColor;

void main() {
  FragColor = vec4(oColor);
}
`

type point = {
  data: number,
  timestamp: number,
}

const MAX_POINT_N = 500000
const MIN_DATA = -1.0
const MAX_DATA = 1.0
const TIME_WINDOW = 10000000000
const VERTEX_PER_POINT = 16

function useWebGL() {
  const points = useRef<point[]>([])
  let updated = false;

  return {
    canvasRef: useCallback((canvas: HTMLCanvasElement | null) => {
      if (!canvas) {
        return
      }

      const gl = initContext(canvas)

      if (!gl) {
        return
      }

      gl.viewport(0, 0, canvas.width, canvas.height);

      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.STENCIL_TEST);

      const program = new ShaderProgram(gl, [
        { type: "VERTEX", source: vertexSource },
        { type: "FRAGMENT", source: fragmentSource },
      ])
      program.use();

      const vertexArray = gl.createVertexArray();
      if (!vertexArray) {
        alert("Failed to create vertex array")
        return
      }
      gl.bindVertexArray(vertexArray);

      const vertexBuffer = gl.createBuffer();
      if (!vertexBuffer) {
        alert("Failed to create vertex buffer")
        return
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(MAX_POINT_N * VERTEX_PER_POINT), gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4 * 4, 0);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 4 * 4, 2 * 4);
      gl.enableVertexAttribArray(1);

      let lastTime = 0
      const render = (now: DOMHighResTimeStamp) => {
        const deltaTime = now - lastTime
        lastTime = now
        if (!updated) {
          requestAnimationFrame(render)
          return
        }
        updated = false
        gl.bindVertexArray(vertexArray);

        const pts = points.current.slice(-MAX_POINT_N);
        const currentTime = pts[pts.length - 1].timestamp
        const vertices = new Float32Array(pts.length * 16)
        for (let i = 0; i < pts.length - 1; i++) {
          const a = toVertex(pts[i], currentTime - TIME_WINDOW, currentTime, MIN_DATA, MAX_DATA)
          const b = toVertex(pts[i + 1], currentTime - TIME_WINDOW, currentTime, MIN_DATA, MAX_DATA)
          const n = getNormal(a, b)
          const stride = i * 16
          vertices[stride + 0] = a.x
          vertices[stride + 1] = a.y
          vertices[stride + 2] = n.x
          vertices[stride + 3] = n.y
          vertices[stride + 4] = a.x
          vertices[stride + 5] = a.y
          vertices[stride + 6] = -n.x
          vertices[stride + 7] = -n.y
          vertices[stride + 8] = b.x
          vertices[stride + 9] = b.y
          vertices[stride + 10] = n.x
          vertices[stride + 11] = n.y
          vertices[stride + 12] = b.x
          vertices[stride + 13] = b.y
          vertices[stride + 14] = -n.x
          vertices[stride + 15] = -n.y
        }
        console.log("drawing ", vertices.length / 4, " points in ", deltaTime, "ms")
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);

        program.use()
        program.setUniform1f("uWidth", (Math.sin(now / 100) + 1.2) * 0.005);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertices.length / 4);

        requestAnimationFrame(render)
      }

      requestAnimationFrame(render)
    }, []),

    setPoints: (newPoints: point[]) => {
      if (newPoints.length == 0) {
        return
      }
      const latest = newPoints[newPoints.length - 1].timestamp
      points.current = points.current.concat(newPoints).filter((pt) => {
        return latest - pt.timestamp < TIME_WINDOW
      })
      updated = true
    },
  } as const
}

function initContext(canvas: HTMLCanvasElement, options: WebGLContextAttributes = {
  alpha: false,
  antialias: true,
  depth: false,
  stencil: false,
  powerPreference: "high-performance",
  failIfMajorPerformanceCaveat: true,
  desynchronized: false,
}) {
  try {
    return canvas.getContext("webgl2", options)
  } catch (e) {
    alert(e)
    return null
  }
}

type vertex = {
  x: number,
  y: number,
}

function getNormal(a: vertex, b: vertex): vertex {
  return { x: a.y - b.y, y: b.x - a.x }
}

function toVertex(pt: point, tmin: number, tmax: number, dmin: number, dmax: number): vertex {
  return { x: (((pt.timestamp - tmin) / (tmax - tmin)) * 2) - 1, y: (((pt.data - dmin) / (dmax - dmin)) * 2) - 1 }
}

export default useWebGL;