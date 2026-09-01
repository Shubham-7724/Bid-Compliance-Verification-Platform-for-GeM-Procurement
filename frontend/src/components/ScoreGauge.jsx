import React from 'react';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

export default function ScoreGauge({ score = 0, riskLevel = "Medium Risk", status = "Partially Compliant" }) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let colorClass = "text-emerald-600 stroke-emerald-500";
  let bgBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
  let RiskIcon = ShieldCheck;

  if (score >= 80) {
    colorClass = "text-emerald-600 stroke-emerald-500";
    bgBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
    RiskIcon = ShieldCheck;
  } else if (score >= 50) {
    colorClass = "text-amber-600 stroke-amber-500";
    bgBadge = "bg-amber-50 text-amber-700 border-amber-200";
    RiskIcon = ShieldAlert;
  } else {
    colorClass = "text-rose-600 stroke-rose-500";
    bgBadge = "bg-rose-50 text-rose-700 border-rose-200";
    RiskIcon = ShieldX;
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-slate-200 shadow-soft">
      <div className="relative flex items-center justify-center">
        <svg className="w-36 h-36 transform -rotate-90">
          <circle
            cx="72"
            cy="72"
            r={radius}
            className="stroke-slate-100"
            strokeWidth="10"
            fill="transparent"
          />
          <circle
            cx="72"
            cy="72"
            r={radius}
            className={`${colorClass} transition-all duration-1000 ease-out`}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{score}</span>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">/ 100</span>
        </div>
      </div>

      <div className="mt-4 text-center">
        <div className="flex items-center justify-center gap-1.5 mb-1.5">
          <RiskIcon className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Risk Tier: <span className="font-extrabold">{riskLevel}</span>
          </span>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold border inline-block ${bgBadge}`}>
          {status}
        </div>
      </div>
    </div>
  );
}
