"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Play, Square, RefreshCw, Power } from "lucide-react";
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileManager } from "@/components/FileManager";

import { ServerStats } from "@/components/ServerStats";
import { ServerPropertiesEditor } from "@/components/ServerPropertiesEditor";

const ServerTerminal = dynamic(() => import("@/components/ServerTerminal").then(mod => mod.ServerTerminal), { ssr: false });

export default function ServerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [server, setServer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchServer();
  }, []);

  const fetchServer = async () => {
    try {
      const res = await fetch(`http://localhost:4000/servers/${params.id}`);
      const data = await res.json();
      setServer(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePowerAction = async (action: 'start' | 'stop' | 'kill') => {
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/servers/${params.id}/power`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await fetchServer(); // Refresh status
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!server) {
    return <div className="p-8">Server not found</div>;
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{server.name}</h1>
        <div className={`px-4 py-2 rounded-full font-bold text-sm ${server.status === 'ONLINE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {server.status}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Power Actions */}
        <Card className="col-span-1 border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">Power Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full justify-start bg-green-600 hover:bg-green-700"
              onClick={() => handlePowerAction('start')}
              disabled={actionLoading || server.status === 'ONLINE'}
            >
              <Play className="mr-2 h-4 w-4" /> Start
            </Button>
            <Button
              className="w-full justify-start bg-yellow-600 hover:bg-yellow-700"
              onClick={() => handlePowerAction('stop')}
              disabled={actionLoading || server.status === 'OFFLINE'}
            >
              <Square className="mr-2 h-4 w-4" /> Stop
            </Button>
            <Button
              className="w-full justify-start bg-red-600 hover:bg-red-700"
              onClick={() => handlePowerAction('kill')}
              disabled={actionLoading || server.status === 'OFFLINE'}
            >
              <Power className="mr-2 h-4 w-4" /> Kill
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handlePowerAction('start')} // Simplistic restart for now
              disabled={actionLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Restart
            </Button>
          </CardContent>
        </Card>

        <div className="col-span-2 grid gap-6">
          {/* Server Info */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Server Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 font-semibold">Address</p>
                  <p className="font-mono ">{server.domain}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Real-time Stats */}
          <ServerStats serverId={params.id as string} />
        </div>

      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="console" className="mt-8">
        <TabsList className="grid w-full grid-cols-3 md:w-[600px]">
          <TabsTrigger value="console">Console</TabsTrigger>
          <TabsTrigger value="files">File Manager</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="console" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Console</CardTitle>
            </CardHeader>
            <CardContent>
              <ServerTerminal serverId={params.id as string} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>File Manager</CardTitle>
            </CardHeader>
            <CardContent>
              <FileManager serverId={params.id as string} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Server Settings (server.properties)</CardTitle>
            </CardHeader>
            <CardContent>
              <ServerPropertiesEditor serverId={params.id as string} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
