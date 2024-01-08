import { CanvasContext as Canvas2DContext, DrawingContext, WebGL2Context, WebGLContext } from "../context/context";
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

  draw(ctx: DrawingContext): number {
    switch (ctx.type) {
      case "webgl2":
        return this.drawWebGL2(ctx)
      case "webgl":
        return this.drawWebGL(ctx)
      case "canvas2d":
        return this.drawCanvas2D(ctx)
    }

    return 0
  }

  private drawWebGL2(c: WebGL2Context): number {
    const vao = this.getVAO(c)
    c.gl.bindVertexArray(vao)

    if (this.updated) {
      const buffer = this.getBuffer(this.maxPoints, this.points[this.points.length - 1].x)

      const vbo = this.getVBO(c)
      c.gl.bindBuffer(c.gl.ARRAY_BUFFER, vbo)
      c.gl.bufferSubData(c.gl.ARRAY_BUFFER, 0, buffer)
      this.bufferLength = buffer.length
    }
    this.updated = false;

    c.program.use(c.gl)
    c.program.setUniform1f(c.gl, "uWidth", this.style.width)
    c.program.setUniform4f(c.gl, "uColor", this.style.colorR, this.style.colorG, this.style.colorB, this.style.colorA)

    c.gl.drawArrays(c.gl.TRIANGLE_STRIP, 0, this.bufferLength / 4)
    return this.bufferLength / 4
  }

  private drawWebGL(c: WebGLContext): number {
    const vbo = this.getVBO(c)
    c.gl.bindBuffer(c.gl.ARRAY_BUFFER, vbo)
    c.gl.vertexAttribPointer(c.program.getAttributeLocation(c.gl, "iPosition"), 2, c.gl.FLOAT, false, 4 * 4, 0)
    c.gl.enableVertexAttribArray(0)
    c.gl.vertexAttribPointer(c.program.getAttributeLocation(c.gl, "iNormal"), 2, c.gl.FLOAT, false, 4 * 4, 2 * 4)
    c.gl.enableVertexAttribArray(1)

    if (this.updated) {
      const buffer = this.getBuffer(this.maxPoints, this.points[this.points.length - 1].x)
      c.gl.bufferSubData(c.gl.ARRAY_BUFFER, 0, buffer)
      this.bufferLength = buffer.length
    }
    this.updated = false;

    c.program.use(c.gl)
    c.program.setUniform1f(c.gl, "uWidth", this.style.width)
    c.program.setUniform4f(c.gl, "uColor", this.style.colorR, this.style.colorG, this.style.colorB, this.style.colorA)

    c.gl.drawArrays(c.gl.TRIANGLE_STRIP, 0, this.bufferLength / 4)
    return this.bufferLength / 4
  }

  private drawCanvas2D(_: Canvas2DContext): number {
    throw new Error("Method not implemented.");
  }

  private getVAO(c: WebGL2Context): WebGLVertexArrayObject {
    if (this.vao) {
      return this.vao
    }

    const vao = c.gl.createVertexArray()
    if (!vao) {
      throw new BufferError("Failed to create vertex array")
    }

    c.gl.bindVertexArray(vao)
    const vbo = this.getVBO(c)
    c.gl.bindBuffer(c.gl.ARRAY_BUFFER, vbo)
    c.gl.vertexAttribPointer(c.program.getAttributeLocation(c.gl, "iPosition"), 2, c.gl.FLOAT, false, 4 * 4, 0)
    c.gl.enableVertexAttribArray(0)
    c.gl.vertexAttribPointer(c.program.getAttributeLocation(c.gl, "iNormal"), 2, c.gl.FLOAT, false, 4 * 4, 2 * 4)
    c.gl.enableVertexAttribArray(1)

    this.vao = vao
    return vao
  }

  private getVBO(c: WebGL2Context | WebGLContext): WebGLBuffer {
    if (this.vbo) {
      return this.vbo
    }

    const vbo = c.gl.createBuffer()
    if (!vbo) {
      throw new BufferError("Failed to create vertex buffer")
    }

    c.gl.bindBuffer(c.gl.ARRAY_BUFFER, vbo)
    c.gl.bufferData(c.gl.ARRAY_BUFFER, new Float32Array(this.maxPoints * 16), c.gl.DYNAMIC_DRAW)

    this.vbo = vbo
    return vbo
  }

  private getBuffer(maxPoints: number, currentTime: number): Float32Array {
    const pts = this.points.slice(-maxPoints).map(pt => this.mapPoint(pt, currentTime));
    const vertices = new Float32Array(pts.length * 16)
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
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