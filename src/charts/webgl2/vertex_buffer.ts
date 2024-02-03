export default class VertexBufferObjectBase {
    private vertexBuffer?: WebGLBuffer

    bind(context: WebGL2RenderingContext) {
        const buffer = this.getBuffer(context)
        context.bindBuffer(context.ARRAY_BUFFER, buffer)
    }

    protected getBuffer(context: WebGL2RenderingContext): WebGLBuffer {
        if (!this.vertexBuffer) {
            this.createBuffer(context)
        }

        return this.vertexBuffer!
    }

    protected createBuffer(context: WebGL2RenderingContext) {
        const buffer = context.createBuffer()
        if (!buffer) {
            throw "Error creating buffer"
        }

        this.vertexBuffer = buffer
    }
}