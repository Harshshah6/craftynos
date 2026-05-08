"use client";

import { useState, useEffect } from "react";
import { Folder, FileText, ArrowLeft, Trash2, Save, X, Edit2, ArrowUpRight, Loader2, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Editor from "@monaco-editor/react";
import { useAuth } from "@/components/auth-provider";

interface FileManagerProps {
  serverId: string;
}

interface FileInfo {
  name: string;
  isDirectory: boolean;
  size: number;
  lastModified: string;
}

export function FileManager({ serverId }: FileManagerProps) {
  const { token } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>("/");
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState<string>("");

  const startRename = (e: React.MouseEvent, file: FileInfo) => {
    e.stopPropagation();
    setRenamingFile(file.name);
    setRenameValue(file.name);
  };

  const handleRename = async (e: React.FormEvent | React.MouseEvent | React.KeyboardEvent, file: FileInfo) => {
    e.stopPropagation();
    if (!token) return;
    if (!renameValue || renameValue === file.name) {
      setRenamingFile(null);
      return;
    }

    const oldPath = currentPath.endsWith("/") ? `${currentPath}${file.name}` : `${currentPath}/${file.name}`;
    let newPath = renameValue;
    if (!newPath.startsWith("/")) {
      newPath = currentPath.endsWith("/") ? `${currentPath}${newPath}` : `${currentPath}/${newPath}`;
    }

    try {
      const res = await fetch(`http://localhost:4000/servers/${serverId}/files/rename`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPath, newPath })
      });
      if (res.ok) {
        setRenamingFile(null);
        fetchFiles(currentPath);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to rename/move file");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  useEffect(() => {
    if (!token) return;
    if (!editingFile) {
      fetchFiles(currentPath);
    }
  }, [serverId, currentPath, editingFile, token]);

  const fetchFiles = async (path: string) => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/servers/${serverId}/files?path=${encodeURIComponent(path)}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (file: FileInfo) => {
    if (!token) return;
    const newPath = currentPath.endsWith("/") ? `${currentPath}${file.name}` : `${currentPath}/${file.name}`;
    
    if (file.isDirectory) {
      setCurrentPath(newPath);
    } else {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:4000/servers/${serverId}/files/read?path=${encodeURIComponent(newPath)}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setFileContent(data.content || "");
          setEditingFile(newPath);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, file: FileInfo) => {
    e.stopPropagation();
    if (!token) return;
    if (!confirm(`Are you sure you want to delete ${file.name}?`)) return;

    const targetPath = currentPath.endsWith("/") ? `${currentPath}${file.name}` : `${currentPath}/${file.name}`;
    try {
      const res = await fetch(`http://localhost:4000/servers/${serverId}/files?path=${encodeURIComponent(targetPath)}`, {
        method: 'DELETE',
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchFiles(currentPath);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!editingFile || !token) return;
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:4000/servers/${serverId}/files/write`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ path: editingFile, content: fileContent })
      });
      if (res.ok) {
        setEditingFile(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const navigateUp = () => {
    if (currentPath === "/" || currentPath === "") return;
    const parts = currentPath.split("/").filter(p => p);
    parts.pop();
    setCurrentPath("/" + parts.join("/"));
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentPath("/");
      return;
    }
    const parts = currentPath.split("/").filter(p => p);
    const newPath = "/" + parts.slice(0, index + 1).join("/");
    setCurrentPath(newPath);
  };

  if (editingFile) {
    const filename = editingFile.split('/').pop() || editingFile;
    let language = "plaintext";
    if (filename.endsWith('.json')) language = "json";
    else if (filename.endsWith('.yml') || filename.endsWith('.yaml')) language = "yaml";
    else if (filename.endsWith('.properties')) language = "ini";
    else if (filename.endsWith('.js')) language = "javascript";

    return (
      <div className="space-y-4 select-none">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4 border-apple-hairline">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setEditingFile(null)}
              className="h-9 w-9 border border-zinc-200 hover:bg-zinc-100 rounded-full flex items-center justify-center text-zinc-600 hover:text-apple-ink active-scale transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h4 className="text-[14px] font-semibold text-apple-ink leading-none mb-1">Sandboxed Buffer</h4>
              <span className="font-mono text-[12px] text-zinc-400 bg-zinc-50 px-2 py-0.5 border border-zinc-100 rounded-[6px]">{editingFile}</span>
            </div>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => setEditingFile(null)}
              className="border border-zinc-300 text-zinc-600 hover:bg-zinc-100 text-xs md:text-sm font-semibold h-9 px-4 rounded-full active-scale transition-colors"
            >
              <X className="mr-1.5 h-3.5 w-3.5 inline-block" /> Cancel
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving} 
              className="bg-apple-primary hover:bg-apple-primary-focus text-white text-xs md:text-sm font-semibold h-9 px-5 rounded-full active-scale transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> 
              <span>{saving ? "Saving..." : "Save Config"}</span>
            </button>
          </div>
        </div>
        <div className="h-[550px] border border-apple-hairline rounded-[18px] overflow-hidden">
          <Editor
            height="100%"
            language={language}
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
      </div>
    );
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const pathParts = currentPath.split("/").filter(p => p);

  return (
    <div className="space-y-6 select-none">
      {/* Breadcrumbs Section */}
      <div className="flex items-center justify-between border-b pb-4 border-apple-hairline">
        <div className="flex items-center space-x-1 font-mono text-[13px] text-zinc-400 overflow-x-auto py-1 pr-4">
          <button 
            onClick={(e) => { e.preventDefault(); navigateToBreadcrumb(-1); }}
            className="hover:text-apple-primary font-medium transition-colors"
          >
            root
          </button>
          {pathParts.map((part, idx) => (
            <div key={idx} className="flex items-center space-x-1">
              <span className="text-zinc-300">/</span>
              <button 
                onClick={(e) => { e.preventDefault(); navigateToBreadcrumb(idx); }}
                className="hover:text-apple-primary font-medium transition-colors text-zinc-600"
              >
                {part}
              </button>
            </div>
          ))}
        </div>

        {/* Refresh Action button */}
        <button 
          onClick={() => fetchFiles(currentPath)}
          disabled={loading}
          className="h-8 px-3.5 rounded-full border border-zinc-200 hover:bg-zinc-100 text-xs text-zinc-600 hover:text-apple-ink font-semibold active-scale transition-all flex items-center space-x-1.5 shrink-0"
          title="Refresh Directory"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Files Table layout */}
      <div className="border border-apple-hairline rounded-[18px] overflow-hidden bg-apple-canvas">
        <Table>
          <TableHeader className="bg-apple-surface-pearl">
            <TableRow className="hover:bg-transparent border-b border-apple-hairline">
              <TableHead className="w-[50%] text-xs font-semibold uppercase tracking-wider text-zinc-500 py-3.5 px-6">Name</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-zinc-500 py-3.5">Size</TableHead>
              <TableHead className="text-xs font-semibold uppercase tracking-wider text-zinc-500 py-3.5">Last Modified</TableHead>
              <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 py-3.5 px-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentPath !== "/" && currentPath !== "" && (
              <TableRow className="cursor-pointer hover:bg-apple-canvas-parchment border-b border-apple-divider-soft transition-colors" onClick={navigateUp}>
                <TableCell className="font-semibold text-[15px] text-apple-ink py-3.5 px-6 flex items-center space-x-3">
                  <div className="h-8 w-8 bg-zinc-100 border border-zinc-200/50 rounded-full flex items-center justify-center">
                    <ArrowLeft className="h-4 w-4 text-zinc-500" />
                  </div>
                  <span>..</span>
                </TableCell>
                <TableCell className="py-3.5">--</TableCell>
                <TableCell className="py-3.5">--</TableCell>
                <TableCell className="py-3.5 text-right px-6">--</TableCell>
              </TableRow>
            )}
            
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-sm font-mono text-zinc-400">
                  <span className="inline-flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-apple-primary" />
                    <span>Analyzing file cluster...</span>
                  </span>
                </TableCell>
              </TableRow>
            ) : files.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center text-sm text-zinc-400 font-light">
                  This directory is empty
                </TableCell>
              </TableRow>
            ) : (
              files.map((file) => (
                <TableRow 
                  key={file.name} 
                  className="cursor-pointer hover:bg-apple-canvas-parchment border-b border-apple-divider-soft last:border-0 transition-colors"
                  onClick={() => renamingFile !== file.name && handleRowClick(file)}
                >
                  <TableCell className="font-semibold text-[15px] text-apple-ink py-3.5 px-6 flex items-center space-x-3">
                    {file.isDirectory ? (
                      <div className="h-8 w-8 bg-apple-primary/5 border border-apple-primary/10 rounded-[8px] flex items-center justify-center">
                        <Folder className="h-4 w-4 text-apple-primary fill-apple-primary/10" />
                      </div>
                    ) : (
                      <div className="h-8 w-8 bg-zinc-50 border border-zinc-200/40 rounded-[8px] flex items-center justify-center">
                        <FileText className="h-4 w-4 text-zinc-500" />
                      </div>
                    )}
                    {renamingFile === file.name ? (
                      <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                        <input
                           type="text"
                           className="px-3 h-8 text-[14px] border border-zinc-300 rounded-[8px] bg-white focus:outline-none focus:ring-2 focus:ring-apple-primary-focus focus:border-transparent transition-all min-w-[200px]"
                           value={renameValue}
                           onChange={(e) => setRenameValue(e.target.value)}
                           autoFocus
                           onKeyDown={(e) => {
                             if (e.key === 'Enter') handleRename(e, file);
                             if (e.key === 'Escape') setRenamingFile(null);
                           }}
                        />
                        <button 
                          onClick={(e) => handleRename(e, file)}
                          className="h-8 px-3 rounded-full text-xs font-semibold text-white bg-green-600 hover:bg-green-700 active-scale transition-colors"
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => setRenamingFile(null)}
                          className="h-8 px-3 rounded-full text-xs font-semibold text-zinc-500 hover:text-zinc-800 border border-zinc-300 hover:bg-zinc-50 active-scale transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className="truncate max-w-[240px] md:max-w-md group-hover:text-apple-primary transition-colors">{file.name}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-[13px] text-zinc-500 font-mono py-3.5">
                    {file.isDirectory ? "--" : formatSize(file.size)}
                  </TableCell>
                  <TableCell className="text-[13px] text-zinc-500 py-3.5 font-light">
                    {new Date(file.lastModified).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right py-3.5 px-6" onClick={(e) => e.stopPropagation()}>
                    {renamingFile !== file.name && (
                      <div className="flex items-center justify-end space-x-1">
                        <button 
                          onClick={(e) => startRename(e, file)}
                          className="h-8 w-8 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-full flex items-center justify-center active-scale transition-all"
                          title="Rename file"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button 
                          onClick={(e) => handleDelete(e, file)}
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full flex items-center justify-center active-scale transition-all"
                          title="Delete file"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
