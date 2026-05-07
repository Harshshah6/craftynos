import Link from 'next/link';
import { Server, Settings, Users, Terminal } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white dark:bg-gray-800">
        <div className="flex h-16 items-center border-b px-6">
          <span className="text-xl font-bold tracking-tight">CraftyNOS</span>
        </div>
        <nav className="space-y-1 p-4">
          <Link href="/" className="flex items-center space-x-3 rounded-lg px-3 py-2 text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700">
            <Server className="h-5 w-5" />
            <span>Servers</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
