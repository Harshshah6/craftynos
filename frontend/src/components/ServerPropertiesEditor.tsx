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
    <div className="space-y-6 select-none">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4 border-apple-hairline">
        <div>
          <h4 className="text-[14px] font-semibold text-apple-ink leading-none mb-1">Instance Attributes</h4>
          <span className="font-mono text-[12px] text-zinc-400 bg-zinc-50 px-2 py-0.5 border border-zinc-100 rounded-[6px]">/server.properties</span>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving} 
          className="bg-apple-primary hover:bg-apple-primary-focus text-white text-xs md:text-sm font-semibold h-9 px-5 rounded-full active-scale transition-colors flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-50 w-full sm:w-auto"
        >
          <Save className="h-3.5 w-3.5" />
          <span>{saving ? "Saving..." : "Save Configuration"}</span>
        </button>
      </div>
      
      <div className="h-[500px] border border-apple-hairline rounded-[18px] overflow-hidden">
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
      <p className="text-[13px] text-zinc-400 font-light italic">
        * Please note that you must restart the container for these server.properties overrides to be injected into the virtual machine JVM state.
      </p>
    </div>
  );
}
