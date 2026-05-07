const Docker = require('dockerode');
const docker = new Docker();

async function test() {
  const containerId = 'craftynos-ce5b1f66-46dd-4e52-956e-c9da707a331b';
  const container = docker.getContainer(containerId);
  
  const exec = await container.exec({
    Cmd: ['rcon-cli', 'list'],
    AttachStdout: true,
    AttachStderr: true,
    Tty: true
  });
  
  const stream = await exec.start({});
  console.log("Stream started");
  
  return new Promise((resolve, reject) => {
    let output = '';
    stream.on('data', (chunk) => {
      console.log("DATA chunk:", chunk.toString('utf8'));
      output += chunk.toString('utf8');
    });
    stream.on('end', () => {
      console.log("Stream END");
      resolve(output);
    });
    stream.on('error', (e) => {
      console.error("Stream ERROR");
      reject(e);
    });
    stream.on('close', () => {
      console.log("Stream CLOSE");
      // resolve(output);
    });
  });
}

test().then(o => console.log("Final output:", o)).catch(console.error);
