import Shader from "./shader";

type RenderingContext = WebGLRenderingContext | WebGL2RenderingContext

export default class Program {
    private shaders: Shader[]

    private uniformLocations: { [name: string]: WebGLUniformLocation } = {}
    private attributeLocations: { [name: string]: number } = {}

    private program?: WebGLProgram

    constructor(shaders: Shader[]) {
        this.shaders = shaders

    }

    use(context: RenderingContext) {
        const program = this.getProgram(context)
        context.useProgram(program)
    }

    setUniform1f(context: RenderingContext, name: string, value: number) {
        const location = this.getUniformLocation(context, name)
        context.uniform1f(location, value)
    }

    setUniform4f(context: RenderingContext, name: string, x: number, y: number, z: number, w: number) {
        const location = this.getUniformLocation(context, name)
        context.uniform4f(location, x, y, z, w)
    }

    getUniformLocation(context: RenderingContext, name: string): WebGLUniformLocation {
        if (!(name in this.uniformLocations)) {
            this.loadUniformLocation(context, name)
        }

        return this.uniformLocations[name]
    }

    private loadUniformLocation(context: RenderingContext, name: string) {
        const program = this.getProgram(context)
        const location = context.getUniformLocation(program, name)
        /**
         * This code is commented because it hurts performance during startup.
         * Possible solutions:
         * * add an option to enable/disable
         * * ignore
         */
        // switch (context.getError()) {
        //     case WebGLRenderingContext.INVALID_VALUE:
        //         throw "Invalid program"
        //     case WebGLRenderingContext.INVALID_OPERATION:
        //         throw "Operation in program is invalid"
        // }

        if (!location) {
            throw `Error getting location of uniform ${name}`
        }

        this.uniformLocations[name] = location
    }

    getAttributeLocation(context: RenderingContext, name: string): number {
        if (!(name in this.attributeLocations)) {
            this.loadAttributeLocations(context, name)
        }

        return this.attributeLocations[name]
    }

    private loadAttributeLocations(context: RenderingContext, name: string) {
        const program = this.getProgram(context)
        const location = context.getAttribLocation(program, name)

        if (location == -1) {
            throw `Error getting location of attribute ${name}`
        }

        this.attributeLocations[name] = location
    }

    getProgram(context: RenderingContext): WebGLProgram {
        if (!this.program) {
            this.linkProgram(context)
        }

        return this.program!
    }

    private linkProgram(context: RenderingContext) {
        const program = context.createProgram();
        if (!program) {
            throw "Error creating program"
        }

        this.shaders.forEach(shader => {
            const compiledShader = shader.compile(context)
            context.attachShader(program, compiledShader)
        })

        context.linkProgram(program);
        if (!context.getProgramParameter(program, context.LINK_STATUS)) {
            const errorLog = context.getProgramInfoLog(program);
            throw `Error linking program, ${errorLog ?? "no description provided"}`
        }

        this.program = program
    }
}