"use client";

import { useEffect, useState } from "react";
import { Cpu, MemoryStick } from "lucide-react";
import { io, Socket } from "socket.io-client";

interface ServerStatsProps {
  serverId: string;
}

export function ServerStats({ serverId }: ServerStatsProps) {
  const [cpu, setCpu] = useState<number>(0);
  const [ram, setRam] = useState<number>(0);
  const [ramLimit, setRamLimit] = useState<number>(0);
  const [status, setStatus] = useState<string>("OFFLINE");

  useEffect(() => {
    const socket: Socket = io("http://localhost:4000");

    socket.on("connect", () => {
      socket.emit("joinServerConsole", serverId);
    });

    socket.on("stats", (data: any) => {
      if (data.status === 'OFFLINE') {
        setStatus('OFFLINE');
        setCpu(0);
        setRam(0);
        return;
      }
      
      setStatus('ONLINE');
      setCpu(data.cpuPercent || 0);
      setRam(data.memoryUsage ? data.memoryUsage / 1024 / 1024 : 0); // Convert bytes to MB
      setRamLimit(data.memoryLimit ? data.memoryLimit / 1024 / 1024 : 0);
    });

    return () => {
      socket.disconnect();
    };
  }, [serverId]);

  const ramPercent = ramLimit > 0 ? (ram / ramLimit) * 100 : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
      
      {/* CPU Usage Card */}
      <div className="bg-apple-canvas border border-apple-hairline rounded-[18px] p-6 space-y-4 select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-zinc-500 font-semibold text-xs uppercase tracking-wider">
            <Cpu className="h-4 w-4 text-apple-primary" />
            <span>CPU Load</span>
          </div>
          <span className={`h-1.5 w-1.5 rounded-full ${status === 'ONLINE' ? 'bg-green-500' : 'bg-zinc-400'}`} />
        </div>
        <div className="space-y-1">
          <div className="text-[28px] font-bold text-apple-ink font-mono tracking-tight leading-none">
            {cpu.toFixed(1)}<span className="text-lg font-medium text-zinc-400">%</span>
          </div>
          <p className="text-[12px] text-zinc-400">Total Docker CPU resource slice</p>
        </div>
        <div className="h-1.5 w-full bg-apple-divider-soft rounded-full overflow-hidden">
          <div 
            className="h-full bg-apple-primary rounded-full transition-all duration-300" 
            style={{ width: `${Math.min(cpu, 100)}%` }} 
          />
        </div>
      </div>

      {/* Memory Utilization Card */}
      <div className="bg-apple-canvas border border-apple-hairline rounded-[18px] p-6 space-y-4 select-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-zinc-500 font-semibold text-xs uppercase tracking-wider">
            <MemoryStick className="h-4 w-4 text-apple-ink" />
            <span>Memory Allocation</span>
          </div>
          <span className={`h-1.5 w-1.5 rounded-full ${status === 'ONLINE' ? 'bg-green-500' : 'bg-zinc-400'}`} />
        </div>
        <div className="space-y-1">
          <div className="text-[28px] font-bold text-apple-ink font-mono tracking-tight leading-none">
            {ram.toFixed(0)}<span className="text-lg font-medium text-zinc-400"> MB</span>
          </div>
          <p className="text-[12px] text-zinc-400">Limit: {ramLimit > 0 ? `${ramLimit.toFixed(0)} MB` : 'Dynamic'}</p>
        </div>
        <div className="h-1.5 w-full bg-apple-divider-soft rounded-full overflow-hidden">
          <div 
            className="h-full bg-apple-ink rounded-full transition-all duration-300" 
            style={{ width: `${Math.min(ramPercent, 100)}%` }} 
          />
        </div>
      </div>

    </div>
  );
}
