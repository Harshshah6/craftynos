"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { io, Socket } from "socket.io-client";

interface ServerTerminalProps {
  serverId: string;
}

export function ServerTerminal({ serverId }: ServerTerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js
    const term = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      convertEol: true, // Crucial for properly formatting \n to \r\n
      disableStdin: false,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    // Handle window resize
    const onResize = () => fitAddon.fit();
    window.addEventListener("resize", onResize);

    // Connect to Backend WebSocket Gateway
    const newSocket = io("http://localhost:4000");
    setSocket(newSocket);

    newSocket.on("connect", () => {
      term.writeln("\x1b[32m[CraftyNOS] Connected to orchestrator gateway.\x1b[0m");
      newSocket.emit("joinServerConsole", serverId);
    });

    newSocket.on("log", (data: string) => {
      // Remove docker multiplexing headers if they leak through
      // A proper fix involves demultiplexing the buffer on the daemon side, but this is a simple fallback
      term.write(data);
    });

    newSocket.on("disconnect", () => {
      term.writeln("\x1b[31m[CraftyNOS] Disconnected from gateway.\x1b[0m");
    });

    // Handle user input
    let currentInput = "";
    term.onData((data) => {
      // Enter key
      if (data === "\r") {
        term.writeln("");
        if (currentInput.trim() !== "") {
          newSocket.emit("sendCommand", { serverId, command: currentInput });
        }
        currentInput = "";
      } 
      // Backspace
      else if (data === "\x7f") {
        if (currentInput.length > 0) {
          currentInput = currentInput.slice(0, -1);
          term.write("\b \b");
        }
      } 
      // Printable characters
      else if (data >= String.fromCharCode(0x20) && data <= String.fromCharCode(0x7e)) {
        currentInput += data;
        term.write(data);
      }
    });

    return () => {
      window.removeEventListener("resize", onResize);
      newSocket.disconnect();
      term.dispose();
    };
  }, [serverId]);

  return (
    <div className="w-full h-[500px] overflow-hidden rounded-md bg-[#1e1e1e] p-2">
      <div ref={terminalRef} className="w-full h-full" />
    </div>
  );
}
