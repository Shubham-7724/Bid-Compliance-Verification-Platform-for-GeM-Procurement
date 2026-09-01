import React from 'react';
import { 
  Shield, LayoutDashboard, FileCheck2, Search, 
  MessageSquareText, History, LogOut 
} from 'lucide-react';

export default function Sidebar({ activeView, setActiveView, user, onLogout }) {
  const navItems = [
    { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
    { id: 'workspace', label: 'Tender Evaluation Hub', icon: FileCheck2 },
    { id: 'portal', label: 'Statutory Portal Lookup', icon: Search },
    { id: 'copilot', label: 'AI Tender Copilot', icon: MessageSquareText },
    { id: 'audit', label: 'Audit Trail & Records', icon: History },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col flex-shrink-0 border-r border-slate-800 select-none">
      
      {/* GeM Portal Brand Header */}
      <div className="p-6 border-b border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
            <Shield className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="text-sm font-black tracking-wide text-white">
              GeM • Portal
            </div>
            <div className="text-xs text-amber-400 font-semibold">
              Procurement Officer Suite
            </div>
          </div>
        </div>
      </div>

      {/* Officer Profile Card */}
      <div className="p-4 mx-4 my-4 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-900 text-blue-200 flex items-center justify-center font-black text-sm border border-blue-600">
          PO
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate">
            {user?.name || 'Rajesh Kumar'}
          </div>
          <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Tender Authority</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 px-4 py-2 space-y-2 overflow-y-auto">
        <div className="px-2 py-1 text-xs font-black uppercase tracking-wider text-slate-400">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Logout & System Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Rules:</span>
          <span className="font-semibold text-slate-200">GFR 2017 / GTC 7.1</span>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

    </aside>
  );
}
