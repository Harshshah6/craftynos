"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Square, RefreshCw, Power, Trash2, Server as ServerIcon, HardDrive, Terminal as TermIcon, Settings, Upload, Palette, AlertCircle, CheckCircle2 } from "lucide-react";
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileManager } from "@/components/FileManager";
import { ServerStats } from "@/components/ServerStats";
import { ServerPropertiesEditor } from "@/components/ServerPropertiesEditor";
import { useAuth } from "@/components/auth-provider";

const ServerTerminal = dynamic(() => import("@/components/ServerTerminal").then(mod => mod.ServerTerminal), { ssr: false });

type ServerStatus = 'ONLINE' | 'OFFLINE' | 'STARTING' | 'RESTARTING' | 'CRASHED';

const STATUS_CONFIG: Record<ServerStatus, { label: string; bg: string; text: string; pulse: boolean }> = {
  ONLINE:     { label: 'Online',     bg: 'bg-green-50/80 border-green-200',   text: 'text-green-700',   pulse: false },
  OFFLINE:    { label: 'Offline',    bg: 'bg-zinc-50 border-zinc-200',         text: 'text-zinc-600',     pulse: false },
  STARTING:   { label: 'Starting…',  bg: 'bg-blue-50/80 border-blue-200 animate-pulse',     text: 'text-blue-700',     pulse: true  },
  RESTARTING: { label: 'Restarting…',bg: 'bg-amber-50/80 border-amber-200 animate-pulse', text: 'text-amber-700', pulse: true  },
  CRASHED:    { label: 'Crashed',    bg: 'bg-red-50/80 border-red-200',       text: 'text-red-700',       pulse: false },
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
  const [showBrandingRestartButton, setShowBrandingRestartButton] = useState(false);
  const brandingRestartTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // ── Branding States ──────────────────────────────────────────────────────
  const [propertiesContent, setPropertiesContent] = useState("");
  const [motd, setMotd] = useState("");
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [iconBase64, setIconBase64] = useState<string | null>(null);
  const [brandingMessage, setBrandingMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // ── Initial server fetch ───────────────────────────────────────────────
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

  // ── Branding Restart Timer Cleanups ─────────────────────────────────────
  useEffect(() => {
    return () => {
      if (brandingRestartTimerRef.current) {
        clearTimeout(brandingRestartTimerRef.current);
      }
    };
  }, []);

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
      // silently ignore
    }
  };

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);
    pollStatus();
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
    return stopPolling;
  }, [params.id, token]);

  // Load Server Branding properties & icon
  useEffect(() => {
    if (!token || !params.id) return;

    const loadBranding = async () => {
      try {
        // 1. Fetch server.properties
        const propRes = await fetch(`http://localhost:4000/servers/${params.id}/files/read?path=server.properties`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (propRes.ok) {
          const propData = await propRes.json();
          if (propData.success && propData.content) {
            setPropertiesContent(propData.content);
            const match = propData.content.match(/^motd=(.*)$/m);
            if (match) {
              setMotd(match[1]);
            }
          }
        }
      } catch (err) {
        console.error("Error loading server.properties for branding:", err);
      }

      try {
        // 2. Fetch server-icon.png as base64
        const iconRes = await fetch(`http://localhost:4000/servers/${params.id}/files/read?path=server-icon.png&encoding=base64`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (iconRes.ok) {
          const iconData = await iconRes.json();
          if (iconData.success && iconData.content) {
            setIconBase64(iconData.content);
          }
        }
      } catch (err) {
        console.log("No server-icon.png found or failed to load:", err);
      }
    };

    loadBranding();
  }, [params.id, token]);

  const triggerRestartIndicator = () => {
    if (brandingRestartTimerRef.current) {
      clearTimeout(brandingRestartTimerRef.current);
    }
    setShowBrandingRestartButton(true);
    brandingRestartTimerRef.current = setTimeout(() => {
      setShowBrandingRestartButton(false);
    }, 15000);
  };

  // ── Branding Actions ─────────────────────────────────────────────────────
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBrandingSaving(true);
    setBrandingMessage(null);

    try {
      // 1. Fetch latest server.properties first to prevent overwriting
      let currentContent = propertiesContent;
      const readRes = await fetch(`http://localhost:4000/servers/${params.id}/files/read?path=server.properties`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (readRes.ok) {
        const readData = await readRes.json();
        if (readData.success && readData.content) {
          currentContent = readData.content;
        }
      }

      // 2. Modify MOTD in properties
      const hasMotd = /^motd=/m.test(currentContent);
      let updatedContent = "";
      if (hasMotd) {
        updatedContent = currentContent.replace(/^motd=.*$/m, `motd=${motd}`);
      } else {
        updatedContent = currentContent + `\nmotd=${motd}`;
      }
      setPropertiesContent(updatedContent);

      // 3. Write back server.properties
      const writeRes = await fetch(`http://localhost:4000/servers/${params.id}/files/write`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          path: "server.properties",
          content: updatedContent
        })
      });

      if (writeRes.ok) {
        setBrandingMessage({ type: 'success', text: 'Server MOTD updated successfully!' });
        triggerRestartIndicator();
      } else {
        setBrandingMessage({ type: 'error', text: 'Failed to write server.properties' });
      }
    } catch (err: any) {
      console.error(err);
      setBrandingMessage({ type: 'error', text: 'Error saving branding: ' + err.message });
    } finally {
      setBrandingSaving(false);
    }
  };

  const handleBrandingRestart = async () => {
    if (brandingRestartTimerRef.current) {
      clearTimeout(brandingRestartTimerRef.current);
    }
    setShowBrandingRestartButton(false);
    await handlePowerAction('restart');
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    setBrandingSaving(true);
    setBrandingMessage(null);

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      // Create HTML canvas to crop and resize to exactly 64x64 PNG (Minecraft multiplayer specs)
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw 1:1 centered crop
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 64, 64);
        
        // Convert canvas image to Base64 payload string
        const dataUrl = canvas.toDataURL("image/png");
        const base64Payload = dataUrl.split(",")[1];

        // Upload to server-icon.png using base64 encoding scheme
        const upload = async () => {
          try {
            const res = await fetch(`http://localhost:4000/servers/${params.id}/files/write`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({
                path: "server-icon.png",
                content: base64Payload,
                encoding: "base64"
              })
            });

            if (res.ok) {
              setIconBase64(base64Payload);
              setBrandingMessage({ type: 'success', text: 'Server icon updated successfully (64x64 PNG)!' });
              triggerRestartIndicator();
            } else {
              setBrandingMessage({ type: 'error', text: 'Failed to write server-icon.png' });
            }
          } catch (err: any) {
            console.error(err);
            setBrandingMessage({ type: 'error', text: 'Error uploading server icon: ' + err.message });
          } finally {
            setBrandingSaving(false);
          }
        };

        upload();
      }
    };
  };

  // ── Power actions ────────────────────────────────────────────────────────
  const handlePowerAction = async (action: 'start' | 'stop' | 'kill' | 'restart') => {
    if (!token) return;
    setActionLoading(true);
    stopPolling();
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
      startPolling();
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
      <div className="flex h-screen flex-col items-center justify-center space-y-4 bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-apple-primary" />
        <p className="text-sm font-mono text-zinc-500">Querying container details...</p>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white space-y-4">
        <h1 className="text-2xl font-semibold text-zinc-900">Server Not Found</h1>
        <p className="text-sm text-zinc-500">The requested container does not exist or has been deleted.</p>
        <Button onClick={() => router.push("/")} className="rounded-full bg-apple-primary">Back to dashboard</Button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.OFFLINE;

  // Custom Power Actions Component rendered inside sticky Navbar
  const navbarActions = (
    <div className="flex items-center space-x-1.5 md:space-x-2">
      {/* status dot indicator */}
      <span className={`hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.text}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${status === 'ONLINE' ? 'bg-green-500' : status === 'CRASHED' ? 'bg-red-500' : status === 'STARTING' || status === 'RESTARTING' ? 'bg-amber-500 animate-pulse' : 'bg-zinc-400'}`} />
        <span>{statusCfg.label}</span>
      </span>

      {/* Start Button */}
      <button
        onClick={() => handlePowerAction('start')}
        disabled={actionLoading || status === 'ONLINE' || status === 'STARTING'}
        className="h-8 md:h-9 px-3.5 rounded-full text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-30 disabled:pointer-events-none active-scale transition-all flex items-center space-x-1 shadow-sm"
        title="Start Server"
      >
        <Play className="h-3.5 w-3.5 fill-white" />
        <span className="hidden md:inline">Start</span>
      </button>

      {/* Stop Button */}
      <button
        onClick={() => handlePowerAction('stop')}
        disabled={actionLoading || status === 'OFFLINE'}
        className="h-8 md:h-9 px-3.5 rounded-full text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-30 disabled:pointer-events-none active-scale transition-all flex items-center space-x-1 shadow-sm"
        title="Stop Server"
      >
        <Square className="h-3 w-3 fill-white" />
        <span className="hidden md:inline">Stop</span>
      </button>

      {/* Restart Button */}
      <button
        onClick={() => handlePowerAction('restart')}
        disabled={actionLoading || status === 'OFFLINE'}
        className="h-8 md:h-9 w-8 md:w-9 rounded-full text-zinc-600 hover:text-zinc-900 border border-zinc-300 hover:bg-zinc-100 disabled:opacity-30 disabled:pointer-events-none active-scale transition-all flex items-center justify-center"
        title="Restart Server"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${status === 'RESTARTING' ? 'animate-spin' : ''}`} />
      </button>

      {/* Trash/Delete Button */}
      {!deleteConfirm ? (
        <button
          onClick={() => setDeleteConfirm(true)}
          className="h-8 md:h-9 w-8 md:w-9 rounded-full text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-30 disabled:pointer-events-none active-scale transition-all flex items-center justify-center"
          title="Delete Server"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : (
        <div className="flex items-center space-x-1 bg-red-50 border border-red-200 px-1.5 py-1 rounded-full animate-in fade-in slide-in-from-right-3 duration-200">
          <button
            onClick={handleDeleteServer}
            disabled={actionLoading}
            className="text-[10px] md:text-xs text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-full font-medium"
          >
            Confirm
          </button>
          <button
            onClick={() => setDeleteConfirm(false)}
            className="text-[10px] md:text-xs text-zinc-500 hover:text-zinc-800 px-3 py-1 rounded-full font-medium"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-apple-canvas">
      {/* Navigation */}
      <Navbar title={server.name} actions={navbarActions} />

      {/* Section 1: Hero & Real-time Resources Monitor (Full-bleed parchment, low density, centered grid) */}
      <section className="bg-apple-canvas-parchment py-12 md:py-16 px-6 border-b border-apple-hairline">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Metadata Display */}
          <div className="md:col-span-1 space-y-5 self-center">
            <span className="inline-block text-[11px] font-semibold text-apple-primary tracking-wider uppercase bg-apple-surface-pearl px-3 py-1 border border-apple-hairline rounded-full">
              Host Specifications
            </span>
            <div className="space-y-2 pt-1">
              <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Address Connection</h3>
              <p className="font-mono text-[17px] text-apple-ink font-medium tracking-tight bg-white px-3.5 py-2 border border-zinc-200 rounded-[11px] select-all">
                {server.domain}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div>
                <h4 className="text-zinc-400 text-[11px] font-semibold uppercase tracking-wider">Allocation Limit</h4>
                <p className="text-[15px] font-semibold text-apple-ink">{server.memory} MB RAM</p>
              </div>
              <div>
                <h4 className="text-zinc-400 text-[11px] font-semibold uppercase tracking-wider">Container Status</h4>
                <p className="text-[15px] font-semibold text-apple-ink flex items-center space-x-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${status === 'ONLINE' ? 'bg-green-500' : 'bg-zinc-400'}`} />
                  <span className="capitalize">{status.toLowerCase()}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Live Charts (Takes remaining columns) */}
          <div className="md:col-span-2">
            <ServerStats serverId={params.id as string} />
          </div>

        </div>
      </section>

      {/* Section 1.5: Server Identity & Branding (Quick Editor) */}
      <section className="bg-apple-canvas py-16 px-6 border-b border-apple-hairline">
        <div className="max-w-[1200px] mx-auto space-y-8">
          
          {/* Section Header */}
          <div className="text-center md:text-left space-y-2">
            <span className="text-[11px] font-semibold text-apple-primary tracking-wider uppercase bg-apple-surface-pearl px-3 py-1 border border-apple-hairline rounded-full inline-block">
              Server Identity
            </span>
            <h2 className="text-2xl md:text-3xl font-semibold text-apple-ink tracking-apple-tight">Branding & Personalization</h2>
            <p className="text-[14px] text-zinc-500 max-w-lg">Customize your Minecraft server's MOTD nameplate and lobby listing icon in real time.</p>
          </div>

          {/* Status Message */}
          {brandingMessage && (
            <div className={`p-4 rounded-[14px] flex items-center space-x-3 text-sm border ${
              brandingMessage.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {brandingMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}
              <span>{brandingMessage.text}</span>
            </div>
          )}

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Column 1: Server Icon (1:1 Upload & Resize to 64x64 PNG) */}
            <div className="bg-apple-canvas-parchment border border-apple-hairline rounded-[18px] p-6 space-y-5 flex flex-col items-center justify-between text-center">
              <div className="space-y-2 w-full">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Server Icon</span>
                <p className="text-xs text-zinc-500">Minecraft multiplayer lists display this logo alongside your server listing address.</p>
              </div>

              {/* Icon Image Frame */}
              <div className="h-28 w-28 rounded-[18px] overflow-hidden bg-white border border-apple-hairline flex items-center justify-center shadow-inner relative group">
                {iconBase64 ? (
                  <img 
                    src={`data:image/png;base64,${iconBase64}`} 
                    alt="Minecraft Server Icon" 
                    className="h-full w-full object-cover" 
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-1 text-zinc-400 font-semibold text-center p-2">
                    <ServerIcon className="h-8 w-8 text-zinc-300" />
                    <span className="text-[10px]">No Custom Logo</span>
                  </div>
                )}
              </div>

              {/* Upload Input & Button */}
              <div className="w-full">
                <input 
                  type="file" 
                  id="server-icon-file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleIconUpload}
                  disabled={brandingSaving}
                />
                <label 
                  htmlFor="server-icon-file"
                  className={`w-full inline-flex h-9 items-center justify-center space-x-1.5 rounded-full border border-zinc-300 hover:border-zinc-400 bg-white text-xs font-semibold text-zinc-700 hover:text-zinc-900 shadow-sm cursor-pointer active-scale transition-all ${
                    brandingSaving ? 'opacity-50 pointer-events-none' : ''
                  }`}
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload Logo (1:1)</span>
                </label>
                <span className="text-[10px] text-zinc-400 block mt-2 leading-normal">
                  Resized to standard 64×64 PNG in your browser to match Minecraft network specifications.
                </span>
              </div>
            </div>

            {/* Column 2 & 3: MOTD Editor & Live Multiplayer Preview */}
            <div className="lg:col-span-2 bg-apple-canvas-parchment border border-apple-hairline rounded-[18px] p-6 flex flex-col justify-between space-y-6">
              
              {/* MOTD Input Field */}
              <form onSubmit={handleSaveBranding} className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="motd-input" className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                      Message of the Day (MOTD)
                    </label>
                    <span className="text-[10px] text-zinc-400">{motd.length}/120 characters</span>
                  </div>
                  <input 
                    id="motd-input"
                    type="text"
                    maxLength={120}
                    placeholder="Enter server description (e.g. A Minecraft Server, Survival Server)..."
                    value={motd}
                    onChange={(e) => setMotd(e.target.value)}
                    className="w-full h-10 px-4 bg-white border border-zinc-200 rounded-[11px] text-[14px] font-mono focus:outline-none focus:ring-1 focus:ring-apple-primary focus:border-transparent transition-all placeholder-zinc-400"
                    disabled={brandingSaving}
                  />
                </div>

                {/* Live Multiplayer Lobby Simulation */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                    Lobby Multiplayer Screen Preview
                  </span>
                  
                  {/* Minecraft List Row simulation */}
                  <div className="bg-[#121214] border border-zinc-800 rounded-[14px] p-4 flex items-center space-x-4 select-none relative group transition-all">
                    {/* Simulated Icon */}
                    <div className="h-12 w-12 rounded-[6px] overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                      {iconBase64 ? (
                        <img 
                          src={`data:image/png;base64,${iconBase64}`} 
                          alt="Server Icon Preview" 
                          className="h-full w-full object-cover" 
                        />
                      ) : (
                        <div className="h-full w-full bg-zinc-800 flex flex-col items-center justify-center text-zinc-600 font-bold text-[10px]">
                          <span>64×64</span>
                        </div>
                      )}
                    </div>

                    {/* Server Text Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-mono text-[14px] font-bold text-[#fafafa] truncate tracking-wide">
                          {server?.name || "CraftyNOS Server"}
                        </h4>
                        <span className="text-green-500 font-mono text-[11px] font-bold">0/20</span>
                      </div>
                      <p className="font-mono text-zinc-400 text-xs truncate mt-1 leading-none tracking-wide text-left">
                        {motd || "A Minecraft Server"}
                      </p>
                    </div>

                    {/* Simulated Connectivity bars */}
                    <div className="flex flex-col items-center justify-center shrink-0 pl-2">
                      <div className="flex items-end space-x-[2px] h-3.5">
                        <span className="w-[3px] h-1.5 bg-green-500 rounded-sm" />
                        <span className="w-[3px] h-2 bg-green-500 rounded-sm" />
                        <span className="w-[3px] h-2.5 bg-green-500 rounded-sm" />
                        <span className="w-[3px] h-3 bg-green-500 rounded-sm" />
                        <span className="w-[3px] h-3.5 bg-green-500 rounded-sm animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Trigger button & Round Restart Indicator */}
                <div className="flex justify-end items-center space-x-3 pt-2">
                  {showBrandingRestartButton && (
                    <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-right-4 duration-300">
                      <span className="text-[10px] md:text-xs font-semibold text-amber-600 animate-pulse">
                        Restart to apply branding:
                      </span>
                      <button
                        type="button"
                        onClick={handleBrandingRestart}
                        disabled={actionLoading}
                        title="Instant Reboot Server"
                        className="h-9 w-9 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center relative shadow-md active-scale transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 group cursor-pointer"
                      >
                        <span className="absolute -inset-0.5 rounded-full border border-amber-500/50 animate-ping opacity-75 pointer-events-none" />
                        <RefreshCw className="h-4 w-4 relative z-10" />
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-900 text-[10px] text-white px-2 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20 font-sans">
                          Restart Now
                        </span>
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={brandingSaving || !motd.trim()}
                    className="bg-apple-primary hover:bg-apple-primary-focus text-white text-xs font-semibold h-9 px-5 rounded-full active-scale transition-all flex items-center space-x-1.5 disabled:opacity-50 disabled:pointer-events-none shadow-sm cursor-pointer"
                  >
                    {brandingSaving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Palette className="h-3.5 w-3.5" />
                        <span>Save Branding</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>

          </div>

        </div>
      </section>

      {/* Section 2: Interactive Terminal & Console (Full-bleed dark surface, command console styled as a custom terminal chassis) */}
      <section className="bg-apple-surface-tile-1 py-16 px-6 border-b border-apple-surface-tile-3">
        <div className="max-w-[1200px] mx-auto space-y-6">
          <div className="text-center md:text-left space-y-2">
            <span className="text-[11px] font-semibold text-apple-primary-on-dark tracking-wider uppercase bg-zinc-900/60 px-3 py-1 border border-zinc-800 rounded-full inline-block">
              Live Output CLI
            </span>
            <h2 className="text-2xl md:text-3xl font-semibold text-apple-canvas tracking-apple-tight">Orchestrator Terminal</h2>
            <p className="text-[14px] text-zinc-400 max-w-lg">Execute system-level commands, monitor cluster startup dumps, and send console overrides.</p>
          </div>

          {/* Terminal Chassis container mimicking a macOS window frame */}
          <div className="border border-zinc-800 bg-[#1e1e1e] rounded-[18px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
            {/* Terminal Window Header Bar */}
            <div className="h-10 bg-[#1a1a1c] border-b border-zinc-900 px-4 flex items-center justify-between select-none">
              {/* Window Controls Dot buttons */}
              <div className="flex space-x-2">
                <span className="h-3 w-3 rounded-full bg-red-500/80 inline-block" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="h-3 w-3 rounded-full bg-green-500/80 inline-block" />
              </div>
              <span className="text-xs font-mono text-zinc-500">guest@craftynos:~</span>
              <div className="w-10" /> {/* empty spacer */}
            </div>

            {/* Core xterm component */}
            <div className="p-1">
              <ServerTerminal serverId={params.id as string} />
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: File Manager & Configurator (Full-bleed pure white section) */}
      <section className="bg-apple-canvas py-16 px-6 flex-1">
        <div className="max-w-[1200px] mx-auto space-y-8">
          
          <Tabs defaultValue="files" className="w-full">
            {/* Custom styled segmented pill selector triggers */}
            <div className="flex justify-center mb-10">
              <TabsList className="bg-apple-canvas-parchment border border-apple-hairline p-1 rounded-full flex space-x-1 max-w-lg w-full">
                <TabsTrigger 
                  value="files" 
                  className="flex-1 rounded-full py-2 text-xs md:text-[13px] font-semibold text-zinc-500 data-[state=active]:bg-apple-canvas data-[state=active]:text-apple-ink data-[state=active]:shadow-sm transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <HardDrive className="h-3.5 w-3.5" />
                  <span>File Manager</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="config" 
                  className="flex-1 rounded-full py-2 text-xs md:text-[13px] font-semibold text-zinc-500 data-[state=active]:bg-apple-canvas data-[state=active]:text-apple-ink data-[state=active]:shadow-sm transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span>Configuration</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab content 1: File Manager */}
            <TabsContent value="files" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <div className="space-y-4">
                <div className="space-y-1 text-center md:text-left mb-6">
                  <h3 className="text-[21px] font-semibold text-apple-ink tracking-apple-tight flex items-center justify-center md:justify-start space-x-2">
                    <HardDrive className="h-5 w-5 text-apple-primary" />
                    <span>Live File Hierarchy</span>
                  </h3>
                  <p className="text-[14px] text-zinc-500">Edit core configurations, properties, or upload custom plugins directly in the sandboxed directories.</p>
                </div>
                <div className="border border-zinc-200 rounded-[18px] p-6 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
                  <FileManager serverId={params.id as string} />
                </div>
              </div>
            </TabsContent>

            {/* Tab content 2: Configurations properties editor */}
            <TabsContent value="config" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <div className="space-y-4">
                <div className="space-y-1 text-center md:text-left mb-6">
                  <h3 className="text-[21px] font-semibold text-apple-ink tracking-apple-tight flex items-center justify-center md:justify-start space-x-2">
                    <Settings className="h-5 w-5 text-apple-primary" />
                    <span>Server Parameters (server.properties)</span>
                  </h3>
                  <p className="text-[14px] text-zinc-500">Modify properties key-value mappings. Note that you must restart the container to inject live settings.</p>
                </div>
                <div className="border border-zinc-200 rounded-[18px] p-6 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.01)]">
                  <ServerPropertiesEditor 
                    serverId={params.id as string} 
                    onSaved={triggerRestartIndicator}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

        </div>
      </section>


    </div>
  );
}


