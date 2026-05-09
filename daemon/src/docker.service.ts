import Docker from 'dockerode';

export class DockerService {
  private docker: Docker;

  constructor() {
    // Defaults to //./pipe/docker_engine on Windows, or /var/run/docker.sock on Linux
    this.docker = new Docker();
  }

  getDocker() {
    return this.docker;
  }

  async createMinecraftServer(name: string, domain: string, memoryMB: number, softwareType: string = 'VANILLA', softwareVersion: string = 'LATEST', mods: string = '') {
    try {
      // Create a persistent host directory for this server's data
      const fs = require('fs');
      const path = require('path');
      const dataDir = path.resolve(process.cwd(), 'server-data', name);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Pull the image first (this is a simplified example, pulling can take time)
      console.log(`Ensuring itzg/minecraft-server is pulled...`);
      await new Promise((resolve, reject) => {
        this.docker.pull('itzg/minecraft-server', (err: any, stream: any) => {
          if (err) return reject(err);
          this.docker.modem.followProgress(stream, onFinished, onProgress);
          function onFinished(err: any, output: any) {
            if (err) return reject(err);
            resolve(output);
          }
          function onProgress(event: any) {}
        });
      });

      const container = await this.docker.createContainer({
        Image: 'itzg/minecraft-server',
        name: `craftynos-${name}`,
        OpenStdin: true,
        Tty: true,
        Env: [
          'EULA=TRUE',
          'ONLINE_MODE=FALSE',
          `MEMORY=${memoryMB}M`,
          `TYPE=${softwareType}`,
          `VERSION=${softwareVersion}`,
          'PAUSE_WHEN_EMPTY_SECONDS=0',
          ...(mods ? [`MODRINTH_PROJECTS=${mods}`] : [])
        ],
        Labels: {
          'mc.domain': domain,
        },
        HostConfig: {
          NetworkMode: 'craftynos-net',
          Binds: [
            // Bind mount the host directory to /data inside the container
            `${dataDir}:/data`
          ],
          Memory: memoryMB * 1024 * 1024,
        },
        ExposedPorts: {
          '25565/tcp': {}
        }
      });

      await container.start();

      return { containerId: container.id };
    } catch (error) {
      console.error('Error creating container:', error);
      throw error;
    }
  }

  async updateServerDomain(uuid: string, newDomain: string) {
    const containerName = `craftynos-${uuid}`;
    const container = this.docker.getContainer(containerName);

    try {
      // 1. Inspect container to get its current configuration
      const info = await container.inspect();
      const wasRunning = info.State.Running;

      // 2. Remove the existing container
      await container.remove({ force: true });

      // 3. Recreate the container with the updated mc.domain label
      const config = info.Config || {};
      const hostConfig = info.HostConfig || {};

      config.Labels = config.Labels || {};
      config.Labels['mc.domain'] = newDomain;

      const newContainer = await this.docker.createContainer({
        Image: info.Image,
        name: containerName,
        OpenStdin: config.OpenStdin,
        Tty: config.Tty,
        Env: config.Env,
        Labels: config.Labels,
        HostConfig: hostConfig,
        ExposedPorts: config.ExposedPorts
      });

      // 4. If container was running, boot it back up
      if (wasRunning) {
        await newContainer.start();
      }
    } catch (err: any) {
      if (err?.statusCode === 404) {
        console.log(`Container ${containerName} not found during domain update, skipping Docker recreation.`);
        return;
      }
      throw err;
    }
  }


  async startContainer(containerId: string) {
    const container = this.docker.getContainer(containerId);
    await container.start();
  }

  async stopContainer(containerId: string) {
    const container = this.docker.getContainer(containerId);
    await container.stop();
  }

  async killContainer(containerId: string) {
    const container = this.docker.getContainer(containerId);
    await container.kill();
  }

  async getContainerStream(containerId: string) {
    const container = this.docker.getContainer(containerId);
    
    // Attach to the container's stdout, stderr, and stdin streams
    const stream = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
      stdin: true,
      logs: true // Include previous logs
    });
    
    return stream;
  }

  async sendCommand(containerId: string, command: string): Promise<string> {
    const container = this.docker.getContainer(containerId);
    
    const exec = await container.exec({
      Cmd: ['rcon-cli', command],
      AttachStdout: true,
      AttachStderr: true,
      Tty: true
    });
    
    const stream = await exec.start({});
    
    return new Promise((resolve, reject) => {
      let output = '';
      stream.on('data', (chunk) => {
        output += chunk.toString('utf8');
      });
      stream.on('end', () => resolve(output));
      stream.on('error', reject);
    });
  }

  async getContainerStats(containerId: string) {
    const container = this.docker.getContainer(containerId);
    return await container.stats({ stream: false });
  }

  async getContainerStatus(containerId: string): Promise<{
    dockerState: string;
    status: 'ONLINE' | 'OFFLINE' | 'STARTING' | 'RESTARTING' | 'CRASHED';
    startedAt: string | null;
  }> {
    try {
      const container = this.docker.getContainer(containerId);
      const info = await container.inspect();
      const state = info.State;

      // Map Docker states → our normalized status
      let status: 'ONLINE' | 'OFFLINE' | 'STARTING' | 'RESTARTING' | 'CRASHED';
      if (state.Running) {
        status = 'ONLINE';
      } else if (state.Restarting) {
        status = 'RESTARTING';
      } else if (state.Dead || state.OOMKilled || state.ExitCode !== 0) {
        status = 'CRASHED';
      } else if (state.Status === 'created') {
        status = 'STARTING';
      } else {
        status = 'OFFLINE';
      }

      return {
        dockerState: state.Status,  // raw: 'running' | 'exited' | 'restarting' | 'paused' | 'dead' | 'created'
        status,
        startedAt: state.StartedAt || null,
      };
    } catch (err: any) {
      if (err?.statusCode === 404) {
        return { dockerState: 'not_found', status: 'OFFLINE', startedAt: null };
      }
      throw err;
    }
  }

  async deleteMinecraftServer(name: string) {
    const container = this.docker.getContainer(`craftynos-${name}`);
    try {
      // Force remove stops running container and removes it in a single step
      await container.remove({ force: true });
    } catch (err: any) {
      if (err?.statusCode !== 404) {
        console.error(`Error removing container craftynos-${name}:`, err.message);
      }
    }

    try {
      const fs = require('fs');
      const path = require('path');
      const dataDir = path.resolve(process.cwd(), 'server-data', name);
      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true, force: true });
      }
    } catch (err: any) {
      console.error(`Error deleting host directory for ${name}:`, err.message);
    }
  }
}
