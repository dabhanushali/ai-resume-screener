'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Briefcase, Sliders, Settings, Award,
  Check, Loader2, ArrowLeft, Plus, X,
  FileText, Upload, PenLine, FilePlus2, ChevronRight
} from 'lucide-react';

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Mode = 'select' | 'text' | 'file' | 'manual';

const MAX_JD_FILE_SIZE_MB = 10;
const MAX_JD_FILE_SIZE_BYTES = MAX_JD_FILE_SIZE_MB * 1024 * 1024;

function NewJobPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('templateId');
  const jobId = searchParams.get('jobId');
  const isEditingTemplate = searchParams.get('editTemplate') === 'true' && !!templateId;
  const isEditingJob = !!jobId;
  const isEditMode = isEditingJob || isEditingTemplate;

  const [mode, setMode] = useState<Mode>(templateId || jobId ? 'manual' : 'select');
  const [loading, setLoading] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [draftNotice, setDraftNotice] = useState('');
  const [formError, setFormError] = useState('');

  // ── JD text paste state ────────────────────────────────────────────────────
  const [jdText, setJdText] = useState('');

  // ── JD file upload state ───────────────────────────────────────────────────
  const [jdFile, setJdFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Manual form state ──────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [employmentType, setEmploymentType] = useState('Full-time');
  const [location, setLocation] = useState('Remote');
  const [minExperience, setMinExperience] = useState(2);
  const [maxExperience, setMaxExperience] = useState(8);
  const [minDegree, setMinDegree] = useState('Bachelor');
  const [minGpa, setMinGpa] = useState('');
  const [noticePeriod, setNoticePeriod] = useState('Immediate');
  const [minMatchScore, setMinMatchScore] = useState(70);
  const [reqSkills, setReqSkills] = useState<string[]>([]);
  const [prefSkills, setPrefSkills] = useState<string[]>([]);
  const [certs, setCerts] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [prefInput, setPrefInput] = useState('');
  const [certInput, setCertInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [wSkills, setWSkills] = useState(40);
  const [wExp, setWExp] = useState(25);
  const [wRelevance, setWRelevance] = useState(15);
  const [wPref, setWPref] = useState(10);
  const [wEdu, setWEdu] = useState(5);
  const [wNP, setWNP] = useState(5);
  const [threshShortlist, setThreshShortlist] = useState(75);
  const [threshReview, setThreshReview] = useState(50);

  const totalWeights = wSkills + wExp + wRelevance + wPref + wEdu + wNP;

  useEffect(() => {
    if (jobId) fetchJobDetails(jobId);
    else if (templateId) fetchTemplateDetails();
  }, [jobId, templateId]);

  function fillManualForm(source: any) {
    setTitle(source.title || '');
    setDepartment(source.department || 'Engineering');
    setEmploymentType(source.employmentType || 'Full-time');
    setLocation(source.location || 'Remote');
    setMinExperience(source.minExperience ?? 2);
    setMaxExperience(source.maxExperience ?? 8);
    setReqSkills(source.requiredSkills || []);
    setPrefSkills(source.preferredSkills || []);
    setCerts(source.certifications || []);
    setKeywords(source.keywords || []);
    setMinDegree(source.minDegree || 'Bachelor');
    setMinGpa(source.minGpa || '');
    setNoticePeriod(source.noticePeriod || 'Immediate');
    setMinMatchScore(source.minMatchScore ?? 70);
    setWSkills(source.weightSkills ?? 40);
    setWExp(source.weightExperience ?? 25);
    setWRelevance(source.weightRelevance ?? 15);
    setWPref(source.weightPreferred ?? 10);
    setWEdu(source.weightEducation ?? 5);
    setWNP(source.weightNoticePeriod ?? 5);
    setThreshShortlist(source.thresholdShortlist ?? 75);
    setThreshReview(source.thresholdReview ?? 50);
  }

  function fillParsedDraft(parsed: any) {
    fillManualForm({
      ...parsed,
      minMatchScore: parsed.minMatchScore ?? 70,
      weightSkills: parsed.weightSkills ?? 40,
      weightExperience: parsed.weightExperience ?? 25,
      weightRelevance: parsed.weightRelevance ?? 15,
      weightPreferred: parsed.weightPreferred ?? 10,
      weightEducation: parsed.weightEducation ?? 5,
      weightNoticePeriod: parsed.weightNoticePeriod ?? 5,
      thresholdShortlist: parsed.thresholdShortlist ?? 75,
      thresholdReview: parsed.thresholdReview ?? 50
    });
    setDraftNotice('Review the extracted job requirement below, adjust anything that looks off, then save it.');
    setMode('manual');
  }

  async function fetchTemplateDetails() {
    setLoadingTemplate(true);
    try {
      const res = await fetch('/api/templates');
      const data = await res.json();
      if (res.ok && data.success) {
        const found = data.templates.find((t: any) => t.id === templateId);
        if (found) {
          fillManualForm(found);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoadingTemplate(false); }
  }

  async function fetchJobDetails(id: string) {
    setLoadingTemplate(true);
    try {
      const res = await fetch(`/api/jobs/${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        fillManualForm(data.job);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingTemplate(false); }
  }

  const handleAddTag = (input: string, setInput: any, list: string[], setList: any) => {
    const t = input.trim();
    if (t && !list.includes(t)) { setList([...list, t]); setInput(''); }
  };
  const handleRemoveTag = (tag: string, list: string[], setList: any) =>
    setList(list.filter(t => t !== tag));

  // ── JD text submit ─────────────────────────────────────────────────────────
  async function handleJdTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!jdText.trim() || jdText.trim().length < 30) {
      setFormError('Please paste a valid job description (at least 30 characters).');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/jobs/parse-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse JD');
      fillParsedDraft(data.parsed || data.job);
    } catch (e: any) {
      setFormError(e.message || 'Failed to parse JD');
    } finally {
      setLoading(false);
    }
  }

  // ── JD file submit ─────────────────────────────────────────────────────────
  async function handleJdFileSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!jdFile) { setFormError('Please select a PDF or DOCX file.'); return; }
    if (jdFile.size > MAX_JD_FILE_SIZE_BYTES) {
      setFormError(`File is too large. Upload JD files up to ${MAX_JD_FILE_SIZE_MB}MB.`);
      return;
    }
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', jdFile);
      const res = await fetch('/api/jobs/parse-jd', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse JD file');
      fillParsedDraft(data.parsed || data.job);
    } catch (e: any) {
      setFormError(e.message || 'Failed to parse JD file');
    } finally {
      setLoading(false);
    }
  }

  function handleJdFileSelect(file: File) {
    if (file.size > MAX_JD_FILE_SIZE_BYTES) {
      setFormError(`File is too large. Upload JD files up to ${MAX_JD_FILE_SIZE_MB}MB.`);
      return;
    }
    setFormError('');
    setJdFile(file);
  }

  // ── Manual form submit ─────────────────────────────────────────────────────
  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (totalWeights !== 100) {
      setFormError(`Scoring weights must add up to exactly 100%. Currently: ${totalWeights}%.`);
      return;
    }
    setLoading(true);
    try {
      const endpoint = isEditingJob
        ? `/api/jobs/${jobId}`
        : isEditingTemplate
          ? `/api/templates/${templateId}`
          : '/api/jobs';

      const res = await fetch(endpoint, {
        method: isEditMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: title,
          title, department, employmentType, location,
          minExperience, maxExperience, minDegree, minGpa, noticePeriod, minMatchScore,
          requiredSkills: reqSkills, preferredSkills: prefSkills,
          certifications: certs, keywords,
          weightSkills: wSkills, weightExperience: wExp, weightRelevance: wRelevance,
          weightPreferred: wPref, weightEducation: wEdu, weightNoticePeriod: wNP,
          thresholdShortlist: threshShortlist, thresholdReview: threshReview
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save job');
      setDraftNotice('');
      router.push('/jobs');
      router.refresh();
    } catch (e: any) {
      setFormError(e.message || 'Error creating job requirement');
    } finally {
      setLoading(false);
    }
  }

  if (loadingTemplate) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm font-semibold text-slate-400">Loading Template Parameters...</span>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // HEADER shared across modes
  // ══════════════════════════════════════════════════════════════════════════════
  const Header = ({ subtitle }: { subtitle: string }) => (
    <div className="flex items-center gap-4">
      <button
        onClick={() => {
          if (isEditMode) router.push('/jobs');
          else if (mode === 'select') router.back();
          else setMode('select');
        }}
        className="p-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200 cursor-pointer"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {isEditMode ? 'Edit Requirement' : 'Create Requirement'}
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">{subtitle}</p>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════════
  // MODE: SELECT (3-card picker)
  // ══════════════════════════════════════════════════════════════════════════════
  if (mode === 'select') {
    return (
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
        <Header subtitle="Choose how you want to enter the role details." />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">

          {/* Option 1: Paste JD Text */}
          <button
            onClick={() => setMode('text')}
            className="group glass-panel p-7 border border-slate-200 flex flex-col items-start gap-5 text-left hover:border-blue-200 hover-glow transition-all duration-200 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors duration-200">
              <FileText className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors duration-200">
                Paste job description
              </h3>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                Paste the role description and review the extracted requirement before saving.
              </p>
            </div>
            <span className="mt-auto flex items-center gap-1 text-xs font-bold text-blue-700">
              <ChevronRight className="w-3.5 h-3.5" /> Continue
            </span>
          </button>

          {/* Option 2: Upload PDF/DOCX */}
          <button
            onClick={() => setMode('file')}
            className="group glass-panel p-7 border border-slate-200 flex flex-col items-start gap-5 text-left hover:border-blue-200 hover-glow transition-all duration-200 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors duration-200">
              <Upload className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors duration-200">
                Upload JD file
              </h3>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                Upload a PDF or Word document, then confirm the requirement details.
              </p>
            </div>
            <span className="mt-auto flex items-center gap-1 text-xs font-bold text-blue-700">
              <ChevronRight className="w-3.5 h-3.5" /> Continue
            </span>
          </button>

          {/* Option 3: Manual Form */}
          <button
            onClick={() => setMode('manual')}
            className="group glass-panel p-7 border border-slate-200 flex flex-col items-start gap-5 text-left hover:border-emerald-200 hover-glow transition-all duration-200 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center group-hover:bg-emerald-100 transition-colors duration-200">
              <PenLine className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors duration-200">
                Fill manually
              </h3>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                Enter the requirement yourself and adjust screening rules as needed.
              </p>
            </div>
            <span className="mt-auto flex items-center gap-1 text-xs font-bold text-emerald-700">
              <ChevronRight className="w-3.5 h-3.5" /> Continue
            </span>
          </button>

        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MODE: PASTE JD TEXT
  // ══════════════════════════════════════════════════════════════════════════════
  if (mode === 'text') {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
        <Header subtitle="Paste the job description, then save it as a screening requirement." />

        {formError && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm font-semibold text-red-700">
            {formError}
          </div>
        )}

        <form onSubmit={handleJdTextSubmit} className="space-y-6">
          <div className="glass-panel p-8 border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <FileText className="w-5 h-5 text-blue-700" />
              <h2 className="text-lg font-bold text-slate-900">Job description text</h2>
            </div>
            <p className="text-sm text-slate-600">
              Paste the full JD below: title, responsibilities, required skills, experience, education requirements, and notice period.
            </p>
            <textarea
              value={jdText}
              onChange={e => setJdText(e.target.value)}
              rows={16}
              placeholder={`Paste job description here...\n\nExample:\nFullstack Developer\n\nResponsibilities:\n- Build full-stack apps using MERN stack\n- Lead code reviews...\n\nRequired Skills:\n- 4+ years React, Node.js, MongoDB\n- Experience with Docker, CI/CD...`}
              className="glass-input w-full px-4 py-3 rounded-lg text-sm font-mono resize-none leading-relaxed"
              style={{ minHeight: '320px' }}
            />
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{jdText.trim().length} characters</span>
              {jdText.trim().length > 0 && jdText.trim().length < 30 && (
                <span className="text-amber-400">Needs at least 30 characters</span>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setMode('select')}
              className="px-6 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || jdText.trim().length < 30}
              className="flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Reading description...</>
              ) : (
                <><Check className="w-5 h-5" /> Review Requirement</>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MODE: FILE UPLOAD
  // ══════════════════════════════════════════════════════════════════════════════
  if (mode === 'file') {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-12">
        <Header subtitle="Upload a PDF or DOCX job description file." />

        {formError && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm font-semibold text-red-700">
            {formError}
          </div>
        )}

        <form onSubmit={handleJdFileSubmit} className="space-y-6">
          <div className="glass-panel p-8 border border-slate-200 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
              <Upload className="w-5 h-5 text-blue-700" />
              <h2 className="text-lg font-bold text-slate-900">Upload job description file</h2>
            </div>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleJdFileSelect(f);
              }}
              className="border-2 border-dashed border-slate-300 hover:border-blue-300 rounded-lg p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-200 group bg-slate-50"
            >
              <div className="w-14 h-14 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center group-hover:bg-blue-100 transition-colors duration-200">
                <FilePlus2 className="w-7 h-7 text-blue-700" />
              </div>
              {jdFile ? (
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-900">{jdFile.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{(jdFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">Click to browse or drag and drop</p>
                  <p className="text-xs text-slate-500 mt-1">Supports PDF and DOCX files up to {MAX_JD_FILE_SIZE_MB}MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleJdFileSelect(f);
                }}
              />
            </div>

            {jdFile && (
              <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-blue-50 border border-blue-100 text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-700" />
                  {jdFile.name}
                </span>
                <button
                  type="button"
                  onClick={() => setJdFile(null)}
                  className="text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => setMode('select')}
              className="px-6 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || !jdFile}
              className="flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Reading file...</>
              ) : (
                <><Check className="w-5 h-5" /> Review Requirement</>
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MODE: MANUAL FORM
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      <Header subtitle={isEditMode ? 'Update the saved details for this requirement.' : 'Enter the role details and screening preferences.'} />

      {formError && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-sm font-semibold text-red-700">
          {formError}
        </div>
      )}

      {draftNotice && (
        <div className="p-4 rounded-lg border border-blue-100 bg-blue-50 text-sm font-semibold text-blue-800">
          {draftNotice}
        </div>
      )}

      <form onSubmit={handleManualSubmit} className="space-y-8">

        {/* Step 1: Basic Information */}
        <div className="glass-panel p-8 border border-slate-200 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
            <Briefcase className="w-5 h-5 text-blue-700" />
            1. Role details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Job title</label>
              <input
                type="text" required value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Senior Frontend Developer"
                className="glass-input w-full px-4 py-3 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Department</label>
              <input
                list="dept-options" type="text" required value={department}
                onChange={e => setDepartment(e.target.value)}
                placeholder="Select or type a department..."
                className="glass-input w-full px-4 py-3 rounded-lg text-sm"
              />
              <datalist id="dept-options">
                <option value="Engineering" /><option value="Product Management" />
                <option value="Quality Assurance" /><option value="Design" />
                <option value="Human Resources" /><option value="Sales" />
                <option value="Marketing" /><option value="Finance" />
                <option value="Operations" /><option value="Customer Success" />
                <option value="Data Science" /><option value="DevOps" />
                <option value="Legal" /><option value="Research & Development" />
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Employment type</label>
              <select value={employmentType} onChange={e => setEmploymentType(e.target.value)} className="glass-input w-full px-4 py-3 rounded-lg text-sm">
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Contract">Contract</option>
                <option value="Internship">Internship</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Location</label>
              <input
                type="text" required value={location} onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Remote, Hybrid (New York, NY)"
                className="glass-input w-full px-4 py-3 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* Step 2: Experience & Qualification */}
        <div className="glass-panel p-8 border border-slate-200 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
            <Award className="w-5 h-5 text-blue-700" />
            2. Experience and qualifications
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Minimum experience</label>
              <input type="number" min="0" value={minExperience}
                onChange={e => setMinExperience(parseInt(e.target.value) || 0)}
                className="glass-input w-full px-4 py-3 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Maximum experience</label>
              <input type="number" min="0" value={maxExperience}
                onChange={e => setMaxExperience(parseInt(e.target.value) || 99)}
                className="glass-input w-full px-4 py-3 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Minimum degree</label>
              <select value={minDegree} onChange={e => setMinDegree(e.target.value)} className="glass-input w-full px-4 py-3 rounded-lg text-sm">
                <option value="Associate">Associate Degree</option>
                <option value="Bachelor">Bachelor's Degree</option>
                <option value="Master">Master's Degree</option>
                <option value="Doctorate">Doctorate (Ph.D.)</option>
                <option value="High School">No Specific Degree</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Minimum GPA or marks</label>
              <input type="text" value={minGpa} onChange={e => setMinGpa(e.target.value)}
                placeholder="e.g. 3.0 GPA or 70% or 7.5 CGPA"
                className="glass-input w-full px-4 py-3 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Notice period</label>
              <select value={noticePeriod} onChange={e => setNoticePeriod(e.target.value)} className="glass-input w-full px-4 py-3 rounded-lg text-sm">
                <option value="Immediate">Immediate / Notice: 0 days</option>
                <option value="15 Days">Notice: 15 days</option>
                <option value="30 Days">Notice: 30 days</option>
                <option value="60 Days">Notice: 60 days</option>
                <option value="90 Days">Notice: 90 days</option>
              </select>
            </div>
          </div>
        </div>

        {/* Step 3: Skills & Tags */}
        <div className="glass-panel p-8 border border-slate-200 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
            <Settings className="w-5 h-5 text-blue-700" />
            3. Skills and keywords
          </h2>

          <div className="space-y-6">
            {/* Required Skills */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Required skills</label>
              <div className="flex gap-2">
                <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag(skillInput, setSkillInput, reqSkills, setReqSkills))}
                  placeholder="Type skill name and press enter"
                  className="glass-input flex-1 px-4 py-3 rounded-lg text-sm"
                />
                <button type="button" onClick={() => handleAddTag(skillInput, setSkillInput, reqSkills, setReqSkills)}
                  className="px-4 py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {reqSkills.map(tag => (
                  <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold rounded-md">
                    {tag}<X className="w-3 h-3 hover:text-red-400 cursor-pointer" onClick={() => handleRemoveTag(tag, reqSkills, setReqSkills)} />
                  </span>
                ))}
              </div>
            </div>

            {/* Preferred Skills */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Preferred skills</label>
              <div className="flex gap-2">
                <input type="text" value={prefInput} onChange={e => setPrefInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag(prefInput, setPrefInput, prefSkills, setPrefSkills))}
                  placeholder="Type preferred skills (e.g. Next.js, Redux)"
                  className="glass-input flex-1 px-4 py-3 rounded-lg text-sm"
                />
                <button type="button" onClick={() => handleAddTag(prefInput, setPrefInput, prefSkills, setPrefSkills)}
                  className="px-4 py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {prefSkills.map(tag => (
                  <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-md">
                    {tag}<X className="w-3 h-3 hover:text-red-400 cursor-pointer" onClick={() => handleRemoveTag(tag, prefSkills, setPrefSkills)} />
                  </span>
                ))}
              </div>
            </div>

            {/* Certs & Keywords */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Certifications</label>
                <div className="flex gap-2">
                  <input type="text" value={certInput} onChange={e => setCertInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag(certInput, setCertInput, certs, setCerts))}
                    placeholder="e.g. AWS Solutions Architect"
                    className="glass-input flex-1 px-4 py-3 rounded-lg text-sm"
                  />
                  <button type="button" onClick={() => handleAddTag(certInput, setCertInput, certs, setCerts)}
                    className="px-3 py-3 bg-slate-50 text-slate-700 border border-slate-200 rounded-lg cursor-pointer">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {certs.map(tag => (
                    <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-semibold rounded-md">
                      {tag}<X className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => handleRemoveTag(tag, certs, setCerts)} />
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Keywords</label>
                <div className="flex gap-2">
                  <input type="text" value={keywordInput} onChange={e => setKeywordInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag(keywordInput, setKeywordInput, keywords, setKeywords))}
                    placeholder="e.g. Microservices, SaaS"
                    className="glass-input flex-1 px-4 py-3 rounded-lg text-sm"
                  />
                  <button type="button" onClick={() => handleAddTag(keywordInput, setKeywordInput, keywords, setKeywords)}
                    className="px-3 py-3 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg cursor-pointer">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {keywords.map(tag => (
                    <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-100 text-amber-700 text-[11px] font-semibold rounded-md">
                      {tag}<X className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={() => handleRemoveTag(tag, keywords, setKeywords)} />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Scoring Engine */}
        <div className="glass-panel p-8 border border-slate-200 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-700" />
              4. Candidate match settings
            </h2>
            <span className={`px-3 py-1 rounded-md text-xs font-bold ${totalWeights === 100 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              Scoring total: {totalWeights}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-2">
            {[
              { label: 'Required skills', val: wSkills, set: setWSkills },
              { label: 'Experience', val: wExp, set: setWExp },
              { label: 'Similar past roles', val: wRelevance, set: setWRelevance },
              { label: 'Preferred skills', val: wPref, set: setWPref },
              { label: 'Education', val: wEdu, set: setWEdu },
              { label: 'Notice period', val: wNP, set: setWNP },
            ].map(({ label, val, set }) => (
              <div key={label} className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>{label}</span>
                  <span className="text-blue-700">{val}%</span>
                </div>
                <input type="range" min="0" max="100" value={val}
                  onChange={e => set(parseInt(e.target.value) || 0)}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 pt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Shortlist score</label>
              <input type="number" min="0" max="100" value={threshShortlist}
                onChange={e => setThreshShortlist(parseInt(e.target.value) || 75)}
                className="glass-input w-full px-4 py-3 rounded-lg text-sm"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Candidates at or above this score are shortlisted.</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Review score</label>
              <input type="number" min="0" max="100" value={threshReview}
                onChange={e => setThreshReview(parseInt(e.target.value) || 50)}
                className="glass-input w-full px-4 py-3 rounded-lg text-sm"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Candidates between review and shortlist need manual review.</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Minimum match score</label>
              <input type="number" min="0" max="100" value={minMatchScore}
                onChange={e => setMinMatchScore(parseInt(e.target.value) || 70)}
                className="glass-input w-full px-4 py-3 rounded-lg text-sm"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Minimum score you expect for this requirement.</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button type="button" onClick={() => isEditMode ? router.push('/jobs') : setMode('select')}
            className="px-6 py-3 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer">
            Cancel
          </button>
          <button type="submit" disabled={loading || totalWeights !== 100}
            className="flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" />Saving...</>
            ) : (
              <><Check className="w-5 h-5" />{isEditMode ? 'Save Changes' : 'Save Requirement'}</>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}

export default function NewJobPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <span className="text-sm font-semibold text-slate-400 font-sans">Loading...</span>
      </div>
    }>
      <NewJobPageContent />
    </Suspense>
  );
}
