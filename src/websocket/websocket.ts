

class WS {
  private socket: WebSocket;

  constructor(url: string, onMessage: (event: MessageEvent<string>) => void) {
    this.socket = new WebSocket(url);
  
    this.socket.onopen = (_) => {
      console.log("Socket opened");
    };

    this.socket.onclose = (event) => {
      console.log("Socket closed", event.code, event.reason);
      this.socket.close();
    };

    this.socket.onerror = (event) => {
      console.log("Socket error", event);
      this.socket.close();
    };

    this.socket.onmessage = onMessage;
  }

  close() {
    this.socket.close();
  }
}

export default WS;