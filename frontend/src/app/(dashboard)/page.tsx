"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Server as ServerIcon, Plus, Loader2 } from "lucide-react";
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
        // Ensure we got an array
        setServers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch servers", err);
        setLoading(false);
      });
  }, [token]);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Your Servers</h1>
        <Link href="/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" /> New Server
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : servers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12">
          <ServerIcon className="mb-4 h-12 w-12 text-gray-400" />
          <CardTitle className="mb-2">No servers found</CardTitle>
          <CardDescription className="mb-6 text-center max-w-md">
            You don't have any Minecraft servers yet. Create one to get started!
          </CardDescription>
          <Link href="/create">
            <Button>Create your first server</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {servers.map((server) => (
            <Link key={server.id} href={`/server/${server.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{server.name}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${server.status === 'ONLINE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {server.status}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>RAM: {server.memory} MB</p>
                    <p>Domain: {server.domain}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
