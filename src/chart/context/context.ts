import { Program } from "../shader/program";

export type DrawingContext = WebGL2Context | WebGLContext | CanvasContext;

export type WebGL2Context = {
  type: "webgl2",
  gl: WebGL2RenderingContext,
  program: Program,
}

export type WebGLContext = {
  type: "webgl",
  gl: WebGLRenderingContext,
  program: Program,
}

export type CanvasContext = {
  type: "canvas2d",
  ctx: CanvasRenderingContext2D,
}