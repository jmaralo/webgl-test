import Series from "./series";

export default class Chart {
    private series: { [name: string]: Series } = {}

    private context: WebGL2RenderingContext

    constructor(context: WebGL2RenderingContext) {
        this.context = context
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

    draw() {
        this.clearBuffers()
        for (const series of Object.values(this.series)) {
            series.draw()
        }
    }

    private clearBuffers() {
        this.context.clear(this.context.COLOR_BUFFER_BIT);
        this.context.clearColor(0, 0, 0, 0);
    }
}
