import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../lib/api';

export default function AdminSettings({ config, onUpdateConfig, authToken }) {
  const [counselorName, setCounselorName] = useState(config.counselorName || '');
  const [counselorAvatar, setCounselorAvatar] = useState(config.counselorAvatar || '🤖');
  const [counselorAvatarUrl, setCounselorAvatarUrl] = useState(config.counselorAvatarUrl || '');
  const [sidebarLogoUrl, setSidebarLogoUrl] = useState(config.sidebarLogoUrl || '');
  const [greetingMessage, setGreetingMessage] = useState(config.greetingMessage || '');
  const [behaviorMode, setBehaviorMode] = useState(config.behaviorMode || 'warm');
  
  const [status, setStatus] = useState(null);
  const [ingestionMetadata, setIngestionMetadata] = useState([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState('');
  
  const avatarInputRef = useRef(null);
  const logoInputRef = useRef(null);

  const handleImageUpload = (file, callback) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Drag and Drop Upload States
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // FAQ Editor States
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqStatus, setFaqStatus] = useState({ type: '', message: '' });
  const [isCreatingFaq, setIsCreatingFaq] = useState(false);

  // Deletion States
  const [deletingFile, setDeletingFile] = useState(null);

  // Query Debugger States
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // View / Edit Source States
  const [editingDocName, setEditingDocName] = useState(null);
  const [editingDocContent, setEditingDocContent] = useState('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isSavingContent, setIsSavingContent] = useState(false);
  const [editStatus, setEditStatus] = useState({ type: '', message: '' });
  const [uploadProgress, setUploadProgress] = useState(null);
  const [editProgress, setEditProgress] = useState(null);
  const [activeJobs, setActiveJobs] = useState([]);
  const [currentEditJobId, setCurrentEditJobId] = useState(null);

  useEffect(() => {
    fetchStatus();
    setCounselorName(config.counselorName || '');
    setCounselorAvatar(config.counselorAvatar || '🤖');
    setCounselorAvatarUrl(config.counselorAvatarUrl || '');
    setSidebarLogoUrl(config.sidebarLogoUrl || '');
    setGreetingMessage(config.greetingMessage || '');
    setBehaviorMode(config.behaviorMode || 'warm');
  }, [config]);

  const fetchIngestionMetadata = async () => {
    setIsLoadingMetadata(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/ingestion-metadata`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setIngestionMetadata(data.records || []);
      }
    } catch (err) {
      console.error('Error fetching ingestion metadata:', err);
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/status`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Error fetching status:', err);
    }
    fetchIngestionMetadata();
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    onUpdateConfig({
      counselorName,
      counselorAvatar,
      counselorAvatarUrl,
      sidebarLogoUrl,
      greetingMessage,
      behaviorMode
    });
  };

  const handleTriggerIngest = async () => {
    setIsIngesting(true);
    setIngestResult('Syncing database...');
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/ingest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        setIngestResult(data.message || 'Sync completed successfully.');
        fetchStatus();
      } else {
        setIngestResult(`Error: ${data.error || 'Failed to sync.'}`);
      }
    } catch (err) {
      setIngestResult('Network error during sync.');
      console.error(err);
    } finally {
      setIsIngesting(false);
    }
  };

  // Drag and Drop Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const dismissJob = (jobId) => {
    setActiveJobs(prev => prev.filter(j => j.jobId !== jobId));
  };

  const cancelActiveJob = async (jobId) => {
    setActiveJobs(prev => prev.map(job => {
      if (job.jobId === jobId) {
        return { ...job, status: 'cancelling' };
      }
      return job;
    }));

    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/jobs/${encodeURIComponent(jobId)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        setActiveJobs(prev => prev.map(job => {
          if (job.jobId === jobId) {
            return { ...job, status: 'cancelled' };
          }
          return job;
        }));
        fetchStatus();
        setTimeout(() => {
          dismissJob(jobId);
        }, 8000);
      } else {
        const data = await res.json();
        alert(`Failed to cancel job: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Error cancelling job:', err);
      alert(`Error communicating with server: ${err.message}`);
    }
  };

  const pollJobStatus = (jobId, type, fileName, onComplete) => {
    setActiveJobs(prev => {
      if (prev.some(j => j.jobId === jobId)) return prev;
      return [...prev, {
        jobId,
        type,
        fileName,
        status: 'processing',
        progress: { done: 0, total: 0 },
        error: null
      }];
    });

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/knowledge/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          const { status, progress, error } = data.job;

          setActiveJobs(prev => prev.map(job => {
            if (job.jobId === jobId) {
              return { ...job, status, progress, error };
            }
            return job;
          }));
          
          if (status === 'completed') {
            clearInterval(intervalId);
            fetchStatus();
            if (onComplete) onComplete(null, progress);
            
            setTimeout(() => {
              dismissJob(jobId);
            }, 8000);

          } else if (status === 'failed') {
            clearInterval(intervalId);
            if (onComplete) onComplete(error || 'Failed', progress);
            
            setTimeout(() => {
              dismissJob(jobId);
            }, 12000);
          } else if (status === 'cancelled') {
            clearInterval(intervalId);
            if (onComplete) onComplete('Cancelled', progress);
          }
        } else {
          clearInterval(intervalId);
          setActiveJobs(prev => prev.map(job => {
            if (job.jobId === jobId) {
              return { ...job, status: 'failed', error: 'Failed to communicate with server.' };
            }
            return job;
          }));
          if (onComplete) onComplete('Failed to poll status');
        }
      } catch (err) {
        clearInterval(intervalId);
        setActiveJobs(prev => prev.map(job => {
          if (job.jobId === jobId) {
            return { ...job, status: 'failed', error: err.message };
          }
          return job;
        }));
        if (onComplete) onComplete(err.message);
      }
    }, 2000);
    return intervalId;
  };

  const processFile = async (file) => {
    if (!file) return;
    
    const supportedExtensions = ['.pdf', '.docx', '.txt', '.md', '.csv', '.json'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!supportedExtensions.includes(fileExt)) {
      setUploadStatus({ type: 'error', message: 'Supported formats are: PDF, DOCX, TXT, MD, CSV, JSON.' });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: 'success', message: `Uploading "${file.name}"...` });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_BASE_URL}/api/knowledge/upload`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${authToken}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success && data.jobId) {
        setIsUploading(false);
        setUploadStatus({ type: 'success', message: `Upload complete. Indexing "${file.name}" in background...` });
        
        pollJobStatus(data.jobId, 'upload', file.name, (err, progress) => {
          if (err) {
            setUploadStatus({ type: 'error', message: `Indexing "${file.name}" failed: ${err}` });
          } else {
            setUploadStatus({ type: 'success', message: `Successfully indexed "${file.name}"! ${progress?.done || 0}/${progress?.total || 0} chunks.` });
          }
        });
      } else {
        setUploadStatus({ type: 'error', message: data.error || 'Upload failed.' });
        setIsUploading(false);
      }
    } catch (err) {
      setUploadStatus({ type: 'error', message: 'Connection to server failed during upload.' });
      setIsUploading(false);
      console.error(err);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  // FAQ Creator Handler
  const handleCreateFaq = async (e) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) {
      setFaqStatus({ type: 'error', message: 'Both Question and Answer fields are required.' });
      return;
    }

    setIsCreatingFaq(true);
    setFaqStatus({ type: 'success', message: 'Saving FAQ...' });

    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/faq`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          question: faqQuestion,
          answer: faqAnswer
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFaqStatus({ type: 'success', message: data.message || 'FAQ created and indexed!' });
        setFaqQuestion('');
        setFaqAnswer('');
        fetchStatus();
      } else {
        setFaqStatus({ type: 'error', message: data.error || 'Failed to save FAQ.' });
      }
    } catch (err) {
      setFaqStatus({ type: 'error', message: 'Server communication error while saving FAQ.' });
      console.error(err);
    } finally {
      setIsCreatingFaq(false);
    }
  };

  // File Deletion Handler
  const handleDeleteSource = async (fileName) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${fileName}" and purge its database chunks?`)) {
      return;
    }

    setDeletingFile(fileName);
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/delete`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ fileName })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        fetchStatus();
      } else {
        alert(`Failed to delete document: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Network error while deleting document.');
    } finally {
      setDeletingFile(null);
    }
  };

  const handleTestSearch = async (e) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/query`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ queryText: testQuery, limit: 2 })
      });
      if (res.ok) {
        const data = await res.json();
        setTestResults(data.results || []);
      }
    } catch (err) {
      console.error('Error search query:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Helper to determine badge type
  const getFileType = (fileName) => {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    if (ext === '.pdf') return 'pdf';
    if (ext === '.docx') return 'docx';
    if (ext === '.csv') return 'csv';
    if (ext === '.json') return 'json';
    if (ext === '.md') return 'md';
    if (fileName.toLowerCase().includes('faq')) return 'faq';
    return 'txt';
  };

  const handleViewEditSource = async (docName) => {
    setEditingDocName(docName);
    setIsLoadingContent(true);
    setEditStatus({ type: '', message: '' });
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/sources/${encodeURIComponent(docName)}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEditingDocContent(data.content || '');
      } else {
        alert('Failed to retrieve document contents.');
        setEditingDocName(null);
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching document contents.');
      setEditingDocName(null);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const handleCloseModal = () => {
    if (isSavingContent) return;
    setEditingDocName(null);
    setEditingDocContent('');
    setCurrentEditJobId(null);
    setEditStatus({ type: '', message: '' });
  };

  const handleSaveDocContent = async () => {
    setIsSavingContent(true);
    setEditStatus({ type: 'success', message: 'Saving changes...' });
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/sources/${encodeURIComponent(editingDocName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ content: editingDocContent })
      });
      
      const data = await res.json();
      if (res.ok && data.success && data.jobId) {
        setIsSavingContent(false);
        setCurrentEditJobId(data.jobId);
        setEditStatus({ type: 'success', message: 'Saved successfully. Indexing in background...' });
        
        pollJobStatus(data.jobId, 'edit', data.fileName, (err, progress) => {
          if (err) {
            if (err === 'Cancelled') {
              setEditStatus({ type: 'error', message: 'Indexing stopped. File reverted.' });
            } else {
              setEditStatus({ type: 'error', message: `Indexing failed: ${err}` });
            }
          } else {
            setEditStatus({ type: 'success', message: `Successfully indexed! ${progress?.done || 0}/${progress?.total || 0} chunks.` });
            setTimeout(() => {
              handleCloseModal();
            }, 2000);
          }
        });
      } else {
        setEditStatus({ type: 'error', message: data.error || 'Failed to save changes.' });
        setIsSavingContent(false);
      }
    } catch (err) {
      console.error(err);
      setEditStatus({ type: 'error', message: 'Connection to server failed.' });
      setIsSavingContent(false);
    }
  };

  return (
    <div className="admin-settings-container">
      <div className="admin-settings-inner">
        {/* Section 1: Counselor Persona Configuration */}
        <div className="settings-card">
          <h3>Counselor Config</h3>
          <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label>Counselor Name</label>
              <input
                type="text"
                className="form-control"
                value={counselorName}
                onChange={(e) => setCounselorName(e.target.value)}
                placeholder="Persona Name..."
              />
            </div>

            <div className="form-group" style={{ display: 'flex', gap: '20px', alignItems: 'center', margin: '8px 0' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 500 }}>Bot Avatar Image</label>
                <div 
                  onClick={() => avatarInputRef.current?.click()}
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    border: '2px dashed var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                    backgroundColor: 'var(--bg-primary)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {counselorAvatarUrl ? (
                    <img src={counselorAvatarUrl} alt="Avatar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '2rem' }}>{counselorAvatar || '🤖'}</span>
                  )}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    fontSize: '0.65rem',
                    textAlign: 'center',
                    padding: '2px 0'
                  }}>
                    Upload
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={avatarInputRef} 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageUpload(file, setCounselorAvatarUrl);
                    }
                  }} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
                {counselorAvatarUrl && (
                  <button 
                    type="button" 
                    onClick={() => setCounselorAvatarUrl('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      marginTop: '6px',
                      display: 'block',
                      textAlign: 'center',
                      width: '80px'
                    }}
                  >
                    Clear Image
                  </button>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 500 }}>Sidebar Logo Image</label>
                <div 
                  onClick={() => logoInputRef.current?.click()}
                  style={{
                    width: '180px',
                    height: '80px',
                    borderRadius: '8px',
                    border: '2px dashed var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                    backgroundColor: 'var(--bg-primary)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {sidebarLogoUrl ? (
                    <img src={sidebarLogoUrl} alt="Logo Preview" style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.75rem', padding: '10px' }}>
                      <span style={{ display: 'block', fontSize: '1.25rem', marginBottom: '2px' }}>🖼️</span>
                      No Logo (Text Fallback)
                    </div>
                  )}
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    fontSize: '0.65rem',
                    textAlign: 'center',
                    padding: '2px 0'
                  }}>
                    Upload Logo
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={logoInputRef} 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageUpload(file, setSidebarLogoUrl);
                    }
                  }} 
                  accept="image/*" 
                  style={{ display: 'none' }} 
                />
                {sidebarLogoUrl && (
                  <button 
                    type="button" 
                    onClick={() => setSidebarLogoUrl('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      marginTop: '6px',
                      display: 'block',
                      textAlign: 'center',
                      width: '180px'
                    }}
                  >
                    Clear Logo
                  </button>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Counselor Avatar (Emoji Fallback)</label>
              <input
                type="text"
                className="form-control"
                value={counselorAvatar}
                onChange={(e) => setCounselorAvatar(e.target.value)}
                placeholder="Emoji (e.g. 🤖) used when no custom image is uploaded..."
              />
            </div>

            <div className="form-group">
              <label>Greeting message</label>
              <textarea
                className="form-control"
                style={{ minHeight: '80px', resize: 'vertical' }}
                value={greetingMessage}
                onChange={(e) => setGreetingMessage(e.target.value)}
                placeholder="Greeting shown to new users..."
              />
            </div>

            <div className="form-group">
              <label>Conversation Style</label>
              <select
                className="form-control"
                value={behaviorMode}
                onChange={(e) => setBehaviorMode(e.target.value)}
              >
                <option value="warm">Warm & Supportive</option>
                <option value="formal">Formal & Structured</option>
                <option value="technical">Direct & Clear</option>
              </select>
            </div>

            <button type="submit" className="btn-primary">
              Save Changes
            </button>
          </form>
        </div>

        {/* Section 2: Knowledge Database Manager */}
        <div className="settings-card">
          <h3>Knowledge Manager</h3>
          
          {/* Database stats grid */}
          <div className="ingest-status-grid">
            <div className="stat-item">
              <div className="stat-label">Indexed Chunks</div>
              <div className="stat-val">{status ? status.chunksCount : '0'}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Total Sources</div>
              <div className="stat-val">{status ? status.sourceDocuments.length : '0'}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Model Embeddings</div>
              <div className="stat-val" style={{ fontSize: '0.85rem', marginTop: '6px', fontWeight: 500, color: status && status.apiKeyConfigured ? '#10b981' : 'orange' }}>
                {status && status.apiKeyConfigured ? 'Production (Gemini)' : 'Mock (Local Testing)'}
              </div>
            </div>
          </div>

          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>

          {/* Active Jobs Ingestion Tray */}
          {activeJobs.length > 0 && (
            <div style={{
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '16px',
              marginTop: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {activeJobs.some(j => j.status === 'processing' || j.status === 'cancelling') && (
                    <span className="spinner-border spinner-border-sm" style={{ border: '2px solid transparent', borderTop: '2px solid var(--text-primary)', borderRadius: '50%', width: '12px', height: '12px', display: 'inline-block', animation: 'spin 1s linear infinite' }}></span>
                  )}
                  ⚙️ Background Ingestion Jobs ({activeJobs.filter(j => j.status === 'processing').length} active)
                </h4>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeJobs.map(job => {
                  const percent = job.progress?.total > 0 ? Math.round((job.progress.done / job.progress.total) * 100) : 0;
                  const isDone = job.status === 'completed';
                  const isFailed = job.status === 'failed';
                  const isCancelled = job.status === 'cancelled';
                  const isProcessing = job.status === 'processing';
                  const isCancelling = job.status === 'cancelling';

                  return (
                    <div key={job.jobId} style={{
                      background: 'var(--bg-secondary)',
                      border: `1px solid ${isDone ? '#10b981' : (isFailed || isCancelled) ? '#ef4444' : 'var(--border-color)'}`,
                      borderRadius: '6px',
                      padding: '12px',
                      position: 'relative'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            📄 {job.fileName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Type: <strong style={{ textTransform: 'uppercase' }}>{job.type}</strong> | Status: 
                            <span style={{
                              marginLeft: '4px',
                              fontWeight: 600,
                              color: isDone ? '#10b981' : isFailed ? '#ef4444' : isCancelled ? '#d97706' : 'var(--text-secondary)'
                            }}>
                              {job.status === 'processing' ? 'Indexing...' : job.status === 'cancelling' ? 'Stopping...' : job.status}
                            </span>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {isProcessing && (
                            <button
                              onClick={() => cancelActiveJob(job.jobId)}
                              style={{
                                background: '#dc2626',
                                color: '#fff',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                cursor: 'pointer'
                              }}
                            >
                              Stop
                            </button>
                          )}
                          <button
                            onClick={() => dismissJob(job.jobId)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              fontSize: '0.9rem',
                              cursor: 'pointer',
                              padding: '0 4px'
                            }}
                            title="Dismiss notification"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {(isProcessing || isCancelling || isDone) && job.progress?.total > 0 && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            <span>{job.progress.done} / {job.progress.total} chunks processed</span>
                            <span>{percent}%</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${percent}%`,
                              height: '100%',
                              background: isDone ? '#10b981' : '#3b82f6',
                              transition: 'width 0.3s ease'
                            }}></div>
                          </div>
                        </div>
                      )}

                      {isFailed && (
                        <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '6px' }}>
                          ⚠️ Error: {job.error || 'Unknown error'}
                        </div>
                      )}
                      {isCancelled && (
                        <div style={{ fontSize: '0.75rem', color: '#d97706', marginTop: '6px' }}>
                          🚫 Indexing stopped. File content reverted.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Table List of active document sources */}
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase' }}>
              Active Knowledge Sources
            </h4>
            
            <div className="doc-table-container">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Document Source</th>
                    <th style={{ width: '80px' }}>Type</th>
                    <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {status && status.sourceDocuments.length > 0 ? (
                    status.sourceDocuments.map((doc, idx) => (
                      <tr key={idx}>
                        <td style={{ wordBreak: 'break-all' }}>{doc}</td>
                        <td>
                          <span className={`doc-type-badge ${getFileType(doc)}`}>
                            {getFileType(doc)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <button
                            onClick={() => handleViewEditSource(doc)}
                            className="btn-delete"
                            title="View / Edit Content"
                            style={{ marginRight: '8px', color: 'var(--accent-color)' }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path>
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteSource(doc)}
                            className="btn-delete"
                            title="Delete Source"
                            disabled={deletingFile === doc}
                          >
                            {deletingFile === doc ? (
                              '...'
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No files in database directory.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Indexing Health / Ingestion Metadata Table */}
          <div style={{ marginTop: '32px' }}>
            <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase' }}>
              Indexing Health & Ingestion Metadata
            </h4>
            <div className="doc-table-container">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Source Document</th>
                    <th style={{ width: '40px', textAlign: 'center' }}>v</th>
                    <th style={{ width: '120px' }}>Status</th>
                    <th style={{ width: '60px', textAlign: 'center' }}>Chunks</th>
                    <th style={{ width: '40px', textAlign: 'center' }}>✅</th>
                    <th style={{ width: '40px', textAlign: 'center' }}>❌</th>
                    <th style={{ width: '150px' }}>Provider · Model</th>
                    <th style={{ width: '100px' }}>Initiated By</th>
                    <th style={{ width: '100px' }}>Completed By</th>
                    <th style={{ width: '120px' }}>Last Indexed</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingMetadata ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Loading ingestion metadata...
                      </td>
                    </tr>
                  ) : ingestionMetadata.length > 0 ? (
                    ingestionMetadata.map((record) => {
                      let badgeStyle = { padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, display: 'inline-block' };
                      if (record.status === 'Completed') {
                        badgeStyle = { ...badgeStyle, backgroundColor: '#d1fae5', color: '#065f46' };
                      } else if (record.status === 'Completed with Warnings') {
                        badgeStyle = { ...badgeStyle, backgroundColor: '#fef3c7', color: '#92400e' };
                      } else if (record.status === 'Failed') {
                        badgeStyle = { ...badgeStyle, backgroundColor: '#fee2e2', color: '#991b1b' };
                      } else if (record.status === 'Processing') {
                        badgeStyle = { ...badgeStyle, backgroundColor: '#e0f2fe', color: '#075985' };
                      } else {
                        badgeStyle = { ...badgeStyle, backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' };
                      }

                      const formatActor = (actor) => {
                        if (!actor) return '-';
                        if (actor === 'system-script' || actor === 'system-api') return actor;
                        if (actor.includes('@')) return actor;
                        return actor.substring(0, 8);
                      };

                      const formatDate = (dateStr) => {
                        if (!dateStr) return '-';
                        try {
                          const date = new Date(dateStr);
                          return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        } catch (e) {
                          return dateStr;
                        }
                      };

                      return (
                        <tr key={record.sourceId}>
                          <td style={{ wordBreak: 'break-all' }} title={record.fileName}>{record.fileName}</td>
                          <td style={{ textAlign: 'center' }}>{record.version || 1}</td>
                          <td>
                            <span style={badgeStyle}>
                              {record.status}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>{record.totalChunks}</td>
                          <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 'bold' }}>{record.successfulChunks}</td>
                          <td style={{ textAlign: 'center', color: record.failedChunks > 0 ? '#ef4444' : 'var(--text-muted)' }}>{record.failedChunks}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {record.embeddingProvider} · {record.embeddingModel}
                          </td>
                          <td title={record.initiatedBy}>{formatActor(record.initiatedBy)}</td>
                          <td title={record.completedBy}>{formatActor(record.completedBy)}</td>
                          <td>{formatDate(record.lastIndexedAt)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No ingestion records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Information Subsections */}
          <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Upload PDF Section */}
            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Upload Knowledge Document
              </h4>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,.csv,.json"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <div
                className={`dropzone ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={onButtonClick}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="dropzone-icon">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                <div className="dropzone-text">
                  {isUploading ? 'Uploading and indexing...' : 'Drag & Drop file or click to browse'}
                </div>
                <div className="dropzone-hint">
                  Supports PDF, DOCX, TXT, MD, CSV, JSON
                </div>
              </div>

              {uploadStatus.message && (
                <div className={`notification ${uploadStatus.type}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div>{uploadStatus.message}</div>
                  {uploadProgress && uploadProgress.total > 0 && (
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round((uploadProgress.done / uploadProgress.total) * 100)}%`, height: '100%', background: '#fff', transition: 'width 0.3s ease' }}></div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Custom Q&A FAQ form */}
            <div>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Add Custom Guidelines / FAQ
              </h4>
              
              <form onSubmit={handleCreateFaq} className="faq-editor-form">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Question or Heading..."
                    value={faqQuestion}
                    onChange={(e) => setFaqQuestion(e.target.value)}
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <textarea
                    className="form-control"
                    style={{ minHeight: '80px', resize: 'vertical' }}
                    placeholder="Answer or guidelines details..."
                    value={faqAnswer}
                    onChange={(e) => setFaqAnswer(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start' }}
                  disabled={isCreatingFaq}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  {isCreatingFaq ? 'Saving...' : 'Add Guideline'}
                </button>
              </form>

              {faqStatus.message && (
                <div className={`notification ${faqStatus.type}`}>
                  {faqStatus.message}
                </div>
              )}
            </div>

            {/* Manual Sync Fallback Action */}
            <div style={{ borderTop: '1px dashed var(--border-color)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={handleTriggerIngest}
                className="btn-secondary"
                style={{ alignSelf: 'flex-start' }}
                disabled={isIngesting}
              >
                {isIngesting ? 'Syncing...' : 'Re-sync Entire Directory'}
              </button>
              {ingestResult && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {ingestResult}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Section 3: RAG Search Debugger */}
        <div className="settings-card" style={{ borderBottom: 'none' }}>
          <h3>Knowledge Search Debugger</h3>
          <form onSubmit={handleTestSearch} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              className="form-control"
              style={{ flex: 1 }}
              placeholder="Query database chunks..."
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={isSearching}>
              Search
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {testResults.length === 0 ? (
              <p style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No database query matching tests run.
              </p>
            ) : (
              testResults.map((chunk, idx) => (
                <div key={chunk.id} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    <strong>Match #{idx + 1} ({chunk.metadata.source})</strong>
                    <span>Diff: {chunk.distance?.toFixed(3) || 'N/A'}</span>
                  </div>
                  <div style={{ fontSize: '0.8rem', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
                    {chunk.text}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Document View / Edit Modal */}
      {editingDocName && (() => {
        const currentEditJob = activeJobs.find(j => j.jobId === currentEditJobId);
        const isIndexing = currentEditJob && (currentEditJob.status === 'processing' || currentEditJob.status === 'cancelling');
        
        const showStatusType = currentEditJob
          ? (currentEditJob.status === 'completed' ? 'success' : (currentEditJob.status === 'failed' || currentEditJob.status === 'cancelled') ? 'error' : 'success')
          : editStatus.type;

        const showStatusMsg = currentEditJob
          ? (currentEditJob.status === 'completed'
              ? `Successfully indexed! Processed ${currentEditJob.progress.done}/${currentEditJob.progress.total} chunks.`
              : currentEditJob.status === 'failed'
                ? `Indexing failed: ${currentEditJob.error || 'Unknown error'}`
                : currentEditJob.status === 'cancelled'
                  ? 'Indexing stopped. File reverted.'
                  : currentEditJob.status === 'cancelling'
                    ? 'Stopping indexing...'
                    : `Indexing in progress: ${currentEditJob.progress.done} / ${currentEditJob.progress.total} chunks...`)
          : editStatus.message;

        const percent = currentEditJob && currentEditJob.progress.total > 0
          ? Math.round((currentEditJob.progress.done / currentEditJob.progress.total) * 100)
          : 0;

        const getCancelButtonProps = () => {
          if (currentEditJob) {
            if (currentEditJob.status === 'processing') {
              return {
                label: 'Stop Indexing',
                onClick: () => cancelActiveJob(currentEditJobId),
                disabled: false,
                style: { padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer' }
              };
            }
            if (currentEditJob.status === 'cancelling') {
              return {
                label: 'Stopping...',
                onClick: () => {},
                disabled: true,
                style: { padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'not-allowed', opacity: 0.7 }
              };
            }
            return {
              label: 'Close',
              onClick: handleCloseModal,
              disabled: false,
              style: { padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }
            };
          }
          return {
            label: 'Cancel',
            onClick: handleCloseModal,
            disabled: isSavingContent,
            style: { padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', cursor: isSavingContent ? 'not-allowed' : 'pointer' }
          };
        };
        const cancelBtnProps = getCancelButtonProps();

        return (
          <div className="modal-backdrop" onClick={handleCloseModal}>
            <div className="settings-modal" onClick={(e) => e.stopPropagation()} style={{ width: '80%', maxWidth: '900px', height: '80%', display: 'flex', flexDirection: 'column' }}>
              <div className="settings-modal-header">
                <h2>View / Edit Source - {editingDocName}</h2>
                <button
                  className="close-modal-btn"
                  onClick={handleCloseModal}
                  title={isIndexing ? "Close window — indexing continues in background" : "Close"}
                >
                  ✕
                </button>
              </div>
              <div className="settings-modal-body" style={{ display: 'flex', flexDirection: 'column', padding: '20px', gap: '16px', overflow: 'hidden', flex: 1 }}>
                {isLoadingContent ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                    Loading document contents...
                  </div>
                ) : (
                  <>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                      💡 Editing this document will overwrite the text contents and re-index the vector database.
                      { (editingDocName.toLowerCase().endsWith('.pdf') || editingDocName.toLowerCase().endsWith('.docx')) && (
                        <strong style={{ color: '#d97706', display: 'block', marginTop: '4px' }}>
                          ⚠️ Note: This is a binary file ({editingDocName.substring(editingDocName.lastIndexOf('.'))}). Saving modifications will convert it to a plain text file (.txt) to store your edits.
                        </strong>
                      )}
                    </p>
                    <textarea
                      className="form-control"
                      style={{ flex: 1, minHeight: '300px', fontFamily: 'monospace', fontSize: '0.85rem', resize: 'none', lineHeight: '1.5' }}
                      value={editingDocContent}
                      onChange={(e) => setEditingDocContent(e.target.value)}
                      disabled={isSavingContent || isIndexing}
                    />
                    {showStatusMsg && (
                      <div className={`notification ${showStatusType}`} style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>{showStatusMsg}</div>
                        {currentEditJob && currentEditJob.progress && currentEditJob.progress.total > 0 && (
                          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', background: '#fff', transition: 'width 0.3s ease' }}></div>
                          </div>
                        )}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                      <button
                        className="btn-secondary"
                        onClick={cancelBtnProps.onClick}
                        disabled={cancelBtnProps.disabled}
                        style={cancelBtnProps.style}
                      >
                        {cancelBtnProps.label}
                      </button>
                      <button
                        className="btn-primary"
                        onClick={handleSaveDocContent}
                        disabled={isSavingContent || isIndexing}
                        style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem', cursor: (isSavingContent || isIndexing) ? 'not-allowed' : 'pointer' }}
                      >
                        {isIndexing ? 'Indexing...' : (isSavingContent ? 'Saving...' : 'Save Changes')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

