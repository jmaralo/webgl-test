import { useCallback, useRef } from "react";
import TimeSeries from "../charts/webgl2/series/time";
import Chart from "../charts/webgl2/chart";

export type point = {
    value: number,
    timestamp: number,
}

const NANOSECONDS = 1
const MICROSECONDS = 1000 * NANOSECONDS
const MILLISECONDS = 1000 * MICROSECONDS

function useWebGL() {
    const timeReference = useRef<number>(Date.now() * MILLISECONDS);
    const series1 = useRef<TimeSeries | null>(null);
    const series2 = useRef<TimeSeries | null>(null);
    const series3 = useRef<TimeSeries | null>(null);

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
            series1.current = new TimeSeries(gl, timeReference.current)
            series2.current = new TimeSeries(gl, timeReference.current)
            series3.current = new TimeSeries(gl, timeReference.current)

            series1.current.setLineColor(1, 0, 0, 1)
            series1.current.setLineWidth(10)
            chart.addNamedSeries("sin", series1.current)

            series2.current.setLineColor(0, 0, 1, 1)
            series2.current.setLineWidth(10)
            chart.addNamedSeries("cos", series2.current)

            series3.current.setLineColor(0, 1, 0, 1)
            series3.current.setLineWidth(10)
            chart.addNamedSeries("tan", series3.current)

            const render = () => {
                chart.draw()

                requestAnimationFrame(render)
            }

            requestAnimationFrame(render)
        }, []),

        setPoints1: (newPoints: point[]) => {
            if (!series1.current) {
                return
            }
            series1.current.updatePoints(newPoints)
        },
        setPoints2: (newPoints: point[]) => {
            if (!series2.current) {
                return
            }
            series2.current.updatePoints(newPoints)
        },
        setPoints3: (newPoints: point[]) => {
            if (!series3.current) {
                return
            }
            series3.current.updatePoints(newPoints)
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