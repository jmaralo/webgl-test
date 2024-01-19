import { useCallback, useRef } from "react";
import Chart from "../chart/chart";
import LineSeries from "../chart/series/line";
import { MILLISECOND } from "../chart/series/series";

export type point = {
  data: number,
  timestamp: number,
}
function useWebGL() {
  const timeReference = useRef<number>(Date.now() * MILLISECOND);
  const series1 = useRef<LineSeries>(new LineSeries(timeReference.current));
  const series2 = useRef<LineSeries>(new LineSeries(timeReference.current));
  const series3 = useRef<LineSeries>(new LineSeries(timeReference.current));

  return {
    canvasRef: useCallback((canvas: HTMLCanvasElement | null) => {
      if (!canvas) {
        return
      }

      const gl = initContext(canvas)
      if (!gl) {
        return
      }

      const chart = new Chart(gl)

      series1.current.style.colorR = 1
      series1.current.style.colorG = 0
      series1.current.style.colorB = 0
      series1.current.style.width = 10
      chart.addSeries(series1.current)

      series2.current.style.colorR = 0
      series2.current.style.colorG = 0
      series2.current.style.colorB = 1
      series2.current.style.width = 20
      chart.addSeries(series2.current)

      series3.current.style.colorR = 0
      series3.current.style.colorG = 1
      series3.current.style.colorB = 0
      series3.current.style.width = 5
      chart.addSeries(series3.current)

      chart.render()
    }, []),

    setPoints1: (newPoints: point[]) => {
      series1.current.update(newPoints.map(({ timestamp, data }) => ({ x: timestamp, y: data })))
    },
    setPoints2: (newPoints: point[]) => {
      series2.current.update(newPoints.map(({ timestamp, data }) => ({ x: timestamp, y: data })))
    },
    setPoints3: (newPoints: point[]) => {
      series3.current.update(newPoints.map(({ timestamp, data }) => ({ x: timestamp, y: data })))
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

export default useWebGL;