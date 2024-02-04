import Program from "../../program"
import VertexArrayObjectBase from "../vertex_array"
import VertexBufferObjectBase from "../vertex_buffer"
import VertexShaderSource from "./vertex.glsl?raw";
import FragmentShaderSource from "./fragment.glsl?raw";
import Shader from "../../shader";

const FLOAT_SIZE = 4

type RGBA = {
    r: number,
    g: number,
    b: number,
    a: number,
}

type Style = {
    color: RGBA,
    lineWidth: number,
}

export default class Axes {
    private style: Style = {
        color: {
            r: 0.2,
            g: 0.2,
            b: 0.2,
            a: 1.0,
        },
        lineWidth: 5,
    }

    private horizontalDivisions: number = 10
    private maxHorizontalDivisions: number = 9999
    private verticalDivisions: number = 5
    private maxVerticalDivisions: number = 9999

    private program: Program = new Program([
        new Shader(WebGL2RenderingContext.VERTEX_SHADER, VertexShaderSource),
        new Shader(WebGL2RenderingContext.FRAGMENT_SHADER, FragmentShaderSource),
    ])

    private context: WebGL2RenderingContext

    private vertexBuffer: VertexBufferObject = new VertexBufferObject((this.maxHorizontalDivisions * 16) + (this.maxVerticalDivisions * 16))
    private vertexArray: VertexArrayObject

    constructor(context: WebGL2RenderingContext) {
        this.context = context
        this.vertexArray = new VertexArrayObject(this.vertexBuffer, [
            {
                index: this.program.getAttributeLocation(context, "iFrom"),
                size: 2,
                type: WebGL2RenderingContext.FLOAT,
                normalized: false,
                stride: 4 * FLOAT_SIZE,
                offset: 0,
            },
            {
                index: this.program.getAttributeLocation(context, "iTo"),
                size: 2,
                type: WebGL2RenderingContext.FLOAT,
                normalized: false,
                stride: 4 * FLOAT_SIZE,
                offset: 2 * FLOAT_SIZE,
            },
        ])
        this.vertexBuffer.bufferDivisions(context, this.horizontalDivisions, this.verticalDivisions)
    }

    draw(container: HTMLElement) {
        this.vertexArray.bind(this.context)
        this.program.use(this.context)

        this.loadUniforms(container)

        this.context.drawArrays(this.context.TRIANGLES, 0, this.vertexBuffer.vertexCount * 3)
    }

    private loadUniforms(container: HTMLElement) {
        const rect = container.getBoundingClientRect()
        const viewportWidth = rect.width
        const viewportHeight = rect.height
        this.program.setUniform1f(this.context, "uViewport.width", viewportWidth)
        this.program.setUniform1f(this.context, "uViewport.height", viewportHeight)


        const {r, g, b, a} = this.style.color
        this.program.setUniform4f(this.context, "uColor", r, g, b, a)
        this.program.setUniform1f(this.context, "uLineWidth", this.style.lineWidth)
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
    vertexCount: number = 0

    private elementsPerVertex = 4
    private vertexPerPoint = 3
    private pointsPerDivision = 2
    private vertexPerDivision = this.pointsPerDivision * this.vertexPerPoint
    private divisionStride = this.vertexPerDivision * this.elementsPerVertex

    private buffer: Float32Array

    constructor(size: number) {
        super()
        this.buffer = new Float32Array(size)
    }

    bufferDivisions(context: WebGL2RenderingContext, horizontal: number, vertical: number) {
        this.vertexCount = 0
    
        for (let i = 0; i < horizontal; i++) {
            this.writeHorizontalDivision((((i + 1) / (horizontal + 1)) * 2) - 1, i * this.divisionStride)
            this.vertexCount += 2
        }

        for (let j = 0; j < vertical; j++) {
            this.writeVerticalDivision((((j + 1) / (vertical + 1)) * 2) - 1, (horizontal + j) * this.divisionStride)
            this.vertexCount += 2
        }

        this.writeToGPU(context)
    }

    private writeHorizontalDivision(division: number, position: number) {
        this.buffer[position + 0] = division
        this.buffer[position + 1] = -1.0
        this.buffer[position + 2] = division
        this.buffer[position + 3] = 0.0
        this.buffer[position + 4] = division
        this.buffer[position + 5] = -1.0
        this.buffer[position + 6] = division
        this.buffer[position + 7] = -2.0
        this.buffer[position + 8] = division
        this.buffer[position + 9] = 1.0
        this.buffer[position + 10] = division
        this.buffer[position + 11] = 0.0
        
        this.buffer[position + 12] = division
        this.buffer[position + 13] = 1.0
        this.buffer[position + 14] = division
        this.buffer[position + 15] = 0.0
        this.buffer[position + 16] = division
        this.buffer[position + 17] = 1.0
        this.buffer[position + 18] = division
        this.buffer[position + 19] = 2.0
        this.buffer[position + 20] = division
        this.buffer[position + 21] = -1.0
        this.buffer[position + 22] = division
        this.buffer[position + 23] = 0.0
    }

    private writeVerticalDivision(division: number, position: number) {
        this.buffer[position + 0] = -1.0
        this.buffer[position + 1] = division
        this.buffer[position + 2] = 0.0
        this.buffer[position + 3] = division
        this.buffer[position + 4] = -1.0
        this.buffer[position + 5] = division
        this.buffer[position + 6] = -2.0
        this.buffer[position + 7] = division
        this.buffer[position + 8] = 1.0
        this.buffer[position + 9] = division
        this.buffer[position + 10] = 0.0
        this.buffer[position + 11] = division
        
        this.buffer[position + 12] = 1.0
        this.buffer[position + 13] = division
        this.buffer[position + 14] = 0.0
        this.buffer[position + 15] = division
        this.buffer[position + 16] = 1.0
        this.buffer[position + 17] = division
        this.buffer[position + 18] = 2.0
        this.buffer[position + 19] = division
        this.buffer[position + 20] = -1.0
        this.buffer[position + 21] = division
        this.buffer[position + 22] = 0.0
        this.buffer[position + 23] = division
    }

    private writeToGPU(context: WebGL2RenderingContext) {
        this.bind(context)
        context.bufferData(context.ARRAY_BUFFER, this.buffer, context.STATIC_DRAW, 0, this.vertexCount * this.elementsPerVertex * this.vertexPerPoint)
    }
}