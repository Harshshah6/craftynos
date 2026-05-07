"use client";

import { useState, useEffect } from "react";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Editor from "@monaco-editor/react";
import { useAuth } from "@/components/auth-provider";

interface ServerPropertiesEditorProps {
  serverId: string;
  onSaved?: () => void;
}

export function ServerPropertiesEditor({ serverId, onSaved }: ServerPropertiesEditorProps) {
  const { token } = useAuth();
  const [fileContent, setFileContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchProperties();
  }, [serverId, token]);

  const fetchProperties = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://localhost:4000/servers/${serverId}/files/read?path=server.properties`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content || "");
      } else {
        setError("Could not load server.properties. Is the server initialized?");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:4000/servers/${serverId}/files/write`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ path: 'server.properties', content: fileContent })
      });
      if (!res.ok) {
        throw new Error("Failed to save changes");
      }
      if (onSaved) {
        onSaved();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[400px] items-center justify-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-4 border-gray-200 dark:border-gray-800">
        <div className="font-mono text-sm">/server.properties</div>
        <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
      <div className="h-[500px] border rounded-md overflow-hidden border-gray-200 dark:border-gray-800">
        <Editor
          height="100%"
          language="ini"
          theme="vs-dark"
          value={fileContent}
          onChange={(value) => setFileContent(value || "")}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: "on",
            scrollBeyondLastLine: false,
          }}
        />
      </div>
      <p className="text-sm text-gray-500">
        Note: You must restart the server for configuration changes to take effect.
      </p>
    </div>
  );
}
