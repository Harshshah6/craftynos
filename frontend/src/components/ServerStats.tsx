"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu, MemoryStick, HardDrive } from "lucide-react";
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
    <Card className="col-span-2 border-gray-200 dark:border-gray-800">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          Live Resources
          <div className={`h-2 w-2 rounded-full ${status === 'ONLINE' ? 'bg-green-500' : 'bg-red-500'}`} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CPU Stats */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 text-gray-500 font-semibold">
              <Cpu className="h-4 w-4" />
              <span>CPU Usage</span>
            </div>
            <span className="font-mono">{cpu.toFixed(2)}%</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden dark:bg-gray-800">
            <div 
              className="h-full bg-blue-500 transition-all duration-500" 
              style={{ width: `${Math.min(cpu, 100)}%` }} 
            />
          </div>
        </div>

        {/* RAM Stats */}
        <div className="space-y-2">
          <div className="flex flex-wrap justify-between text-sm">
            <div className="flex items-center space-x-2 text-gray-500 font-semibold">
              <MemoryStick className="h-4 w-4" />
              <span>Memory</span>
            </div>
            <span className="font-mono">
              {ram.toFixed(0)} MB / {ramLimit > 0 ? ramLimit.toFixed(0) : '???'} MB
            </span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden dark:bg-gray-800">
            <div 
              className="h-full bg-purple-500 transition-all duration-500" 
              style={{ width: `${Math.min(ramPercent, 100)}%` }} 
            />
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
