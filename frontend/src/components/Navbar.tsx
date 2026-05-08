"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Menu, X, LogOut, Server, Plus, HardDrive, Terminal } from "lucide-react";

interface NavbarProps {
  title?: string;
  actions?: React.ReactNode;
}

export function Navbar({ title = "Dashboard", actions }: NavbarProps) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="w-full z-40">
      {/* 1. Global Navigation Bar (global-nav: 44px, true-black background) */}
      <div className="h-[44px] bg-apple-surface-black text-apple-canvas flex items-center justify-between px-4 md:px-8 border-b border-zinc-900 select-none relative">
        <div className="flex items-center space-x-6">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 font-semibold text-sm tracking-tight hover:opacity-80 transition-opacity">
            <span className="bg-apple-primary p-1 rounded-sm text-xs font-bold leading-none text-white tracking-widest">CN</span>
            <span className="text-white">CraftyNOS</span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className="text-[12px] font-normal tracking-tight text-zinc-300 hover:text-white transition-colors"
            >
              Servers
            </Link>
            <Link 
              href="/create" 
              className="text-[12px] font-normal tracking-tight text-zinc-300 hover:text-white transition-colors"
            >
              Deploy Container
            </Link>
          </nav>
        </div>

        {/* Right side user card / signout */}
        <div className="hidden md:flex items-center space-x-4">
          {user && (
            <span className="text-[11px] font-mono tracking-tight text-zinc-400">
              {user.email}
            </span>
          )}
          <button 
            onClick={logout}
            className="flex items-center space-x-1.5 text-[12px] font-normal tracking-tight bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white px-2.5 py-1 rounded-[8px] active-scale transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-zinc-300 hover:text-white focus:outline-none p-1"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* 2. Frosted Sub-Navigation Bar (sub-nav-frosted: 52px, sticky below global-nav, parchment translucent, backdrop-blur) */}
      <div className="sticky top-0 w-full h-[52px] border-b border-apple-hairline bg-apple-canvas-parchment/80 backdrop-blur-apple z-30 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-[19px] md:text-[21px] font-semibold text-apple-ink tracking-tight leading-none">
            {title}
          </h2>
        </div>

        {/* Sticky Actions on Right (e.g. power controls or create buttons) */}
        <div className="flex items-center space-x-2">
          {actions}
        </div>
      </div>

      {/* Mobile Slide-down Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[44px] bottom-0 bg-apple-surface-black z-50 flex flex-col p-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col space-y-4">
            <Link 
              href="/" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-xl font-normal text-zinc-200 hover:text-white py-2 border-b border-zinc-900"
            >
              Servers
            </Link>
            <Link 
              href="/create" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-xl font-normal text-zinc-200 hover:text-white py-2 border-b border-zinc-900"
            >
              Deploy Container
            </Link>
          </div>

          <div className="mt-auto flex flex-col space-y-4 pt-6 border-t border-zinc-900">
            {user && (
              <div className="text-sm font-mono text-zinc-400">
                Logged in as: {user.email}
              </div>
            )}
            <button 
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="w-full flex items-center justify-center space-x-2 bg-zinc-900 hover:bg-zinc-800 text-white py-3 rounded-[18px] text-base active-scale"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
