import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChatStorage } from '../utils/sessionStorage';
import BotAvatar from './BotAvatar';
import { API_BASE_URL } from '../lib/api';

// Dynamic emoji selector for suggestion chips
const getChipEmoji = (text) => {
  const lower = text.toLowerCase();
  if (lower.includes('course') || lower.includes('program') || lower.includes('school')) return '🎓';
  if (lower.includes('admission') || lower.includes('apply') || lower.includes('eligibility')) return '🚀';
  if (lower.includes('placement') || lower.includes('job') || lower.includes('career') || lower.includes('salary')) return '💼';
  if (lower.includes('campus') || lower.includes('life') || lower.includes('hostel') || lower.includes('food')) return '🏠';
  if (lower.includes('fee') || lower.includes('scholarship') || lower.includes('cost') || lower.includes('free') || lower.includes('pay')) return '💰';
  if (lower.includes('contact') || lower.includes('phone') || lower.includes('email') || lower.includes('reach')) return '📞';
  return '✨';
};

const loadingPhrases = [
  "✨ Looking that up...",
  "📚 Checking NavGurukul resources...",
  "🎒 Finding the best answer...",
  "☕ Give me a moment...",
  "🧩 Connecting the dots...",
  "🔍 Searching our student guide..."
];

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

    // Check if line is numbered list item (e.g. 1. text)
    let isNumbered = false;
    let numberVal = '';
    const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      isNumbered = true;
      numberVal = numMatch[1];
      remaining = numMatch[2];
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
      parts.push(
        <strong 
          key={match.index} 
          style={{ 
            color: 'var(--accent-color)', 
            fontWeight: '700',
            background: 'var(--bg-hover)',
            padding: '2px 6px',
            borderRadius: '4px'
          }}
        >
          {match[1]}
        </strong>
      );
      lastIndex = boldRegex.lastIndex;
    }
    
    if (lastIndex < remaining.length) {
      parts.push(remaining.substring(lastIndex));
    }
    
    if (isBullet) {
      return (
        <li 
          key={idx} 
          style={{ 
            marginLeft: '12px', 
            listStyleType: 'none', 
            marginBottom: '8px', 
            lineHeight: '1.6',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start'
          }}
        >
          <span style={{ color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '1.1rem', lineHeight: '1' }}>•</span>
          <div>{parts}</div>
        </li>
      );
    }

    if (isNumbered) {
      return (
        <div 
          key={idx} 
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'flex-start',
            marginBottom: '8px',
            lineHeight: '1.6'
          }}
        >
          <span 
            style={{
              background: 'var(--bg-active-tab)',
              color: 'var(--accent-color)',
              fontWeight: '700',
              fontSize: '0.78rem',
              borderRadius: '50%',
              width: '22px',
              height: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px'
            }}
          >
            {numberVal}
          </span>
          <div>{parts}</div>
        </div>
      );
    }
    
    // Return regular line with some spacing if it is not empty
    return (
      <div key={idx} style={{ marginBottom: '10px', minHeight: '1.2em', lineHeight: '1.6' }}>
        {parts}
      </div>
    );
  });
}

