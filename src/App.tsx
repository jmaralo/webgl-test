import { useEffect } from 'react';
import useWebGL from './hooks/useWebGL'
import WS from './websocket/websocket';

function App() {
  const { canvasRef, setPoints } = useWebGL()

  useEffect(() => {
    const socket = new WS('ws://192.168.1.135:8080', (msg) => {
      setPoints(JSON.parse(msg.data))
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
