'use client';

import { useEffect, useState } from 'react';
import { 
  FileText, Briefcase, FileDown, Printer, Loader2, 
  CheckCircle2, AlertCircle, XCircle, Search, Mail, Phone
} from 'lucide-react';

interface ReportRow {
  candidateName: string;
  email: string;
  phone: string;
  experience: number;
  currentCompany: string;
  location: string;
  matchedSkills: string;
  missingSkills: string;
  matchScore: number;
  recommendation: 'SHORTLIST' | 'REVIEW' | 'REJECT';
  hrStatus: 'PENDING' | 'SHORTLISTED' | 'REJECTED' | 'HOLD';
  remarks: string;
}

interface Job {
  id: string;
  title: string;
  department: string;
}

export default function ReportsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [rows, setRows] = useState<ReportRow[]>([]);
  
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch('/api/jobs');
        const data = await res.json();
        if (res.ok && data.success) {
          setJobs(data.jobs);
          if (data.jobs.length > 0) {
            setSelectedJobId(data.jobs[0].id);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingJobs(false);
      }
    }
    fetchJobs();
  }, []);

  useEffect(() => {
    if (selectedJobId) {
      fetchReportData();
    } else {
      setRows([]);
    }
  }, [selectedJobId]);

  async function fetchReportData() {
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/reports?jobId=${selectedJobId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setRows(data.report);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReport(false);
    }
  }

  // Comma Separated CSV Exporter
  const handleExportCSV = () => {
    if (rows.length === 0) return;

    const headers = [
      'Candidate Name',
      'Email',
      'Phone',
      'Experience (Yrs)',
      'Current Company',
      'Location',
      'Matched Required Skills',
      'Missing Required Skills',
      'Match Score',
      'Recommendation',
      'HR Status',
      'Remarks'
    ];

    const csvContent = [
      headers.join(','), // join headers
      ...rows.map(row => [
        `"${row.candidateName.replace(/"/g, '""')}"`,
        `"${row.email.replace(/"/g, '""')}"`,
        `"${row.phone.replace(/"/g, '""')}"`,
        row.experience,
        `"${row.currentCompany.replace(/"/g, '""')}"`,
        `"${row.location.replace(/"/g, '""')}"`,
        `"${row.matchedSkills.replace(/"/g, '""')}"`,
        `"${row.missingSkills.replace(/"/g, '""')}"`,
        row.matchScore,
        row.recommendation,
        row.hrStatus,
        `"${row.remarks.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const targetJob = jobs.find(j => j.id === selectedJobId);
    const jobTitle = targetJob ? targetJob.title.replace(/\s+/g, '_') : 'Job';
    const timestamp = new Date().toISOString().slice(0, 10);

    link.setAttribute('href', url);
    link.setAttribute('download', `AR_Hiring_Report_${jobTitle}_${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-400 font-bold';
    if (score >= 50) return 'text-amber-400 font-bold';
    return 'text-rose-400 font-bold';
  };

  if (loadingJobs) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm font-semibold text-slate-400">Loading Job Matrix...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12 print:p-0">
      
      {/* Header section (hidden on browser print layouts) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
            Hiring & Screening Reports
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Preview match profiles, download CSV Excel logs, or compile high-end printable sheets.
          </p>
        </div>

        {rows.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-800 bg-slate-900/30 hover:bg-slate-800/40 text-slate-300 text-xs font-semibold rounded-xl transition-all duration-300 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print Report (PDF)
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 text-indigo-400 text-xs font-bold rounded-xl transition-all duration-300 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              Export CSV Excel
            </button>
          </div>
        )}
      </div>

      {/* Target Job Selector Card (hidden on print layouts) */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-lg space-y-4 print:hidden">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-indigo-400" />
          Choose Job Requirement Report
        </label>
        
        {jobs.length > 0 ? (
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="glass-input w-full px-4 py-3.5 rounded-xl shadow-inner text-sm font-semibold"
          >
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title} ({j.department})</option>
            ))}
          </select>
        ) : (
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs font-semibold flex items-center gap-2">
            No active job requirements found. Create a Job Requirement before compiling reports.
          </div>
        )}
      </div>

      {/* Report Table Card */}
      {selectedJobId && (
        <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-lg space-y-6 print:border-none print:shadow-none print:bg-transparent">
          
          {/* Print only Header section */}
          <div className="hidden print:block text-center border-b-2 border-slate-800 pb-5 space-y-2">
            <h1 className="text-3xl font-extrabold text-slate-100">Enacton Recruit - Hiring Assessment</h1>
            <p className="text-sm text-slate-400">
              Job: {jobs.find(j => j.id === selectedJobId)?.title} • Date Compiled: {new Date().toLocaleDateString()}
            </p>
          </div>

          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800/40 pb-3 print:hidden">
            <FileText className="w-5 h-5 text-indigo-400" />
            Matching Matrix Preview ({rows.length} records)
          </h2>

          {loadingReport ? (
            <div className="py-12 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <span className="text-sm font-semibold text-slate-400">Compiling Report Sheet...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/60 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-2">Candidate Name</th>
                    <th className="py-4 px-2">Email</th>
                    <th className="py-4 px-2">Phone</th>
                    <th className="py-4 px-2">Experience</th>
                    <th className="py-4 px-2">Company</th>
                    <th className="py-4 px-2">Matched Required</th>
                    <th className="py-4 px-2">Missing Required</th>
                    <th className="py-4 px-2 text-center">Score</th>
                    <th className="py-4 px-2 text-right">Rec Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-xs">
                  {rows.length > 0 ? (
                    rows.map((row, idx) => (
                      <tr key={idx} className="group hover:bg-slate-900/10 transition-colors duration-300">
                        <td className="py-4 px-2 font-bold text-slate-200">{row.candidateName}</td>
                        <td className="py-4 px-2 text-slate-400 font-medium">{row.email}</td>
                        <td className="py-4 px-2 text-slate-400 font-medium">{row.phone}</td>
                        <td className="py-4 px-2 text-slate-300 font-semibold">{row.experience} Yrs</td>
                        <td className="py-4 px-2 text-slate-400 font-medium">{row.currentCompany}</td>
                        <td className="py-4 px-2 text-slate-400 font-medium max-w-[150px] truncate" title={row.matchedSkills}>
                          {row.matchedSkills || 'None'}
                        </td>
                        <td className="py-4 px-2 text-slate-400 font-medium max-w-[150px] truncate text-rose-400/90" title={row.missingSkills}>
                          {row.missingSkills || 'None'}
                        </td>
                        <td className="py-4 px-2 text-center">
                          <span className={getScoreColor(row.matchScore)}>{row.matchScore}%</span>
                        </td>
                        <td className="py-4 px-2 text-right">
                          <span className={`px-2 py-0.5 rounded font-extrabold text-[9px] uppercase tracking-wider ${
                            row.hrStatus === 'SHORTLISTED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                            row.hrStatus === 'HOLD' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' :
                            row.hrStatus === 'REJECTED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10' :
                            'bg-slate-900 border border-slate-800 text-slate-400'
                          }`}>
                            {row.hrStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500 font-semibold italic">
                        No screenings available under this job requirement category yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
