import VertexBufferObjectBase from "../vertex_buffer";
import Series from "../series";
import VertexArrayObjectBase from "../vertex_array";
import Program from "../../program";
import VertexShaderSource from "./time_vertex.glsl?raw";
import FragmentShaderSource from "./time_fragment.glsl?raw";
import Shader from "../../shader";

const FLOAT_SIZE = 4

const NANOSECONDS = 1
const MICROSECONDS = 1000 * NANOSECONDS
const MILLISECONDS = 1000 * MICROSECONDS
const SECONDS = 1000 * MILLISECONDS

type Point = {
    timestamp: number,
    value: number,
}

type Style = {
    color: {
        r: number,
        g: number,
        b: number,
        a: number,
    },
    lineWidth: number

}

export default class TimeSeries implements Series {
    style: Style = {
        color: {
            r: 1.0,
            g: 1.0,
            b: 1.0,
            a: 1.0,
        },
        lineWidth: 5,
    }

    private valueHigh = 1.0
    private valueLow = -1.0

    private maxPoints = 100000
    private vertexPerPoint = 2
    private elementsPerVertex = 6
    private pointSize = this.vertexPerPoint * this.elementsPerVertex

    private timeReference: number
    private timeWindow = 5 * SECONDS

    private context: WebGL2RenderingContext
    private program: Program = new Program([
        new Shader(WebGL2RenderingContext.VERTEX_SHADER, VertexShaderSource),
        new Shader(WebGL2RenderingContext.FRAGMENT_SHADER, FragmentShaderSource),
    ])

    private points: Point[] = []

    private vertexBuffer: VertexBufferObject = new VertexBufferObject(this.maxPoints * this.pointSize)
    private vertexArray: VertexArrayObject

    constructor(context: WebGL2RenderingContext, timeReference: number) {
        this.context = context
        this.vertexArray = new VertexArrayObject(this.vertexBuffer, [
            {
                index: this.program.getAttributeLocation(context, "iPrevious"),
                size: 2,
                type: WebGL2RenderingContext.FLOAT,
                normalized: false,
                stride: 6 * FLOAT_SIZE,
                offset: 0,
            },
            {
                index: this.program.getAttributeLocation(context, "iCurrent"),
                size: 2,
                type: WebGL2RenderingContext.FLOAT,
                normalized: false,
                stride: 6 * FLOAT_SIZE,
                offset: 2 * FLOAT_SIZE,
            },
            {
                index: this.program.getAttributeLocation(context, "iNext"),
                size: 2,
                type: WebGL2RenderingContext.FLOAT,
                normalized: false,
                stride: 6 * FLOAT_SIZE,
                offset: 4 * FLOAT_SIZE,
            },
        ])
        this.timeReference = timeReference
    }

    draw() {
        this.vertexArray.bind(this.context)
        this.program.use(this.context)

        this.loadUniforms()

        this.context.drawArrays(this.context.TRIANGLE_STRIP, 0, this.vertexBuffer.vertexCount)
    }

    private loadUniforms() {
        let viewportWidth = this.context.canvas.width
        let viewportHeight = this.context.canvas.height
        if (this.context.canvas instanceof HTMLCanvasElement) {
            viewportWidth = this.context.canvas.clientWidth
            viewportHeight = this.context.canvas.clientHeight
        }
        this.program.setUniform1f(this.context, "uViewport.width", viewportWidth)
        this.program.setUniform1f(this.context, "uViewport.height", viewportHeight)

        const relativeTime = (Date.now() * MILLISECONDS) - this.timeReference
        this.program.setUniform1f(this.context, "uPointConstraints.currentTime", relativeTime)
        this.program.setUniform1f(this.context, "uPointConstraints.timeWindow", this.timeWindow)
        this.program.setUniform1f(this.context, "uPointConstraints.valueLow", this.valueLow)
        this.program.setUniform1f(this.context, "uPointConstraints.valueHigh", this.valueHigh)

        this.program.setUniform1f(this.context, "uLineWidth", this.style.lineWidth)
        this.program.setUniform4f(this.context, "uColor", this.style.color.r, this.style.color.g, this.style.color.b, this.style.color.a)
    }

    updatePoints(newPoints: Point[]) {
        this.mapTimestampToReference(newPoints)
        const currentRelativeTime = (Date.now() * MILLISECONDS) - this.timeReference
        const firstCurrentPointInRange = this.findFirstInTimeRange(this.points, currentRelativeTime)
        const firstNewPointInRange = this.findFirstInTimeRange(newPoints, currentRelativeTime)
        this.points = this.mergeSortedPointsInRange(this.points, newPoints, firstCurrentPointInRange, firstNewPointInRange)
        this.vertexBuffer.bufferPoints(this.context, this.points)
    }

    private mapTimestampToReference(points: Point[]) {
        for (const point of points) {
            point.timestamp -= this.timeReference
        }
    }

    private findFirstInTimeRange(points: Point[], now: number): number {
        let pointer = 0
        while (pointer < points.length && now - points[pointer].timestamp > this.timeWindow) {
            pointer++
        }
        return pointer
    }

