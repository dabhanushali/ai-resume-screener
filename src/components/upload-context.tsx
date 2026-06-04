'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

export interface UploadQueueItem {
  id: string;
  file: File;
  status: 'QUEUED' | 'PARSING' | 'DUPLICATE' | 'SUCCESS' | 'SKIPPED' | 'ERROR';
  progress: number;
  jobId: string;
  jobTitle?: string;
  errorMsg?: string;
  extractedDetails?: any;
  existingCandidate?: any;
}

interface UploadContextType {
  queue: UploadQueueItem[];
  setQueue: React.Dispatch<React.SetStateAction<UploadQueueItem[]>>;
  processing: boolean;
  setProcessing: React.Dispatch<React.SetStateAction<boolean>>;
  selectedJobId: string;
  setSelectedJobId: (id: string) => void;
  pageError: string;
  setPageError: (err: string) => void;
  duplicateItem: UploadQueueItem | null;
  setDuplicateItem: (item: UploadQueueItem | null) => void;
  addFilesToQueue: (files: File[], jobId: string, jobTitle?: string) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  processQueue: () => Promise<void>;
  resolveDuplicateAction: (keepNew: boolean) => Promise<void>;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [pageError, setPageError] = useState('');
  const [duplicateItem, setDuplicateItem] = useState<UploadQueueItem | null>(null);

  const queueRef = useRef<UploadQueueItem[]>([]);
  const selectedJobIdRef = useRef<string>('');

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    selectedJobIdRef.current = selectedJobId;
  }, [selectedJobId]);

  const addFilesToQueue = (files: File[], targetJobId: string, targetJobTitle?: string) => {
    const MAX_FILE_SIZE_MB = 10;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

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
        jobId: targetJobId,
        jobTitle: targetJobTitle,
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

  const updateItemStatus = (id: string, status: UploadQueueItem['status'], progress: number) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, status, progress } : item
    ));
  };

  const processQueue = async () => {
    if (processing) return; // Prevent concurrent processing loops

    setPageError('');
    setProcessing(true);

    while (true) {
      const nextItem = queueRef.current.find(item => item.status === 'QUEUED');
      if (!nextItem) break;

      updateItemStatus(nextItem.id, 'PARSING', 20);

      try {
        const formData = new FormData();
        formData.append('file', nextItem.file);
        formData.append('jobId', nextItem.jobId);

        const res = await fetch('/api/resumes/upload', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();

        if (res.status === 200 && data.duplicate) {
          setQueue(prev => prev.map(q => 
            q.id === nextItem.id 
              ? { ...q, status: 'DUPLICATE', progress: 100, extractedDetails: data.candidateDetails, existingCandidate: data.existingCandidate }
              : q
          ));
          setDuplicateItem({
            ...nextItem,
            status: 'DUPLICATE',
            extractedDetails: data.candidateDetails,
            existingCandidate: data.existingCandidate
          });
          setProcessing(false);
          return; // Pause processing
        }

        if (!res.ok) {
          throw new Error(data.error || 'Parsing error');
        }

        updateItemStatus(nextItem.id, 'SUCCESS', 100);
      } catch (e: any) {
        setQueue(prev => prev.map(q => 
          q.id === nextItem.id ? { ...q, status: 'ERROR', progress: 100, errorMsg: e.message || 'Processing failed' } : q
        ));
      }
      
      // Allow state update to propagate
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setProcessing(false);
  };

  const resolveDuplicateAction = async (keepNew: boolean) => {
    if (!duplicateItem) return;

    const itemId = duplicateItem.id;
    const itemJobId = duplicateItem.jobId;
    setDuplicateItem(null);
    setProcessing(true);

    if (!keepNew) {
      setQueue(prev => prev.map(q => 
        q.id === itemId ? { ...q, status: 'SKIPPED', progress: 100, errorMsg: 'Skipped - kept original candidate' } : q
      ));
      setTimeout(() => processQueue(), 200);
      return;
    }

    updateItemStatus(itemId, 'PARSING', 60);

    try {
      const formData = new FormData();
      formData.append('file', duplicateItem.file);
      formData.append('jobId', itemJobId);
      formData.append('overrideDuplicate', 'true');

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

    setTimeout(() => processQueue(), 200);
  };

  return (
    <UploadContext.Provider value={{
      queue, setQueue,
      processing, setProcessing,
      selectedJobId, setSelectedJobId,
      pageError, setPageError,
      duplicateItem, setDuplicateItem,
      addFilesToQueue,
      removeFromQueue,
      clearQueue,
      processQueue,
      resolveDuplicateAction
    }}>
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
}
