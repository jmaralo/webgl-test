export default class VertexArrayObjectBase {
    private vertexArray?: WebGLVertexArrayObject

    bind(context: WebGL2RenderingContext) {
        const array = this.getArray(context)
        context.bindVertexArray(array)
    }

    protected getArray(context: WebGL2RenderingContext): WebGLVertexArrayObject {
        if (!this.vertexArray) {
            this.createArray(context)
        }

        return this.vertexArray!
    }

    protected createArray(context: WebGL2RenderingContext) {
        const array = context.createVertexArray()
        if (!array) {
            throw "Error creating vertex array"
        }

        this.vertexArray = array
    }
}