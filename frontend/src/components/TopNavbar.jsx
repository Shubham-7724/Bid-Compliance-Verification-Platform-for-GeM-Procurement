import React from 'react';
import { Shield, LogOut, CheckCircle, Bell } from 'lucide-react';

export default function TopNavbar({ backendStatus, activeTender = "GEM/2026/B/894721", user, onLogout }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
      {/* Indian National Tricolor Line */}
      <div className="h-1.5 w-full grid grid-cols-3">
        <div className="bg-[#FF9933]"></div>
        <div className="bg-white border-y border-slate-200"></div>
        <div className="bg-[#138808]"></div>
      </div>

      <div className="px-6 py-3.5 flex items-center justify-between gap-4">
        
        {/* Active Tender Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs sm:text-sm font-extrabold text-blue-900">
            <span>Tender:</span>
            <span className="text-blue-950 font-black">{activeTender}</span>
          </div>
          <span className="text-xs text-slate-500 font-medium hidden md:inline">
            IT Infrastructure & Services Procurement
          </span>
        </div>

        {/* Right Status & Officer Profile */}
        <div className="flex items-center gap-4">
          
          {/* Backend Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${
            backendStatus?.status === 'online'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${backendStatus?.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="hidden sm:inline">
              {backendStatus?.status === 'online' ? 'Statutory Portals Connected' : 'Demo Mode'}
            </span>
          </div>

          {/* User / Sign out */}
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-black text-slate-900">{user?.name || 'Rajesh Kumar'}</div>
              <div className="text-[11px] text-slate-500 font-semibold">{user?.id || 'GEM-PO-2026'}</div>
            </div>

            <button
              onClick={onLogout}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-all text-xs font-bold flex items-center gap-1.5"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline">Sign Out</span>
            </button>
          </div>

        </div>

      </div>
    </header>
  );
}
