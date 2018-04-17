import * as WebSocket from 'ws';

export class WSServer {
  private _server: WebSocket.Server;
  private _socket: WebSocket;

  constructor(private _port: number) {
    this._server = new WebSocket.Server({ port: _port });
    this._server.on('connection', ws => {
      this._socket = ws;
    });
    this._server.on('error', error => {
      console.log(`[Error] Open WebSocket on port ${this._port} failed:`);
      console.log(error.message);
    });
  }

  async send(text: string) {
    if (!this._socket) {
      return Promise.reject(new Error('Connection lost.'));
    }
    this._socket.send(text, Promise.resolve);
  }

  close() {
    this._socket.close();
  }
}