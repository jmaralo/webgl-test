import { CanvasContext as Canvas2DContext, DrawingContext, WebGL2Context, WebGLContext } from "../context/context";
import Series, { MILLISECOND, Point, SECOND, SeriesStyle } from "./series"

export default class LineSeries implements Series {
  name: string = "Line"
  style: SeriesStyle = {
    colorR: 1,
    colorG: 0,
    colorB: 0,
    colorA: 1,
    width: 0.015,
  }

  timeReference: number = 0;
  timeWindow: number = 5 * SECOND;
  maxValue: number = 1.0;
  minValue: number = -1.0;

  readonly maxPoints: number = 100000;

  private points: Point[] = []
  private buffer: Float32Array = new Float32Array((this.maxPoints - 1) * 16);

  private vao?: WebGLVertexArrayObject;
  private vbo?: WebGLBuffer;

  constructor(timeReference: number) {
    this.timeReference = timeReference
  }

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

    const vertexCount = this.updateBuffer(this.maxPoints, this.timeReference)

    const vbo = this.getVBO(c)
    c.gl.bindBuffer(c.gl.ARRAY_BUFFER, vbo)
    c.gl.bufferSubData(c.gl.ARRAY_BUFFER, 0, this.buffer, 0, vertexCount)

    c.program.use(c.gl)
    c.program.setUniform1f(c.gl, "uWidth", this.style.width)
    c.program.setUniform1f(c.gl, "uMinValue", this.minValue)
    c.program.setUniform1f(c.gl, "uMaxValue", this.maxValue)
    c.program.setUniform1f(c.gl, "uTimeWindow", this.timeWindow)
    c.program.setUniform1f(c.gl, "uCurrentTime", (Date.now() * MILLISECOND) - this.timeReference)

    c.program.setUniform4f(c.gl, "uColor", this.style.colorR, this.style.colorG, this.style.colorB, this.style.colorA)

    c.gl.drawArrays(c.gl.TRIANGLE_STRIP, 0, vertexCount / 4)
    return vertexCount / 4
  }

  private drawWebGL(c: WebGLContext): number {
    const vbo = this.getVBO(c)
    c.gl.bindBuffer(c.gl.ARRAY_BUFFER, vbo)
    c.gl.vertexAttribPointer(c.program.getAttributeLocation(c.gl, "iPosition"), 2, c.gl.FLOAT, false, 4 * 4, 0)
    c.gl.enableVertexAttribArray(0)
    c.gl.vertexAttribPointer(c.program.getAttributeLocation(c.gl, "iPositionNext"), 2, c.gl.FLOAT, false, 4 * 4, 2 * 4)
    c.gl.enableVertexAttribArray(1)

    const vertexCount = this.updateBuffer(this.maxPoints, this.timeReference)

    c.gl.bufferSubData(c.gl.ARRAY_BUFFER, 0, this.buffer.slice(0, vertexCount))

    c.program.use(c.gl)
    c.program.setUniform1f(c.gl, "uWidth", this.style.width)
    c.program.setUniform1f(c.gl, "uMinValue", this.minValue)
    c.program.setUniform1f(c.gl, "uMaxValue", this.maxValue)
    c.program.setUniform1f(c.gl, "uTimeWindow", this.timeWindow)
    c.program.setUniform1f(c.gl, "uCurrentTime", (Date.now() * MILLISECOND) - this.timeReference)

    c.program.setUniform4f(c.gl, "uColor", this.style.colorR, this.style.colorG, this.style.colorB, this.style.colorA)

    c.gl.drawArrays(c.gl.TRIANGLE_STRIP, 0, vertexCount / 4)
    return vertexCount / 4
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
    c.gl.vertexAttribPointer(c.program.getAttributeLocation(c.gl, "iPositionNext"), 2, c.gl.FLOAT, false, 4 * 4, 2 * 4)
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

  private updateBuffer(maxPoints: number, currentTime: number): number {
    const pts = Math.min(this.points.length, maxPoints)
    for (let i = 0; i < pts - 1; i++) {
      const a = this.points[this.points.length - pts + i]
      const ax = a.x - currentTime
      const ay = a.y
      const b = this.points[this.points.length - pts + i + 1]
      const bx = b.x - currentTime
      const by = b.y
      const stride = i * 16
      this.buffer[stride + 0] = ax
      this.buffer[stride + 1] = ay
      this.buffer[stride + 2] = bx
      this.buffer[stride + 3] = by
      this.buffer[stride + 4] = ax
      this.buffer[stride + 5] = ay
      this.buffer[stride + 6] = -bx + (2 * ax)
      this.buffer[stride + 7] = -by + (2 * ay)
      this.buffer[stride + 8] = bx
      this.buffer[stride + 9] = by
      this.buffer[stride + 10] = -ax + (2 * bx)
      this.buffer[stride + 11] = -ay + (2 * by)
      this.buffer[stride + 12] = bx
      this.buffer[stride + 13] = by
      this.buffer[stride + 14] = ax
      this.buffer[stride + 15] = ay
      
    }
    return (pts - 1) * 16
  }

  update(points: Point[]) {
    const time = (Date.now() * MILLISECOND)
    const newPoints = []
    for (let i = 0; i < this.points.length; i++) {
      if (time - this.points[i].x >= this.timeWindow) {
        continue
      }

      newPoints.push(this.points[i])
    }
    for (let i = 0; i < points.length; i++) {
      if (time - points[i].x >= this.timeWindow) {
        continue
      }

      newPoints.push(points[i])
    }
    this.points = newPoints
  }
}

class BufferError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "BufferError"
  }
}