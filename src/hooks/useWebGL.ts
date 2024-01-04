import { useCallback, useRef } from "react";
import ShaderProgram from "./webgl/shader";

const vertexSource = `#version 300 es
layout (location = 0) in vec2 iPosition;

out vec4 oColor;

uniform float uTime;
uniform float uCurrentTime;
uniform float uMaxValue;
uniform float uMinValue;

float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + ((max2 - min2) * ((value - min1) / (max1 - min1)));
}

void main() {
  float y = map(iPosition.x, uMinValue, uMaxValue, -1.0, 1.0);
  float x = map(iPosition.y, uCurrentTime - uTime, uCurrentTime, -1.0, 1.0);
  gl_Position = vec4(x, y, 0.0, 1.0);

  oColor = vec4(map(y, -1.0, 1.0, 0.0, 1.0), 1.0, 1.0, 1.0);
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

function useWebGL() {
  const points = useRef<point[]>([])
  const timeWindow = 2000000000
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

      const program = new ShaderProgram(gl, [
        { type: "VERTEX", source: vertexSource },
        { type: "FRAGMENT", source: fragmentSource },
      ])
      program.use();
      program.setUniform1f("uTime", timeWindow);
      program.setUniform1f("uMaxValue", 1.0);
      program.setUniform1f("uMinValue", -1.0);

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
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(MAX_POINT_N * 2), gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * 4, 0);
      gl.enableVertexAttribArray(0);

      const vertexBuffer2 = gl.createBuffer();
      if (!vertexBuffer2) {
        alert("Failed to create vertex buffer")
        return
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer2);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(MAX_POINT_N * 2), gl.DYNAMIC_DRAW);

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

        const pts = [...points.current];
        const vertices = new Float32Array(min(MAX_POINT_N, pts.length) * 2)
        for (let i = 1; i <= vertices.length / 2; i++) {
          const pt = pts[pts.length - i]
          vertices[vertices.length - (2 * i)] = pt.data
          vertices[(vertices.length - (2 * i)) + 1] = pt.timestamp;
        }
        console.log("drawing ", vertices.length / 2, " points in " , deltaTime, "ms")
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);

        program.use()
        program.setUniform1f("uCurrentTime", vertices[vertices.length - 1]);

        gl.drawArrays(gl.LINE_STRIP, 0, vertices.length / 2);

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
        return latest - pt.timestamp < timeWindow
      })
      updated = true
    },
  } as const
}

function initContext(canvas: HTMLCanvasElement, options: WebGLContextAttributes = {
  alpha: false,
  antialias: false,
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

function min(a: number, b: number): number {
  return a < b ? a : b
}

export default useWebGL;