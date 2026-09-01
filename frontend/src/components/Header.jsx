import React from 'react';
import { Shield, Sparkles, Database, History, SearchCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, backendStatus, totalEvaluationsCount = 0 }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
      {/* Indian National Tricolor Top Accent */}
      <div className="h-1.5 w-full grid grid-cols-3">
        <div className="bg-[#FF9933]"></div>
        <div className="bg-white border-y border-slate-200"></div>
        <div className="bg-[#138808]"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between py-3.5 gap-4">
          
          {/* Logo & Portal Identity */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-900 to-indigo-950 flex items-center justify-center text-white shadow-md ring-2 ring-blue-100">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-900 text-white font-extrabold text-xs px-2 py-0.5 rounded tracking-wider uppercase">
                  GeM • AI Engine
                </span>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Govt. of India
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Bid Compliance Verification Platform
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                Automated Statutory Cross-Checking • Multi-Portal Integration • Procurement Officer Decision Support
              </p>
            </div>
          </div>

          {/* Backend Status & Quick Stats */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>GFR 2017 & Public Procurement Policy</span>
            </div>

            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              backendStatus?.status === 'online'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {backendStatus?.status === 'online' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>API Online (Port 8000)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Demo Mode (API Offline)</span>
                </>
              )}
            </div>
          </div>

        </div>

        {/* Tab Navigation */}
        <nav className="flex space-x-2 sm:space-x-4 border-t border-slate-100 pt-2 pb-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('evaluator')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'evaluator'
                ? 'bg-blue-900 text-white shadow-md shadow-blue-950/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Bid Evaluation & AI Analyzer</span>
          </button>

          <button
            onClick={() => setActiveTab('lookup')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'lookup'
                ? 'bg-blue-900 text-white shadow-md shadow-blue-950/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <SearchCheck className="w-4 h-4" />
            <span>Multi-Portal Lookup & Sandbox</span>
          </button>

          <button
            onClick={() => setActiveTab('chatbot')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'chatbot'
                ? 'bg-blue-900 text-white shadow-md shadow-blue-950/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>AI Bid Tender Assistant</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-blue-900 text-white shadow-md shadow-blue-950/20'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Audit Trail & Records</span>
            {totalEvaluationsCount > 0 && (
              <span className={`px-2 py-0.2 text-[10px] rounded-full font-extrabold ${
                activeTab === 'history' ? 'bg-blue-800 text-blue-100' : 'bg-slate-200 text-slate-700'
              }`}>
                {totalEvaluationsCount}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
}
