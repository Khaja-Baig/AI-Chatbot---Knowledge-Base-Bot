import React, { useState, useEffect, useRef } from 'react';

export default function AdminSettings({ config, onUpdateConfig, authToken }) {
  const [counselorName, setCounselorName] = useState(config.counselorName || '');
  const [greetingMessage, setGreetingMessage] = useState(config.greetingMessage || '');
  const [behaviorMode, setBehaviorMode] = useState(config.behaviorMode || 'warm');
  
  const [status, setStatus] = useState(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState('');
  
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

  useEffect(() => {
    fetchStatus();
    setCounselorName(config.counselorName || '');
    setGreetingMessage(config.greetingMessage || '');
    setBehaviorMode(config.behaviorMode || 'warm');
  }, [config]);

  const fetchStatus = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/knowledge/status', {
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
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    onUpdateConfig({
      counselorName,
      greetingMessage,
      behaviorMode
    });
  };

  const handleTriggerIngest = async () => {
    setIsIngesting(true);
    setIngestResult('Syncing database...');
    try {
      const res = await fetch('http://localhost:5001/api/knowledge/ingest', {
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

  const processFile = async (file) => {
    if (!file) return;
    
    // Only accept supported extensions
    const supportedExtensions = ['.pdf', '.docx', '.txt', '.md', '.csv', '.json'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!supportedExtensions.includes(fileExt)) {
      setUploadStatus({ type: 'error', message: 'Supported formats are: PDF, DOCX, TXT, MD, CSV, JSON.' });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: 'success', message: `Reading "${file.name}"...` });

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Content = e.target.result.split(',')[1];
        
        try {
          const res = await fetch('http://localhost:5001/api/knowledge/upload', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
              fileName: file.name,
              fileContent: base64Content
            })
          });

          const data = await res.json();
          if (res.ok && data.success) {
            setUploadStatus({ type: 'success', message: data.message || 'File uploaded and indexed successfully!' });
            fetchStatus();
          } else {
            setUploadStatus({ type: 'error', message: data.error || 'Upload failed.' });
          }
        } catch (err) {
          setUploadStatus({ type: 'error', message: 'Connection to server failed during upload.' });
          console.error(err);
        } finally {
          setIsUploading(false);
        }
      };
      
      reader.readAsDataURL(file);
    } catch (err) {
      setUploadStatus({ type: 'error', message: 'Failed to read local file.' });
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
      const res = await fetch('http://localhost:5001/api/knowledge/faq', {
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
      const res = await fetch('http://localhost:5001/api/knowledge/delete', {
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
      const res = await fetch('http://localhost:5001/api/knowledge/query', {
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
      const res = await fetch(`http://localhost:5001/api/knowledge/sources/${encodeURIComponent(docName)}`, {
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

  const handleSaveDocContent = async () => {
    setIsSavingContent(true);
    setEditStatus({ type: 'success', message: 'Saving and re-indexing...' });
    try {
      const res = await fetch(`http://localhost:5001/api/knowledge/sources/${encodeURIComponent(editingDocName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ content: editingDocContent })
      });
      if (res.ok) {
        const data = await res.json();
        setEditStatus({ type: 'success', message: 'Document updated successfully!' });
        fetchStatus(); // Refresh active sources table since name or chunk count might change
        setTimeout(() => {
          setEditingDocName(null);
          setEditingDocContent('');
        }, 1500);
      } else {
        const data = await res.json();
        setEditStatus({ type: 'error', message: data.error || 'Failed to save changes.' });
      }
    } catch (err) {
      console.error(err);
      setEditStatus({ type: 'error', message: 'Connection to server failed.' });
    } finally {
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
                <div className={`notification ${uploadStatus.type}`}>
                  {uploadStatus.message}
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
      {editingDocName && (
        <div className="modal-backdrop" onClick={() => !isSavingContent && setEditingDocName(null)}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()} style={{ width: '80%', maxWidth: '900px', height: '80%', display: 'flex', flexDirection: 'column' }}>
            <div className="settings-modal-header">
              <h2>View / Edit Source - {editingDocName}</h2>
              <button className="close-modal-btn" onClick={() => !isSavingContent && setEditingDocName(null)}>✕</button>
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
                    disabled={isSavingContent}
                  />
                  {editStatus.message && (
                    <div className={`notification ${editStatus.type}`} style={{ margin: 0 }}>
                      {editStatus.message}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                    <button
                      className="btn-secondary"
                      onClick={() => setEditingDocName(null)}
                      disabled={isSavingContent}
                      style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-primary"
                      onClick={handleSaveDocContent}
                      disabled={isSavingContent}
                      style={{ padding: '8px 16px', borderRadius: '6px', fontSize: '0.85rem' }}
                    >
                      {isSavingContent ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

