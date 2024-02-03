type ShaderType = typeof WebGLRenderingContext.VERTEX_SHADER | typeof WebGLRenderingContext.FRAGMENT_SHADER;


export default class Shader {
    private type: ShaderType
    private source: string

    private compiledShader?: WebGLShader

    constructor(type: ShaderType, source: string) {
        this.type = type
        this.source = source
    }

    compile(context: WebGLRenderingContext | WebGL2RenderingContext): WebGLShader {
        if (this.compiledShader) {
            return this.compiledShader
        }

        const shader = context.createShader(this.type)
        if (!shader) {
            throw "Error creating shader"
        }
        context.shaderSource(shader, this.source)

        context.compileShader(shader)
        if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
            const errorLog = context.getShaderInfoLog(shader);
            throw `Error compiling ${getShaderName(this.type)} shader, ${errorLog ?? "no description provided"}`
        }

        this.compiledShader = shader
        return this.compiledShader
    }

}

function getShaderName(type: ShaderType) {
    switch (type) {
        case WebGLRenderingContext.VERTEX_SHADER:
            return "vertex"
        case WebGLRenderingContext.FRAGMENT_SHADER:
            return "fragment"
        default:
            return "unknown"
    }
}