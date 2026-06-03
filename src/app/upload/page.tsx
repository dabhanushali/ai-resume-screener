'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  UploadCloud, Briefcase, FileText, AlertTriangle, 
  CheckCircle2, XCircle, Loader2, ArrowRight, Trash2, ShieldAlert
} from 'lucide-react';

interface Job {
  id: string;
  title: string;
  department: string;
}

interface UploadQueueItem {
  id: string;
  file: File;
  status: 'QUEUED' | 'PARSING' | 'DUPLICATE' | 'SUCCESS' | 'SKIPPED' | 'ERROR';
  progress: number;
  errorMsg?: string;
  extractedDetails?: any;
  existingCandidate?: any;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function UploadPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryJobId = searchParams.get('jobId');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [pageError, setPageError] = useState('');

  // Duplicate Resolution Modal State
  const [duplicateItem, setDuplicateItem] = useState<UploadQueueItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch('/api/jobs');
        const data = await res.json();
        if (res.ok && data.success) {
          setJobs(data.jobs);
          if (data.jobs.length > 0) {
            setSelectedJobId(queryJobId || data.jobs[0].id);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingJobs(false);
      }
    }
    fetchJobs();
  }, [queryJobId]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(Array.from(e.target.files));
    }
  };

  const addFilesToQueue = (files: File[]) => {
    const newItems: UploadQueueItem[] = files.map(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const isSupported = ext === 'pdf' || ext === 'docx' || ext === 'doc';
      const isEmpty = file.size === 0;
      const isTooLarge = file.size > MAX_FILE_SIZE_BYTES;

      let status: UploadQueueItem['status'] = 'QUEUED';
      let errorMsg: string | undefined;

      if (!isSupported) {
        status = 'ERROR';
        errorMsg = 'Unsupported file format. Use PDF, DOC, or DOCX.';
      } else if (isEmpty) {
        status = 'ERROR';
        errorMsg = 'Empty file rejected.';
      } else if (isTooLarge) {
        status = 'ERROR';
        errorMsg = `File is too large. Upload files up to ${MAX_FILE_SIZE_MB}MB.`;
      }

      return {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        status,
        progress: status === 'ERROR' ? 100 : 0,
        errorMsg
      };
    });

    setQueue(prev => [...prev, ...newItems]);
  };

  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  const clearQueue = () => {
    setQueue([]);
  };

  // Run queue processor
  const processQueue = async () => {
    if (!selectedJobId) {
      setPageError('Please select a target job requirement first.');
      return;
    }

    setPageError('');
    setProcessing(true);
    
    for (const item of queue) {
      if (item.status !== 'QUEUED') continue;

      // Update status to parsing
      updateItemStatus(item.id, 'PARSING', 20);

      try {
        const formData = new FormData();
        formData.append('file', item.file);
        formData.append('jobId', selectedJobId);

        const res = await fetch('/api/resumes/upload', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        
        if (res.status === 200 && data.duplicate) {
          // Pause and trigger duplicate resolution modal
          setQueue(prev => prev.map(q => 
            q.id === item.id 
              ? { ...q, status: 'DUPLICATE', progress: 100, extractedDetails: data.candidateDetails, existingCandidate: data.existingCandidate }
              : q
          ));
          setDuplicateItem({
            ...item,
            status: 'DUPLICATE',
            extractedDetails: data.candidateDetails,
            existingCandidate: data.existingCandidate
          });
          // Break loop to wait for recruiter input
          setProcessing(false);
          return;
        }

        if (!res.ok) {
          throw new Error(data.error || 'Parsing error');
        }

        updateItemStatus(item.id, 'SUCCESS', 100);

      } catch (e: any) {
        setQueue(prev => prev.map(q => 
          q.id === item.id ? { ...q, status: 'ERROR', progress: 100, errorMsg: e.message || 'Processing failed' } : q
        ));
      }
    }

    setProcessing(false);
  };

  const resolveDuplicateAction = async (keepNew: boolean) => {
    if (!duplicateItem) return;

    const itemId = duplicateItem.id;
    setDuplicateItem(null);
    setProcessing(true);

    if (!keepNew) {
      // HR chose to ignore/keep original
      setQueue(prev => prev.map(q => 
        q.id === itemId ? { ...q, status: 'SKIPPED', progress: 100, errorMsg: 'Skipped - kept original candidate' } : q
      ));
      // Re-trigger queue processing for subsequent items
      setTimeout(() => continueProcessing(), 200);
      return;
    }

    // HR chose to overwrite (Keep New)
    updateItemStatus(itemId, 'PARSING', 60);

    try {
      const formData = new FormData();
      formData.append('file', duplicateItem.file);
      formData.append('jobId', selectedJobId);
      formData.append('overrideDuplicate', 'true'); // Overwrite flag!

      const res = await fetch('/api/resumes/upload', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Overwrite failed');

      updateItemStatus(itemId, 'SUCCESS', 100);
    } catch (e: any) {
      setQueue(prev => prev.map(q => 
        q.id === itemId ? { ...q, status: 'ERROR', progress: 100, errorMsg: e.message } : q
      ));
    }

    // Re-trigger processing for next elements in queue
    setTimeout(() => continueProcessing(), 200);
  };

  const continueProcessing = async () => {
    setProcessing(true);
    // Recursively process the rest of the queue
    await processQueue();
  };

  const updateItemStatus = (id: string, status: UploadQueueItem['status'], progress: number) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, status, progress } : item
    ));
  };

  if (loadingJobs) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm font-semibold text-slate-500">Loading upload workspace...</span>
      </div>
    );
  }

  const hasQueuedItems = queue.some(i => i.status === 'QUEUED');
  const batchSummary = {
    processed: queue.filter(i => i.status === 'SUCCESS' || i.status === 'SKIPPED' || i.status === 'ERROR').length,
    duplicates: queue.filter(i => i.status === 'DUPLICATE' || i.status === 'SKIPPED').length,
    failed: queue.filter(i => i.status === 'ERROR').length,
    completed: queue.filter(i => i.status === 'SUCCESS').length,
    skipped: queue.filter(i => i.status === 'SKIPPED').length,
    pending: queue.filter(i => i.status === 'QUEUED' || i.status === 'PARSING').length
  };
  const showBatchSummary = queue.length > 0 && !processing && batchSummary.processed > 0;
  const getSkillPreview = (details: any) => Array.isArray(details?.skills) ? details.skills.slice(0, 8) : [];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-12">
      
      {/* Header section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Upload Resumes
        </h1>
        <p className="text-slate-600 text-sm mt-0.5">
          Add resume files and screen them against a selected job requirement.
        </p>
      </div>

      {/* Target Job Selector Card */}
      {pageError && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-semibold">
          {pageError}
        </div>
      )}

      {showBatchSummary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            ['Processed', batchSummary.processed, 'text-blue-700'],
            ['Screened', batchSummary.completed, 'text-emerald-700'],
            ['Duplicates', batchSummary.duplicates, 'text-amber-700'],
            ['Skipped', batchSummary.skipped, 'text-slate-700'],
            ['Failed', batchSummary.failed, 'text-red-700']
          ].map(([label, value, color]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
              <p className={`mt-1 text-2xl font-extrabold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="glass-panel p-6 border border-slate-200 space-y-4">
        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-blue-700" />
          Target Job Requirement
        </label>
        
        {jobs.length > 0 ? (
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            disabled={processing}
            className="glass-input w-full px-4 py-3.5 rounded-lg text-sm font-semibold"
          >
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title} ({j.department})</option>
            ))}
          </select>
        ) : (
          <div className="p-4 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            No active job requirements found. Create a Job Requirement before uploading resumes.
          </div>
        )}
      </div>

      {/* Drag and Drop Zone */}
      {jobs.length > 0 && (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`glass-panel border-2 border-dashed rounded-lg p-12 text-center flex flex-col items-center justify-center gap-4 hover-glow cursor-pointer transition-all duration-200 ${
            isDragActive 
              ? 'border-blue-300 bg-blue-50' 
              : 'border-slate-300 hover:border-blue-300'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.doc"
            onChange={handleFileChange}
            disabled={processing}
            className="hidden"
          />
          <div className="w-14 h-14 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
            <UploadCloud className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Drag and drop resumes here</h3>
            <p className="text-slate-500 text-xs mt-1 font-medium">Supports PDF, DOC, or DOCX up to {MAX_FILE_SIZE_MB}MB each</p>
          </div>
          <button
            type="button"
            className="px-4 py-2 border border-slate-300 bg-white text-slate-700 text-xs font-semibold rounded-lg hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 transition-all duration-200"
          >
            Browse files
          </button>
        </div>
      )}

      {/* Processing Queue List */}
      {queue.length > 0 && (
        <div className="glass-panel p-6 border border-slate-200 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-700" />
              Upload Queue ({queue.length} files)
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={clearQueue}
                disabled={processing}
                className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer disabled:opacity-40"
              >
                Clear Queue
              </button>
              <button
                onClick={processQueue}
                disabled={processing || !hasQueuedItems}
                className="flex items-center gap-1 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    Processing...
                  </>
                ) : (
                  <>
                    Process Batch
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="divide-y divide-slate-200 max-h-[300px] overflow-y-auto pr-1 space-y-3">
            {queue.map((item) => (
              <div key={item.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{item.file.name}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{(item.file.size / 1024).toFixed(0)} KB</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {/* Status Indicator */}
                  {item.status === 'QUEUED' && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md border border-slate-200 uppercase">Queued</span>
                  )}
                  {item.status === 'PARSING' && (
                    <span className="px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md border border-blue-100 uppercase flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Parsing
                    </span>
                  )}
                  {item.status === 'DUPLICATE' && (
                    <span className="px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-md border border-amber-100 uppercase">Duplicate Alert</span>
                  )}
                  {item.status === 'SUCCESS' && (
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md border border-emerald-100 uppercase flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Success
                    </span>
                  )}
                  {item.status === 'SKIPPED' && (
                    <span className="px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md border border-slate-200 uppercase">
                      Skipped
                    </span>
                  )}
                  {item.status === 'ERROR' && (
                    <span className="px-2 py-1 bg-red-50 text-red-700 text-[10px] font-bold rounded-md border border-red-100 uppercase flex items-center gap-1" title={item.errorMsg}>
                      <XCircle className="w-3.5 h-3.5" />
                      Failed
                    </span>
                  )}

                  {/* Cancel Button */}
                  <button
                    onClick={() => removeFromQueue(item.id)}
                    disabled={processing && item.status === 'PARSING'}
                    className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all duration-200 cursor-pointer disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicate warning Modal */}
      {duplicateItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="max-w-3xl w-full glass-panel-glow p-8 rounded-lg space-y-6 relative border border-amber-200">
            <div className="text-center relative z-10 space-y-3">
              <div className="mx-auto w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700 border border-amber-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Duplicate Candidate Detected</h2>
              <p className="text-xs text-slate-600">
                This resume details conflict with an existing profile in our talent pool.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
              {[
                ['Existing Profile', duplicateItem.existingCandidate],
                ['New Extraction', duplicateItem.extractedDetails]
              ].map(([title, details]: any) => (
                <div key={title} className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <p className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">{title}</p>
                  <p className="text-slate-900 font-bold text-sm">{details?.name || 'Name not found'}</p>
                  <p className="text-slate-600">Email: <span className="text-slate-900 font-semibold">{details?.email || 'Not found'}</span></p>
                  <p className="text-slate-600">Phone: <span className="text-slate-900 font-semibold">{details?.phone || 'Not found'}</span></p>
                  <p className="text-slate-600">Location: <span className="text-slate-900 font-semibold">{details?.location || 'Not found'}</span></p>
                  <p className="text-slate-600">Role: <span className="text-slate-900 font-semibold">{details?.currentDesignation || details?.currentRole || 'Not found'}</span></p>
                  <p className="text-slate-600">Company: <span className="text-slate-900 font-semibold">{details?.currentCompany || 'Not found'}</span></p>
                  <p className="text-slate-600">Experience: <span className="text-slate-900 font-semibold">{details?.totalExperience ?? 'Not found'} years</span></p>
                  <div>
                    <p className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] mt-3">Skills</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {getSkillPreview(details).map((skill: any) => (
                        <span key={typeof skill === 'string' ? skill : skill?.name} className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-semibold">
                          {typeof skill === 'string' ? skill : skill?.name}
                        </span>
                      ))}
                      {getSkillPreview(details).length === 0 && <span className="text-slate-500">No skills extracted</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs text-slate-600 text-center relative z-10 leading-relaxed">
              Choose <span className="font-semibold text-amber-700">"Overwrite / Keep New"</span> to update the candidate profile, or <span className="font-semibold text-slate-900">"Skip / Keep Original"</span> to retain the current profile.
            </div>

            <div className="flex gap-4 relative z-10">
              <button
                onClick={() => resolveDuplicateAction(false)}
                className="flex-1 py-3 border border-slate-300 bg-white text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 cursor-pointer"
              >
                Skip & Keep Original
              </button>
              <button
                onClick={() => resolveDuplicateAction(true)}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-lg transition-all duration-200 shadow-sm cursor-pointer"
              >
                Overwrite / Keep New
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Wrap in Suspense to resolve searchParams de-optimization during next build page data collection
export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <span className="text-sm font-semibold text-slate-500">Loading upload workspace...</span>
      </div>
    }>
      <UploadPageContent />
    </Suspense>
  );
}
