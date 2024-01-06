import Series, { Point, SECOND, SeriesStyle } from "./series"

export default class LineSeries implements Series {
  name: string = "Line"
  style: SeriesStyle = {
    colorR: 1,
    colorG: 0,
    colorB: 0,
    colorA: 1,
    width: 0.015,
  }

  timeWindow: number = SECOND * 5;
  maxValue: number = 1.0;
  minValue: number = -1.0;

  readonly maxPoints: number = 50000;

  private points: Point[] = []
  private updated: boolean = false;

  private vao?: WebGLVertexArrayObject;
  private vbo?: WebGLBuffer;
  private bufferLength: number = 0;

  constructor() { }

  draw(ctx: WebGL2RenderingContext | WebGLRenderingContext | CanvasRenderingContext2D): number {
    if (ctx instanceof CanvasRenderingContext2D) {
      return this.drawCanvas2D(ctx)
    } else if (ctx instanceof WebGLRenderingContext) {
      return this.drawWebGL(ctx)
    } else if (ctx instanceof WebGL2RenderingContext) {
      return this.drawWebGL2(ctx)
    }

    return 0
  }

  private drawWebGL2(gl: WebGL2RenderingContext): number {
    const vao = this.getVAO(gl)
    gl.bindVertexArray(vao)

    if (this.updated) {
      const buffer = this.getBuffer(this.maxPoints, this.points[this.points.length - 1].x)

      const vbo = this.getVBO(gl)
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, buffer)
      this.bufferLength = buffer.length
    }
    this.updated = false;


    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.bufferLength / 4)
    return this.bufferLength / 4
  }

  private drawWebGL(_: WebGLRenderingContext): number {
    throw new Error("Method not implemented.");
  }

  private drawCanvas2D(_: CanvasRenderingContext2D): number {
    throw new Error("Method not implemented.");
  }

  private getVAO(gl: WebGL2RenderingContext): WebGLVertexArrayObject {
    if (this.vao) {
      return this.vao
    }

    const vao = gl.createVertexArray()
    if (!vao) {
      throw new BufferError("Failed to create vertex array")
    }

    gl.bindVertexArray(vao)

    const vbo = gl.createBuffer()
    if (!vbo) {
      throw new BufferError("Failed to create vertex buffer")
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.maxPoints * 16), gl.DYNAMIC_DRAW)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4 * 4, 0)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 4 * 4, 2 * 4)
    gl.enableVertexAttribArray(1)

    this.vao = vao
    this.vbo = vbo
    return vao
  }

  private getVBO(gl: WebGL2RenderingContext | WebGLRenderingContext): WebGLBuffer {
    if (this.vbo) {
      return this.vbo
    }

    const vbo = gl.createBuffer()
    if (!vbo) {
      throw new BufferError("Failed to create vertex buffer")
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.maxPoints * 16), gl.DYNAMIC_DRAW)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 4 * 4, 0)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 4 * 4, 2 * 4)
    gl.enableVertexAttribArray(1)

    this.vbo = vbo
    return vbo
  }

  private getBuffer(maxPoints: number, currentTime: number): Float32Array {
    const pts = this.points.slice(-maxPoints);
    const vertices = new Float32Array(pts.length * 16)
    for (let i = 0; i < pts.length - 1; i++) {
      const a = this.mapPoint(pts[i], currentTime)
      const b = this.mapPoint(pts[i + 1], currentTime)
      const n = this.getNormal(a, b)
      const stride = i * 16
      vertices[stride + 0] = a.x
      vertices[stride + 1] = a.y
      vertices[stride + 2] = n.x
      vertices[stride + 3] = n.y
      vertices[stride + 4] = a.x
      vertices[stride + 5] = a.y
      vertices[stride + 6] = -n.x
      vertices[stride + 7] = -n.y
      vertices[stride + 8] = b.x
      vertices[stride + 9] = b.y
      vertices[stride + 10] = n.x
      vertices[stride + 11] = n.y
      vertices[stride + 12] = b.x
      vertices[stride + 13] = b.y
      vertices[stride + 14] = -n.x
      vertices[stride + 15] = -n.y
    }
    return vertices
  }

  private mapPoint(point: Point, currentTime: number): Point {
    return {
      x: (((point.x - currentTime + this.timeWindow) / this.timeWindow) * 2) - 1,
      y: (((point.y - this.minValue) / (this.maxValue - this.minValue)) * 2) - 1,
    }
  }

  private getNormal(a: Point, b: Point): Point {
    return { x: a.y - b.y, y: b.x - a.x }
  }

  update(points: Point[]) {
    if (points.length == 0) {
      return
    }

    const latest = points[points.length - 1].x
    this.points = this.points.concat(points).filter((pt) => latest - pt.x < this.timeWindow)
    this.updated = true;
  }
}

class BufferError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BufferError"
  }
}