    private mergeSortedPointsInRange(pointsA: Point[], pointsB: Point[], startA: number, startB: number): Point[] {
        const sortedPoints = new Array(Math.min(this.maxPoints, (pointsA.length - startA) + (pointsB.length - startB)))
        let pointerForA = pointsA.length - 1
        let pointerForB = pointsB.length - 1
        let pointerForSorted = sortedPoints.length - 1
        while (pointerForA >= startA && pointerForB >= startB && pointerForSorted >= 0) {
            const pointA = pointsA[pointerForA]
            const pointB = pointsB[pointerForB]
            if (pointA.timestamp > pointB.timestamp) {
                sortedPoints[pointerForSorted] = pointA
                pointerForA--
            } else {
                sortedPoints[pointerForSorted] = pointB
                pointerForB--
            }
            pointerForSorted--
        }
        while (pointerForA >= startA && pointerForSorted >= 0) {
            sortedPoints[pointerForSorted] = pointsA[pointerForA]
            pointerForSorted--
            pointerForA--
        }
        while (pointerForB >= startB && pointerForSorted >= 0) {
            sortedPoints[pointerForSorted] = pointsB[pointerForB]
            pointerForSorted--
            pointerForB--
        }
        return sortedPoints
    }
}

class VertexArrayObject extends VertexArrayObjectBase {
    private vertexBuffer: VertexBufferObject;
    private attributePointers: AttributePointer[];

    constructor(vertexBuffer: VertexBufferObject, attributePointers: AttributePointer[]) {
        super()
        this.vertexBuffer = vertexBuffer
        this.attributePointers = attributePointers
    }

    protected createArray(context: WebGL2RenderingContext) {
        super.createArray(context)
        super.bind(context)

        this.vertexBuffer.bind(context)

        for (const attributePointer of this.attributePointers) {
            context.enableVertexAttribArray(attributePointer.index)
            context.vertexAttribPointer(
                attributePointer.index,
                attributePointer.size,
                attributePointer.type,
                attributePointer.normalized,
                attributePointer.stride,
                attributePointer.offset,
            )
        }

        context.bindVertexArray(null)
    }
}

type AttributePointer = {
    index: number,
    size: number,
    type: number,
    normalized: boolean,
    stride: number,
    offset: number,
}

class VertexBufferObject extends VertexBufferObjectBase {
    buffer: Float32Array
    vertexCount: number = 0

    private stridePerVertex = 6
    private vertexPerPoint = 2
    private pointStride = this.stridePerVertex * this.vertexPerPoint

    constructor(size: number) {
        super()
        this.buffer = new Float32Array(size)
    }

    protected createBuffer(context: WebGL2RenderingContext): void {
        super.createBuffer(context)
        this.bind(context)
        context.bufferData(context.ARRAY_BUFFER, this.buffer, context.DYNAMIC_DRAW)
    }

    bufferPoints(context: WebGL2RenderingContext, points: Point[]) {
        this.vertexCount = points.length * 2

        if (points.length < 2) {
            this.clearPoints()
            this.writeBufferToGPU(context)
            return
        }

        this.writePointAt(0, mirrorPointAcross(points[1], points[0]), points[0], points[1])
        for (let i = 1; i < points.length - 1; i++) {
            this.writePointAt(i * this.pointStride, points[i - 1], points[i], points[i + 1])
        }
        const last = points.length - 1
        this.writePointAt(last * this.pointStride, points[last - 1], points[last], mirrorPointAcross(points[last - 1], points[last]))

        this.writeBufferToGPU(context)
    }

    clearPoints() {
        for (let i = 0; i < this.buffer.length; i++) {
            this.buffer[i] = 0.0
        }
    }

    private writePointAt(position: number, previous: Point, current: Point, next: Point) {
        this.buffer[position + 0] = previous.timestamp
        this.buffer[position + 1] = previous.value
        this.buffer[position + 2] = current.timestamp
        this.buffer[position + 3] = current.value
        this.buffer[position + 4] = next.timestamp
        this.buffer[position + 5] = next.value
        this.buffer[position + 6] = current.timestamp + current.timestamp - previous.timestamp
        this.buffer[position + 7] = current.value + current.value - previous.value
        this.buffer[position + 8] = current.timestamp
        this.buffer[position + 9] = current.value
        this.buffer[position + 10] = current.timestamp + current.timestamp - next.timestamp
        this.buffer[position + 11] = current.value + current.value - next.value
    }

    private writeBufferToGPU(context: WebGL2RenderingContext) {
        this.bind(context)
        context.bufferSubData(context.ARRAY_BUFFER, 0, this.buffer, 0, this.vertexCount * 6)
    }
}

function mirrorPointAcross(point: Point, mirror: Point): Point {
    return {
        timestamp: mirror.timestamp + mirror.timestamp - point.timestamp,
        value: mirror.value + mirror.value - point.value,
    }
}
