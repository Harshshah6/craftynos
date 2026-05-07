import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { DockerService } from './docker.service';


import { FileService } from './file.service';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  }
});

const dockerService = new DockerService();
const fileService = new FileService();

app.use(cors());
app.use(express.json());

app.post('/servers/create', async (req, res) => {
  try {
    const { name, domain, memoryMB } = req.body;
    const result = await dockerService.createMinecraftServer(name, domain, memoryMB);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/servers/:id/:action', async (req, res) => {
  try {
    const { id, action } = req.params;
    if (action === 'start') await dockerService.startContainer(id);
    else if (action === 'stop') await dockerService.stopContainer(id);
    else if (action === 'kill') await dockerService.killContainer(id);
    else return res.status(400).json({ error: 'Invalid action' });
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// File Manager Endpoints
app.get('/servers/:id/files', async (req, res) => {
  try {
    const { id } = req.params;
    const path = (req.query.path as string) || '';
    const files = await fileService.listFiles(id, path);
    res.json({ success: true, files });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/servers/:id/files/read', async (req, res) => {
  try {
    const { id } = req.params;
    const path = req.query.path as string;
    if (!path) return res.status(400).json({ error: 'Path is required' });
    
    const content = await fileService.readFile(id, path);
    res.json({ success: true, content });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/servers/:id/files/write', async (req, res) => {
  try {
    const { id } = req.params;
    const { path, content } = req.body;
    if (!path) return res.status(400).json({ error: 'Path is required' });
    
    await fileService.writeFile(id, path, content);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/servers/:id/files', async (req, res) => {
  try {
    const { id } = req.params;
    const path = req.query.path as string;
    if (!path) return res.status(400).json({ error: 'Path is required' });
    
    await fileService.deleteFile(id, path);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// WebSocket for log streaming
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);
  
  socket.on('attach', async (containerName: string) => {
    console.log(`[WS] Attaching to container: ${containerName}`);
    try {
      const stream = await dockerService.getContainerStream(containerName);
      
      if (!stream) {
        socket.emit('log', `\r\n\x1b[31mError: Could not attach to ${containerName}\x1b[0m\r\n`);
        return;
      }

      // Stream logs to client
      // Because we now use Tty: true when creating the container, the output is raw (not multiplexed)
      stream.on('data', (chunk: Buffer) => {
        socket.emit('log', chunk.toString('utf8'));
      });

      socket.on('command', async (cmd: string) => {
        try {
          const output = await dockerService.sendCommand(containerName, cmd);
          if (output && output.trim().length > 0) {
            // Strip trailing newlines and add a nice prefix so the user sees RCON output
            const lines = output.trim().split('\n');
            for (const line of lines) {
              socket.emit('log', `\r\n\x1b[36m[RCON]\x1b[0m ${line.replace(/\r/g, '')}`);
            }
            socket.emit('log', '\r\n');
          }
        } catch (err: any) {
          socket.emit('log', `\r\n\x1b[31m[RCON Error] ${err.message}\x1b[0m\r\n`);
        }
      });

      socket.on('disconnect', () => {
        // Clean up stream if needed
        if (stream && 'destroy' in stream) {
          (stream as any).destroy();
        }
      });

    } catch (e: any) {
      socket.emit('log', `\r\n\x1b[31mError: ${e.message}\x1b[0m\r\n`);
    }
  });
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`Daemon agent listening on port ${PORT}`);
});
