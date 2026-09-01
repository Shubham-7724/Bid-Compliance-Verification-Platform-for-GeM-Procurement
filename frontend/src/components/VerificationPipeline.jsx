import React from 'react';
import { FileText, Cpu, Database, Sparkles, CheckCircle } from 'lucide-react';

export default function VerificationPipeline({ step = 5 }) {
  const steps = [
    { label: "Document Ingestion", icon: FileText, desc: "PDF Parsing & OCR" },
    { label: "Entity Extraction", icon: Cpu, desc: "Regex & Pattern matching" },
    { label: "Statutory Portals", icon: Database, desc: "GSTN / MSME / PAN Cross-Check" },
    { label: "AI Verification", icon: Sparkles, desc: "Llama 3.1 & Rule Review" },
    { label: "Audit & Synthesis", icon: CheckCircle, desc: "Compliance Report Generated" }
  ];

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-5 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
          Automated Verification Pipeline
        </h4>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          Complete Multi-Portal Audit
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative">
        {steps.map((s, idx) => {
          const isDone = idx < step;
          const isCurrent = idx === step - 1;
          const Icon = s.icon;

          return (
            <div
              key={idx}
              className={`flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                isCurrent
                  ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20'
                  : isDone
                  ? 'bg-slate-50/80 border-slate-200'
                  : 'bg-slate-50/40 border-slate-100 opacity-60'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center mb-2 font-bold text-xs ${
                  isDone
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : isCurrent
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-200 text-slate-500'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800 leading-tight mb-0.5">
                {s.label}
              </span>
              <span className="text-[10px] text-slate-500 line-clamp-1">
                {s.desc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
