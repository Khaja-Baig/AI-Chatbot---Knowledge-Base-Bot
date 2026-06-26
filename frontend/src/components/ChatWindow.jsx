import React, { useState, useEffect, useRef } from 'react';

function parseMarkdown(text) {
  if (!text) return '';
  
  // Split the response by newlines to preserve paragraph formatting
  const lines = text.split('\n');
  
  return lines.map((line, idx) => {
    let remaining = line;
    
    // Check if the line is a list item (starts with a bullet point like * or -)
    let isBullet = false;
    const trimmed = line.trim();
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      isBullet = true;
      remaining = trimmed.substring(2);
    }
    
    // Simple inline parser for bold markdown: **text**
    const parts = [];
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    let lastIndex = 0;
    
    while ((match = boldRegex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        parts.push(remaining.substring(lastIndex, match.index));
      }
      parts.push(<strong key={match.index}>{match[1]}</strong>);
      lastIndex = boldRegex.lastIndex;
    }
    
    if (lastIndex < remaining.length) {
      parts.push(remaining.substring(lastIndex));
    }
    
    if (isBullet) {
      return (
        <li key={idx} style={{ marginLeft: '20px', listStyleType: 'disc', marginBottom: '6px', lineHeight: '1.5' }}>
          {parts}
        </li>
      );
    }
    
    // Return regular line with some spacing if it is not empty
    return (
      <div key={idx} style={{ marginBottom: '8px', minHeight: '1.2em', lineHeight: '1.5' }}>
        {parts}
      </div>
    );
  });
}

export default function ChatWindow({ activeSessionId, config, onMessageSent }) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (activeSessionId) {
      fetchHistory();
    } else {
      setMessages([]);
      setSuggestedQuestions([
        "Tell me about the School of Business",
        "What is the admission process?",
        "Is the program free of cost?"
      ]);
    }
  }, [activeSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`http://localhost:5001/api/chat/sessions/${activeSessionId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setSuggestedQuestions([]); // Clear old suggestions for old threads
      } else {
        // Fallback for new unsaved sessions
        setMessages([]);
        setSuggestedQuestions([
          "Tell me about the School of Business",
          "What is the admission process?",
          "Is the program free of cost?"
        ]);
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
      setMessages([]);
      setSuggestedQuestions([
        "Tell me about the School of Business",
        "What is the admission process?",
        "Is the program free of cost?"
      ]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessageText = async (text) => {
    if (isTyping) return;
    
    setInputValue('');
    setSuggestedQuestions([]); // Hide current suggestions
    
    // Add user message to state
    const tempMessages = [
      ...messages,
      { role: 'user', text: text, timestamp: new Date().toISOString() }
    ];
    setMessages(tempMessages);
    setIsTyping(true);

    try {
      const res = await fetch('http://localhost:5001/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: activeSessionId
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [
          ...prev,
          { role: 'model', text: data.response, timestamp: new Date().toISOString() }
        ]);
        setSuggestedQuestions(data.suggestedQuestions || []);
        if (onMessageSent) {
          onMessageSent(data.sessionId);
        }
      } else {
        throw new Error('Server error');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => [
        ...prev,
        { 
          role: 'model', 
          text: '❌ Connection issue. Please check that the server is online.', 
          timestamp: new Date().toISOString() 
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;
    await sendMessageText(inputValue);
  };

  return (
    <div className="chat-area">
      <div className="chat-messages">
        <div className="chat-messages-inner">
          {messages.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-secondary)', textAlign: 'center', padding: '24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>👋</div>
              <h3 style={{ marginBottom: '8px', color: 'white', fontWeight: 500 }}>Guru</h3>
              <p style={{ maxWidth: '440px', fontSize: '0.85rem', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
                {config.greetingMessage || 'I am here to help you understand our courses, admissions process, placements, and campus life. Go ahead and ask me anything!'}
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`message-bubble ${msg.role}`}
              >
                {parseMarkdown(msg.text)}
              </div>
            ))
          )}

          {isTyping && (
            <div className="message-bubble model">
              <div className="typing-indicator">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}

          {suggestedQuestions.length > 0 && !isTyping && (
            <div className="suggestion-chips-container">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  className="suggestion-chip"
                  onClick={() => sendMessageText(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="chat-input-container">
        <div className="chat-input-inner">
          <form onSubmit={handleSubmit} className="chat-input-form">
            <input
              type="text"
              className="chat-input"
              placeholder="Ask Guru anything about admissions, courses, placements..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isTyping}
            />
            <button
              type="submit"
              className="send-btn"
              disabled={!inputValue.trim() || isTyping}
            >
              ➔
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
