type ShaderType = "vertex" | "fragment";
type ShaderSource = string;

/**
 * A shader that can be compiled and used in a program.
 * 
 * It contains all the information needed to compile the shader.
 */
export default class ShaderData {
  private type: ShaderType;
  private source: ShaderSource;
  private shader?: WebGLShader;

  /**
   * Prepare a shader for compilation.
   * 
   * @param type Type of the shader ("vertex" or "fragment")
   * @param source Source for the shader
   */
  constructor(type: ShaderType, source: ShaderSource) {
    this.type = type;
    this.source = source;
  }

  /**
   * Compile the shader and return it.
   * 
   * If the shader was already compiled, it will return the cached version.
   * 
   * @param gl The WebGL context
   * @returns The compiled shader
   */
  compile(gl: WebGL2RenderingContext | WebGLRenderingContext): WebGLShader {
    if (this.shader) {
      return this.shader
    }

    const shader = gl.createShader(this.getType(gl));
    if (!shader) {
      throw new ShaderError(`Failed to create ${this.type} shader`, this.type, this.source);
    }

    gl.shaderSource(shader, this.source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      throw new ShaderError(`Error compiling ${this.type} shader: ${log ?? "(no log provided)"}`, this.type, this.source, log);
    }

    this.shader = shader;
    return this.shader;
  }

  /**
   * Get the type of the shader.
   * 
   * @returns The type of the shader
   */
  private getType(gl: WebGL2RenderingContext | WebGLRenderingContext) {
    switch (this.type) {
      case "vertex":
        return gl.VERTEX_SHADER;
      case "fragment":
        return gl.FRAGMENT_SHADER;
    }
  }
}

/**
 * Error thrown when a shader fails to compile.
 */
export class ShaderError extends Error {
  readonly source: ShaderSource;
  readonly type: ShaderType;
  readonly log?: string | null;

  constructor(message: string, type: ShaderType, source: ShaderSource, log?: string | null) {
    super(message);
    this.name = "ShaderError";
    this.type = type;
    this.source = source;
    this.log = log;
  }
}
