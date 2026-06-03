'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, Briefcase, CheckCircle2, AlertCircle, XCircle, 
  TrendingUp, BarChart3, Loader2, ArrowRight, Activity 
} from 'lucide-react';

interface DashboardStats {
  totalCandidates: number;
  totalJobs: number;
  shortlisted: number;
  rejected: number;
  pending: number;
  averageMatchScore: number;
  candidatesPerJob: number;
  screeningSuccessRate: number;
}

interface CandidateFeed {
  id: string;
  name: string;
  email: string;
  currentDesignation: string | null;
  createdAt: string;
}

interface AuditLogEntry {
  id: string;
  userName: string;
  action: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [candidates, setCandidates] = useState<CandidateFeed[]>([]);
  const [activities, setActivities] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (!res.ok) {
          throw new Error('Not logged in');
        }
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
          setCandidates(data.latestCandidates);
          setActivities(data.recentActivity);
        }
      } catch (e) {
        console.error('Fetch dashboard error:', e);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm font-semibold text-slate-400">Loading Recruiter Console...</span>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Candidates', value: stats?.totalCandidates || 0, icon: Users, color: 'text-indigo-400', glow: 'shadow-indigo-500/10 border-indigo-500/10' },
    { label: 'Active Jobs', value: stats?.totalJobs || 0, icon: Briefcase, color: 'text-purple-400', glow: 'shadow-purple-500/10 border-purple-500/10' },
    { label: 'Shortlisted', value: stats?.shortlisted || 0, icon: CheckCircle2, color: 'text-emerald-400', glow: 'shadow-emerald-500/10 border-emerald-500/10' },
    { label: 'Pending Reviews', value: stats?.pending || 0, icon: AlertCircle, color: 'text-amber-400', glow: 'shadow-amber-500/10 border-amber-500/10' },
    { label: 'Rejected', value: stats?.rejected || 0, icon: XCircle, color: 'text-rose-400', glow: 'shadow-rose-500/10 border-rose-500/10' }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-100 text-glow-primary">
            Recruiter Console
          </h1>
          <p className="text-slate-400 mt-1 text-base">
            Screening summaries, statistics, and recent hiring activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/upload"
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 hover-glow transition-all duration-200 shadow-sm cursor-pointer"
          >
            Upload Resumes
            <ArrowRight className="w-4.5 h-4.5" />
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div 
              key={idx} 
              className={`glass-panel p-5 rounded-2xl flex flex-col justify-between hover-glow transition-all duration-300 shadow-lg border ${kpi.glow}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                <Icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold text-slate-100">{kpi.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Visualization Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SVG Match Score Gauge */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between border border-slate-800/60 shadow-lg">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-slate-100">Average Match Quality</h2>
            </div>
            <p className="text-xs text-slate-400">Total average suitability profile scoring.</p>
          </div>
          
          <div className="flex flex-col items-center justify-center py-6 relative">
            <svg className="w-36 h-36 transform -rotate-90">
              <circle cx="72" cy="72" r="62" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="transparent" />
              <circle 
                cx="72" 
                cy="72" 
                r="62" 
                stroke="url(#indigoGrad)" 
                strokeWidth="10" 
                fill="transparent" 
                strokeDasharray="389"
                strokeDashoffset={389 - (389 * (stats?.averageMatchScore || 0)) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="indigoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#14b8a6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-slate-100">{stats?.averageMatchScore || 0}%</span>
              <span className="text-xs text-indigo-400 font-semibold tracking-wider uppercase mt-0.5">Average</span>
            </div>
          </div>
          
          <div className="border-t border-slate-800/50 pt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Minimum Match Threshold</span>
            <span className="font-semibold text-slate-200">70.0%</span>
          </div>
        </div>

        {/* SVG Screening Success Circular */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between border border-slate-800/60 shadow-lg">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-slate-100">Screening Success Rate</h2>
            </div>
            <p className="text-xs text-slate-400">Percentage of candidates recommended for shortlists.</p>
          </div>
          
          <div className="flex flex-col items-center justify-center py-6 relative">
            <svg className="w-36 h-36 transform -rotate-90">
              <circle cx="72" cy="72" r="62" stroke="rgba(255,255,255,0.05)" strokeWidth="10" fill="transparent" />
              <circle 
                cx="72" 
                cy="72" 
                r="62" 
                stroke="url(#emeraldGrad)" 
                strokeWidth="10" 
                fill="transparent" 
                strokeDasharray="389"
                strokeDashoffset={389 - (389 * (stats?.screeningSuccessRate || 0)) / 100}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
              <defs>
                <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-extrabold text-slate-100">{stats?.screeningSuccessRate || 0}%</span>
              <span className="text-xs text-emerald-400 font-semibold tracking-wider uppercase mt-0.5">Shortlisted</span>
            </div>
          </div>

          <div className="border-t border-slate-800/50 pt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Average Candidates/Job</span>
            <span className="font-semibold text-slate-200">{stats?.candidatesPerJob || 0} applicants</span>
          </div>
        </div>

        {/* SVG Candidates Per Job requirement */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between border border-slate-800/60 shadow-lg">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-slate-100">Screening Yield Ratio</h2>
            </div>
            <p className="text-xs text-slate-400">Yield spread between Shortlisted, Review, and Rejected.</p>
          </div>

          <div className="py-6 flex flex-col gap-3">
            {/* Shortlisted Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Shortlisted applicants</span>
                <span className="text-emerald-400">{stats?.shortlisted}</span>
              </div>
              <div className="w-full bg-slate-900/60 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${stats?.totalCandidates ? ((stats.shortlisted / stats.totalCandidates) * 100) : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Pending Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Pending Review</span>
                <span className="text-amber-400">{stats?.pending}</span>
              </div>
              <div className="w-full bg-slate-900/60 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${stats?.totalCandidates ? ((stats.pending / stats.totalCandidates) * 100) : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Rejected Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-400">Rejected applicants</span>
                <span className="text-rose-400">{stats?.rejected}</span>
              </div>
              <div className="w-full bg-slate-900/60 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${stats?.totalCandidates ? ((stats.rejected / stats.totalCandidates) * 100) : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/50 pt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Overall Processed Batch</span>
            <span className="font-semibold text-slate-200">{stats?.totalCandidates} resumes</span>
          </div>
        </div>

      </div>

      {/* Grid Split Content: Latest Candidates & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Latest Candidates */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Latest Talent Intake
            </h2>
            <Link 
              href="/candidates" 
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors duration-200 flex items-center gap-1 cursor-pointer"
            >
              Talent Pool
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-800/40">
            {candidates.length > 0 ? (
              candidates.map((cand) => (
                <div key={cand.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0 group">
                  <div>
                    <h3 className="text-sm font-bold text-slate-200 group-hover:text-indigo-400 transition-colors duration-200">
                      {cand.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {cand.currentDesignation || 'Designation Not Extracted'}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-medium">
                      {new Date(cand.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-slate-500 font-medium">
                No candidates available in talent pool. Start by uploading resumes!
              </div>
            )}
          </div>
        </div>

        {/* Audit Log Activities */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              System Audit Trails
            </h2>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Live Feed
            </span>
          </div>

          <div className="divide-y divide-slate-800/40 max-h-[295px] overflow-y-auto pr-1">
            {activities.length > 0 ? (
              activities.map((act) => (
                <div key={act.id} className="py-3 flex items-start gap-3 first:pt-0 last:pb-0 text-xs">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 font-semibold">
                      {act.action}
                    </p>
                    <p className="text-slate-400 mt-0.5">
                      Triggered by <span className="font-medium text-slate-300">{act.userName}</span>
                      {act.metadata?.filename && ` • ${act.metadata.filename}`}
                      {act.metadata?.jobTitle && ` • ${act.metadata.jobTitle}`}
                    </p>
                  </div>
                  <span className="text-slate-500 font-semibold text-right shrink-0">
                    {new Date(act.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-slate-500 font-medium">
                No activities logged yet.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
