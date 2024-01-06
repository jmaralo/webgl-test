# WebGL Chart Test

This repo is a small test I am doing to see how performant a chart library could be by using webgl.

The app consists of a basic backend as an example that send messages to the frontend, which displays all the data in real time using the GPU accelerated charts.

The code should be somewhat easy to read and modify, so feel free to change it (try for example to change the plotted functions).

If you find any bugs, visual artifacts and the like, please open an issue with your problem.

## Running

Before running, make sure you have go and npm installed.

### 1. Backend

The backend is in the `cmd` folder.

Inside this folder run `go build` to compile the backend and then run the output executable.

The executable has three flags to change its behaviour:

* `-m`: Sets the delay between messages to the frontend (default 16ms / 60 Hz)
* `-d`: Sets the delay between data samples (default 1us / 1 MHz)
* `-l`: Address for the server, note this must match the value on the frontend (default "localhost:8080")

> All delay values need units of time: "s" for second, "ms" for millisecond, "us" for microsecond and "ns" for nanosecond. Note that small delay values will be inacurrate and highly depend on the computer hardware, values under the microsecond range will probably not work as expected.

### 2. Frontend

First install all dependencies with `npm install` and then run with `npm run dev`. This will then show a url you can access to see the chart.

## Authors

* [Juan Martinez Alonso](https://github.com/jmaralo)