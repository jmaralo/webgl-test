class WS {
  private socket: WebSocket;

  constructor(url: string, onMessage: (event: MessageEvent<string>) => void) {
    this.socket = this.connect(url, onMessage)
  }

  connect(url: string, onMessage: (event: MessageEvent<string>) => void) {
    const socket = new WebSocket(url);

    socket.onopen = (_) => {
      console.log("Socket opened");
    };

    socket.onclose = (event) => {
      console.log("Socket closed", event.code, event.reason);
      this.socket.close();
      setTimeout(() => {
        this.socket = this.connect(url, onMessage)
      }, 1000);
    };

    socket.onerror = (event) => {
      console.log("Socket error", event);
      this.socket.close();
    };

    socket.onmessage = onMessage;

    return socket
  }

  close() {
    this.socket.close();
  }
}

export default WS;