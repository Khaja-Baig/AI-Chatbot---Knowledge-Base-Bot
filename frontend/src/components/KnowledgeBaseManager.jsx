import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../lib/api';
import './KnowledgeBaseManager.css';

export default function KnowledgeBaseManager({ authToken }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'documents' | 'chunks' | 'add' | 'debugger'

  // Global Status & Metadata
  const [status, setStatus] = useState(null);
  const [ingestionMetadata, setIngestionMetadata] = useState([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);

  // Chunks Browser States
  const [chunks, setChunks] = useState([]);
  const [chunksPage, setChunksPage] = useState(1);
  const [chunksTotalPages, setChunksTotalPages] = useState(1);
  const [chunksTotal, setChunksTotal] = useState(0);
  const [chunksFilter, setChunksFilter] = useState('');
  const [isLoadingChunks, setIsLoadingChunks] = useState(false);

  // Background Jobs
  const [activeJobs, setActiveJobs] = useState([]);

  // Document Editor Modal
  const [editingDocName, setEditingDocName] = useState(null);
  const [editingDocContent, setEditingDocContent] = useState('');
  const [isLoadingDocContent, setIsLoadingDocContent] = useState(false);
  const [isSavingDocContent, setIsSavingDocContent] = useState(false);
  const [editStatus, setEditStatus] = useState({ type: '', message: '' });
  const [currentEditJobId, setCurrentEditJobId] = useState(null);

  // Single Chunk Editor Modal
  const [editingChunk, setEditingChunk] = useState(null);
  const [editingChunkText, setEditingChunkText] = useState('');
  const [isSavingChunk, setIsSavingChunk] = useState(false);
  const [chunkEditStatus, setChunkEditStatus] = useState({ type: '', message: '' });


  // RAG Debugger States
  const [testQuery, setTestQuery] = useState('');
  const [testLimit, setTestLimit] = useState(3);
  const [testResults, setTestResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Add Knowledge Form States
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqStatus, setFaqStatus] = useState({ type: '', message: '' });
  const [isCreatingFaq, setIsCreatingFaq] = useState(false);

  // Confirm Modal Drawer States
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null, isDanger: false });

  // Load status and metadata on boot
  useEffect(() => {
    fetchStatus();
    fetchIngestionMetadata();
  }, [authToken]);

  // Load chunks when tab or page changes
  useEffect(() => {
    if (activeTab === 'chunks') {
      fetchChunks(chunksPage, chunksFilter);
    }
  }, [activeTab, chunksPage]);

  const fetchStatus = async () => {
    setIsLoadingStatus(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/status`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error('Error fetching knowledge status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const fetchIngestionMetadata = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/ingestion-metadata`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIngestionMetadata(data.records || []);
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  const fetchChunks = async (page = 1, source = '') => {
    setIsLoadingChunks(true);
    try {
      let url = `${API_BASE_URL}/api/knowledge/chunks?page=${page}&limit=12`;
      if (source) url += `&source=${encodeURIComponent(source)}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChunks(data.chunks || []);
        setChunksTotal(data.total || 0);
        setChunksTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Error fetching vector chunks:', err);
    } finally {
      setIsLoadingChunks(false);
    }
  };

  // Job status polling helper
  const pollJobStatus = (jobId, type, fileName, onComplete) => {
    setActiveJobs(prev => {
      if (prev.some(j => j.jobId === jobId)) return prev;
      return [...prev, { jobId, type, fileName, status: 'processing', progress: { done: 0, total: 0 }, error: null }];
    });

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/knowledge/jobs/${jobId}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
          const data = await res.json();
          const { status, progress, error } = data.job;

          setActiveJobs(prev => prev.map(job => (job.jobId === jobId ? { ...job, status, progress, error } : job)));

          if (status === 'completed' || status === 'failed' || status === 'cancelled') {
            clearInterval(intervalId);
            fetchStatus();
            fetchIngestionMetadata();
            if (onComplete) onComplete(status === 'failed' ? error : null, progress);
            setTimeout(() => dismissJob(jobId), 8000);
          }
        }
      } catch (err) {
        clearInterval(intervalId);
      }
    }, 2000);
  };

  const dismissJob = (jobId) => {
    setActiveJobs(prev => prev.filter(j => j.jobId !== jobId));
  };

  const cancelJob = async (jobId) => {
    try {
      await fetch(`${API_BASE_URL}/api/knowledge/jobs/${encodeURIComponent(jobId)}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      setActiveJobs(prev => prev.map(j => j.jobId === jobId ? { ...j, status: 'cancelled' } : j));
      fetchStatus();
    } catch (err) {
      console.error('Error cancelling job:', err);
    }
  };

  // Document management
  const handleDeleteDocument = (fileName) => {
    setConfirmModal({
      open: true,
      title: 'Delete Knowledge Source',
      message: `Are you sure you want to permanently purge "${fileName}" and all associated vector database chunks?`,
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/knowledge/delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
            body: JSON.stringify({ fileName })
          });
          if (res.ok) {
            fetchStatus();
            fetchIngestionMetadata();
          }
        } catch (err) {
          console.error('Delete error:', err);
        }
        setConfirmModal({ open: false });
      }
    });
  };

  const handleViewEditSource = async (docName) => {
    setEditingDocName(docName);
    setIsLoadingDocContent(true);
    setEditStatus({ type: '', message: '' });
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/sources/${encodeURIComponent(docName)}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEditingDocContent(data.content || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDocContent(false);
    }
  };

  const handleSaveDocContent = async () => {
    setIsSavingDocContent(true);
    setEditStatus({ type: 'success', message: 'Saving and re-indexing...' });
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/sources/${encodeURIComponent(editingDocName)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ content: editingDocContent })
      });
      const data = await res.json();
      if (res.ok && data.success && data.jobId) {
        setIsSavingDocContent(false);
        setCurrentEditJobId(data.jobId);
        pollJobStatus(data.jobId, 'edit', data.fileName, (err) => {
          if (!err) {
            setEditStatus({ type: 'success', message: 'Indexed successfully!' });
            setTimeout(() => setEditingDocName(null), 1500);
          }
        });
      }
    } catch (err) {
      setEditStatus({ type: 'error', message: 'Failed to save changes.' });
      setIsSavingDocContent(false);
    }
  };

  // Upload handling
  const processFile = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setUploadStatus({ type: 'success', message: `Uploading "${file.name}"...` });
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE_URL}/api/knowledge/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.jobId) {
        setIsUploading(false);
        setUploadStatus({ type: 'success', message: `Upload complete. Indexing "${file.name}" in background...` });
        pollJobStatus(data.jobId, 'upload', file.name, (err) => {
          if (!err) setUploadStatus({ type: 'success', message: `Successfully indexed "${file.name}"!` });
        });
      }
    } catch (err) {
      setIsUploading(false);
      setUploadStatus({ type: 'error', message: 'Upload failed.' });
    }
  };

  // FAQ creation
  const handleCreateFaq = async (e) => {
    e.preventDefault();
    if (!faqQuestion.trim() || !faqAnswer.trim()) return;
    setIsCreatingFaq(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/faq`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ question: faqQuestion, answer: faqAnswer })
      });
      if (res.ok) {
        setFaqStatus({ type: 'success', message: 'FAQ created and indexed!' });
        setFaqQuestion('');
        setFaqAnswer('');
        fetchStatus();
      }
    } catch (err) {
      setFaqStatus({ type: 'error', message: 'Failed to create FAQ.' });
    } finally {
      setIsCreatingFaq(false);
    }
  };

  // Single chunk delete
  const handleDeleteChunk = (chunkId) => {
    setConfirmModal({
      open: true,
      title: 'Delete Vector Chunk',
      message: `Are you sure you want to remove chunk ID "${chunkId}"?`,
      isDanger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/knowledge/chunks/${encodeURIComponent(chunkId)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          if (res.ok) fetchChunks(chunksPage, chunksFilter);
        } catch (err) {
          console.error('Error deleting chunk:', err);
        }
        setConfirmModal({ open: false });
      }
    });
  };

  // Single chunk edit (<200ms real-time update)
  const handleEditChunk = (chunk) => {
    setEditingChunk(chunk);
    setEditingChunkText(chunk.text || '');
    setChunkEditStatus({ type: '', message: '' });
  };

  const handleSaveChunk = async () => {
    if (!editingChunk) return;
    setIsSavingChunk(true);
    setChunkEditStatus({ type: 'success', message: '⚡ Updating chunk and re-embedding in real time...' });

    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/chunks/${encodeURIComponent(editingChunk.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ text: editingChunkText })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setChunkEditStatus({ type: 'success', message: '⚡ Chunk updated and re-embedded in <200ms!' });
        setChunks(prev => prev.map(c => c.id === editingChunk.id ? { ...c, text: editingChunkText, metadata: data.chunk.metadata } : c));
        setTimeout(() => {
          setEditingChunk(null);
        }, 1200);
      } else {
        setChunkEditStatus({ type: 'error', message: data.error || 'Failed to update chunk.' });
      }
    } catch (err) {
      console.error('Error updating chunk:', err);
      setChunkEditStatus({ type: 'error', message: 'Network error while updating chunk.' });
    } finally {
      setIsSavingChunk(false);
    }
  };


  // RAG Debugger
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!testQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/knowledge/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ queryText: testQuery, limit: testLimit })
      });
      if (res.ok) {
        const data = await res.json();
        setTestResults(data.results || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const getFileType = (fileName) => {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    return ['pdf', 'docx', 'csv', 'json', 'md'].includes(ext.slice(1)) ? ext.slice(1) : 'txt';
  };

  return (
    <div className="kb-container">

      {/* Internal Navigation Tabs */}
      <div className="kb-tab-bar">
        <button className={`kb-tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          📊 Overview
        </button>
        <button className={`kb-tab-btn ${activeTab === 'documents' ? 'active' : ''}`} onClick={() => setActiveTab('documents')}>
          📁 Documents ({status ? status.sourceDocuments.length : 0})
        </button>
        <button className={`kb-tab-btn ${activeTab === 'chunks' ? 'active' : ''}`} onClick={() => setActiveTab('chunks')}>
          🧩 Chunks Browser ({status ? status.chunksCount : 0})
        </button>
        <button className={`kb-tab-btn ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>
          ➕ Add Knowledge
        </button>
        <button className={`kb-tab-btn ${activeTab === 'debugger' ? 'active' : ''}`} onClick={() => setActiveTab('debugger')}>
          🔍 RAG Search Debugger
        </button>
      </div>

      {/* VIEW 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div>
          <div className="kb-stats-grid">
            <div className="kb-stat-card">
              <span className="kb-stat-icon">🧩</span>
              <span className="kb-stat-label">Indexed Vector Chunks</span>
              <span className="kb-stat-val">{status ? status.chunksCount : '0'}</span>
            </div>

            <div className="kb-stat-card">
              <span className="kb-stat-icon">📄</span>
              <span className="kb-stat-label">Source Documents</span>
              <span className="kb-stat-val">{status ? status.sourceDocuments.length : '0'}</span>
            </div>

            <div className="kb-stat-card">
              <span className="kb-stat-icon">🤖</span>
              <span className="kb-stat-label">Embedding Provider</span>
              <span className="kb-stat-val" style={{ fontSize: '1.2rem', color: status?.apiKeyConfigured ? '#10b981' : '#d97706' }}>
                {status?.apiKeyConfigured ? 'Google Gemini (768d)' : 'Mock (Local)'}
              </span>
            </div>

            <div className="kb-stat-card">
              <span className="kb-stat-icon">⚡</span>
              <span className="kb-stat-label">ChromaDB Status</span>
              <div>
                <span className={`kb-badge ${status ? 'online' : 'offline'}`}>
                  <span className="pulse-dot"></span>
                  {status ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>
          </div>

          <div className="kb-card">
            <div className="kb-card-header">
              <div>
                <h3 className="kb-card-title">Ingestion & Sync Health</h3>
                <p className="kb-card-subtitle">Latest background indexing jobs and document health metadata.</p>
              </div>
              <button className="btn-secondary" onClick={fetchStatus}>🔄 Refresh Stats</button>
            </div>

            <div className="doc-table-container">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Source File</th>
                    <th>Status</th>
                    <th>Chunks</th>
                    <th>Completed By</th>
                    <th>Last Indexed</th>
                  </tr>
                </thead>
                <tbody>
                  {ingestionMetadata.length > 0 ? (
                    ingestionMetadata.slice(0, 5).map((rec) => (
                      <tr key={rec.sourceId}>
                        <td>{rec.fileName}</td>
                        <td>
                          <span className={`doc-type-badge ${rec.status === 'Completed' ? 'pdf' : 'faq'}`}>
                            {rec.status}
                          </span>
                        </td>
                        <td>{rec.totalChunks}</td>
                        <td>{rec.completedBy || '-'}</td>
                        <td>{rec.lastIndexedAt ? new Date(rec.lastIndexedAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No ingestion history recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DOCUMENTS */}
      {activeTab === 'documents' && (
        <div className="kb-card">
          <div className="kb-card-header">
            <div>
              <h3 className="kb-card-title">Source Documents Directory</h3>
              <p className="kb-card-subtitle">Manage raw files powering your admissions counselor context.</p>
            </div>
            <button className="btn-primary" onClick={() => setActiveTab('add')}>+ Add Document</button>
          </div>

          <div className="doc-table-container">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th style={{ width: '90px' }}>Type</th>
                  <th style={{ width: '140px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {status && status.sourceDocuments.length > 0 ? (
                  status.sourceDocuments.map((doc, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 500 }}>{doc}</td>
                      <td>
                        <span className={`doc-type-badge ${getFileType(doc)}`}>
                          {getFileType(doc)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn-delete"
                          onClick={() => handleViewEditSource(doc)}
                          title="View / Edit Content"
                          style={{ marginRight: '12px', color: 'var(--accent-color)' }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteDocument(doc)}
                          title="Delete File & Chunks"
                        >
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No documents found in raw database directory.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: CHUNKS BROWSER */}
      {activeTab === 'chunks' && (
        <div>
          <div className="kb-card-header" style={{ marginBottom: '16px' }}>
            <div>
              <h3 className="kb-card-title">Raw Vector Chunks Browser</h3>
              <p className="kb-card-subtitle">Showing {chunks.length} of {chunksTotal} chunks across all vector collections.</p>
            </div>
            <div className="kb-search-bar">
              <input
                type="text"
                className="kb-input"
                placeholder="Filter by source name..."
                value={chunksFilter}
                onChange={(e) => {
                  setChunksFilter(e.target.value);
                  fetchChunks(1, e.target.value);
                }}
              />
            </div>
          </div>

          {isLoadingChunks ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading vector chunks...</div>
          ) : chunks.length > 0 ? (
            <div>
              <div className="chunks-grid">
                {chunks.map((chunk) => (
                  <div key={chunk.id} className="chunk-card">
                    <div className="chunk-header">
                      <span className="chunk-id" title={chunk.id}>{chunk.id}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={() => handleEditChunk(chunk)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                          title="Edit chunk instantly (<200ms)"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteChunk(chunk.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                          title="Delete this chunk"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Source: <strong>{chunk.metadata?.source || 'Unknown'}</strong> | Category: {chunk.metadata?.category || 'general'}
                      {chunk.metadata?.manuallyEdited && (
                        <span style={{ color: 'var(--accent-color)', fontWeight: 600, marginLeft: '6px' }}>[Edited]</span>
                      )}
                    </div>
                    <div className="chunk-text">
                      {chunk.text}
                    </div>
                  </div>
                ))}

              </div>

              {/* Pagination Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Page {chunksPage} of {chunksTotalPages}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-secondary"
                    disabled={chunksPage <= 1}
                    onClick={() => setChunksPage(p => Math.max(1, p - 1))}
                  >
                    ◀ Prev
                  </button>
                  <button
                    className="btn-secondary"
                    disabled={chunksPage >= chunksTotalPages}
                    onClick={() => setChunksPage(p => Math.min(chunksTotalPages, p + 1))}
                  >
                    Next ▶
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="kb-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No chunks found matching current filter.
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: ADD KNOWLEDGE */}
      {activeTab === 'add' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Sub-panel A: Upload File */}
          <div className="kb-card">
            <h3 className="kb-card-title" style={{ marginBottom: '12px' }}>Upload Document File</h3>
            <p className="kb-card-subtitle" style={{ marginBottom: '20px' }}>
              Drag & drop or browse PDF, DOCX, TXT, MD, CSV, JSON files to chunk and index automatically.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,.csv,.json"
              onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
              style={{ display: 'none' }}
            />

            <div
              className={`dropzone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); e.dataTransfer.files?.[0] && processFile(e.dataTransfer.files[0]); }}
              onClick={() => fileInputRef.current?.click()}
            >
              <span style={{ fontSize: '2rem', marginBottom: '8px' }}>📄</span>
              <div className="dropzone-text">{isUploading ? 'Uploading...' : 'Click or Drag File Here'}</div>
              <div className="dropzone-hint">Supports PDF, DOCX, TXT, MD, CSV, JSON</div>
            </div>

            {uploadStatus.message && (
              <div className={`notification ${uploadStatus.type}`} style={{ marginTop: '16px' }}>
                {uploadStatus.message}
              </div>
            )}
          </div>

          {/* Sub-panel B: Custom FAQ */}
          <div className="kb-card">
            <h3 className="kb-card-title" style={{ marginBottom: '12px' }}>Add FAQ / Specific Rule</h3>
            <p className="kb-card-subtitle" style={{ marginBottom: '20px' }}>
              Add a quick Q&A entry or rule directly without creating a PDF file.
            </p>

            <form onSubmit={handleCreateFaq} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Question or Topic Heading</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. What is the stipend for SOB students?"
                  value={faqQuestion}
                  onChange={(e) => setFaqQuestion(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Answer / Guidelines Content</label>
                <textarea
                  className="form-control"
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  placeholder="Provide the exact factual answer..."
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={isCreatingFaq}>
                {isCreatingFaq ? 'Saving...' : '➕ Save & Index FAQ'}
              </button>
            </form>

            {faqStatus.message && (
              <div className={`notification ${faqStatus.type}`} style={{ marginTop: '16px' }}>
                {faqStatus.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 5: RAG SEARCH DEBUGGER */}
      {activeTab === 'debugger' && (
        <div className="kb-card">
          <h3 className="kb-card-title">Vector Search Debugger</h3>
          <p className="kb-card-subtitle" style={{ marginBottom: '20px' }}>
            Test what vector chunks are fetched by ChromaDB for any query.
          </p>

          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <input
              type="text"
              className="kb-input"
              style={{ flex: 1 }}
              placeholder="Type a test user prompt (e.g. admissions process)..."
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
            />
            <select
              className="kb-input"
              style={{ width: '100px' }}
              value={testLimit}
              onChange={(e) => setTestLimit(parseInt(e.target.value, 10))}
            >
              <option value={2}>Top 2</option>
              <option value={3}>Top 3</option>
              <option value={5}>Top 5</option>
            </select>
            <button type="submit" className="btn-primary" disabled={isSearching}>
              {isSearching ? 'Searching...' : '🔍 Search'}
            </button>
          </form>

          <div>
            {testResults.length > 0 ? (
              testResults.map((item, idx) => (
                <div key={item.id} className="rag-match-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                    <span>Match #{idx + 1} — Source: {item.metadata?.source || 'Unknown'}</span>
                    <span style={{ color: 'var(--accent-color)' }}>Distance: {item.distance !== null ? item.distance.toFixed(3) : 'N/A'}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {item.text}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                No search query run yet. Enter a query above to inspect match rankings.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Active Jobs Progress Tray */}
      {activeJobs.length > 0 && (
        <div className="kb-job-tray">
          <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
            ⚙️ Ingestion Jobs ({activeJobs.length})
          </div>
          {activeJobs.map(job => (
            <div key={job.jobId} style={{ fontSize: '0.8rem' }}>
              <div>📄 {job.fileName} ({job.status})</div>
              {job.progress?.total > 0 && (
                <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.1)', borderRadius: '3px', marginTop: '4px' }}>
                  <div style={{ width: `${Math.round((job.progress.done / job.progress.total) * 100)}%`, height: '100%', background: 'var(--accent-color)' }}></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Slide-in / Modal Edit Drawer */}
      {editingDocName && (
        <div className="confirm-modal-backdrop" onClick={() => setEditingDocName(null)}>
          <div className="confirm-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', width: '90%' }}>
            <h3>View / Edit Document: {editingDocName}</h3>
            {isLoadingDocContent ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>Loading content...</div>
            ) : (
              <div>
                <textarea
                  className="kb-input"
                  style={{ minHeight: '280px', fontFamily: 'monospace', fontSize: '0.83rem', margin: '16px 0' }}
                  value={editingDocContent}
                  onChange={(e) => setEditingDocContent(e.target.value)}
                  disabled={isSavingDocContent}
                />
                {editStatus.message && <div className={`notification ${editStatus.type}`}>{editStatus.message}</div>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                  <button className="btn-secondary" onClick={() => setEditingDocName(null)}>Cancel</button>
                  <button className="btn-primary" onClick={handleSaveDocContent} disabled={isSavingDocContent}>
                    {isSavingDocContent ? 'Saving...' : 'Save & Re-index'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Single Chunk Edit Modal */}
      {editingChunk && (
        <div className="confirm-modal-backdrop" onClick={() => setEditingChunk(null)}>
          <div className="confirm-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>⚡ Instant Chunk Editor</h3>
              <span style={{ fontSize: '0.75rem', background: 'var(--bg-active-tab)', color: 'var(--accent-color)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                &lt; 200ms real-time update
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '16px' }}>
              Chunk ID: <strong style={{ fontFamily: 'monospace' }}>{editingChunk.id}</strong><br/>
              Source: <strong>{editingChunk.metadata?.source || 'Unknown'}</strong>
            </p>

            <textarea
              className="kb-input"
              style={{ minHeight: '180px', fontFamily: 'monospace', fontSize: '0.85rem', lineHeight: '1.5' }}
              value={editingChunkText}
              onChange={(e) => setEditingChunkText(e.target.value)}
              disabled={isSavingChunk}
            />

            {chunkEditStatus.message && (
              <div className={`notification ${chunkEditStatus.type}`} style={{ marginTop: '12px', margin: '12px 0 0 0' }}>
                {chunkEditStatus.message}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button className="btn-secondary" onClick={() => setEditingChunk(null)} disabled={isSavingChunk}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveChunk} disabled={isSavingChunk}>
                {isSavingChunk ? 'Updating...' : '⚡ Save & Re-embed Chunk'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

