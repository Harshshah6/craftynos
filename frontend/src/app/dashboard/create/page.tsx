"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function CreateServerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [memory, setMemory] = useState(2048);
  const [softwareType, setSoftwareType] = useState("VANILLA");
  const [softwareVersion, setSoftwareVersion] = useState("LATEST");
  const [mods, setMods] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://localhost:4000/servers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, memory, softwareType, softwareVersion, mods }),
      });

      if (!res.ok) throw new Error("Failed to create server");
      
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Failed to create server. Check backend/daemon logs.");
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create Server</h1>
      </div>

      <Card>
        <form onSubmit={handleCreate}>
          <CardHeader>
            <CardTitle>Server Configuration</CardTitle>
            <CardDescription>Setup your new Minecraft server container.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Server Name</Label>
              <Input 
                id="name" 
                placeholder="My Awesome Server" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="memory">Memory Allocation (MB)</Label>
              <Input 
                id="memory" 
                type="number"
                min={512}
                max={16000}
                step={512}
                value={memory}
                onChange={(e) => setMemory(Number(e.target.value))}
                required
              />
              <p className="text-sm text-gray-500">Amount of RAM dedicated to this server.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="softwareType">Software Type</Label>
              <select
                id="softwareType"
                value={softwareType}
                onChange={(e) => setSoftwareType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="VANILLA">Vanilla</option>
                <option value="PAPER">Paper (Highly Recommended)</option>
                <option value="PURPUR">Purpur</option>
                <option value="SPIGOT">Spigot</option>
                <option value="FABRIC">Fabric</option>
                <option value="FORGE">Forge</option>
                <option value="MAGMA">Magma</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="softwareVersion">Version</Label>
              <Input
                id="softwareVersion"
                type="text"
                list="mc-versions"
                value={softwareVersion}
                onChange={(e) => setSoftwareVersion(e.target.value)}
                placeholder="e.g. LATEST or 1.20.4"
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="mods">Modrinth Plugins / Mods (Auto-Install)</Label>
              <textarea
                id="mods"
                value={mods}
                onChange={(e) => setMods(e.target.value)}
                placeholder="Enter a comma-separated list of Modrinth slugs or IDs (e.g. chunky, luckperms, viaversion)"
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 h-24 resize-y font-mono"
              />
              <p className="text-sm text-gray-500">These will be automatically downloaded and injected into the server on startup.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? "Provisioning Container..." : "Deploy Server"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
