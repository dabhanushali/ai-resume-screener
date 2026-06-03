'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase, Users, CheckCircle2, AlertCircle, XCircle,
  MapPin, Clock, Calendar, CheckSquare, Loader2, ArrowLeft,
  ArrowRight, ShieldCheck, HelpCircle, FileDown, Check, X, Sliders
} from 'lucide-react';

interface Screening {
  id: string;
  matchScore: number;
  recommendation: 'SHORTLIST' | 'REVIEW' | 'REJECT';
  hrStatus: 'PENDING' | 'SHORTLISTED' | 'REJECTED' | 'HOLD';
  hrNotes: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string;
    totalExperience: number;
    currentCompany: string | null;
    currentDesignation: string | null;
  };
}

interface JobDetail {
  id: string;
  title: string;
  department: string;
  employmentType: string;
  location: string;
  minExperience: number;
  maxExperience: number;
  minMatchScore: number;
  requiredSkills: string[];
  preferredSkills: string[];
  minDegree: string;
  noticePeriod: string;
  certifications: string[];
  keywords: string[];

  weightSkills: number;
  weightExperience: number;
  weightRelevance: number;
  weightPreferred: number;
  weightEducation: number;
  weightNoticePeriod: number;

  screenings: Screening[];
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedScreeningIds, setSelectedScreeningIds] = useState<string[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkMessage, setBulkMessage] = useState('');

  useEffect(() => {
    fetchJobDetail();
  }, [jobId]);

  async function fetchJobDetail() {
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setJob(data.job);
        setSelectedScreeningIds(prev => prev.filter(id => data.job.screenings.some((s: Screening) => s.id === id)));
      } else {
        router.push('/jobs');
      }
    } catch (e) {
      console.error(e);
      router.push('/jobs');
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStatus = async (screeningId: string, status: string) => {
    setUpdatingId(screeningId);
    try {
      const res = await fetch(`/api/screenings/${screeningId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hrStatus: status }),
      });
      if (res.ok) {
        fetchJobDetail();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleScreeningSelection = (screeningId: string) => {
    setSelectedScreeningIds(prev =>
      prev.includes(screeningId) ? prev.filter(id => id !== screeningId) : [...prev, screeningId]
    );
  };

  const toggleAllScreenings = () => {
    if (!job) return;
    setSelectedScreeningIds(prev => prev.length === job.screenings.length ? [] : job.screenings.map(s => s.id));
  };

  const handleBulkStatus = async (status: 'SHORTLISTED' | 'REJECTED') => {
    if (selectedScreeningIds.length === 0) return;
    setBulkUpdating(true);
    setBulkMessage('');
    try {
      const responses = await Promise.all(selectedScreeningIds.map(screeningId =>
        fetch(`/api/screenings/${screeningId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hrStatus: status }),
        })
      ));
      if (responses.some(res => !res.ok)) {
        throw new Error('One or more selected candidates could not be updated.');
      }
      setBulkMessage(`${selectedScreeningIds.length} candidate(s) updated.`);
      setSelectedScreeningIds([]);
      fetchJobDetail();
    } catch (e) {
      console.error(e);
      setBulkMessage('Bulk update failed. Please try again.');
    } finally {
      setBulkUpdating(false);
    }
  };

  const exportSelected = () => {
    if (!job || selectedScreeningIds.length === 0) return;
    const selected = job.screenings.filter(s => selectedScreeningIds.includes(s.id));
    const escapeCsv = (value: string | number | null | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['Candidate', 'Email', 'Phone', 'Current Role', 'Company', 'Experience', 'Match Score', 'Recommendation', 'Recruiter Status'],
      ...selected.map(s => [
        s.candidate.name,
        s.candidate.email,
        s.candidate.phone,
        s.candidate.currentDesignation || '',
        s.candidate.currentCompany || '',
        s.candidate.totalExperience,
        s.matchScore,
        s.recommendation,
        s.hrStatus
      ])
    ];
    const csv = rows.map(row => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${job.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-selected-candidates.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getRecBadge = (rec: string) => {
    switch (rec) {
      case 'SHORTLIST':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'REVIEW':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
  };

  const getHrBadge = (status: string) => {
    switch (status) {
      case 'SHORTLISTED':
        return 'bg-emerald-500 text-slate-900';
      case 'REJECTED':
        return 'bg-rose-500 text-slate-900';
      case 'HOLD':
        return 'bg-amber-500 text-slate-900';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm font-semibold text-slate-400">Loading Job Criteria Matrix...</span>
      </div>
    );
  }

  if (!job) return null;

  // Screening yield calculations
  const totalApplicants = job.screenings.length;
  const shortlisted = job.screenings.filter(s => s.hrStatus === 'SHORTLISTED' || (s.hrStatus === 'PENDING' && s.recommendation === 'SHORTLIST')).length;
  const reviews = job.screenings.filter(s => s.hrStatus === 'HOLD' || (s.hrStatus === 'PENDING' && s.recommendation === 'REVIEW')).length;
  const rejected = job.screenings.filter(s => s.hrStatus === 'REJECTED' || (s.hrStatus === 'PENDING' && s.recommendation === 'REJECT')).length;

  return (
    <div className="space-y-8 animate-fade-in pb-12">

      {/* Header back row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/jobs')}
            className="p-2.5 rounded-xl border border-slate-800/80 bg-slate-900/20 text-slate-400 hover:text-slate-200 transition-all duration-300 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-100">{job.title}</h1>
            <p className="text-slate-400 text-sm mt-0.5">{job.department} • Job Requirement Overview</p>
          </div>
        </div>
        <Link
          href={`/upload?jobId=${job.id}`}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 hover-glow transition-all duration-200 shadow-sm cursor-pointer shrink-0"
        >
          Screen Resumes For This Job
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Yield Ratio Panels */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800/40 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Applicants</span>
            <span className="text-2xl font-extrabold text-slate-200 mt-1 block">{totalApplicants}</span>
          </div>
          <Users className="w-5 h-5 text-indigo-400" />
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/10 flex items-center justify-between shadow-lg shadow-emerald-500/5">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Shortlisted</span>
            <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">{shortlisted}</span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-amber-500/10 flex items-center justify-between shadow-lg shadow-amber-500/5">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Review Queue</span>
            <span className="text-2xl font-extrabold text-amber-400 mt-1 block">{reviews}</span>
          </div>
          <AlertCircle className="w-5 h-5 text-amber-400" />
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-rose-500/10 flex items-center justify-between shadow-lg shadow-rose-500/5">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Rejected</span>
            <span className="text-2xl font-extrabold text-rose-400 mt-1 block">{rejected}</span>
          </div>
          <XCircle className="w-5 h-5 text-rose-400" />
        </div>
      </div>

      {/* Grid Split: Job Requirements specs & Calibrated weights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Specifications */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-lg space-y-4 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800/40 pb-3">
            <Briefcase className="w-4.5 h-4.5 text-indigo-400" />
            Job Benchmarks
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <p className="text-slate-400">Location: <span className="text-slate-200 font-semibold">{job.location}</span></p>
            <p className="text-slate-400">Classification: <span className="text-slate-200 font-semibold">{job.employmentType}</span></p>
            <p className="text-slate-400">Experience Range: <span className="text-slate-200 font-semibold">{job.minExperience}–{job.maxExperience} years</span></p>
            <p className="text-slate-400">Minimum Degree: <span className="text-slate-200 font-semibold">{job.minDegree}</span></p>
            <p className="text-slate-400">Notice Period Max: <span className="text-slate-200 font-semibold">{job.noticePeriod}</span></p>
          </div>

          <div className="border-t border-slate-800/40 pt-4 space-y-3">
            <div>
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Required Skills</span>
              <div className="flex flex-wrap gap-1.5">
                {job.requiredSkills.map(tag => (
                  <span key={tag} className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold rounded-lg">{tag}</span>
                ))}
              </div>
            </div>

            {job.preferredSkills.length > 0 && (
              <div>
                <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Preferred Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {job.preferredSkills.map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold rounded-lg">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Scoring Weights */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-lg space-y-4">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800/40 pb-3">
            <Sliders className="w-4.5 h-4.5 text-purple-400" />
            Match Score Settings
          </h2>
          <div className="space-y-2 text-xs font-semibold text-slate-400">
            <div className="flex justify-between"><span>Required Skills</span><span className="text-indigo-400">{job.weightSkills}%</span></div>
            <div className="flex justify-between"><span>Experience Level</span><span className="text-indigo-400">{job.weightExperience}%</span></div>
            <div className="flex justify-between"><span>Designation Relevance</span><span className="text-indigo-400">{job.weightRelevance}%</span></div>
            <div className="flex justify-between"><span>Preferred Skills</span><span className="text-indigo-400">{job.weightPreferred}%</span></div>
            <div className="flex justify-between"><span>Academic Degree</span><span className="text-indigo-400">{job.weightEducation}%</span></div>
            <div className="flex justify-between"><span>Notice Period</span><span className="text-indigo-400">{job.weightNoticePeriod}%</span></div>
          </div>
        </div>

      </div>

      {/* Screened Applicants Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/40 pb-3">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Evaluated Candidates ({job.screenings.length})
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {bulkMessage && <span className="text-xs font-semibold text-slate-400">{bulkMessage}</span>}
            <button
              type="button"
              onClick={() => handleBulkStatus('SHORTLISTED')}
              disabled={bulkUpdating || selectedScreeningIds.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700 disabled:opacity-40"
            >
              <Check className="w-3.5 h-3.5" />
              Shortlist Selected
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatus('REJECTED')}
              disabled={bulkUpdating || selectedScreeningIds.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-xs font-bold text-red-700 disabled:opacity-40"
            >
              <X className="w-3.5 h-3.5" />
              Reject Selected
            </button>
            <button
              type="button"
              onClick={exportSelected}
              disabled={selectedScreeningIds.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-700 disabled:opacity-40"
            >
              <FileDown className="w-3.5 h-3.5" />
              Export Selected
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800/60 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-4 px-4">
                  <button
                    type="button"
                    onClick={toggleAllScreenings}
                    className="inline-flex items-center justify-center text-slate-500 hover:text-blue-700"
                    title="Select all candidates"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                </th>
                <th className="py-4 px-4">Candidate</th>
                <th className="py-4 px-4 text-center">Match Score</th>
                <th className="py-4 px-4">Recommendation</th>
                <th className="py-4 px-4">Recruiter Status</th>
                <th className="py-4 px-4">Experience</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 text-sm">
              {job.screenings.length > 0 ? (
                job.screenings.map((sc) => (
                  <tr key={sc.id} className="group hover:bg-slate-900/10 transition-colors duration-300">
                    <td className="py-4 px-4">
                      <input
                        type="checkbox"
                        checked={selectedScreeningIds.includes(sc.id)}
                        onChange={() => toggleScreeningSelection(sc.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <Link href={`/candidates/${sc.candidate.id}`} className="font-bold text-slate-200 hover:text-indigo-400 transition-all duration-200">
                          {sc.candidate.name}
                        </Link>
                        <p className="text-xs text-slate-400 mt-0.5">{sc.candidate.currentCompany || 'N/A'}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center justify-center w-9 h-9 rounded-full font-extrabold border text-xs shadow-inner ${sc.matchScore >= 75 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          sc.matchScore >= 50 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                        {sc.matchScore}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 text-[10px] font-bold border rounded-lg uppercase tracking-wider ${getRecBadge(sc.recommendation)}`}>
                        {sc.recommendation}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-0.5 text-[10px] font-extrabold uppercase rounded-md tracking-wider ${getHrBadge(sc.hrStatus)}`}>
                        {sc.hrStatus}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-400 font-semibold">
                      {sc.candidate.totalExperience} Yrs Exp
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                        {/* Status updating action shortcuts */}
                        <button
                          disabled={updatingId === sc.id || sc.hrStatus === 'SHORTLISTED'}
                          onClick={() => handleUpdateStatus(sc.id, 'SHORTLISTED')}
                          className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                          title="Shortlist applicant"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          disabled={updatingId === sc.id || sc.hrStatus === 'HOLD'}
                          onClick={() => handleUpdateStatus(sc.id, 'HOLD')}
                          className="p-1 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg cursor-pointer"
                          title="Hold/Review candidate"
                        >
                          <HelpCircle className="w-4 h-4" />
                        </button>
                        <button
                          disabled={updatingId === sc.id || sc.hrStatus === 'REJECTED'}
                          onClick={() => handleUpdateStatus(sc.id, 'REJECTED')}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                          title="Reject candidate"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <Link
                          href={`/screenings/${sc.id}`}
                          className="ml-2 px-3 py-1.5 bg-slate-900/60 border border-slate-800 text-[11px] font-bold text-slate-300 rounded-lg hover:text-indigo-400 hover:border-indigo-500/30 transition-all duration-300 cursor-pointer"
                        >
                          Open Review
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-semibold">
                    No candidates screened for this job requirement. Start by uploading resumes!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
