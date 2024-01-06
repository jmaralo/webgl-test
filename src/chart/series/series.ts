
export default interface Series {
  draw(ctx: WebGL2RenderingContext | WebGLRenderingContext | CanvasRenderingContext2D): number
  update(points: Point[]): void
  style: SeriesStyle
}

export type Point = {
  x: number,
  y: number,
}

export type SeriesStyle = {
  colorR: number,
  colorG: number,
  colorB: number,
  colorA: number,
  width: number,
}

export const NANOSECOND = 1
export const MICROSECOND = 1000 * NANOSECOND
export const MILLISECOND = 1000 * MICROSECOND
export const SECOND = 1000 * MILLISECOND