import { useEffect } from 'react';
import useWebGL, { point } from './hooks/useWebGL'
import WS from './websocket/websocket';

type Message = {
  a: point[],
  b: point[],
  c: point[],
}

function App() {
  const { canvasRef, setPoints1, setPoints2, setPoints3 } = useWebGL()

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
      <canvas width="1200" height="800" ref={canvasRef} />
    </>
  )
}

export default App