export default function ChatWindow({ activeSessionId, config, onMessageSent }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentLoadingPhrase, setCurrentLoadingPhrase] = useState(loadingPhrases[0]);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const messagesEndRef = useRef(null);
  const chatMessagesRef = useRef(null);

  useEffect(() => {
    if (activeSessionId) {
      fetchHistory();
      setInputValue(ChatStorage.getDraft(activeSessionId));
    } else {
      setMessages([]);
      setInputValue('');
      setSuggestedQuestions([
        "Explore courses & programs",
        "What is the admission process?",
        "Is the program free of cost?"
      ]);
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (messages.length > 0 || isTyping) {
      scrollToBottom();
    } else {
      if (chatMessagesRef.current) {
        chatMessagesRef.current.scrollTop = 0;
      }
    }
  }, [messages, isTyping]);

  const fetchHistory = async () => {
    try {
      const headers = {};
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      const res = await fetch(`${API_BASE_URL}/api/chat/sessions/${activeSessionId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setSuggestedQuestions([]); // Clear old suggestions for old threads
      } else {
        // Fallback for new unsaved sessions
        setMessages([]);
        setSuggestedQuestions([
          "Explore courses & programs",
          "What is the admission process?",
          "Is the program free of cost?"
        ]);
      }
    } catch (err) {
      console.error('Error fetching chat history:', err);
      setMessages([]);
      setSuggestedQuestions([
        "Explore courses & programs",
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
    if (activeSessionId) {
      ChatStorage.removeDraft(activeSessionId);
    }
    setSuggestedQuestions([]); // Hide current suggestions
    
    // Add user message to state
    const tempMessages = [
      ...messages,
      { role: 'user', text: text, timestamp: new Date().toISOString() }
    ];
    setMessages(tempMessages);
    
    // Pick a random loading phrase
    const randomIndex = Math.floor(Math.random() * loadingPhrases.length);
    setCurrentLoadingPhrase(loadingPhrases[randomIndex]);
    setIsTyping(true);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      const res = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: text,
          sessionId: activeSessionId,
          userId: user?.uid
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.responses && data.responses.length > 0) {
          const newModelMsgs = data.responses.map(text => ({
            role: 'model',
            text,
            timestamp: new Date().toISOString()
          }));
          setMessages(prev => [
            ...prev,
            ...newModelMsgs
          ]);
        } else {
          setMessages(prev => [
            ...prev,
            { role: 'model', text: data.response, timestamp: new Date().toISOString() }
          ]);
        }
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

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    if (activeSessionId) {
      ChatStorage.saveDraft(activeSessionId, val);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;
    await sendMessageText(inputValue);
  };

  return (
    <>
      <div ref={chatMessagesRef} className="chat-messages">
        {/* Background decorations */}
        <div className="chat-bg-decorations">
          <div className="decor-doodle d1">✈️</div>
          <div className="decor-doodle d2">⭐</div>
          <div className="decor-doodle d3">🎓</div>
          <div className="decor-doodle d4">💡</div>
        </div>

        <div className="chat-messages-inner">
          {messages.length === 0 ? (
            <div className="welcome-container">
              <div className="welcome-avatar-wrapper">
                <span className="decor-element star1">⭐</span>
                <span className="decor-element plane">✈️</span>
                <span className="decor-element cap">🎓</span>
                <span className="decor-element bulb">💡</span>
                <BotAvatar
                  avatarUrl={config.counselorAvatarUrl}
                  fallbackEmoji={config.counselorAvatar}
                  size={96}
                  className="welcome-avatar-container"
                />
              </div>
              <h1 className="welcome-heading">👋 Namaste! I'm {config.counselorName || 'Guru'}</h1>
              <p className="welcome-subtitle">
                Your NavGurukul Guide. Ask me anything about admissions, courses, placements, and campus life!
              </p>
              
              <div className="welcome-prompt-grid">
                <div 
                  className="welcome-prompt-card" 
                  onClick={() => sendMessageText("Tell me about NavGurukul courses and branches")}
                >
                  <div className="welcome-prompt-card-icon">🎓</div>
                  <div className="welcome-prompt-card-info">
                    <h4>Explore Courses</h4>
                    <p>Software development, Business & graphic design</p>
                  </div>
                </div>
                
                <div 
                  className="welcome-prompt-card" 
                  onClick={() => sendMessageText("What is the admission process for NavGurukul?")}
                >
                  <div className="welcome-prompt-card-icon">🚀</div>
                  <div className="welcome-prompt-card-info">
                    <h4>Apply for Admission</h4>
                    <p>Learn eligibility, steps & interview details</p>
                  </div>
                </div>
                
                <div 
                  className="welcome-prompt-card" 
                  onClick={() => sendMessageText("Tell me about NavGurukul placement support and package stats")}
                >
                  <div className="welcome-prompt-card-icon">💼</div>
                  <div className="welcome-prompt-card-info">
                    <h4>Placement Support</h4>
                    <p>Hiring partners, job records & packages</p>
                  </div>
                </div>
                
                <div 
                  className="welcome-prompt-card" 
                  onClick={() => sendMessageText("What is Campus Life like at NavGurukul?")}
                >
                  <div className="welcome-prompt-card-icon">🏠</div>
                  <div className="welcome-prompt-card-info">
                    <h4>Campus Life</h4>
                    <p>Hostel accommodations, food & campus schedule</p>
                  </div>
                </div>

                <div 
                  className="welcome-prompt-card" 
                  onClick={() => sendMessageText("What are the fees and are there scholarships?")}
                >
                  <div className="welcome-prompt-card-icon">💰</div>
                  <div className="welcome-prompt-card-info">
                    <h4>Fees & Scholarships</h4>
                    <p>Affordable study program, no upfront costs</p>
                  </div>
                </div>

                <div 
                  className="welcome-prompt-card" 
                  onClick={() => sendMessageText("Can you answer some Frequently Asked Questions?")}
                >
                  <div className="welcome-prompt-card-icon">❓</div>
                  <div className="welcome-prompt-card-info">
                    <h4>FAQs</h4>
                    <p>Quick answers to common student doubts</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              if (msg.role === 'model') {
                return (
                  <div key={index} className="bot-message-row" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', alignSelf: 'flex-start', maxWidth: '85%' }}>
                    <BotAvatar
                      avatarUrl={config.counselorAvatarUrl}
                      fallbackEmoji={config.counselorAvatar}
                      size="var(--bot-message-avatar-size)"
                    />
                    <div className="message-bubble model" style={{ maxWidth: '100%' }}>
                      {parseMarkdown(msg.text)}
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={index}
                  className="message-bubble user"
                >
                  {parseMarkdown(msg.text)}
                </div>
              );
            })
          )}

          {isTyping && (
            <div className="bot-message-row" style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', alignSelf: 'flex-start', maxWidth: '85%' }}>
              <BotAvatar
                avatarUrl={config.counselorAvatarUrl}
                fallbackEmoji={config.counselorAvatar}
                size="var(--bot-message-avatar-size)"
              />
              <div className="typing-row-container">
                <div className="message-bubble model" style={{ maxWidth: '100%', display: 'inline-block' }}>
                  <div className="typing-indicator">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </div>
                </div>
                <div className="typing-status-text">{currentLoadingPhrase}</div>
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
                  <span>{getChipEmoji(q)}</span> {q}
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
              onChange={handleInputChange}
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
    </>
  );
}
