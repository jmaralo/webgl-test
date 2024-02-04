import { useEffect } from 'react';
import useWebGL, { point } from './hooks/useWebGL'
import WS from './websocket/websocket';

type Message = {
  a: point[],
  b: point[],
  c: point[],
}

function App() {
  const { canvasRef, containerRef1, containerRef2, setPoints1, setPoints2, setPoints3 } = useWebGL()

  useEffect(() => {
    const socket = new WS('ws://localhost:8080', (msg) => {
      const data = JSON.parse(msg.data) as Message;
      setPoints1(data.a);
      setPoints2(data.b);
      setPoints3(data.c);
    });

    return () => {
      socket.close();
    }
  }, [])

  return (
    <>
      <canvas width={window.innerWidth} height={window.innerHeight} ref={canvasRef}/>
      <div id="chart-container-1" ref={containerRef1}></div>
      <div id="chart-container-2" ref={containerRef2}></div>
    </>
  )
}

export default App
