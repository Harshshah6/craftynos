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
    const { name, domain, memoryMB, softwareType, softwareVersion, mods } = req.body;
    const result = await dockerService.createMinecraftServer(name, domain, memoryMB, softwareType, softwareVersion, mods);
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

app.get('/servers/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const statusInfo = await dockerService.getContainerStatus(id);
    res.json({ success: true, ...statusInfo });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/servers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dockerService.deleteMinecraftServer(id);
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

app.post('/servers/:id/files/rename', async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) return res.status(400).json({ error: 'oldPath and newPath are required' });
    
    await fileService.renameFile(id, oldPath, newPath);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// WebSocket for log streaming and stats
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);
  let statsInterval: NodeJS.Timeout | null = null;
  
  socket.on('attach', async (containerName: string) => {
    console.log(`[WS] Attaching to container: ${containerName}`);
    
    let activeStream: any = null;
    let isSocketConnected = true;
    let retryTimeout: NodeJS.Timeout | null = null;

    const cleanupStream = () => {
      if (activeStream) {
        if ('destroy' in activeStream) {
          try { activeStream.destroy(); } catch {}
        }
        activeStream = null;
      }
    };

    const attachStream = async () => {
      if (!isSocketConnected) return;
      cleanupStream();

      try {
        const statusInfo = await dockerService.getContainerStatus(containerName);
        if (statusInfo.dockerState === 'not_found') {
          socket.emit('log', `\r\n\x1b[33m[CraftyNOS] Container not found. Checking again soon...\x1b[0m\r\n`);
          scheduleRetry();
          return;
        }

        const stream = await dockerService.getContainerStream(containerName);
        if (!stream) {
          scheduleRetry();
          return;
        }

        activeStream = stream;

        stream.on('data', (chunk: Buffer) => {
          if (isSocketConnected) {
            socket.emit('log', chunk.toString('utf8'));
          }
        });

        stream.on('end', () => {
          cleanupStream();
          if (isSocketConnected) {
            socket.emit('log', '\r\n\x1b[33m[CraftyNOS] Container stream ended. Re-attaching...\x1b[0m\r\n');
            scheduleRetry();
          }
        });

        stream.on('error', (err: any) => {
          cleanupStream();
          if (isSocketConnected) {
            console.error(`[WS] Stream error for ${containerName}:`, err.message);
            scheduleRetry();
          }
        });

      } catch (err: any) {
        cleanupStream();
        if (isSocketConnected) {
          scheduleRetry();
        }
      }
    };

    const scheduleRetry = () => {
      if (retryTimeout) clearTimeout(retryTimeout);
      if (!isSocketConnected) return;
      retryTimeout = setTimeout(attachStream, 3000);
    };

    // Start initial attachment
    attachStream();

    // Start stats polling every 2.5s
    statsInterval = setInterval(async () => {
      try {
        // console.log(`Polling stats for ${containerName}`);
        const stats = await dockerService.getContainerStats(containerName);
        // Parse stats
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
        let cpuPercent = 0.0;
        if (systemDelta > 0 && cpuDelta > 0) {
          // Note: Docker typically calculates 1 core = 100%. 
          // We omit multiplying by online_cpus here so it maxes at 100% for the entire host.
          cpuPercent = (cpuDelta / systemDelta) * 100.0;
        }
        
        const memoryUsage = stats.memory_stats.usage || 0;
        const memoryLimit = stats.memory_stats.limit || 0;
        
        // console.log(`Emitting stats for ${containerName}: CPU ${cpuPercent}% RAM ${memoryUsage}`);
        socket.emit('stats', {
          cpuPercent: parseFloat(cpuPercent.toFixed(2)),
          memoryUsage,
          memoryLimit,
          status: 'ONLINE'
        });
      } catch (e: any) {
        // container might be offline
        socket.emit('stats', { status: 'OFFLINE' });
      }
    }, 2500);

    socket.on('command', async (cmd: string) => {
      try {
        const output = await dockerService.sendCommand(containerName, cmd);
        if (output && output.trim().length > 0) {
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
      isSocketConnected = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (statsInterval) clearInterval(statsInterval);
      cleanupStream();
    });
  });
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`Daemon agent listening on port ${PORT}`);
});
