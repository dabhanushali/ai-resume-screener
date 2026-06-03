'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ShieldCheck, AlertCircle, CheckCircle2, XCircle, 
  Mail, Phone, MapPin, Briefcase, GraduationCap, FileText, 
  Loader2, ArrowLeft, Plus, Save, Award, AlertTriangle, RefreshCw
} from 'lucide-react';

interface Education {
  degree: string;
  institution: string;
  gradYear: string;
}

interface Employment {
  company: string;
  designation: string;
  duration: string;
}

interface Project {
  name: string;
  technologies: string[];
}

interface ScreeningDetail {
  id: string;
  matchScore: number;
  recommendation: 'SHORTLIST' | 'REVIEW' | 'REJECT';
  aiSummary: string;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  categoryScores?: Record<string, number>;
  hrStatus: 'PENDING' | 'SHORTLISTED' | 'REJECTED' | 'HOLD';
  hrNotes: string;
  remarks: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedinUrl: string | null;
    portfolioUrl: string | null;
    currentDesignation: string | null;
    currentCompany: string | null;
    totalExperience: number;
    skills: string[];
    certifications: string[];
    education: Education[];
    employmentHistory: Employment[];
    projects: Project[];
    noticePeriod: string;
  };
  job: {
    id: string;
    title: string;
    department: string;
    minMatchScore: number;
  };
}

