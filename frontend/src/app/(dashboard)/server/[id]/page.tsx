"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Square, RefreshCw, Power, Trash2, Server as ServerIcon, HardDrive, Terminal as TermIcon, Settings, Upload, Palette, AlertCircle, CheckCircle2, Type, Globe, Users, Shield, LayoutDashboard, UserMinus, UserPlus, FolderOpen, Cpu } from "lucide-react";
import dynamic from 'next/dynamic';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileManager } from "@/components/FileManager";
import { ServerStats } from "@/components/ServerStats";
import { ServerPropertiesEditor } from "@/components/ServerPropertiesEditor";
import { useAuth } from "@/components/auth-provider";

const ServerTerminal = dynamic(() => import("@/components/ServerTerminal").then(mod => mod.ServerTerminal), { ssr: false });

type ServerStatus = 'ONLINE' | 'OFFLINE' | 'STARTING' | 'RESTARTING' | 'CRASHED';

const STATUS_CONFIG: Record<ServerStatus, { label: string; bg: string; text: string; pulse: boolean }> = {
  ONLINE: { label: 'Online', bg: 'bg-green-50/80 border-green-200', text: 'text-green-700', pulse: false },
  OFFLINE: { label: 'Offline', bg: 'bg-zinc-50 border-zinc-200', text: 'text-zinc-600', pulse: false },
  STARTING: { label: 'Starting…', bg: 'bg-blue-50/80 border-blue-200 animate-pulse', text: 'text-blue-700', pulse: true },
  RESTARTING: { label: 'Restarting…', bg: 'bg-amber-50/80 border-amber-200 animate-pulse', text: 'text-amber-700', pulse: true },
  CRASHED: { label: 'Crashed', bg: 'bg-red-50/80 border-red-200', text: 'text-red-700', pulse: false },
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

  // ── Rename & Redomain States ─────────────────────────────────────────────
  const [editName, setEditName] = useState("");
  const [editSubdomain, setEditSubdomain] = useState("");
  const [renameSaving, setRenameSaving] = useState(false);
  const [renameMessage, setRenameMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // ── Active Navigation State ──────────────────────────────────────────────
  type ActiveView = 'dashboard' | 'console' | 'players' | 'files' | 'config' | 'branding';
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');

  // ── Player Management States ─────────────────────────────────────────────
  const [operators, setOperators] = useState<{ uuid: string; name: string }[]>([]);
  const [whitelist, setWhitelist] = useState<{ uuid: string; name: string }[]>([]);
  const [bannedPlayers, setBannedPlayers] = useState<{ uuid: string; name: string; reason?: string }[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [playerActionLoading, setPlayerActionLoading] = useState<string | null>(null);
  const [playerMessage, setPlayerMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [opUsernameInput, setOpUsernameInput] = useState("");
  const [whitelistUsernameInput, setWhitelistUsernameInput] = useState("");
  const [banUsernameInput, setBanUsernameInput] = useState("");
  const [banReasonInput, setBanReasonInput] = useState("");

  const fetchPlayersData = async () => {
    if (!token) return;
    setPlayersLoading(true);
    setPlayerMessage(null);
    try {
      const fetchFileSafe = async (filename: string) => {
        try {
          const res = await fetch(`http://localhost:4000/servers/${params.id}/files/read?path=${filename}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            return JSON.parse(data.content);
          }
        } catch {}
        return [];
      };

      const [opsData, whitelistData, bannedData] = await Promise.all([
        fetchFileSafe('ops.json'),
        fetchFileSafe('whitelist.json'),
        fetchFileSafe('banned-players.json')
      ]);

      setOperators(Array.isArray(opsData) ? opsData : []);
      setWhitelist(Array.isArray(whitelistData) ? whitelistData : []);
      setBannedPlayers(Array.isArray(bannedData) ? bannedData : []);
    } catch (err) {
      console.error("Failed to fetch player files:", err);
    } finally {
      setPlayersLoading(false);
    }
  };

  useEffect(() => {
    if (activeView === 'players') {
      fetchPlayersData();
    }
  }, [activeView]);

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
        setEditName(data.name || "");
        if (data.domain) {
          setEditSubdomain(data.domain.replace(".lulli.qzz.io", ""));
        }
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

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setRenameSaving(true);
    setRenameMessage(null);

    try {
      const res = await fetch(`http://localhost:4000/servers/${params.id}/rename`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          domain: editSubdomain
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setRenameMessage({ type: 'success', text: 'Server settings updated successfully!' });

        const oldDomain = server.domain;
        setServer(data.server);
        if (data.server.domain) {
          setEditSubdomain(data.server.domain.replace(".lulli.qzz.io", ""));
        }

        // Trigger reboot alert if domain changed and container is online
        if (data.server.domain !== oldDomain && status === 'ONLINE') {
          triggerRestartIndicator();
        }
      } else {
        setRenameMessage({ type: 'error', text: data.message || 'Failed to update server configuration' });
      }
    } catch (err: any) {
      console.error(err);
      setRenameMessage({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setRenameSaving(false);
    }
  };

  // ── Players Management Command executions ───────────────────────────────
  const handlePlayerCommand = async (command: string, actionKey: string, successMsg: string) => {
    if (!token) return;
    setPlayerActionLoading(actionKey);
    setPlayerMessage(null);
    try {
      const res = await fetch(`http://localhost:4000/servers/${params.id}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ command })
      });
      if (res.ok) {
        setPlayerMessage({ type: 'success', text: successMsg });
        if (actionKey === 'op-add') setOpUsernameInput("");
        if (actionKey === 'whitelist-add') setWhitelistUsernameInput("");
        if (actionKey === 'ban-add') {
          setBanUsernameInput("");
          setBanReasonInput("");
        }
        setTimeout(() => fetchPlayersData(), 1200);
      } else {
        const errData = await res.json();
        setPlayerMessage({ type: 'error', text: errData.message || 'Action execution failed.' });
      }
    } catch (err: any) {
      setPlayerMessage({ type: 'error', text: err.message || 'An error occurred.' });
    } finally {
      setPlayerActionLoading(null);
    }
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

  const [playerSubTab, setPlayerSubTab] = useState<'ops' | 'whitelist' | 'banned'>('ops');

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

  // Header Actions
  const navbarActions = (
    <div className="flex items-center space-x-1.5 md:space-x-2">
      <span className={`hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusCfg.bg} ${statusCfg.text}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${status === 'ONLINE' ? 'bg-green-500' : status === 'CRASHED' ? 'bg-red-500' : status === 'STARTING' || status === 'RESTARTING' ? 'bg-amber-500 animate-pulse' : 'bg-zinc-400'}`} />
        <span>{statusCfg.label}</span>
      </span>

      {!deleteConfirm ? (
        <button
          onClick={() => setDeleteConfirm(true)}
          className="h-8 md:h-9 w-8 md:w-9 rounded-full text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-30 disabled:pointer-events-none active-scale transition-all flex items-center justify-center cursor-pointer"
          title="Delete Server"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : (
        <div className="flex items-center space-x-1 bg-red-50 border border-red-200 px-1.5 py-1 rounded-full animate-in fade-in slide-in-from-right-3 duration-200">
          <button
            onClick={handleDeleteServer}
            disabled={actionLoading}
            className="text-[10px] md:text-xs text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-full font-medium cursor-pointer"
          >
            Confirm
          </button>
          <button
            onClick={() => setDeleteConfirm(false)}
            className="text-[10px] md:text-xs text-zinc-500 hover:text-zinc-800 px-3 py-1 rounded-full font-medium cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#fbfbfd]">
      {/* Navigation */}
      <Navbar title={server.name} actions={navbarActions} />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1300px] mx-auto w-full px-4 md:px-6 py-6 md:py-8 gap-8">
        
        {/* Left Sidebar Workspace Controls */}
        <aside className="w-full lg:w-[260px] shrink-0 space-y-6">
          
          {/* Server mini status box (Aternos-style) */}
          <div className="bg-white border border-apple-hairline rounded-[20px] p-5 space-y-4 shadow-[0_4px_24px_rgba(0,0,0,0.015)]">
            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Container Status</span>
                <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.text}`}>
                  <span className={`h-1 w-1 rounded-full ${status === 'ONLINE' ? 'bg-green-500' : status === 'CRASHED' ? 'bg-red-500' : status === 'STARTING' || status === 'RESTARTING' ? 'bg-amber-500 animate-pulse' : 'bg-zinc-400'}`} />
                  <span>{statusCfg.label}</span>
                </span>
              </div>
              <div>
                <h3 className="text-base font-bold text-apple-ink truncate tracking-tight">{server.name}</h3>
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-50 border border-zinc-150 px-2 py-0.5 rounded-md inline-block select-all max-w-full truncate mt-1">
                  {server.domain}
                </span>
              </div>
            </div>

            {/* General Power buttons */}
            <div className="flex flex-col gap-2 pt-1">
              {status === 'OFFLINE' ? (
                <button
                  onClick={() => handlePowerAction('start')}
                  disabled={actionLoading}
                  className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-full flex items-center justify-center space-x-1.5 transition-all text-xs active-scale shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Play className="h-3.5 w-3.5 fill-white text-white" />}
                  <span>Start Server</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handlePowerAction('stop')}
                    disabled={actionLoading}
                    className="w-full h-10 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full flex items-center justify-center space-x-1.5 transition-all text-xs active-scale shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Square className="h-3.5 w-3.5 fill-white text-white" />}
                    <span>Stop Server</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handlePowerAction('restart')}
                      disabled={actionLoading}
                      className="h-8.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 font-semibold border border-zinc-200 rounded-full flex items-center justify-center space-x-1 transition-all text-[11px] active-scale cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`h-3 w-3 ${status === 'RESTARTING' ? 'animate-spin' : ''}`} />
                      <span>Restart</span>
                    </button>
                    <button
                      onClick={() => handlePowerAction('kill')}
                      disabled={actionLoading}
                      className="h-8.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold border border-red-100 rounded-full flex items-center justify-center space-x-1 transition-all text-[11px] active-scale cursor-pointer disabled:opacity-50"
                    >
                      <Power className="h-3 w-3" />
                      <span>Force Kill</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sidebar Menu Drawer */}
          <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-3 lg:pb-0 scrollbar-none border-b lg:border-b-0 border-zinc-100">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'console', label: 'Terminal CLI', icon: TermIcon },
              { id: 'players', label: 'Players', icon: Users },
              { id: 'files', label: 'File Manager', icon: HardDrive },
              { id: 'branding', label: 'Identity & Logo', icon: Palette },
              { id: 'config', label: 'Properties', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id as ActiveView)}
                  className={`h-10 px-4 rounded-full lg:rounded-xl flex items-center space-x-3 text-[12.5px] font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-apple-primary text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right workspace canvas panel */}
        <main className="flex-1 min-w-0 bg-white border border-apple-hairline rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.015)] flex flex-col overflow-hidden min-h-[550px]">
          
          {/* Dashboard View */}
          {activeView === 'dashboard' && (
            <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-300 text-left">
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-bold text-apple-ink tracking-tight flex items-center space-x-2">
                  <LayoutDashboard className="h-5 w-5 text-apple-primary" />
                  <span>Server Dashboard</span>
                </h2>
                <p className="text-xs md:text-sm text-zinc-500">Monitor cluster node resources, CPU/RAM charts, and specifications.</p>
              </div>

              <div className="border border-zinc-200/85 rounded-[20px] overflow-hidden bg-zinc-50/50 p-6 shadow-inner">
                <ServerStats serverId={params.id as string} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="bg-white border border-apple-hairline rounded-[16px] p-5 space-y-2 shadow-sm">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Allocation Limit</span>
                  <p className="text-lg font-bold text-apple-ink">{server.memory} MB RAM</p>
                  <span className="text-[10px] text-zinc-400 block leading-normal">
                    Max dedicated memory limits allocated to this server.
                  </span>
                </div>

                <div className="bg-white border border-apple-hairline rounded-[16px] p-5 space-y-2 shadow-sm text-left">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Server Software</span>
                  <p className="text-lg font-bold text-apple-ink flex items-center space-x-1.5">
                    <span className="bg-apple-primary/10 border border-apple-primary/20 px-2 py-0.5 rounded-md text-[11px] font-extrabold text-apple-primary uppercase tracking-wider">
                      {server.softwareType || 'VANILLA'}
                    </span>
                  </p>
                  <span className="text-[10px] text-zinc-400 block leading-normal">
                    Running platform version {server.softwareVersion || 'LATEST'}.
                  </span>
                </div>

                <div className="bg-white border border-apple-hairline rounded-[16px] p-5 space-y-2 shadow-sm text-left">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Direct connection</span>
                  <p className="text-[13px] font-mono font-bold text-apple-primary truncate select-all">
                    {server.domain}
                  </p>
                  <span className="text-[10px] text-zinc-400 block leading-normal">
                    Dynamic routing DNS hostname address.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Console View */}
          {activeView === 'console' && (
            <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300 text-left">
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-bold text-apple-ink tracking-tight flex items-center space-x-2">
                  <TermIcon className="h-5 w-5 text-apple-primary" />
                  <span>Orchestrator Terminal</span>
                </h2>
                <p className="text-xs md:text-sm text-zinc-500">Inspect server boot logs and run administrative game commands.</p>
              </div>

              <div className="border border-zinc-800 bg-[#1e1e1e] rounded-[18px] overflow-hidden shadow-lg">
                <div className="h-10 bg-[#1a1a1c] border-b border-zinc-900 px-4 flex items-center justify-between select-none">
                  <div className="flex space-x-2">
                    <span className="h-3 w-3 rounded-full bg-red-500/80 inline-block" />
                    <span className="h-3 w-3 rounded-full bg-yellow-500/80 inline-block" />
                    <span className="h-3 w-3 rounded-full bg-green-500/80 inline-block" />
                  </div>
                  <span className="text-xs font-mono text-zinc-500">guest@craftynos:~</span>
                  <div className="w-10" />
                </div>
                <div className="p-1">
                  <ServerTerminal serverId={params.id as string} />
                </div>
              </div>
            </div>
          )}

          {/* Players Management View */}
          {activeView === 'players' && (
            <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300 text-left">
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-bold text-apple-ink tracking-tight flex items-center space-x-2">
                  <Users className="h-5 w-5 text-apple-primary" />
                  <span>Players Management</span>
                </h2>
                <p className="text-xs md:text-sm text-zinc-500">Configure operator rights, custom whitelists, and blocked banned players.</p>
              </div>

              {playerMessage && (
                <div className={`p-4 rounded-[14px] flex items-center space-x-3 text-sm border ${
                  playerMessage.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                  {playerMessage.type === 'success' ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" /> : <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />}
                  <span>{playerMessage.text}</span>
                </div>
              )}

              {/* Subtabs Selection */}
              <div className="flex border-b border-zinc-150 overflow-x-auto scrollbar-none">
                {[
                  { id: 'ops', label: 'Operators (OP)', count: operators.length },
                  { id: 'whitelist', label: 'Whitelist', count: whitelist.length },
                  { id: 'banned', label: 'Banned Blocklist', count: bannedPlayers.length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setPlayerSubTab(tab.id as 'ops' | 'whitelist' | 'banned')}
                    className={`px-5 py-3 text-[13px] font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
                      playerSubTab === tab.id
                        ? 'border-apple-primary text-apple-primary font-bold'
                        : 'border-transparent text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                      playerSubTab === tab.id ? 'bg-apple-primary/10 text-apple-primary' : 'bg-zinc-100 text-zinc-500'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Lists and Forms */}
              <div className="space-y-6 pt-2">
                {playerSubTab === 'ops' && (
                  <div className="space-y-6">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!opUsernameInput.trim()) return;
                        handlePlayerCommand(`op ${opUsernameInput.trim()}`, 'op-add', `Granted OP privileges to ${opUsernameInput.trim()}`);
                      }}
                      className="flex gap-3"
                    >
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                          <UserPlus className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          placeholder="Enter username to promote to OP..."
                          value={opUsernameInput}
                          onChange={(e) => setOpUsernameInput(e.target.value)}
                          disabled={playerActionLoading !== null}
                          className="w-full h-10 pl-10 pr-4 bg-white border border-zinc-200 rounded-[11px] text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-apple-primary transition-all placeholder-zinc-400"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={playerActionLoading !== null || !opUsernameInput.trim()}
                        className="bg-apple-primary hover:bg-apple-primary-focus text-white text-xs font-semibold h-10 px-5 rounded-[11px] flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                      >
                        {playerActionLoading === 'op-add' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Shield className="h-3.5 w-3.5" />}
                        <span>Promote OP</span>
                      </button>
                    </form>

                    {playersLoading ? (
                      <div className="text-center py-8 text-zinc-400 text-xs flex items-center justify-center space-x-1.5">
                        <Loader2 className="h-4 w-4 animate-spin text-apple-primary" />
                        <span>Querying operators database...</span>
                      </div>
                    ) : operators.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-zinc-200 rounded-[18px] bg-zinc-50/30">
                        <Shield className="h-8 w-8 text-zinc-300 mx-auto mb-2 animate-pulse" />
                        <h4 className="text-zinc-600 font-semibold text-xs md:text-sm">No Operators Defined</h4>
                        <p className="text-zinc-400 text-[11px] mt-1">Promote usernames above to allow full visual console integrations inside their servers.</p>
                      </div>
                    ) : (
                      <div className="border border-zinc-150 rounded-[18px] overflow-hidden divide-y divide-zinc-100 bg-white shadow-sm">
                        {operators.map((p) => (
                          <div key={p.uuid || p.name} className="flex items-center justify-between p-3.5 hover:bg-zinc-50/50 transition-colors">
                            <div className="flex items-center space-x-3">
                              <img
                                src={`https://minotar.net/avatar/${p.name}/32`}
                                alt={p.name}
                                className="h-8 w-8 rounded-md bg-zinc-100 shadow-sm"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${p.name}`;
                                }}
                              />
                              <span className="font-mono text-sm font-semibold text-apple-ink">{p.name}</span>
                            </div>
                            <button
                              onClick={() => handlePlayerCommand(`deop ${p.name}`, `op-remove-${p.name}`, `Revoked OP privileges from ${p.name}`)}
                              disabled={playerActionLoading !== null}
                              className="text-red-500 hover:bg-red-50 text-[11px] font-semibold h-8 px-3 rounded-lg border border-red-100 transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                            >
                              {playerActionLoading === `op-remove-${p.name}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserMinus className="h-3 w-3" />}
                              <span>De-OP</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {playerSubTab === 'whitelist' && (
                  <div className="space-y-6">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!whitelistUsernameInput.trim()) return;
                        handlePlayerCommand(`whitelist add ${whitelistUsernameInput.trim()}`, 'whitelist-add', `Added ${whitelistUsernameInput.trim()} to Whitelist`);
                      }}
                      className="flex gap-3"
                    >
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                          <UserPlus className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          placeholder="Enter username to whitelist..."
                          value={whitelistUsernameInput}
                          onChange={(e) => setWhitelistUsernameInput(e.target.value)}
                          disabled={playerActionLoading !== null}
                          className="w-full h-10 pl-10 pr-4 bg-white border border-zinc-200 rounded-[11px] text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-apple-primary transition-all placeholder-zinc-400"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={playerActionLoading !== null || !whitelistUsernameInput.trim()}
                        className="bg-apple-primary hover:bg-apple-primary-focus text-white text-xs font-semibold h-10 px-5 rounded-[11px] flex items-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                      >
                        {playerActionLoading === 'whitelist-add' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        <span>Whitelist</span>
                      </button>
                    </form>

                    {playersLoading ? (
                      <div className="text-center py-8 text-zinc-400 text-xs flex items-center justify-center space-x-1.5">
                        <Loader2 className="h-4 w-4 animate-spin text-apple-primary" />
                        <span>Querying whitelist parameters...</span>
                      </div>
                    ) : whitelist.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-zinc-200 rounded-[18px] bg-zinc-50/30">
                        <CheckCircle2 className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                        <h4 className="text-zinc-600 font-semibold text-xs md:text-sm">No Whitelisted Players</h4>
                        <p className="text-zinc-400 text-[11px] mt-1">Protect this server by whitelisting players, keeping unwanted strangers off your nodes.</p>
                      </div>
                    ) : (
                      <div className="border border-zinc-150 rounded-[18px] overflow-hidden divide-y divide-zinc-100 bg-white shadow-sm">
                        {whitelist.map((p) => (
                          <div key={p.uuid || p.name} className="flex items-center justify-between p-3.5 hover:bg-zinc-50/50 transition-colors">
                            <div className="flex items-center space-x-3">
                              <img
                                src={`https://minotar.net/avatar/${p.name}/32`}
                                alt={p.name}
                                className="h-8 w-8 rounded-md bg-zinc-100 shadow-sm"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${p.name}`;
                                }}
                              />
                              <span className="font-mono text-sm font-semibold text-apple-ink">{p.name}</span>
                            </div>
                            <button
                              onClick={() => handlePlayerCommand(`whitelist remove ${p.name}`, `whitelist-remove-${p.name}`, `Removed ${p.name} from Whitelist`)}
                              disabled={playerActionLoading !== null}
                              className="text-red-500 hover:bg-red-50 text-[11px] font-semibold h-8 px-3 rounded-lg border border-red-100 transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                            >
                              {playerActionLoading === `whitelist-remove-${p.name}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserMinus className="h-3 w-3" />}
                              <span>Remove</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {playerSubTab === 'banned' && (
                  <div className="space-y-6">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!banUsernameInput.trim()) return;
                        const reason = banReasonInput.trim() || "Banned by administrator";
                        handlePlayerCommand(`ban ${banUsernameInput.trim()} ${reason}`, 'ban-add', `Banned player ${banUsernameInput.trim()}`);
                      }}
                      className="flex flex-col md:flex-row gap-3"
                    >
                      <div className="relative flex-2">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
                          <UserPlus className="h-4 w-4 text-red-400" />
                        </span>
                        <input
                          type="text"
                          placeholder="Enter username to ban..."
                          value={banUsernameInput}
                          onChange={(e) => setBanUsernameInput(e.target.value)}
                          disabled={playerActionLoading !== null}
                          className="w-full h-10 pl-10 pr-4 bg-white border border-zinc-200 rounded-[11px] text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-apple-primary transition-all placeholder-zinc-400"
                          required
                        />
                      </div>
                      <div className="flex-1 min-w-[150px]">
                        <input
                          type="text"
                          placeholder="Reason for ban..."
                          value={banReasonInput}
                          onChange={(e) => setBanReasonInput(e.target.value)}
                          disabled={playerActionLoading !== null}
                          className="w-full h-10 px-4 bg-white border border-zinc-200 rounded-[11px] text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-apple-primary transition-all placeholder-zinc-400"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={playerActionLoading !== null || !banUsernameInput.trim()}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold h-10 px-5 rounded-[11px] flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-sm"
                      >
                        {playerActionLoading === 'ban-add' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertCircle className="h-3.5 w-3.5" />}
                        <span>Ban Player</span>
                      </button>
                    </form>

                    {playersLoading ? (
                      <div className="text-center py-8 text-zinc-400 text-xs flex items-center justify-center space-x-1.5">
                        <Loader2 className="h-4 w-4 animate-spin text-apple-primary" />
                        <span>Querying server blocklists...</span>
                      </div>
                    ) : bannedPlayers.length === 0 ? (
                      <div className="text-center py-12 border border-dashed border-zinc-200 rounded-[18px] bg-zinc-50/30">
                        <AlertCircle className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                        <h4 className="text-zinc-600 font-semibold text-xs md:text-sm">Banned List is Empty</h4>
                        <p className="text-zinc-400 text-[11px] mt-1">No players are currently banned from logging onto this Minecraft server.</p>
                      </div>
                    ) : (
                      <div className="border border-zinc-150 rounded-[18px] overflow-hidden divide-y divide-zinc-100 bg-white shadow-sm">
                        {bannedPlayers.map((p) => (
                          <div key={p.uuid || p.name} className="flex items-center justify-between p-3.5 hover:bg-zinc-50/50 transition-colors">
                            <div className="flex items-center space-x-3 text-left">
                              <img
                                src={`https://minotar.net/avatar/${p.name}/32`}
                                alt={p.name}
                                className="h-8 w-8 rounded-md bg-zinc-100 shadow-sm"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/identicon/svg?seed=${p.name}`;
                                }}
                              />
                              <div>
                                <span className="font-mono text-sm font-semibold text-apple-ink block leading-tight">{p.name}</span>
                                {p.reason && (
                                  <span className="text-[10px] text-zinc-400">Reason: {p.reason}</span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => handlePlayerCommand(`pardon ${p.name}`, `ban-remove-${p.name}`, `Pardoned ${p.name}`)}
                              disabled={playerActionLoading !== null}
                              className="text-green-600 hover:bg-green-50 text-[11px] font-semibold h-8 px-3 rounded-lg border border-green-100 transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                            >
                              {playerActionLoading === `ban-remove-${p.name}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                              <span>Pardon</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Files View */}
          {activeView === 'files' && (
            <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300 text-left">
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-bold text-apple-ink tracking-tight flex items-center space-x-2">
                  <HardDrive className="h-5 w-5 text-apple-primary" />
                  <span>Files Manager</span>
                </h2>
                <p className="text-xs md:text-sm text-zinc-500">Edit sandbox properties, upload config parameters, and manage plugins.</p>
              </div>

              <div className="border border-zinc-200 rounded-[18px] p-6 bg-white shadow-sm">
                <FileManager serverId={params.id as string} />
              </div>
            </div>
          )}

          {/* Identity & Branding View */}
          {activeView === 'branding' && (
            <div className="p-6 md:p-8 space-y-8 animate-in fade-in duration-300 text-left">
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-bold text-apple-ink tracking-tight flex items-center space-x-2">
                  <Palette className="h-5 w-5 text-apple-primary" />
                  <span>Branding & Logo Identity</span>
                </h2>
                <p className="text-xs md:text-sm text-zinc-500">Customize lobby MOTDs nameplates and upload custom server icon logos.</p>
              </div>

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

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Icon box */}
                <div className="bg-zinc-50/20 border border-apple-hairline rounded-[18px] p-5 space-y-4 flex flex-col items-center justify-between text-center shadow-sm">
                  <div className="space-y-1 w-full text-left">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Server Icon</span>
                    <p className="text-[11px] text-zinc-500 leading-normal">Server list multiplayer display emblem logo.</p>
                  </div>

                  <div className="h-24 w-24 rounded-[16px] overflow-hidden bg-white border border-apple-hairline flex items-center justify-center shadow-inner relative shrink-0">
                    {iconBase64 ? (
                      <img
                        src={`data:image/png;base64,${iconBase64}`}
                        alt="Server Icon"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-1 text-zinc-400 font-semibold text-center p-2">
                        <ServerIcon className="h-7 w-7 text-zinc-300" />
                        <span className="text-[9px]">Default Logo</span>
                      </div>
                    )}
                  </div>

                  <div className="w-full">
                    <input
                      type="file"
                      id="server-icon-file-aside"
                      accept="image/*"
                      className="hidden"
                      onChange={handleIconUpload}
                      disabled={brandingSaving}
                    />
                    <label
                      htmlFor="server-icon-file-aside"
                      className={`w-full inline-flex h-8.5 items-center justify-center space-x-1.5 rounded-full border border-zinc-300 hover:border-zinc-400 bg-white text-xs font-semibold text-zinc-700 hover:text-zinc-900 shadow-sm cursor-pointer transition-all ${
                        brandingSaving ? 'opacity-50 pointer-events-none' : ''
                      }`}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload Logo</span>
                    </label>
                  </div>
                </div>

                {/* Identity form */}
                <div className="bg-zinc-50/20 border border-apple-hairline rounded-[18px] p-5 flex flex-col justify-between lg:col-span-2 text-left shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Server Settings</span>
                    <h3 className="text-base font-semibold text-apple-ink tracking-tight">Identity Configuration</h3>
                    <p className="text-[11px] text-zinc-500">Edit visual naming labels and connection domain subdomains instantly.</p>
                  </div>

                  {renameMessage && (
                    <div className={`p-3 rounded-[12px] flex items-start space-x-2 text-xs border ${
                      renameMessage.type === 'success'
                        ? 'bg-green-50 border-green-250 text-green-800'
                        : 'bg-red-50 border-red-250 text-red-800'
                    }`}>
                      {renameMessage.type === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                      )}
                      <span className="leading-normal">{renameMessage.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleRenameSubmit} className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Server Name</label>
                        <input
                          type="text"
                          maxLength={30}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full h-9.5 px-3 bg-white border border-zinc-200 rounded-[9px] text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-apple-primary placeholder-zinc-400"
                          disabled={renameSaving}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Server Subdomain</label>
                        <div className="flex rounded-[9px] overflow-hidden border border-zinc-200 bg-white focus-within:ring-1 focus-within:ring-apple-primary">
                          <input
                            type="text"
                            maxLength={30}
                            value={editSubdomain}
                            onChange={(e) => setEditSubdomain(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
                            className="flex-1 h-9.5 px-3 bg-white text-xs font-mono focus:outline-none placeholder-zinc-400"
                            disabled={renameSaving}
                            required
                          />
                          <span className="flex items-center bg-zinc-50 text-[10px] text-zinc-400 font-mono px-2.5 border-l border-zinc-150 select-none">
                            .lulli.qzz.io
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={renameSaving || !editName.trim() || !editSubdomain.trim()}
                        className="bg-apple-primary hover:bg-apple-primary-focus text-white text-[11px] font-semibold h-8.5 px-4 rounded-full active-scale transition-all flex items-center space-x-1 cursor-pointer disabled:opacity-50"
                      >
                        {renameSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Settings className="h-3 w-3" />}
                        <span>Save Subdomain</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* MOTD Section */}
              <form onSubmit={handleSaveBranding} className="space-y-5 border border-apple-hairline rounded-[18px] p-5 bg-zinc-50/20 text-left shadow-sm">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Message of the Day (MOTD)</span>
                    <span className="text-[10px] text-zinc-400 font-mono font-bold">{motd.length}/120</span>
                  </div>
                  <input
                    type="text"
                    maxLength={120}
                    placeholder="Enter visual server list description..."
                    value={motd}
                    onChange={(e) => setMotd(e.target.value)}
                    className="w-full h-10 px-4 bg-white border border-zinc-200 rounded-[11px] text-xs md:text-sm font-mono focus:outline-none focus:ring-1 focus:ring-apple-primary transition-all placeholder-zinc-400"
                    disabled={brandingSaving}
                  />
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">Multiplayer Screen Live Preview</span>
                  <div className="bg-[#121214] border border-zinc-800 rounded-[14px] p-4 flex items-center space-x-4 select-none">
                    <div className="h-11 w-11 rounded-[6px] overflow-hidden bg-zinc-900 border border-zinc-850 flex items-center justify-center shrink-0">
                      {iconBase64 ? (
                        <img src={`data:image/png;base64,${iconBase64}`} alt="Icon Preview" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-zinc-800 flex flex-col items-center justify-center text-zinc-600 font-bold text-[9px]">64x64</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-mono text-xs md:text-sm font-bold text-[#fafafa] truncate tracking-wide">{server?.name || "CraftyNOS"}</h4>
                        <span className="text-green-500 font-mono text-[10px] font-bold">0/20</span>
                      </div>
                      <p className="font-mono text-zinc-400 text-xs truncate mt-0.5 tracking-wide text-left">{motd || "A Minecraft Server"}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center shrink-0 pl-1">
                      <div className="flex items-end space-x-[2px] h-3">
                        <span className="w-[2.5px] h-1.5 bg-green-500 rounded-sm" />
                        <span className="w-[2.5px] h-2 bg-green-500 rounded-sm" />
                        <span className="w-[2.5px] h-2.5 bg-green-500 rounded-sm" />
                        <span className="w-[2.5px] h-3 bg-green-500 rounded-sm" />
                        <span className="w-[2.5px] h-3.5 bg-green-500 rounded-sm animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end items-center space-x-3 pt-1">
                  {showBrandingRestartButton && (
                    <div className="flex items-center space-x-1.5 animate-in fade-in duration-300">
                      <span className="text-[10px] font-semibold text-amber-600 animate-pulse">Reboot to apply settings:</span>
                      <button
                        type="button"
                        onClick={handleBrandingRestart}
                        disabled={actionLoading}
                        className="h-8 w-8 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center relative active-scale cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={brandingSaving || !motd.trim()}
                    className="bg-apple-primary hover:bg-apple-primary-focus text-white text-xs font-semibold h-9 px-5 rounded-full active-scale transition-all flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {brandingSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Palette className="h-3.5 w-3.5" />}
                    <span>Save Branding</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Properties View */}
          {activeView === 'config' && (
            <div className="p-6 md:p-8 space-y-6 animate-in fade-in duration-300 text-left">
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-bold text-apple-ink tracking-tight flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-apple-primary" />
                  <span>Server Parameters (server.properties)</span>
                </h2>
                <p className="text-xs md:text-sm text-zinc-500">Edit key-value attributes mapping. Reboot the server to apply changes.</p>
              </div>

              <div className="border border-zinc-200 rounded-[18px] p-6 bg-white shadow-sm">
                <ServerPropertiesEditor
                  serverId={params.id as string}
                  onSaved={triggerRestartIndicator}
                />
              </div>
            </div>
          )}

        </main>
      </div>

    </div>
  );
}


