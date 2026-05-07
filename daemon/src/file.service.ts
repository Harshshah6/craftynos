import * as fs from 'fs/promises';
import * as path from 'path';

export class FileService {
  private getServerDir(serverId: string): string {
    // serverId here is the uuid without craftynos- prefix
    const dir = path.resolve(process.cwd(), 'server-data', serverId);
    return dir;
  }

  // Prevent directory traversal attacks by validating the resolved path
  private async getSafePath(serverId: string, targetPath: string): Promise<string> {
    const rootDir = this.getServerDir(serverId);
    const resolvedPath = path.resolve(rootDir, targetPath.replace(/^\//, '')); // Remove leading slash
    
    if (!resolvedPath.startsWith(rootDir)) {
      throw new Error('Access denied: Invalid path');
    }
    
    return resolvedPath;
  }

  async listFiles(serverId: string, targetPath: string = '') {
    const safePath = await this.getSafePath(serverId, targetPath);
    
    try {
      const entries = await fs.readdir(safePath, { withFileTypes: true });
      
      const files = await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(safePath, entry.name);
        const stats = await fs.stat(fullPath);
        
        return {
          name: entry.name,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          lastModified: stats.mtime
        };
      }));
      
      // Sort: directories first, then alphabetically
      return files.sort((a, b) => {
        if (a.isDirectory === b.isDirectory) {
          return a.name.localeCompare(b.name);
        }
        return a.isDirectory ? -1 : 1;
      });
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        throw new Error(`Path does not exist: ${targetPath}`);
      }
      throw e;
    }
  }

  async readFile(serverId: string, targetPath: string) {
    const safePath = await this.getSafePath(serverId, targetPath);
    const stats = await fs.stat(safePath);
    
    if (stats.isDirectory()) {
      throw new Error('Cannot read a directory');
    }
    
    return await fs.readFile(safePath, 'utf8');
  }

  async writeFile(serverId: string, targetPath: string, content: string) {
    const safePath = await this.getSafePath(serverId, targetPath);
    
    // Ensure parent directory exists
    const dir = path.dirname(safePath);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(safePath, content, 'utf8');
    return { success: true };
  }

  async deleteFile(serverId: string, targetPath: string) {
    const safePath = await this.getSafePath(serverId, targetPath);
    const stats = await fs.stat(safePath);
    
    if (stats.isDirectory()) {
      await fs.rm(safePath, { recursive: true, force: true });
    } else {
      await fs.unlink(safePath);
    }
    return { success: true };
  }

  async renameFile(serverId: string, oldPath: string, newPath: string) {
    const safeOldPath = await this.getSafePath(serverId, oldPath);
    const safeNewPath = await this.getSafePath(serverId, newPath);

    // Ensure destination parent directory exists
    const destDir = path.dirname(safeNewPath);
    await fs.mkdir(destDir, { recursive: true });

    // Perform rename/move
    await fs.rename(safeOldPath, safeNewPath);
    return { success: true };
  }
}
