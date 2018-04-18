'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {WSServer} from './WSServer';
import {HTTPServer} from './HTTPServer';
import * as path from 'path';

interface serverInfo {
  rootPath: string;
  server: HTTPServer;
}

interface sendMessage {
  url: string;
  html: string;
}

var ws: WSServer;
var messageQueue: NodeJS.Timer;

function watchDocument(documentPath: string, rootPath: string, serverList: Array<serverInfo>) {
  let server: HTTPServer;

  for (let i = 0; i < serverList.length; i++) {
    if (serverList[i].rootPath === rootPath) {
      server = serverList[i].server;
      break;
    }
  }

  if (!server) {
    server = new HTTPServer(rootPath);
    serverList.push({rootPath, server});
  }

  let relativePath = documentPath.substr(rootPath.length);
  relativePath = relativePath.replace(/\\\\/g, '/').replace(/\\/g, '/');
  if (relativePath.substr(0, 1) === '/') {
    relativePath = relativePath.substr(1);
  }
  const url = `http://127.0.0.1:${server.port}/${relativePath}`;
  vscode.commands.executeCommand(
    'vscode.open', vscode.Uri.parse(url));

  return;
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "watch-in-chrome" is now active!');

  ws = new WSServer(20184);

  let serverList: Array<serverInfo> = [];
  let sendList: Array<sendMessage> = [];

  messageQueue = setInterval(() => {
    sendList.forEach(async message => {
      await ws.send(JSON.stringify(message));
    });
    sendList.length = 0;
  }, 1000);

  vscode.workspace.onDidCloseTextDocument(async document => {
    if (!/(\.html|\.htm)$/.test(document.fileName)) {
      return;
    }

    let rootPath: string;
    let serverIndex: number;
    for (let i = 0; i < serverList.length; i++) {
      if (document.uri.fsPath.indexOf(serverList[i].rootPath) === 0) {
        rootPath = serverList[i].rootPath;
        serverIndex = i;
        break;
      }
    }
    
    if (!rootPath) {
      return;
    }

    const documents = vscode.workspace.textDocuments;
    let serverRelease = true;
    for (let i = 0; i < documents.length; i++) {
      if (documents[i].uri.fsPath.indexOf(rootPath) === 0) {
        serverRelease = false;
        break;
      }
    }

    if (serverRelease) {
      await serverList[serverIndex].server.close();
      serverList.splice(serverIndex, 1);
    }
  });

  vscode.workspace.onDidChangeTextDocument(async event => {
    if (!/(\.html|\.htm)$/.test(event.document.fileName)) {
      return;
    }

    const docPath = event.document.uri.fsPath;
    for (let i = 0; i < serverList.length; i++) {
      if (docPath.indexOf(serverList[i].rootPath) === 0) {
        let relativePath = docPath.substr(serverList[i].rootPath.length);
        relativePath = relativePath.replace(/\\\\/g, '/').replace(/\\/g, '/');
        if (relativePath.substr(0, 1) === '/') {
          relativePath = relativePath.substr(1);
        }
        const url = `http://127.0.0.1:${serverList[i].server.port}/${relativePath}`;

        let queued = false;
        for (let i = 0; i < sendList.length; i++) {
          if (sendList[i].url === url) {
            sendList[i].html = event.document.getText();
            queued = true;
          }
        }

        if (!queued) {
          sendList.push({
            url,
            html: event.document.getText()
          });
        }
      }
    }
  });

  let disposable = vscode.commands.registerCommand('vscode-watchinchrome.watch', () => {
    const documents = vscode.workspace.textDocuments;
    const workspaceFolders = vscode.workspace.workspaceFolders;
    documents.forEach(document => {
      if (!/(\.html|\.htm)$/.test(document.fileName)) {
        return;
      }
      const docPath = document.uri.fsPath;
      if (!workspaceFolders) {
        const rootPath = path.join(docPath, '..');
        watchDocument(docPath, rootPath, serverList);
        return;
      }
      for (var i = 0; i < workspaceFolders.length; i++) {
        if (document.uri.fsPath.indexOf(workspaceFolders[i].uri.fsPath) === 0) {
          const rootPath = workspaceFolders[i].uri.fsPath;
          watchDocument(docPath, rootPath, serverList);
          return;
        }
      }
    });
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {
  if (ws) {
    clearInterval(messageQueue);
    ws.close();
  }
}