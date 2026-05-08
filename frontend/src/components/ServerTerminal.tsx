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
  const [commandInput, setCommandInput] = useState("");

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm.js in read-only mode for reliable log display
    const term = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      convertEol: true, // Crucial for properly formatting \n to \r\n
      disableStdin: true, // Disable keyboard echo inputs on viewport itself
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
      term.write(data);
    });

    newSocket.on("disconnect", () => {
      term.writeln("\x1b[31m[CraftyNOS] Disconnected from gateway.\x1b[0m");
    });

    return () => {
      window.removeEventListener("resize", onResize);
      newSocket.disconnect();
      term.dispose();
    };
  }, [serverId]);

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socket || commandInput.trim() === "") return;
    
    // Emit command to virtual container stdin
    socket.emit("sendCommand", { serverId, command: commandInput });
    setCommandInput("");
  };

  return (
    <div className="w-full flex flex-col bg-zinc-900">
      {/* Read-only logs viewport wrapper */}
      <div className="w-full h-[400px] overflow-hidden bg-zinc-900 p-4">
        <div ref={terminalRef} className="w-full h-full" />
      </div>

      {/* Separate terminal command sending bar */}
      <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center space-x-3">
        <div className="text-zinc-500 font-mono text-sm pl-1 select-none">
          $
        </div>
        <form onSubmit={handleSendCommand} className="flex-1 flex space-x-3">
          <input 
            type="text"
            placeholder="Type a server command (e.g. /help, list, say Hello, op)..."
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            className="flex-1 h-10 px-4 bg-zinc-900 border border-zinc-800 rounded-[11px] text-white text-[14px] font-mono focus:outline-none focus:ring-1 focus:ring-apple-primary-on-dark focus:border-transparent transition-all placeholder-zinc-600"
          />
          <button 
            type="submit"
            className="bg-apple-primary hover:bg-apple-primary-focus text-white text-xs md:text-sm font-semibold h-10 px-5 rounded-full active-scale transition-all flex items-center justify-center space-x-1.5 shadow-sm"
          >
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
