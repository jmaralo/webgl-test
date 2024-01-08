import ShaderData from "./shader";
import VertexShaderV300ES from "./vertex_v300es.glsl?raw";
import VertexShaderV200ES from "./vertex_v200es.glsl?raw";
import FragmentShaderV300ES from "./fragment_v300es.glsl?raw";
import FragmentShaderV200ES from "./fragment_v200es.glsl?raw";

/**
 * Default program for the chart. It uses predefined vertex and fragment shaders.
 * 
 * @param gl The WebGL context
 * @returns The default program
 */
export default function defaultProgram(gl: WebGL2RenderingContext | WebGLRenderingContext): Program {
  if (gl instanceof WebGL2RenderingContext) {
    return new Program(gl, [
      new ShaderData("vertex", VertexShaderV300ES),
      new ShaderData("fragment", FragmentShaderV300ES),
    ]);
  }

  return new Program(gl, [
    new ShaderData("vertex", VertexShaderV200ES),
    new ShaderData("fragment", FragmentShaderV200ES),
  ]);
}

/**
 * Wrapper around a WebGL program.
 */
export class Program {
  private program: WebGLProgram;
  private uniformLocations: { [name: string]: WebGLUniformLocation } = {};
  private attributeLocations: { [name: string]: { location: number } } = {};

  /**
   * Compiles and links a new program from the provided shaders.
   * 
   * @param gl The WebGL context
   * @param shaders The shaders to use in the program
   */
  constructor(gl: WebGL2RenderingContext | WebGLRenderingContext, shaders: ShaderData[]) {
    const program = gl.createProgram();
    if (!program) {
      throw new ProgramError("Failed to create program");
    }

    shaders.forEach(shader => gl.attachShader(program, shader.compile(gl)));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      throw new ProgramError(`Linking program: ${log ?? "(no log provided)"}`, log);
    }

    this.program = program;
  }

  /**
   * Use this program for consecuent renderings.
   * 
   * @param gl The WebGL context
   */
  use(gl: WebGL2RenderingContext | WebGLRenderingContext) {
    gl.useProgram(this.program);
  }

  /**
   * Get the location of a uniform variable.
   * 
   * Locations are cached to reduce the number of calls to WebGL.
   * 
   * @param gl The WebGL context
   * @param name The name of the uniform variable
   * @returns The location of the uniform variable
   */
  getUniformLocation(gl: WebGL2RenderingContext | WebGLRenderingContext, name: string): WebGLUniformLocation {
    if (this.uniformLocations[name]) {
      return this.uniformLocations[name];
    }

    const location = gl.getUniformLocation(this.program, name);
    if (!location) {
      throw new UniformError(`Uniform ${name} not found`, name);
    }

    this.uniformLocations[name] = location;
    return location;
  }

  /**
   * Get the location of an attribute variable.
   * 
   * Locations are cached to reduce the number of calls to WebGL.
   * 
   * @param gl The WebGL context
   * @param name The name of the attribute variable
   * @returns The location of the attribute variable
   */
  getAttributeLocation(gl: WebGL2RenderingContext | WebGLRenderingContext, name: string): number {
    if (this.attributeLocations[name]) {
      return this.attributeLocations[name].location;
    }

    const location = gl.getAttribLocation(this.program, name);
    if (location < 0) {
      throw new UniformError(`Attribute ${name} not found`, name);
    }

    this.attributeLocations[name] = { location };
    return location;
  }

  /**
   * Set a uniform variable of type float.
   * 
   * @param gl The WebGL context
   * @param name The name of the uniform variable
   * @param value The value to set
   */
  setUniform1f(gl: WebGL2RenderingContext | WebGLRenderingContext, name: string, value: number) {
    gl.uniform1f(this.getUniformLocation(gl, name), value);
  }

  /**
   * Set a uniform variable of type vec4.
   * 
   * @param gl The WebGL context
   * @param name The name of the uniform variable
   * @param value The value to set
   */
  setUniform4f(gl: WebGL2RenderingContext | WebGLRenderingContext, name: string, x: number, y: number, z: number, w: number) {
    gl.uniform4f(this.getUniformLocation(gl, name), x, y, z, w);
  }
}

export class ProgramError extends Error {
  readonly log?: string | null;

  constructor(message: string, log?: string | null) {
    super(message);
    this.name = "ProgramError";
    this.log = log;
  }
}

export class UniformError extends Error {
  readonly uniform: string;

  constructor(message: string, uniform: string) {
    super(message);
    this.name = "UniformError";
    this.uniform = uniform;
  }
}
