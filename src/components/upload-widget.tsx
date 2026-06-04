'use client';

import { useState } from 'react';
import { useUpload } from './upload-context';
import { Loader2, AlertTriangle, CheckCircle2, ChevronUp, ChevronDown, X, UploadCloud } from 'lucide-react';
import Link from 'next/link';

export default function UploadWidget() {
  const { queue, processing, duplicateItem, clearQueue } = useUpload();
  const [expanded, setExpanded] = useState(false);

  if (queue.length === 0) return null;

  const total = queue.length;
  const queued = queue.filter(q => q.status === 'QUEUED').length;
  const inProgress = processing || queued > 0;
  const completed = queue.filter(q => q.status === 'SUCCESS' || q.status === 'SKIPPED').length;
  const errors = queue.filter(q => q.status === 'ERROR').length;
  const duplicates = queue.filter(q => q.status === 'DUPLICATE').length;

  let headerText = 'Uploading Resumes';
  let headerColor = 'text-blue-700';
  let Icon = Loader2;
  let iconClass = 'animate-spin text-blue-600';

  if (duplicateItem) {
    headerText = 'Action Required';
    headerColor = 'text-amber-700';
    Icon = AlertTriangle;
    iconClass = 'text-amber-600';
  } else if (!inProgress) {
    headerText = 'Upload Complete';
    headerColor = 'text-emerald-700';
    Icon = CheckCircle2;
    iconClass = 'text-emerald-600';
  }

  const handleDismiss = () => {
    if (!inProgress && !duplicateItem) {
      clearQueue();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in shadow-2xl flex flex-col items-end">
      {expanded && (
        <div className="mb-3 w-80 max-h-80 bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl overflow-hidden shadow-xl flex flex-col animate-fade-in">
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Queue Details</span>
            <Link href="/upload" className="text-xs font-bold text-blue-600 hover:text-blue-800">
              Go to Uploads &rarr;
            </Link>
          </div>
          <div className="overflow-y-auto p-2 space-y-2 flex-1">
            {queue.map(item => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-100 shadow-sm text-sm">
                <span className="truncate flex-1 font-medium text-slate-800 mr-2 text-xs" title={item.file.name}>
                  {item.file.name}
                </span>
                {item.status === 'SUCCESS' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                {item.status === 'ERROR' && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                {item.status === 'DUPLICATE' && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                {item.status === 'PARSING' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />}
                {item.status === 'QUEUED' && <span className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0"></span>}
                {item.status === 'SKIPPED' && <span className="text-[10px] font-bold text-slate-500 shrink-0 uppercase">Skip</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-4 shadow-lg flex items-center gap-4 cursor-pointer hover:bg-white transition-colors duration-200 w-80" onClick={() => setExpanded(!expanded)}>
        <div className={`p-2 rounded-xl bg-slate-50 border border-slate-100 ${duplicateItem ? 'bg-amber-50 border-amber-200' : ''}`}>
          <Icon className={`w-6 h-6 ${iconClass}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-bold truncate ${headerColor}`}>
            {headerText}
          </h4>
          <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
            {completed} of {total} processed
            {errors > 0 && ` • ${errors} failed`}
          </p>
          
          {inProgress && total > 0 && (
            <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${duplicateItem ? 'bg-amber-500' : 'bg-blue-600'}`} 
                style={{ width: `${((total - queued - (processing ? 1 : 0)) / total) * 100}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center gap-1">
          <button 
            className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          
          {!inProgress && !duplicateItem && (
            <button 
              className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {duplicateItem && (
        <div className="mt-2 w-full text-right">
          <Link href="/upload" className="inline-flex items-center justify-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors">
            Resolve Duplicate Action Required
          </Link>
        </div>
      )}
    </div>
  );
}
