import React, { useState, useEffect } from 'react';
import { History, Search, Eye } from 'lucide-react';
import { getAllEvaluations, SAMPLE_BIDS_CATALOG } from '../services/api';
import ReportModal from './ReportModal';

export default function AuditHistory({ onSelectEvaluation }) {
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedForReport, setSelectedForReport] = useState(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await getAllEvaluations();
      if (data && data.length > 0) {
        setEvaluations(data);
      } else {
        setEvaluations(SAMPLE_BIDS_CATALOG.map(s => ({
          id: s.id,
          filename: s.filename,
          tender_id: s.tenderId,
          score: s.score,
          compliance_status: s.status,
          officer_decision: s.officerDecision,
          created_at: s.date,
          passed_checks: s.passedChecks,
          failed_checks: s.failedChecks,
          ai_summary: s.aiSummary,
          parsed_data: s.parsed
        })));
      }
    } catch (err) {
      console.error(err);
      setEvaluations(SAMPLE_BIDS_CATALOG.map(s => ({
        id: s.id,
        filename: s.filename,
        tender_id: s.tenderId,
        score: s.score,
        compliance_status: s.status,
        officer_decision: s.officerDecision,
        created_at: s.date,
        passed_checks: s.passedChecks,
        failed_checks: s.failedChecks,
        ai_summary: s.aiSummary,
        parsed_data: s.parsed
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const filtered = evaluations.filter((item) => {
    const matchesSearch =
      (item.filename || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tender_id || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'ALL') return matchesSearch;
    if (statusFilter === 'COMPLIANT') return matchesSearch && (item.score >= 80 || item.compliance_status === 'Compliant');
    if (statusFilter === 'PARTIAL') return matchesSearch && (item.score >= 50 && item.score < 80);
    if (statusFilter === 'NON_COMPLIANT') return matchesSearch && (item.score < 50);
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Statutory Audit Trail & Historical Records
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Official auditable records of all statutory checks and officer decisions.
              </p>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Tender ID or Filename..."
              className="w-full text-xs sm:text-sm pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2.5 mt-6 pt-5 border-t border-slate-100 overflow-x-auto scrollbar-none text-xs font-bold">
          {['ALL', 'COMPLIANT', 'PARTIAL', 'NON_COMPLIANT'].map((filterKey) => (
            <button
              key={filterKey}
              onClick={() => setStatusFilter(filterKey)}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                statusFilter === filterKey
                  ? 'bg-blue-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filterKey === 'ALL' && 'All Audits'}
              {filterKey === 'COMPLIANT' && 'Compliant (80-100)'}
              {filterKey === 'PARTIAL' && 'Partially Compliant (50-79)'}
              {filterKey === 'NON_COMPLIANT' && 'Non-Compliant (<50)'}
            </button>
          ))}
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-black border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Tender ID</th>
                <th className="px-6 py-4">Document File</th>
                <th className="px-6 py-4">Audit Score</th>
                <th className="px-6 py-4">Statutory Status</th>
                <th className="px-6 py-4">Officer Decision</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    Loading records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    
                    <td className="px-6 py-4 font-black text-blue-900">
                      {item.tender_id || 'GEM/2026/B/894721'}
                    </td>

                    <td className="px-6 py-4 font-semibold truncate max-w-[200px]" title={item.filename}>
                      {item.filename}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full font-black text-xs inline-block ${
                        item.score >= 80 ? 'bg-emerald-100 text-emerald-800' : item.score >= 50 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {item.score} / 100
                      </span>
                    </td>

                    <td className="px-6 py-4 font-bold text-slate-900">
                      {item.compliance_status || (item.score >= 80 ? 'Compliant' : item.score >= 50 ? 'Partially Compliant' : 'Non-Compliant')}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${
                        item.officer_decision === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : item.officer_decision === 'Rejected'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {item.officer_decision || 'Pending Review'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-500 font-medium text-xs">
                      {item.created_at || 'Just now'}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedForReport(item)}
                        className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-900 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                        <span>Inspect</span>
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedForReport && (
        <ReportModal
          evaluation={selectedForReport}
          onClose={() => setSelectedForReport(null)}
        />
      )}

    </div>
  );
}
