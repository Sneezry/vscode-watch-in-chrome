try {
  ws = new WebSocket('ws://127.0.0.1:20184');
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.url === location.href) {
      document.body.innerHTML = '';
      document.write(message.html);
    }
  }
} catch(e) {
  //ignore
}