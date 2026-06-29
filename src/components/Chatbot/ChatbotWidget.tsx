import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import axios from 'axios';
import { FiMessageSquare, FiX, FiSend } from 'react-icons/fi';
import './ChatbotWidget.css';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: number;
  sender: 'bot' | 'user';
  text: string;
  timestamp: Date;
}

// ── Quick reply suggestions ────────────────────────────────────────────────────

const QUICK_REPLIES = [
  'Apa saja paket umroh yang tersedia?',
  'Berapa harga paket umroh?',
  'Bagaimana cara mendaftar?',
  'Apa saja dokumen yang diperlukan?',
];

// ── Helpers ──────────────────────────────────────────────────────────────────

let idCounter = 1;
const nextId = () => idCounter++;

const INITIAL_MESSAGES: Message[] = [
  {
    id: nextId(),
    sender: 'bot',
    text: 'Assalamu\'alaikum 🕌 Selamat datang di Bonita Umroh! Saya Bonita Assistant, siap membantu Anda merencanakan perjalanan umroh. Ada yang ingin ditanyakan?',
    timestamp: new Date(),
  },
];

// Simple markdown-ish: **bold**, *italic*, \n → <br>
const renderText = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return <span key={j}>{part}</span>;
    });
    return (
      <span key={i}>
        {parts}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
};

// ── Chatbot Widget ─────────────────────────────────────────────────────────────

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, messages]);

  // ── Send message ──────────────────────────────────────────────────────────

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: nextId(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setShowQuickReplies(false);
    setIsLoading(true);

    try {
      const res = await axios.post('http://localhost:8080/chatbot', {
        pertanyaan: text.trim(),
      });

      const jawaban = res.data?.data?.jawaban ?? 'Maaf, saya tidak bisa menjawab saat ini.';

      const botMsg: Message = {
        id: nextId(),
        sender: 'bot',
        text: jawaban,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botMsg]);
      if (!isOpen) setHasUnread(true);
    } catch {
      const errMsg: Message = {
        id: nextId(),
        sender: 'bot',
        text: 'Maaf, koneksi ke server bermasalah. Silakan coba lagi beberapa saat.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleQuickReply = (text: string) => {
    sendMessage(text);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setHasUnread(false);
  };

  return (
    <div className="chatbot-widget-container">
      {/* ── Floating Button ── */}
      <button
        className={`chatbot-fab ${isOpen ? 'hidden' : ''}`}
        onClick={handleOpen}
        aria-label="Buka Chatbot"
      >
        <FiMessageSquare size={24} />
        {hasUnread && <span className="chatbot-fab-badge" />}
      </button>

      {/* ── Chat Window ── */}
      <div className={`chatbot-window ${isOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-left">
            <div className="chatbot-avatar">🕌</div>
            <div>
              <div className="chatbot-header-name">Bonita Assistant</div>
              <div className="chatbot-header-status">
                <span className="status-dot" />
                {isLoading ? 'Mengetik...' : 'Online'}
              </div>
            </div>
          </div>
          <button className="close-btn" onClick={() => setIsOpen(false)} aria-label="Tutup">
            <FiX size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="chatbot-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-row ${msg.sender}`}>
              {msg.sender === 'bot' && (
                <div className="bot-avatar-sm">🤖</div>
              )}
              <div className={`message-bubble ${msg.sender}`}>
                <p>{renderText(msg.text)}</p>
                <div className="message-time">
                  {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="message-row bot">
              <div className="bot-avatar-sm">🤖</div>
              <div className="message-bubble bot typing-bubble">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
            </div>
          )}

          {/* Quick Replies */}
          {showQuickReplies && !isLoading && (
            <div className="quick-replies">
              <div className="quick-replies-label">💬 Pertanyaan umum:</div>
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  className="quick-reply-btn"
                  onClick={() => handleQuickReply(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form className="chatbot-input-area" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Ketik pertanyaan Anda..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            autoComplete="off"
          />
          <button type="submit" disabled={!input.trim() || isLoading} aria-label="Kirim">
            <FiSend size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatbotWidget;
