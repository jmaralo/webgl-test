import Series from "./series/series";
import defaultProgram, { Program } from "./shader/program";

/**
 * A chart that can be rendered on a canvas.
 */
export default class Chart {
  private series: Series[] = [];
  private gl2?: WebGL2RenderingContext;
  private program?: Program;

  /**
   * Creates a new chart on the provided context.
   * 
   * Note: the chart will take the whole canvas
   * 
   * @param context The context of the canvas
   */
  constructor(context: WebGL2RenderingContext | WebGLRenderingContext | CanvasRenderingContext2D) {
    if (context instanceof WebGL2RenderingContext) {
      this.initWebGL2(context);
    } else if (context instanceof WebGLRenderingContext) {
      this.initWebGL(context);
    } else if (context instanceof CanvasRenderingContext2D) {
      this.initCanvas2D(context);
    } else {
      throw new TypeError('Invalid context');
    }
  }

  /**
   * Prepares the chart to work with WebGL2 (OpenGL ES 3.0)
   * 
   * @param gl the webGL context
   */
  private initWebGL2(gl: WebGL2RenderingContext) {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    this.gl2 = gl;
    this.program = defaultProgram(gl);
  }

  /**
   * Add a series to the chart.
   * 
   * @param series The series to add
   */
  addSeries(series: Series) {
    this.series.push(series);
  }

  render() {
    if (this.gl2 && this.program) {
      return requestAnimationFrame(this.renderWebGL2(this.gl2, this.program))
    }

    throw new ChartError("Chart not initialized properly")
  }

  /**
   * Render the chart on the provided WebGL2 context
   * 
   * @param gl the webGL context
   * @param program the program to use for rendering
   */
  private renderWebGL2(gl: WebGL2RenderingContext, program: Program) {
    let then = 0
    const render = (now: DOMHighResTimeStamp) => {
      const deltaTime = now - then
      then = now

      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.clearColor(0, 0, 0, 0);

      program.use(gl);

      let totalDraw = 0;
      for (const s of this.series) {
        program.setUniform1f(gl, "uWidth", s.style.width)
        program.setUniform4f(gl, "uColor", s.style.colorR, s.style.colorG, s.style.colorB, s.style.colorA)
        totalDraw += s.draw(gl)
      }
      console.log("Drew ", totalDraw, " points in ", deltaTime, "ms")

      requestAnimationFrame(render)
    }

    return render
  }

  /**
   * Prepares the chart to work with WebGL (OpenGL ES 2.0)
   * 
   * @param gl the webGL context
   */
  private initWebGL(_: WebGLRenderingContext) {
    throw new Error("Method not implemented.");
  }

  /**
   * Prepares the chart to work with 2D canvas
   * 
   * @param ctx the canvas context
   */
  private initCanvas2D(_: CanvasRenderingContext2D) {
    throw new Error("Method not implemented.");
  }
}

export class ChartError extends Error {
  constructor(message: string) {
    super(`Chart error: ${message}`);
  }
}