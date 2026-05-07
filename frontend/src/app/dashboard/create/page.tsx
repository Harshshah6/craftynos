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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://localhost:4000/servers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, memory }),
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
