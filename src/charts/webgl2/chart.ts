import Axes from "./axes/axes";
import Series from "./series";

type RGBA = {
    r: number,
    g: number,
    b: number,
    a: number,
}

type Style = {
    backgroundColor: RGBA,
}

export default class Chart {
    private style: Style = {
        backgroundColor: {
            r: 0.0,
            g: 0.0,
            b: 0.0,
            a: 0.0,
        }
    }

    private axes: Axes
    private series: { [name: string]: Series } = {}

    private context: WebGL2RenderingContext

    constructor(context: WebGL2RenderingContext) {
        this.context = context
        this.axes = new Axes(context)
    }

    setBackgroundColor(red: number, green: number, blue: number, alpha: number) {
        this.style.backgroundColor.r = red
        this.style.backgroundColor.g = green
        this.style.backgroundColor.b = blue
        this.style.backgroundColor.a = alpha
    }

    addNamedSeries(name: string, series: Series) {
        this.series[name] = series
    }

    hasNamedSeries(name: string): boolean {
        return name in this.series
    }

    removeNamedSeries(name: string) {
        delete (this.series[name])
    }

    draw(container: HTMLElement) {
        this.prepareViewport(container)
        this.clearBuffers()
        this.axes.draw(container)
        for (const series of Object.values(this.series)) {
            series.draw(container)
        }
    }

    private prepareViewport(container: HTMLElement) {
        const rect = container.getBoundingClientRect();

        this.context.canvas.width = window.innerWidth
        this.context.canvas.height = window.innerHeight

        const width = rect.width;
        const height = rect.height;
        const left = rect.left;
        const bottom = this.context.canvas.height - rect.bottom;

        console.log(bottom, left, width, height)
        this.context.viewport(left, bottom, width, height);

        this.context.enable(this.context.SCISSOR_TEST)
        this.context.scissor(left, bottom, width, height);
    }

    private clearBuffers() {
        this.context.clear(this.context.COLOR_BUFFER_BIT)
        const { r, b, g, a } = this.style.backgroundColor
        this.context.clearColor(r, b, g, a)
    }
}