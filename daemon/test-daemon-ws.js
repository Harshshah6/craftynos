const { io } = require('socket.io-client');

async function test() {
  const containerName = 'craftynos-ce5b1f66-46dd-4e52-956e-c9da707a331b';
  
  const socket = io('http://localhost:8080');
  
  socket.on('connect', () => {
    console.log('Connected to daemon WS');
    console.log('Emitting attach...');
    socket.emit('attach', containerName);
    
    setTimeout(() => {
      console.log('Emitting command: list');
      socket.emit('command', 'list');
    }, 2000);
  });
  
  socket.on('log', (data) => {
    console.log('LOG:', data.replace(/\r/g, '').replace(/\n/g, '\\n'));
  });
  
  setTimeout(() => process.exit(0), 5000);
}

test();
