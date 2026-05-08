"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Plus, Loader2, Server as ServerIcon, ShieldAlert, Cpu, MemoryStick, Terminal } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

interface Server {
  id: string;
  name: string;
  status: string;
  memory: number;
  domain: string;
}

export default function DashboardPage() {
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) return;

    // Fetch from NestJS Backend (port 4000)
    fetch("http://localhost:4000/servers", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => {
        setServers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch servers", err);
        setLoading(false);
      });
  }, [token]);

  // Navbar Create CTA Pill
  const navbarAction = (
    <Link href="/create">
      <button className="bg-apple-primary hover:bg-apple-primary-focus text-white text-xs md:text-[14px] font-medium px-4 py-1.5 md:py-2 rounded-full flex items-center space-x-1.5 active-scale transition-all">
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">New Server</span>
      </button>
    </Link>
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-apple-canvas">
      {/* Navigation */}
      <Navbar title="Servers Dashboard" actions={navbarAction} />

      {/* Hero Banner Section (product-tile-parchment: full-bleed parchment background, low density, centered display typography) */}
      <section className="bg-apple-canvas-parchment py-16 md:py-24 px-6 border-b border-apple-hairline">
        <div className="max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Hero text */}
          <div className="space-y-6 text-left">
            <span className="text-[12px] font-semibold text-apple-primary tracking-wider uppercase bg-apple-surface-pearl px-3 py-1 border border-apple-hairline rounded-full">
              Containerized Architecture
            </span>
            <h1 className="text-4xl md:text-5xl font-semibold text-apple-ink tracking-apple-display leading-tight">
              Minecraft hosting.<br />Redefined.
            </h1>
            <p className="text-apple-ink opacity-80 text-[19px] leading-relaxed max-w-lg font-light">
              Provision high-performance Minecraft containers on-demand. Monitor resource utilization, update live configurations, and access terminals in one streamlined, photography-first workspace.
            </p>
            <div className="flex items-center space-x-4 pt-2">
              <Link href="/create">
                <button className="bg-apple-primary hover:bg-apple-primary-focus text-white text-[15px] font-medium px-6 py-2.5 rounded-full active-scale transition-all shadow-sm">
                  Deploy Container
                </button>
              </Link>
              <a href="#servers-section" className="text-apple-primary hover:underline text-[15px] font-medium flex items-center space-x-1">
                <span>View active hosts</span>
                <span>&darr;</span>
              </a>
            </div>
          </div>

          {/* Premium Vector SVG Illustration representing an active isometric container */}
          <div className="flex justify-center md:justify-end">
            <div className="relative w-[300px] h-[300px] md:w-[350px] md:h-[350px] bg-white rounded-[24px] border border-apple-hairline p-6 flex items-center justify-center shadow-[0_10px_40px_rgba(0,0,0,0.03)] animate-pulse duration-3000">
              {/* Outer floating ring */}
              <div className="absolute inset-4 rounded-[18px] border border-dashed border-zinc-200" />
              {/* Core interactive SVG */}
              <svg className="w-[80%] h-[80%] drop-shadow-[rgba(0,0,0,0.22)_3px_5px_30px]" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Isometric Cube (Server Box representation) */}
                <path d="M100 30L160 65L100 100L40 65L100 30Z" fill="url(#cubeGradTop)" stroke="#0066cc" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M40 65L100 100V170L40 135V65Z" fill="url(#cubeGradLeft)" stroke="#0066cc" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M100 100L160 65V135L100 170V100Z" fill="url(#cubeGradRight)" stroke="#0066cc" strokeWidth="1.5" strokeLinejoin="round" />
                
                {/* Circuit Grid Details */}
                <line x1="100" y1="100" x2="100" y2="170" stroke="#0071e3" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="100" cy="100" r="4" fill="#0071e3" />
                
                {/* Glowing Nodes */}
                <circle cx="100" cy="30" r="3" fill="#2997ff" className="animate-ping" />
                <circle cx="160" cy="65" r="3" fill="#2997ff" />
                <circle cx="40" cy="65" r="3" fill="#2997ff" />
                <circle cx="100" cy="170" r="3" fill="#2997ff" />

                <defs>
                  <linearGradient id="cubeGradTop" x1="100" y1="30" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#ffffff" />
                    <stop offset="1" stopColor="#fafafc" />
                  </linearGradient>
                  <linearGradient id="cubeGradLeft" x1="40" y1="100" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#fafafc" />
                    <stop offset="1" stopColor="#f0f0f0" />
                  </linearGradient>
                  <linearGradient id="cubeGradRight" x1="100" y1="100" x2="160" y2="100" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#f5f5f7" />
                    <stop offset="1" stopColor="#e0e0e0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Main Containers/Servers Section */}
      <main id="servers-section" className="max-w-[1440px] mx-auto w-full px-6 md:px-12 py-16 flex-1">
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-[24px] md:text-[28px] font-semibold text-apple-ink tracking-apple-tight">
            Active Deployments
          </h2>
          <span className="text-xs text-zinc-500 font-mono">
            {servers.length} Container{servers.length !== 1 ? 's' : ''} running
          </span>
        </div>

        {loading ? (
          /* Premium Loading Screen */
          <div className="flex h-64 flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-apple-primary" />
            <p className="text-sm font-mono text-zinc-500">Querying local cluster state...</p>
          </div>
        ) : servers.length === 0 ? (
          /* Empty State styled as soft card with centered contents */
          <div className="border border-apple-hairline rounded-[18px] bg-apple-canvas p-12 text-center max-w-xl mx-auto space-y-6">
            <div className="h-16 w-16 bg-apple-canvas-parchment border border-apple-hairline rounded-full flex items-center justify-center mx-auto">
              <ServerIcon className="h-6 w-6 text-zinc-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-[21px] font-semibold text-apple-ink tracking-tight">No Active Servers Found</h3>
              <p className="text-[15px] text-zinc-500 max-w-md mx-auto">
                Your cluster does not have any active containers provisioned. Click below to launch your first virtual Minecraft node.
              </p>
            </div>
            <Link href="/create">
              <button className="bg-apple-primary hover:bg-apple-primary-focus text-white text-[14px] font-medium px-6 py-2.5 rounded-full active-scale transition-all">
                Provision First Container
              </button>
            </Link>
          </div>
        ) : (
          /* Store Grid Layout (3-column store-utility-card pattern) */
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {servers.map((server) => {
              const isOnline = server.status === 'ONLINE';
              const isStarting = server.status === 'STARTING' || server.status === 'RESTARTING';
              
              return (
                <Link key={server.id} href={`/server/${server.id}`} className="block">
                  <div className="border border-apple-hairline rounded-[18px] bg-apple-canvas p-6 space-y-6 hover:border-apple-primary hover:shadow-[0_10px_30px_rgba(0,102,204,0.03)] transition-all cursor-pointer group flex flex-col h-full justify-between">
                    <div>
                      {/* Isometric Card Mini Icon */}
                      <div className="h-32 w-full bg-apple-canvas-parchment border border-apple-divider-soft rounded-[8px] mb-4 flex items-center justify-center relative overflow-hidden group-hover:bg-apple-surface-pearl transition-colors">
                        <div className="absolute inset-0 bg-radial-gradient from-apple-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        {/* Elegant minimalist server rendering */}
                        <svg className="h-[60%] w-[60%] drop-shadow-[rgba(0,0,0,0.08)_2px_4px_10px]" viewBox="0 0 100 100" fill="none">
                          <rect x="25" y="20" width="50" height="60" rx="4" stroke="#7a7a7a" strokeWidth="1.5" fill="white" />
                          <line x1="30" y1="35" x2="70" y2="35" stroke={isOnline ? "#0066cc" : "#e0e0e0"} strokeWidth="2" />
                          <line x1="30" y1="45" x2="70" y2="45" stroke={isOnline ? "#0066cc" : "#e0e0e0"} strokeWidth="2" />
                          <line x1="30" y1="55" x2="50" y2="55" stroke="#e0e0e0" strokeWidth="2" />
                          
                          {/* Live Status indicator on illustration */}
                          <circle cx="70" cy="55" r="3" fill={isOnline ? "#4ade80" : isStarting ? "#fbbf24" : "#9ca3af"} className={isStarting ? "animate-pulse" : ""} />
                        </svg>
                      </div>

                      {/* Header containing name and status pill */}
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[17px] font-semibold text-apple-ink tracking-apple-tight group-hover:text-apple-primary transition-colors">
                          {server.name}
                        </h3>
                        {/* Status Pearl Pill */}
                        <span className={`text-[12px] px-3 py-0.5 rounded-full font-medium flex items-center space-x-1.5 border ${
                          isOnline 
                            ? 'bg-green-50/60 border-green-200 text-green-700' 
                            : isStarting 
                            ? 'bg-amber-50/60 border-amber-200 text-amber-700' 
                            : 'bg-zinc-50/60 border-zinc-200 text-zinc-600'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-green-500' : isStarting ? 'bg-amber-500 animate-pulse' : 'bg-zinc-400'}`} />
                          <span>{server.status}</span>
                        </span>
                      </div>

                      {/* Address / Domain */}
                      <div className="font-mono text-[12px] text-zinc-500 mb-4 bg-zinc-50 py-1 px-2.5 rounded-[8px] inline-block border border-zinc-100 select-all" onClick={e => e.stopPropagation()}>
                        {server.domain}
                      </div>
                    </div>

                    {/* Resources Summary Section */}
                    <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500 font-sans">
                      <div className="flex items-center space-x-4">
                        <span className="flex items-center space-x-1">
                          <MemoryStick className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{server.memory} MB RAM</span>
                        </span>
                      </div>
                      <span className="text-apple-primary font-medium group-hover:underline flex items-center space-x-1">
                        <span>Console</span>
                        <span>&rarr;</span>
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Classic scannable Apple Footer */}
      <footer className="bg-apple-canvas-parchment text-zinc-500 text-[12px] font-sans border-t border-apple-hairline py-12 px-6 mt-16">
        <div className="max-w-[1200px] mx-auto space-y-8">
          {/* Footer multi-column directory */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-8 border-b border-zinc-200">
            <div className="space-y-3">
              <h4 className="text-zinc-800 font-semibold text-xs uppercase tracking-wider">Explore</h4>
              <ul className="space-y-2">
                <li><Link href="/" className="hover:text-zinc-800 transition-colors">Containers Dashboard</Link></li>
                <li><Link href="/create" className="hover:text-zinc-800 transition-colors">Deploy Virtual Node</Link></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-zinc-800 font-semibold text-xs uppercase tracking-wider">Cluster State</h4>
              <ul className="space-y-2">
                <li><span className="text-zinc-400">Node status: healthy</span></li>
                <li><span className="text-zinc-400">Docker orchestrator: active</span></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-zinc-800 font-semibold text-xs uppercase tracking-wider">Console CLI</h4>
              <ul className="space-y-2">
                <li><span className="font-mono text-[11px] text-zinc-400">v0.1.0-alpha</span></li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="text-zinc-800 font-semibold text-xs uppercase tracking-wider">Account</h4>
              <ul className="space-y-2">
                <li><span className="text-zinc-400">Security Credentials</span></li>
              </ul>
            </div>
          </div>

          {/* Legal / Copyright info row */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between text-zinc-400 text-[11px] space-y-4 md:space-y-0">
            <div>
              Copyright &copy; 2026 CraftyNOS. All rights reserved. Powered by Docker and NestJS.
            </div>
            <div className="flex space-x-4">
              <span className="hover:text-zinc-600 cursor-pointer transition-colors">Privacy Policy</span>
              <span>|</span>
              <span className="hover:text-zinc-600 cursor-pointer transition-colors">Terms of Service</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
