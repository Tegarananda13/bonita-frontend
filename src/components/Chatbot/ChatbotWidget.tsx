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
  // tombol kategori hanya muncul pada pesan tertentu
  showKategori?: boolean;
}

// ── Session Storage Keys ───────────────────────────────────────────────────────

const SS_FLOW           = 'bonita_chat_flow';
const SS_STEP           = 'bonita_chat_step';
const SS_PENDAFTARAN_ID = 'bonita_chat_pendaftaran_id';
const SS_NOMOR_UMR      = 'bonita_chat_nomor_umr';
const SS_KATEGORI       = 'bonita_chat_kategori';

type FlowState = '' | 'pengaduan';
type StepState = '' | 'ask_nomor' | 'ask_kategori' | string; // ask_isi_<kategori> | done | error

// ── Quick reply suggestions ────────────────────────────────────────────────────

const QUICK_REPLIES = [
  'Apa saja paket umroh yang tersedia?',
  'Berapa harga paket umroh?',
  'Bagaimana cara mendaftar?',
  'Apa saja dokumen yang diperlukan?',
  'Saya ingin membuat pengaduan',
];

const KATEGORI_LIST = ['Pembayaran', 'Dokumen', 'Jadwal', 'Hotel', 'Transportasi', 'Lainnya'];

// ── Helpers ──────────────────────────────────────────────────────────────────

let idCounter = 1;
const nextId = () => idCounter++;

const INITIAL_MESSAGES: Message[] = [
  {
    id: nextId(),
    sender: 'bot',
    text: "Assalamu'alaikum 🕌 Selamat datang di Bonita Umroh! Saya Bonita Assistant, siap membantu Anda merencanakan perjalanan umroh. Ada yang ingin ditanyakan?",
    timestamp: new Date(),
  },
];

// Simple markdown-ish: **bold**, \n → <br>
const renderText = (text: string) => {
  const lines = text.split('\n');
  return lines.map((line, i) => {
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

// ── SessionStorage helpers ────────────────────────────────────────────────────

const ssGet = (key: string) => sessionStorage.getItem(key) ?? '';
const ssSet = (key: string, val: string) => sessionStorage.setItem(key, val);
const ssClear = () => {
  [SS_FLOW, SS_STEP, SS_PENDAFTARAN_ID, SS_NOMOR_UMR, SS_KATEGORI].forEach(k =>
    sessionStorage.removeItem(k)
  );
};

// ── Chatbot Widget ─────────────────────────────────────────────────────────────

const ChatbotWidget = () => {
  const [isOpen, setIsOpen]   = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // ── Tambah pesan bot ────────────────────────────────────────────────────────

  const addBotMsg = (text: string, showKategori = false) => {
    setMessages(prev => [...prev, {
      id: nextId(), sender: 'bot', text, timestamp: new Date(), showKategori,
    }]);
  };

  // ── Kirim pesan ─────────────────────────────────────────────────────────────

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Tambah pesan user
    setMessages(prev => [...prev, {
      id: nextId(), sender: 'user', text: text.trim(), timestamp: new Date(),
    }]);
    setInput('');
    setShowQuickReplies(false);
    setIsLoading(true);

    try {
      // Baca state flow dari sessionStorage
      const flow          = ssGet(SS_FLOW) as FlowState;
      const step          = ssGet(SS_STEP) as StepState;
      const pendaftaranId = ssGet(SS_PENDAFTARAN_ID);
      const kategori      = ssGet(SS_KATEGORI);

      const payload: Record<string, string> = {
        pertanyaan:     text.trim(),
        flow:           flow,
        step:           step,
        pendaftaran_id: pendaftaranId,
        kategori:       kategori,
      };

      const res = await axios.post('http://localhost:8080/chatbot', payload);
      const data = res.data?.data ?? {};

      const jawaban    = data.jawaban    ?? 'Maaf, saya tidak bisa menjawab saat ini.';
      const nextFlow   = (data.flow      ?? '') as FlowState;
      const nextStep   = (data.step      ?? '') as StepState;
      const nextPendId = data.pendaftaran_id ?? '';

      // Update sessionStorage
      if (nextFlow === 'pengaduan') {
        ssSet(SS_FLOW, 'pengaduan');
        ssSet(SS_STEP, nextStep);
        if (nextPendId) ssSet(SS_PENDAFTARAN_ID, nextPendId);
        // Simpan kategori dari step ask_isi_<kategori>
        if (nextStep.startsWith('ask_isi_')) {
          const kat = nextStep.replace('ask_isi_', '');
          ssSet(SS_KATEGORI, kat);
        }
      } else {
        // flow selesai atau normal → clear
        if (nextStep === 'done' || nextStep === 'error' || nextFlow === '') {
          ssClear();
        }
      }

      // Tampilkan tombol kategori jika step = ask_kategori
      const showKategori = nextStep === 'ask_kategori';

      addBotMsg(jawaban, showKategori);
      if (!isOpen) setHasUnread(true);

    } catch {
      addBotMsg('Maaf, koneksi ke server bermasalah. Silakan coba lagi beberapa saat.');
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
              <div>
                <div className={`message-bubble ${msg.sender}`}>
                  <p>{renderText(msg.text)}</p>
                  <div className="message-time">
                    {msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Tombol Kategori Pengaduan */}
                {msg.showKategori && !isLoading && (
                  <div className="kategori-grid">
                    {KATEGORI_LIST.map(k => (
                      <button
                        key={k}
                        className="kategori-btn"
                        onClick={() => sendMessage(k)}
                      >
                        {k === 'Pembayaran' && '💳 '}
                        {k === 'Dokumen'    && '📄 '}
                        {k === 'Jadwal'     && '📅 '}
                        {k === 'Hotel'      && '🏨 '}
                        {k === 'Transportasi' && '✈️ '}
                        {k === 'Lainnya'    && '💬 '}
                        {k}
                      </button>
                    ))}
                  </div>
                )}
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
                  className={`quick-reply-btn${q.includes('pengaduan') ? ' quick-reply-pengaduan' : ''}`}
                  onClick={() => sendMessage(q)}
                >
                  {q.includes('pengaduan') ? '📣 ' : ''}{q}
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
            placeholder="Ketik pertanyaan atau keluhan Anda..."
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
