import * as express from 'express';
import * as http from 'http';

export class HTTPServer {
  private _server: http.Server;
  private _serverPort = 0;

  app = express();

  constructor(webRootAbsolutePath: string) {
    this._server = http.createServer(this.app);
    const port = this._server.listen(0).address().port;
    this._serverPort = port;
    console.log(`Starting express server on port: ${port}`);

    this.app.use('/', express.static(webRootAbsolutePath));
  }

  get port() {
    return this._serverPort;
  }

  async close() {
    this._server.close(Promise.resolve);
  }
}