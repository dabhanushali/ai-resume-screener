'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, Mail, Phone, MapPin, Globe, 
  Briefcase, GraduationCap, FolderOpen, Loader2, ArrowLeft,
  ArrowRight, ShieldCheck, ClipboardList, Trash2, Pencil, Save, X
} from 'lucide-react';

interface Education {
  degree: string;
  institution: string;
  gradYear: string;
  gpa?: string;
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

interface Screening {
  id: string;
  matchScore: number;
  recommendation: 'SHORTLIST' | 'REVIEW' | 'REJECT';
  hrStatus: 'PENDING' | 'SHORTLISTED' | 'REJECTED' | 'HOLD';
  hrNotes: string;
  job: {
    id: string;
    title: string;
    department: string;
  };
}

interface CandidateDetail {
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
  resumeHash: string;
  screenings: Screening[];
}

export default function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const candidateId = resolvedParams.id;

  const [cand, setCand] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({});
  const [statusMessage, setStatusMessage] = useState('');
  const [statusError, setStatusError] = useState('');

  useEffect(() => {
    fetchCandidateDetail();
  }, [candidateId]);

  async function fetchCandidateDetail() {
    try {
      const res = await fetch(`/api/candidates/${candidateId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setCand(data.candidate);
        setForm({
          name: data.candidate.name || '',
          email: data.candidate.email || '',
          phone: data.candidate.phone || '',
          location: data.candidate.location || '',
          currentDesignation: data.candidate.currentDesignation || '',
          currentCompany: data.candidate.currentCompany || '',
          totalExperience: data.candidate.totalExperience || 0,
          noticePeriod: data.candidate.noticePeriod || '',
          linkedinUrl: data.candidate.linkedinUrl || '',
          portfolioUrl: data.candidate.portfolioUrl || '',
          skills: (data.candidate.skills || []).join(', '),
          certifications: (data.candidate.certifications || []).join(', ')
        });
      } else {
        router.push('/candidates');
      }
    } catch (e) {
      console.error(e);
      router.push('/candidates');
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteCandidate = async () => {
    if (!confirm('Are you sure you want to permanently delete this candidate from the talent database and discard all associated screening scores?')) return;
    try {
      const res = await fetch(`/api/candidates/${cand?.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        router.push('/candidates');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveCandidate = async () => {
    if (!cand) return;
    setSaving(true);
    setStatusMessage('');
    setStatusError('');

    try {
      const res = await fetch(`/api/candidates/${cand.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          totalExperience: Number(form.totalExperience) || 0,
          skills: String(form.skills || '').split(',').map((item) => item.trim()).filter(Boolean),
          certifications: String(form.certifications || '').split(',').map((item) => item.trim()).filter(Boolean)
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update candidate');
      setCand(data.candidate);
      setEditing(false);
      setStatusMessage('Candidate profile updated. Re-screen related evaluations to refresh scores.');
    } catch (e: any) {
      setStatusError(e.message || 'Could not update candidate');
    } finally {
      setSaving(false);
    }
  };

  const updateForm = (field: string, value: string | number) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm font-semibold text-slate-400">Loading Candidate Profile...</span>
      </div>
    );
  }

  if (!cand) return null;

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Header Back Button Row */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2.5 rounded-xl border border-slate-800/80 bg-slate-900/20 text-slate-400 hover:text-slate-200 transition-all duration-300 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-slate-100">{cand.name}</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {cand.currentDesignation || 'Candidate'}
              {cand.currentCompany && ` at ${cand.currentCompany}`}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleDeleteCandidate}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold border border-red-200 bg-white text-red-700 hover:bg-red-50 transition-all duration-200 shadow-sm cursor-pointer shrink-0"
        >
          <Trash2 className="w-4.5 h-4.5" />
          Discard Profile
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

      {/* Split grid: Left Profile / Right Screenings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Extracted Resume Details & Text Viewer */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Extracted Details block */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-lg space-y-6">
            <div className="flex justify-end gap-2">
              {editing ? (
                <>
                  <button
                    onClick={() => {
                      setEditing(false);
                      fetchCandidateDetail();
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCandidate}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Profile
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-100 bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Extracted Profile
                </button>
              )}
            </div>

            {editing && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200 pb-5">
                {[
                  ['name', 'Name'],
                  ['email', 'Email'],
                  ['phone', 'Phone'],
                  ['location', 'Location'],
                  ['currentDesignation', 'Current designation'],
                  ['currentCompany', 'Current company'],
                  ['linkedinUrl', 'LinkedIn URL'],
                  ['portfolioUrl', 'Portfolio URL'],
                  ['noticePeriod', 'Notice period'],
                  ['skills', 'Skills comma-separated'],
                  ['certifications', 'Certifications comma-separated']
                ].map(([field, label]) => (
                  <div key={field}>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
                    <input
                      type={field === 'email' ? 'email' : 'text'}
                      value={form[field] ?? ''}
                      onChange={(e) => updateForm(field, e.target.value)}
                      className="glass-input w-full px-3 py-2 rounded-lg text-xs"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Total experience</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.totalExperience ?? 0}
                    onChange={(e) => updateForm('totalExperience', e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-lg text-xs"
                  />
                </div>
              </div>
            )}
            
            {/* Contact Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-400 border-b border-slate-800/40 pb-5">
              <span className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-400" />
                {cand.email}
              </span>
              <span className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-indigo-400" />
                {cand.phone}
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-indigo-400" />
                {cand.location}
              </span>
              <div className="flex gap-4">
                {cand.noticePeriod && (
                  <span className="flex items-center gap-1.5 text-slate-600">
                    Notice: {cand.noticePeriod}
                  </span>
                )}
                {cand.linkedinUrl && (
                  <a href={cand.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300">
                    <svg className="w-4 h-4 fill-current text-indigo-400" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                    </svg>
                    LinkedIn
                  </a>
                )}
                {cand.portfolioUrl && (
                  <a href={cand.portfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-teal-400 hover:text-teal-300">
                    <Globe className="w-4 h-4" />
                    Portfolio
                  </a>
                )}
              </div>
            </div>

            {/* Experience & Skills */}
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Technical Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {cand.skills.map(s => (
                    <span key={s} className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold rounded-lg">{s}</span>
                  ))}
                </div>
              </div>

              {cand.certifications.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Certifications</span>
                  <div className="flex flex-wrap gap-1.5">
                    {cand.certifications.map(s => (
                      <span key={s} className="px-2.5 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-bold rounded-lg">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Professional History */}
            <div className="space-y-4 border-t border-slate-800/40 pt-5">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-purple-400" />
                Work History
              </h3>
              <div className="space-y-4">
                {cand.employmentHistory.map((work, idx) => (
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

            {/* Education Timeline */}
            <div className="space-y-4 border-t border-slate-800/40 pt-5">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <GraduationCap className="w-4.5 h-4.5 text-emerald-400" />
                Academic History
              </h3>
              <div className="space-y-4">
                {cand.education.map((edu, idx) => (
                  <div key={idx} className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-300">{edu.degree}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {edu.institution}
                        {edu.gpa && (
                          <span className="ml-2 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded">
                            Marks/GPA: {edu.gpa}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-900/60 border border-slate-800 text-slate-500 rounded-lg">Class of {edu.gradYear}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Projects */}
            {cand.projects.length > 0 && (
              <div className="space-y-4 border-t border-slate-800/40 pt-5">
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <FolderOpen className="w-4.5 h-4.5 text-amber-400" />
                  Key Projects
                </h3>
                <div className="space-y-4">
                  {cand.projects.map((proj, idx) => (
                    <div key={idx} className="space-y-2">
                      <h4 className="text-sm font-bold text-slate-300">{proj.name}</h4>
                      <div className="flex flex-wrap gap-1">
                        {proj.technologies.map(t => (
                          <span key={t} className="px-2 py-0.5 bg-slate-900 text-slate-500 text-[10px] font-bold rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

        </div>

        {/* Right Side: Evaluated Screenings List */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800/60 shadow-lg space-y-6 h-fit">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800/40 pb-3">
            <ClipboardList className="w-4.5 h-4.5 text-purple-400" />
            Evaluation Matches
          </h2>

          <div className="space-y-4">
            {cand.screenings.length > 0 ? (
              cand.screenings.map((sc) => (
                <div 
                  key={sc.id} 
                  className="p-4 rounded-2xl bg-slate-900/35 border border-slate-850 flex flex-col justify-between gap-4"
                >
                  <div>
                    <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-extrabold uppercase rounded tracking-wider">
                      {sc.job.department}
                    </span>
                    <h4 className="text-sm font-bold text-slate-200 mt-2 truncate">
                      {sc.job.title}
                    </h4>
                  </div>

                  <div className="flex items-center justify-between mt-2 border-t border-slate-800/40 pt-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">Match Rating</span>
                      <span className={`text-base font-extrabold mt-0.5 ${
                        sc.matchScore >= 75 ? 'text-emerald-400' :
                        sc.matchScore >= 50 ? 'text-amber-400' :
                        'text-rose-400'
                      }`}>{sc.matchScore}%</span>
                    </div>

                    <Link
                      href={`/screenings/${sc.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-indigo-500/20 hover:text-indigo-400 text-xs font-bold text-slate-300 rounded-lg transition-all duration-300 cursor-pointer"
                    >
                      View Report
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-slate-500 italic font-semibold">
                No evaluations found for this candidate. Screen them by uploading their resume under a job requirement!
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
