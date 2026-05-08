"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, Cpu, MemoryStick, Layers, Code } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

export default function CreateServerPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [memory, setMemory] = useState(2048);
  const [softwareType, setSoftwareType] = useState("VANILLA");
  const [softwareVersion, setSoftwareVersion] = useState("LATEST");
  const [mods, setMods] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      alert("You must be logged in to create a server.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("http://localhost:4000/servers/create", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, memory, softwareType, softwareVersion, mods }),
      });

      if (!res.ok) throw new Error("Failed to create server");
      
      router.push("/");
    } catch (err) {
      console.error(err);
      alert("Failed to create server. Check backend/daemon logs.");
      setLoading(false);
    }
  };

  // Navbar Cancel Actions
  const navbarAction = (
    <Link href="/">
      <button className="border border-zinc-300 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 text-xs md:text-[14px] font-medium px-4 py-1.5 md:py-2 rounded-full active-scale transition-all flex items-center space-x-1">
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Cancel</span>
      </button>
    </Link>
  );

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-apple-canvas-parchment">
      {/* Navigation */}
      <Navbar title="Deploy Virtual Node" actions={navbarAction} />

      <div className="max-w-2xl mx-auto w-full px-6 py-12">
        <div className="border border-apple-hairline rounded-[18px] bg-apple-canvas p-8 md:p-10 shadow-[0_10px_30px_rgba(0,0,0,0.02)] space-y-8">
          {/* Card Header */}
          <div className="space-y-2 border-b border-zinc-100 pb-6 text-center md:text-left">
            <h3 className="text-[24px] font-semibold text-apple-ink tracking-apple-tight">Instance Configuration</h3>
            <p className="text-[14px] text-zinc-500">Specify the container allocation, core software type, and automations for your node.</p>
          </div>

          <form onSubmit={handleCreate} className="space-y-6">
            {/* Server Name */}
            <div className="space-y-2">
              <label htmlFor="name" className="text-[14px] font-semibold text-apple-ink flex items-center space-x-2">
                <span>Server Name</span>
              </label>
              <input 
                id="name" 
                type="text"
                placeholder="My Awesome Server" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full h-11 px-4 border border-apple-hairline rounded-[11px] text-[15px] focus:outline-none focus:ring-2 focus:ring-apple-primary-focus focus:border-transparent transition-all placeholder-zinc-400 font-sans"
              />
              <p className="text-[12px] text-zinc-400">A human-readable label used to identify this container in the index.</p>
            </div>
            
            {/* Memory Allocation */}
            <div className="space-y-2">
              <label htmlFor="memory" className="text-[14px] font-semibold text-apple-ink flex items-center space-x-2">
                <MemoryStick className="h-4 w-4 text-zinc-400" />
                <span>Memory Allocation (MB)</span>
              </label>
              <input 
                id="memory" 
                type="number"
                min={512}
                max={16000}
                step={512}
                value={memory}
                onChange={(e) => setMemory(Number(e.target.value))}
                required
                className="w-full h-11 px-4 border border-apple-hairline rounded-[11px] text-[15px] focus:outline-none focus:ring-2 focus:ring-apple-primary-focus focus:border-transparent transition-all font-mono"
              />
              <p className="text-[12px] text-zinc-400">Memory bounds dedicated to the Java Virtual Machine. Min: 512MB, Max: 16000MB.</p>
            </div>

            {/* Software Type */}
            <div className="space-y-2">
              <label htmlFor="softwareType" className="text-[14px] font-semibold text-apple-ink flex items-center space-x-2">
                <Layers className="h-4 w-4 text-zinc-400" />
                <span>Software Flavor</span>
              </label>
              <div className="relative">
                <select
                  id="softwareType"
                  value={softwareType}
                  onChange={(e) => setSoftwareType(e.target.value)}
                  className="w-full h-11 px-4 border border-apple-hairline rounded-[11px] text-[15px] bg-apple-canvas focus:outline-none focus:ring-2 focus:ring-apple-primary-focus focus:border-transparent transition-all font-sans appearance-none cursor-pointer"
                >
                  <option value="VANILLA">Vanilla</option>
                  <option value="PAPER">Paper (Highly Recommended)</option>
                  <option value="PURPUR">Purpur</option>
                  <option value="SPIGOT">Spigot</option>
                  <option value="FABRIC">Fabric</option>
                  <option value="FORGE">Forge</option>
                  <option value="MAGMA">Magma</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
                    <path d="M50 80L100 130L150 80H50Z" />
                  </svg>
                </div>
              </div>
              <p className="text-[12px] text-zinc-400">The distribution core used to run the server. Vanilla supports base play; Paper optimizes performance.</p>
            </div>

            {/* Software Version */}
            <div className="space-y-2">
              <label htmlFor="softwareVersion" className="text-[14px] font-semibold text-apple-ink flex items-center space-x-2">
                <Code className="h-4 w-4 text-zinc-400" />
                <span>Target Version</span>
              </label>
              <input
                id="softwareVersion"
                type="text"
                list="mc-versions"
                value={softwareVersion}
                onChange={(e) => setSoftwareVersion(e.target.value)}
                placeholder="e.g. LATEST or 1.20.4"
                className="w-full h-11 px-4 border border-apple-hairline rounded-[11px] text-[15px] focus:outline-none focus:ring-2 focus:ring-apple-primary-focus focus:border-transparent transition-all placeholder-zinc-400 font-sans"
              />
              <datalist id="mc-versions">
                <option value="LATEST" />
                <option value="1.21.4" />
                <option value="1.21.1" />
                <option value="1.20.4" />
                <option value="1.19.4" />
                <option value="1.18.2" />
                <option value="1.17.1" />
                <option value="1.16.5" />
                <option value="1.12.2" />
                <option value="1.8.8" />
              </datalist>
              <p className="text-[12px] text-zinc-400">Minecraft version to target. Type 'LATEST' or input a specific release code.</p>
            </div>

            {/* Mods & Plugins list */}
            <div className="space-y-2">
              <label htmlFor="mods" className="text-[14px] font-semibold text-apple-ink flex items-center space-x-2">
                <span>Modrinth Add-ons (Auto-Install)</span>
              </label>
              <textarea
                id="mods"
                value={mods}
                onChange={(e) => setMods(e.target.value)}
                placeholder="Enter a comma-separated list of Modrinth slugs or IDs (e.g. chunky, luckperms, viaversion)"
                className="w-full min-h-[96px] p-4 border border-apple-hairline rounded-[11px] text-[14px] focus:outline-none focus:ring-2 focus:ring-apple-primary-focus focus:border-transparent transition-all placeholder-zinc-400 font-mono resize-y"
              />
              <p className="text-[12px] text-zinc-400">Modrinth integration slugs. Add-ons are dynamically parsed, compiled, and loaded into the files hierarchy on bootstrap.</p>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-zinc-100 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
              <Link href="/" className="w-full sm:w-auto">
                <button 
                  type="button"
                  className="w-full sm:w-auto border border-apple-hairline bg-white text-apple-ink hover:bg-apple-canvas-parchment text-[15px] font-medium h-11 px-6 rounded-full active-scale transition-all"
                >
                  Cancel
                </button>
              </Link>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full sm:w-auto bg-apple-primary hover:bg-apple-primary-focus text-white text-[15px] font-medium h-11 px-8 rounded-full active-scale transition-all flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50 disabled:pointer-events-none"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>{loading ? "Provisioning Container..." : "Deploy Server"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
