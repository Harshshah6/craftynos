/**
 * CraftyNOS Minecraft Reverse Proxy
 * 
 * Reads the Minecraft handshake packet to extract the target hostname,
 * looks up the matching container via Docker socket (by mc.domain label),
 * and pipes the raw TCP connection through.
 * 
 * This is a pure Node.js implementation with no external dependencies
 * except dockerode (already used by the daemon).
 */

'use strict';

const net = require('net');
const http = require('http');

const LISTEN_PORT = 25565;
const DOCKER_SOCKET = '/var/run/docker.sock';
const MC_PORT = 25565;

// ---------------------------------------------------------------------------
// Docker helper — lists containers and finds one with a matching mc.domain label
// ---------------------------------------------------------------------------
function dockerRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      socketPath: DOCKER_SOCKET,
      path,
      method: 'GET',
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function resolveHostToContainer(hostname) {
  // Strip port suffix if present (e.g. "foo.lulli.qzz.io:25565" -> "foo.lulli.qzz.io")
  const host = hostname.split(':')[0].toLowerCase();

  const containers = await dockerRequest('/containers/json');
  for (const c of containers) {
    const labels = c.Labels || {};
    const domain = (labels['mc.domain'] || '').toLowerCase();
    if (domain === host) {
      // Get the container IP on the craftynos-net network
      const networks = c.NetworkSettings?.Networks || {};
      for (const [netName, netInfo] of Object.entries(networks)) {
        if (netInfo.IPAddress) {
          console.log(`[proxy] ${host} -> ${c.Names?.[0]} (${netInfo.IPAddress})`);
          return netInfo.IPAddress;
        }
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Minecraft handshake parser
// Minecraft handshake packet structure (after var-int length):
//   packet id: 0x00
//   protocol version: var-int
//   server address: string (length-prefixed)
//   server port: unsigned short
//   next state: var-int (1=status, 2=login)
// ---------------------------------------------------------------------------
function readVarInt(buf, offset) {
  let value = 0, shift = 0, pos = offset;
  while (pos < buf.length) {
    const byte = buf[pos++];
    value |= (byte & 0x7F) << shift;
    shift += 7;
    if ((byte & 0x80) === 0) break;
  }
  return { value, nextPos: pos };
}

function parseHandshake(buf) {
  try {
    let pos = 0;

    // Packet length (var-int)
    const len = readVarInt(buf, pos);
    pos = len.nextPos;

    // Packet ID (var-int, should be 0x00)
    const packetId = readVarInt(buf, pos);
    pos = packetId.nextPos;
    if (packetId.value !== 0x00) return null;

    // Protocol version (var-int)
    const proto = readVarInt(buf, pos);
    pos = proto.nextPos;

    // Server address string: var-int length + utf8 bytes
    const addrLen = readVarInt(buf, pos);
    pos = addrLen.nextPos;
    if (pos + addrLen.value > buf.length) return null;

    const hostname = buf.slice(pos, pos + addrLen.value).toString('utf8');
    return hostname;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// TCP Server
// ---------------------------------------------------------------------------
const server = net.createServer((clientSocket) => {
  let firstChunk = null;
  let resolved = false;

  clientSocket.on('error', (err) => {
    if (err.code !== 'ECONNRESET') {
      console.error('[proxy] client socket error:', err.message);
    }
  });

  const onData = async (chunk) => {
    if (resolved) return;
    resolved = true;

    // Pause so no more 'data' events fire while we resolve
    clientSocket.pause();
    firstChunk = chunk;

    const hostname = parseHandshake(chunk);
    if (!hostname) {
      console.warn('[proxy] Could not parse handshake — closing connection');
      clientSocket.destroy();
      return;
    }

    console.log(`[proxy] Incoming connection for: ${hostname}`);

    let targetIp;
    try {
      targetIp = await resolveHostToContainer(hostname);
    } catch (err) {
      console.error('[proxy] Docker lookup failed:', err.message);
      clientSocket.destroy();
      return;
    }

    if (!targetIp) {
      console.warn(`[proxy] No container found for hostname: ${hostname}`);
      clientSocket.destroy();
      return;
    }

    const upstream = net.createConnection({ host: targetIp, port: MC_PORT }, () => {
      // Replay the first chunk (handshake) so the MC server gets it unmodified
      upstream.write(firstChunk);
      // Resume bidirectional piping
      clientSocket.resume();
      clientSocket.pipe(upstream);
      upstream.pipe(clientSocket);
    });

    upstream.on('error', (err) => {
      console.error(`[proxy] upstream error for ${hostname}:`, err.message);
      clientSocket.destroy();
    });

    clientSocket.on('close', () => upstream.destroy());
    upstream.on('close', () => clientSocket.destroy());
  };

  clientSocket.once('data', onData);
});

server.listen(LISTEN_PORT, '0.0.0.0', () => {
  console.log(`[proxy] CraftyNOS MC Proxy listening on port ${LISTEN_PORT}`);
  console.log(`[proxy] Routing by Docker label: mc.domain`);
});

server.on('error', (err) => {
  console.error('[proxy] Server error:', err.message);
  process.exit(1);
});
