'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Plus, Copy, Archive, Trash2, 
  MapPin, Clock, Calendar, Loader2, ArrowRight, Pencil, RotateCcw
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  department: string;
  employmentType: string;
  location: string;
  minExperience: number;
  maxExperience: number;
  minMatchScore: number;
  isArchived: boolean;
  createdAt: string;
  _count: { screenings: number };
}

interface Template {
  id: string;
  sourceType: 'template' | 'archivedJob';
  sourceId: string;
  name: string;
  title: string;
  department: string;
  employmentType: string;
  location: string;
  minExperience: number;
  maxExperience: number;
  minMatchScore: number;
  isArchived?: boolean;
}

export default function JobsPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'templates'>('active');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchJobsAndTemplates();
  }, []);

  async function fetchJobsAndTemplates() {
    setLoading(true);
    try {
      // 1. Fetch active jobs
      const jobsRes = await fetch('/api/jobs');
      const jobsData = await jobsRes.json();
      if (jobsRes.ok && jobsData.success) {
        setJobs(jobsData.jobs);
      }

      // 2. Fetch templates
      const tempRes = await fetch('/api/templates');
      const tempData = await tempRes.json();
      if (tempRes.ok && tempData.success) {
        setTemplates(tempData.templates);
      }
    } catch (e: any) {
      setError('Could not load hiring requirements.');
    } finally {
      setLoading(false);
    }
  }

  const handleArchive = async (id: string, currentlyArchived: boolean) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: !currentlyArchived }),
      });
      if (res.ok) {
        fetchJobsAndTemplates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUnarchive = async (id: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: false }),
      });
      if (res.ok) {
        fetchJobsAndTemplates();
        setActiveTab('active');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this requirement and its screening results permanently?')) return;
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchJobsAndTemplates();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDuplicate = async (job: Job) => {
    setError('');
    try {
      // Fetch full job details first
      const detailRes = await fetch(`/api/jobs/${job.id}`);
      const detailData = await detailRes.json();
      if (!detailRes.ok) throw new Error('Could not duplicate');

      const fullJob = detailData.job;
      
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fullJob,
          title: `${fullJob.title} (Copy)`,
          id: undefined, // Let db generate a new ID
          screenings: undefined
        }),
      });

      if (res.ok) {
        fetchJobsAndTemplates();
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Could not duplicate');
      }
    } catch (e: any) {
      setError('Duplication failed: ' + e.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm font-semibold text-slate-500">Loading hiring requirements...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Hiring Requirements
          </h1>
          <p className="text-slate-600 mt-1 text-base">
            Manage the job requirements your team uses to screen candidates.
          </p>
        </div>
        <Link
          href="/jobs/new"
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-sm cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Requirement
        </Link>
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
            activeTab === 'active'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Active Requirements ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-6 py-3 text-sm font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
            activeTab === 'templates'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Saved Templates ({templates.length})
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Active Jobs Tab */}
      {activeTab === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {jobs.length > 0 ? (
            jobs.map((job) => (
              <div 
                key={job.id} 
                className="glass-panel p-6 border border-slate-200 flex flex-col justify-between hover-glow transition-all duration-200 group"
              >
                <div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100 rounded-md">
                      {job.department}
                    </span>
                    <div className="flex items-center gap-2 opacity-75 group-hover:opacity-100 transition-opacity duration-200">
                      <Link
                        href={`/jobs/new?jobId=${job.id}`}
                        className="p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 cursor-pointer"
                        title="Edit requirement"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDuplicate(job)}
                        className="p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 cursor-pointer"
                        title="Duplicate requirement"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleArchive(job.id, job.isArchived)}
                        className="p-2 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all duration-200 cursor-pointer"
                        title="Archive requirement"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 cursor-pointer"
                        title="Delete requirement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <Link href={`/jobs/${job.id}`} className="block mt-4">
                    <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors duration-200">
                      {job.title}
                    </h2>
                  </Link>

                  {/* Metadata Row */}
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600 font-medium">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      {job.employmentType}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {job.minExperience}-{job.maxExperience} years experience
                    </span>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-200 pt-4 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Minimum match score</span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5">{job.minMatchScore}% match</span>
                  </div>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="flex items-center gap-1 px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 transition-all duration-200 cursor-pointer"
                  >
                    View Candidates ({job._count.screenings})
                    <ArrowRight className="w-3 h-3 ml-0.5" />
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 py-12 text-center text-slate-500 font-semibold glass-panel">
              No active requirements yet. Create one to start screening candidates.
            </div>
          )}
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((temp) => (
            <div 
              key={temp.id} 
              className="glass-panel p-6 border border-slate-200 flex flex-col justify-between hover-glow transition-all duration-200 group"
            >
              <div>
                <div className="flex justify-between items-start gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100 rounded-md">
                      {temp.department}
                    </span>
                    {temp.sourceType === 'archivedJob' && (
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100 rounded-md">
                        Archived
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 opacity-75 group-hover:opacity-100 transition-opacity duration-200">
                    <Link
                      href={
                        temp.sourceType === 'archivedJob'
                          ? `/jobs/new?jobId=${temp.sourceId}`
                          : `/jobs/new?templateId=${temp.sourceId}&editTemplate=true`
                      }
                      className="p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all duration-200 cursor-pointer"
                      title="Edit template"
                    >
                      <Pencil className="w-4 h-4" />
                    </Link>
                    {temp.sourceType === 'archivedJob' && (
                      <button
                        onClick={() => handleUnarchive(temp.sourceId)}
                        className="p-2 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all duration-200 cursor-pointer"
                        title="Unarchive requirement"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-slate-900 mt-4 group-hover:text-blue-700 transition-colors duration-200">
                  {temp.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Reusable requirement details for similar openings.
                </p>

                <div className="mt-4 space-y-2 text-xs text-slate-600 font-semibold">
                  <p>Role: <span className="text-slate-900">{temp.title}</span></p>
                  <p>Experience: <span className="text-slate-900">{temp.minExperience}-{temp.maxExperience} years</span></p>
                  <p>Minimum match: <span className="text-slate-900">{temp.minMatchScore}%</span></p>
                </div>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-4">
                <Link
                  href={`/jobs/new?templateId=${temp.sourceId}`}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs font-bold text-blue-700 hover:text-white hover:bg-blue-600 transition-all duration-200 cursor-pointer"
                >
                  Use This Template
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
