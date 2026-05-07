"use client";

import { useState, useEffect } from "react";
import { Folder, FileText, ChevronRight, ArrowLeft, Trash2, Save, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import Editor from "@monaco-editor/react";

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
  const [currentPath, setCurrentPath] = useState<string>("/");
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editingFile) {
      fetchFiles(currentPath);
    }
  }, [serverId, currentPath, editingFile]);

  const fetchFiles = async (path: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:4000/servers/${serverId}/files?path=${encodeURIComponent(path)}`);
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
    const newPath = currentPath.endsWith("/") ? `${currentPath}${file.name}` : `${currentPath}/${file.name}`;
    
    if (file.isDirectory) {
      setCurrentPath(newPath);
    } else {
      // Open editor
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:4000/servers/${serverId}/files/read?path=${encodeURIComponent(newPath)}`);
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
    if (!confirm(`Are you sure you want to delete ${file.name}?`)) return;

    const targetPath = currentPath.endsWith("/") ? `${currentPath}${file.name}` : `${currentPath}/${file.name}`;
    try {
      const res = await fetch(`http://localhost:4000/servers/${serverId}/files?path=${encodeURIComponent(targetPath)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchFiles(currentPath);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = async () => {
    if (!editingFile) return;
    setSaving(true);
    try {
      const res = await fetch(`http://localhost:4000/servers/${serverId}/files/write`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
    // Determine language from extension
    let language = "plaintext";
    if (filename.endsWith('.json')) language = "json";
    else if (filename.endsWith('.yml') || filename.endsWith('.yaml')) language = "yaml";
    else if (filename.endsWith('.properties')) language = "ini";
    else if (filename.endsWith('.js')) language = "javascript";

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-4 border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setEditingFile(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="font-mono text-sm">{editingFile}</div>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => setEditingFile(null)}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
        <div className="h-[600px] border rounded-md overflow-hidden">
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
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const pathParts = currentPath.split("/").filter(p => p);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b pb-4 border-gray-200 dark:border-gray-800">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#" onClick={(e) => { e.preventDefault(); navigateToBreadcrumb(-1); }}>
                /root
              </BreadcrumbLink>
            </BreadcrumbItem>
            {pathParts.map((part, idx) => (
              <div key={idx} className="flex items-center">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="#" onClick={(e) => { e.preventDefault(); navigateToBreadcrumb(idx); }}>
                    {part}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="border rounded-md border-gray-200 dark:border-gray-800">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50%]">Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Last Modified</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentPath !== "/" && currentPath !== "" && (
              <TableRow className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900" onClick={navigateUp}>
                <TableCell className="font-medium flex items-center space-x-2">
                  <Folder className="h-4 w-4 text-blue-500" />
                  <span>..</span>
                </TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
              </TableRow>
            )}
            
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Loading files...
                </TableCell>
              </TableRow>
            ) : files.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-gray-500">
                  This directory is empty
                </TableCell>
              </TableRow>
            ) : (
              files.map((file) => (
                <TableRow 
                  key={file.name} 
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  onClick={() => handleRowClick(file)}
                >
                  <TableCell className="font-medium flex items-center space-x-3">
                    {file.isDirectory ? (
                      <Folder className="h-5 w-5 text-blue-500 fill-blue-500/20" />
                    ) : (
                      <FileText className="h-5 w-5 text-gray-500" />
                    )}
                    <span>{file.name}</span>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {file.isDirectory ? "--" : formatSize(file.size)}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {new Date(file.lastModified).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                      onClick={(e) => handleDelete(e, file)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
