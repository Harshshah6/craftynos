"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Play, Square, RefreshCw, Power, Trash2 } from "lucide-react";
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileManager } from "@/components/FileManager";
import { ServerStats } from "@/components/ServerStats";
import { ServerPropertiesEditor } from "@/components/ServerPropertiesEditor";
import { useAuth } from "@/components/auth-provider";

const ServerTerminal = dynamic(() => import("@/components/ServerTerminal").then(mod => mod.ServerTerminal), { ssr: false });

type ServerStatus = 'ONLINE' | 'OFFLINE' | 'STARTING' | 'RESTARTING' | 'CRASHED';

const STATUS_CONFIG: Record<ServerStatus, { label: string; bg: string; text: string; pulse: boolean }> = {
  ONLINE:     { label: 'Online',     bg: 'bg-green-100 dark:bg-green-900/40',   text: 'text-green-700 dark:text-green-300',   pulse: false },
  OFFLINE:    { label: 'Offline',    bg: 'bg-gray-100 dark:bg-gray-800',         text: 'text-gray-600 dark:text-gray-400',     pulse: false },
  STARTING:   { label: 'Starting…',  bg: 'bg-blue-100 dark:bg-blue-900/40',     text: 'text-blue-700 dark:text-blue-300',     pulse: true  },
  RESTARTING: { label: 'Restarting…',bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300', pulse: true  },
  CRASHED:    { label: 'Crashed',    bg: 'bg-red-100 dark:bg-red-900/40',       text: 'text-red-700 dark:text-red-300',       pulse: false },
};

const POLL_INTERVAL_MS = 3000;

export default function ServerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [server, setServer] = useState<any>(null);
  const [status, setStatus] = useState<ServerStatus>('OFFLINE');
  const [dockerState, setDockerState] = useState<string>('unknown');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // ── Initial server fetch (name, domain, etc.) ──────────────────────────
  useEffect(() => {
    if (!token) return;

    const fetchServer = async () => {
      try {
        const res = await fetch(`http://localhost:4000/servers/${params.id}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        const data = await res.json();
        setServer(data);
        setStatus(data.status as ServerStatus);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchServer();
  }, [params.id, token]);

  // ── Status poller ───────────────────────────────────────────────────────
  const pollStatus = async () => {
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:4000/servers/${params.id}/status`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data.status as ServerStatus);
      setDockerState(data.dockerState ?? 'unknown');
    } catch {
      // silently ignore — network blip shouldn't break the UI
    }
  };

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);
    pollStatus(); // immediate first hit
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => {
    if (!token) return;
    startPolling();
    return stopPolling; // cleanup on unmount
  }, [params.id, token]);

  // ── Power actions ────────────────────────────────────────────────────────
  const handlePowerAction = async (action: 'start' | 'stop' | 'kill' | 'restart') => {
    if (!token) return;
    setActionLoading(true);
    stopPolling(); // pause polling during action
    // Optimistic transitional state
    setStatus(action === 'stop' || action === 'kill' ? 'OFFLINE' : action === 'restart' ? 'RESTARTING' : 'STARTING');
    try {
      await fetch(`http://localhost:4000/servers/${params.id}/power`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ action }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
      startPolling(); // resume — next poll will correct any wrong optimistic state
    }
  };

  // ── Server Deletion ──────────────────────────────────────────────────────
  const handleDeleteServer = async () => {
    if (!token) return;
    setActionLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/servers/${params.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        router.push("/");
      } else {
        alert("Failed to delete server");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to delete server");
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

  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.OFFLINE;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{server.name}</h1>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm ${statusCfg.bg} ${statusCfg.text}`}>
          {statusCfg.pulse
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <span className={`h-2 w-2 rounded-full ${status === 'ONLINE' ? 'bg-green-500' : status === 'CRASHED' ? 'bg-red-500' : 'bg-gray-400'}`} />
          }
          {statusCfg.label}
          {dockerState !== 'unknown' && dockerState !== status.toLowerCase() && (
            <span className="text-xs opacity-60 font-normal ml-1">({dockerState})</span>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        {/* Power Controls */}
        <Card className="col-span-1 border-gray-200 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg">Power Controls</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              className="w-full justify-start bg-green-600 hover:bg-green-700"
              onClick={() => handlePowerAction('start')}
              disabled={actionLoading || status === 'ONLINE' || status === 'STARTING'}
            >
              <Play className="mr-2 h-4 w-4" /> Start
            </Button>
            <Button
              className="w-full justify-start bg-yellow-600 hover:bg-yellow-700"
              onClick={() => handlePowerAction('stop')}
              disabled={actionLoading || status === 'OFFLINE'}
            >
              <Square className="mr-2 h-4 w-4" /> Stop
            </Button>
            <Button
              className="w-full justify-start bg-red-600 hover:bg-red-700"
              onClick={() => handlePowerAction('kill')}
              disabled={actionLoading || status === 'OFFLINE'}
            >
              <Power className="mr-2 h-4 w-4" /> Kill
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => handlePowerAction('restart')}
              disabled={actionLoading || status === 'OFFLINE'}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${status === 'RESTARTING' ? 'animate-spin' : ''}`} /> Restart
            </Button>

            {!deleteConfirm ? (
              <Button
                className="w-full justify-start mt-4 bg-red-600 hover:bg-red-700 dark:bg-red-950 dark:hover:bg-red-900"
                onClick={() => setDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Server
              </Button>
            ) : (
              <div className="space-y-2 mt-4 p-3 border border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 rounded-md">
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">This permanently destroys the container and all server files.</p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1 text-xs bg-red-600 hover:bg-red-700"
                    onClick={handleDeleteServer}
                    disabled={actionLoading}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
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


