type ShaderType = "VERTEX" | "FRAGMENT";
type ShaderSource = string;
type Shader = {
  type: ShaderType;
  source: ShaderSource;
};

class ShaderProgram {
  private program: WebGLProgram;
  private ctx: WebGL2RenderingContext;

  private uniformLocations: { [name: string]: WebGLUniformLocation } = {};

  constructor(context: WebGL2RenderingContext, shaders: Shader[]) {
    this.ctx = context;

    const program = this.ctx.createProgram();
    if (!program) {
      throw new ProgramError("Failed to create program");
    }

    for (const shader of shaders) {
      let shaderObject: WebGLShader | null;
      switch (shader.type) {
        case "VERTEX":
          shaderObject = this.ctx.createShader(this.ctx.VERTEX_SHADER);
          break;
        case "FRAGMENT":
          shaderObject = this.ctx.createShader(this.ctx.FRAGMENT_SHADER);
          break;
        default:
          throw new ProgramError("Unknown shader type");
      }
      if (!shaderObject) {
        throw new ProgramError("Failed to create shader");
      }
      this.ctx.shaderSource(shaderObject, shader.source);
      this.ctx.compileShader(shaderObject);
      if (!this.ctx.getShaderParameter(shaderObject, this.ctx.COMPILE_STATUS)) {
        throw new ProgramError("Compiling " + shader.type + " shader: " + this.ctx.getShaderInfoLog(shaderObject));
      }
      this.ctx.attachShader(program, shaderObject);
    }

    this.ctx.linkProgram(program);
    if (!this.ctx.getProgramParameter(program, this.ctx.LINK_STATUS)) {
      throw new ProgramError("Linking program: " + this.ctx.getProgramInfoLog(program));
    }

    this.program = program;
  }

  /**
   * Use this program for consecuent renderings.
   */
  use() {
    this.ctx.useProgram(this.program);
  }

  /** 
   * Get the location of a uniform from its name.
   * Locations are cached to reduce the number of calls to WebGL.
   * @param name The name of the uniform.
   * @returns The location of the uniform.
  */
  getUniformLocation(name: string) {
    if (!this.uniformLocations[name]) {
      const location = this.ctx.getUniformLocation(this.program, name);
      if (!location) {
        throw new UniformLocationError(name);
      }

      this.uniformLocations[name] = location;
    }

    return this.uniformLocations[name];
  }

  /**
   * Sets the value of a uniform 4x4 matrix.
   * @param name The name of the uniform.
   * @param value New value for the uniform.
   */
  setUniformMatrix4fv(name: string, value: Float32Array) {
    const location = this.getUniformLocation(name);
    if (!location) {
      throw new ProgramError("Failed to get uniform location: " + name);
    }

    this.ctx.uniformMatrix4fv(location, false, value);
  }

  /**
   * Sets the value of a uniform 1f.
   * @param name The name of the uniform.
   * @param value New value for the uniform.
   */
  setUniform1f(name: string, value: number) {
    const location = this.getUniformLocation(name);
    if (!location) {
      throw new ProgramError("Failed to get uniform location: " + name);
    }

    this.ctx.uniform1f(location, value);
  }
}

class ProgramError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProgramError";
  }
}

class UniformLocationError extends Error {
  attribName: string;

  constructor(name: string) {
    super("Failed to locate attribute: " + name);
    this.attribName = name;
    this.name = "AttributeLocationError";
  }
}

export default ShaderProgram;