export default function ScreeningDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const screeningId = resolvedParams.id;

  const [screening, setScreening] = useState<ScreeningDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rescreening, setRescreening] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusError, setStatusError] = useState('');
  const [notes, setNotes] = useState('');
  const [hrStatus, setHrStatus] = useState<'PENDING' | 'SHORTLISTED' | 'REJECTED' | 'HOLD'>('PENDING');

  // Tab selections
  const [activeTab, setActiveTab] = useState<'details' | 'privacy'>('details');

  useEffect(() => {
    fetchScreeningDetail();
  }, [screeningId]);

  async function fetchScreeningDetail() {
    try {
      const res = await fetch(`/api/screenings/${screeningId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setScreening(data.screening);
        setNotes(data.screening.hrNotes || '');
        setHrStatus(data.screening.hrStatus || 'PENDING');
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

  const handleSaveReview = async () => {
    setSaving(true);
    setStatusMessage('');
    setStatusError('');
    try {
      const res = await fetch(`/api/screenings/${screeningId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hrStatus, hrNotes: notes }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage('Recruiter review updated successfully.');
        fetchScreeningDetail();
      } else {
        throw new Error(data.error || 'Error updating candidate review.');
      }
    } catch (e: any) {
      console.error(e);
      setStatusError(e.message || 'Error updating candidate review.');
    } finally {
      setSaving(false);
    }
  };

  const handleRescreen = async () => {
    setRescreening(true);
    setStatusMessage('');
    setStatusError('');
    try {
      const res = await fetch(`/api/screenings/${screeningId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Re-screen failed');
      setStatusMessage('Candidate re-screened with the latest profile and job criteria.');
      fetchScreeningDetail();
    } catch (e: any) {
      setStatusError(e.message || 'Re-screen failed');
    } finally {
      setRescreening(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm font-semibold text-slate-400">Loading Screening Matrix...</span>
      </div>
    );
  }

  if (!screening) return null;

  const scoreColor = 
    screening.matchScore >= 75 ? 'text-emerald-400 stroke-emerald-500' :
    screening.matchScore >= 50 ? 'text-amber-400 stroke-amber-500' :
    'text-rose-400 stroke-rose-500';

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Header back row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/40 pb-5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-xl border border-slate-800/80 bg-slate-900/20 text-slate-400 hover:text-slate-200 transition-all duration-300 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-100">{screening.candidate.name}</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Screened against <span className="text-indigo-400 font-bold">{screening.job.title} ({screening.job.department})</span>
            </p>
          </div>
        </div>
        <button
          onClick={handleRescreen}
          disabled={rescreening}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50"
        >
          {rescreening ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Re-screen
        </button>
      </div>

      {(statusMessage || statusError) && (
        <div className={`p-4 rounded-lg border text-sm font-semibold ${
          statusError
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700'
        }`}>
          {statusError || statusMessage}
        </div>
      )}

      {/* Main Review Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Dynamic tabs for profile details and resume privacy */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex border-b border-slate-800/80">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
                activeTab === 'details'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Extracted Profile
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all duration-200 cursor-pointer ${
                activeTab === 'privacy'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Resume Privacy
            </button>
          </div>

          {activeTab === 'details' && (
            <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-lg space-y-6">
              {/* Contact Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-400 border-b border-slate-800/40 pb-5">
                <span className="flex items-center gap-2"><Mail className="w-4 h-4 text-indigo-400" />{screening.candidate.email}</span>
                <span className="flex items-center gap-2"><Phone className="w-4 h-4 text-indigo-400" />{screening.candidate.phone}</span>
                <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-indigo-400" />{screening.candidate.location}</span>
                <span className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-indigo-400" />Exp: {screening.candidate.totalExperience} years</span>
              </div>

              {/* Skills and Certifications */}
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Technical Skills</span>
                  <div className="flex flex-wrap gap-1.5">
                    {screening.candidate.skills.map(s => (
                      <span key={s} className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold rounded-lg">{s}</span>
                    ))}
                  </div>
                </div>

                {screening.candidate.certifications.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Certifications</span>
                    <div className="flex flex-wrap gap-1.5">
                      {screening.candidate.certifications.map(s => (
                        <span key={s} className="px-2.5 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold rounded-lg">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Professional History */}
              <div className="space-y-4 border-t border-slate-800/40 pt-5">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Briefcase className="w-4.5 h-4.5 text-purple-400" />
                  Work Experience Timeline
                </h3>
                <div className="space-y-4">
                  {screening.candidate.employmentHistory.map((work, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-300">{work.designation}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{work.company}</p>
                      </div>
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-900/60 border border-slate-800 text-slate-500 rounded-lg">{work.duration}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Academic History */}
              <div className="space-y-4 border-t border-slate-800/40 pt-5">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap className="w-4.5 h-4.5 text-emerald-400" />
                  Academic Qualifications
                </h3>
                <div className="space-y-4">
                  {screening.candidate.education.map((edu, idx) => (
                    <div key={idx} className="flex justify-between items-start gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-300">{edu.degree}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{edu.institution}</p>
                      </div>
                      <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-900/60 border border-slate-800 text-slate-500 rounded-lg">Class of {edu.gradYear}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-lg space-y-4">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800/40 pb-3">
                <FileText className="w-4.5 h-4.5 text-indigo-400" />
                Resume Storage Policy
              </h2>
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-slate-700 leading-relaxed">
                The uploaded PDF/DOC/DOCX is parsed in memory for screening and then discarded. Raw resume text is not stored on this candidate profile.
              </div>
            </div>
          )}
        </div>

        {/* Right Side: AI screening metrics & Decision panel */}
        <div className="space-y-6">
          
          {/* Radial score gauge & Recommendation panel */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-lg flex flex-col items-center justify-between text-center relative overflow-hidden">
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl animate-glow-pulse"></div>

            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Score Assessment</span>
            
            {/* Radial Gauge */}
            <div className="relative w-36 h-36 flex flex-col items-center justify-center mb-4">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="72" cy="72" r="62" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="transparent" />
                <circle 
                  cx="72" 
                  cy="72" 
                  r="62" 
                  strokeWidth="8" 
                  fill="transparent" 
                  strokeDasharray="389"
                  strokeDashoffset={389 - (389 * screening.matchScore) / 100}
                  strokeLinecap="round"
                  className={`transition-all duration-1000 ease-out ${scoreColor}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-slate-100">{screening.matchScore}%</span>
                <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mt-0.5">Match Score</span>
              </div>
            </div>

            <div className="space-y-2 mt-2 w-full">
              <span className={`w-full inline-block px-4 py-2 border rounded-xl text-xs font-bold uppercase tracking-wider ${
                screening.recommendation === 'SHORTLIST' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/2' :
                screening.recommendation === 'REVIEW' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-lg shadow-amber-500/2' :
                'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-lg shadow-rose-500/2'
              }`}>
                Recommendation: {screening.recommendation}
              </span>
              <p className="text-[10px] text-slate-500 font-semibold">Min match cutoff score: {screening.job.minMatchScore}%</p>
            </div>
          </div>

          {/* Strengths, weaknesses, and summary box */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/40 pb-3">
              <Award className="w-4.5 h-4.5 text-indigo-400" />
              Auditable Match Summary
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
              {screening.aiSummary}
            </p>

            <div className="space-y-3 pt-3">
              {/* Strengths */}
              {screening.strengths.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Matched because</span>
                  <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 leading-relaxed font-medium">
                    {screening.strengths.map((str, idx) => (
                      <li key={idx} className="marker:text-emerald-500">{str}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {screening.weaknesses.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-slate-800/30">
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Needs review because</span>
                  <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 leading-relaxed font-medium">
                    {screening.weaknesses.map((gap, idx) => (
                      <li key={idx} className="marker:text-rose-500">{gap}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing required skills */}
              {screening.missingSkills.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-slate-800/30">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    Missing because
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {screening.missingSkills.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold rounded">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {screening.categoryScores && (
            <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/40 pb-3">
                <ShieldCheck className="w-4.5 h-4.5 text-blue-700" />
                Score Breakdown
              </h3>
              <div className="space-y-3">
                {[
                  ['Required skills', 'skillScore', 'skillsWeighted'],
                  ['Experience', 'experienceScore', 'experienceWeighted'],
                  ['Role relevance', 'relevanceScore', 'relevanceWeighted'],
                  ['Preferred skills', 'preferredScore', 'preferredWeighted'],
                  ['Education', 'educationScore', 'educationWeighted'],
                  ['Notice period', 'noticePeriodScore', 'noticePeriodWeighted']
                ].map(([label, rawKey, weightedKey]) => {
                  const raw = Math.round(screening.categoryScores?.[rawKey] ?? 0);
                  const weighted = Math.round(screening.categoryScores?.[weightedKey] ?? 0);
                  return (
                    <div key={label} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-600">
                        <span>{label}</span>
                        <span className="text-blue-700">{raw}% / {weighted} pts</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.min(raw, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive Decision Making Panel */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800/40 pb-3">
              <SettingsIcon className="w-4.5 h-4.5 text-purple-400" />
              HR Decision Panel
            </h3>

            {/* HR status selector buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setHrStatus('SHORTLISTED')}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all duration-300 cursor-pointer ${
                  hrStatus === 'SHORTLISTED' 
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/2' 
                    : 'border-slate-800 bg-slate-900/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                Shortlist
              </button>
              <button
                type="button"
                onClick={() => setHrStatus('HOLD')}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all duration-300 cursor-pointer ${
                  hrStatus === 'HOLD' 
                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 shadow-md shadow-amber-500/2' 
                    : 'border-slate-800 bg-slate-900/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                Hold
              </button>
              <button
                type="button"
                onClick={() => setHrStatus('REJECTED')}
                className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all duration-300 cursor-pointer ${
                  hrStatus === 'REJECTED' 
                    ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-md shadow-rose-500/2' 
                    : 'border-slate-800 bg-slate-900/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                Reject
              </button>
            </div>

            {/* Recruiter Notes Text Area */}
            <div className="space-y-2 mt-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Recruiter notes / Internal comments</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add recruiting notes, interview steps, comments..."
                rows={4}
                className="glass-input w-full p-3 rounded-2xl text-xs leading-relaxed"
              ></textarea>
            </div>

            <button
              onClick={handleSaveReview}
              disabled={saving}
              className="w-full flex items-center justify-center gap-1.5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold hover-glow transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Review...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Assessment
                </>
              )}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

// Simple Settings icon definition
function SettingsIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
