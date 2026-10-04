import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import axios from 'axios';
import { FiMessageSquare, FiX, FiSend, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
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

const SS_CHAT_SESSION_ID = 'bonita_chat_session_id'; // Chat session identifier
const SS_REG_SESSION_ID  = 'bonita_chat_reg_session_id';  // Registration session identifier
const SS_FLOW            = 'bonita_chat_flow';
const SS_STEP            = 'bonita_chat_step';
const SS_PENDAFTARAN_ID  = 'bonita_chat_pendaftaran_id';
const SS_NOMOR_UMR       = 'bonita_chat_nomor_umr';
const SS_KATEGORI        = 'bonita_chat_kategori';
const SS_REG_DATA        = 'bonita_chat_reg_data';
const SS_MESSAGES        = 'bonita_chat_messages';
const SS_REGISTERED_UMRS = 'bonita_chat_registered_umrs';

type FlowState = '' | 'pengaduan' | 'registrasi';
type StepState = '' | 'ask_nomor' | 'ask_kategori' | string; // ask_isi_<kategori> | done | error

// ── Quick reply suggestions ────────────────────────────────────────────────────

const QUICK_REPLIES = [
  'Apa saja paket umroh yang tersedia?',
  'Berapa harga paket umroh?',
  'Saya ingin daftar umroh',
  'Apa saja dokumen yang diperlukan?',
  'Saya ingin membuat pengaduan',
];

const KATEGORI_LIST = ['Pembayaran', 'Dokumen', 'Jadwal', 'Hotel', 'Transportasi', 'Lainnya'];

// ── Helpers ──────────────────────────────────────────────────────────────────

let idCounter = 100;
const nextId = () => ++idCounter;

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
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

// Mengambil atau membuat Chat Session ID baru
const getOrCreateChatSessionId = (): string => {
  let id = sessionStorage.getItem(SS_CHAT_SESSION_ID);
  if (!id) {
    id = 'chat-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem(SS_CHAT_SESSION_ID, id);
  }
  return id;
};

// Membersihkan hanya data sementara proses pendaftaran, chat session tetap utuh
const ssClearRegistration = () => {
  sessionStorage.removeItem(SS_FLOW);
  sessionStorage.removeItem(SS_STEP);
  sessionStorage.removeItem(SS_REG_SESSION_ID);
  sessionStorage.removeItem(SS_REG_DATA);
};

// Membersihkan seluruh state alur (pengaduan / pendaftaran), chat session tetap utuh
const ssClear = () => {
  [SS_FLOW, SS_STEP, SS_PENDAFTARAN_ID, SS_NOMOR_UMR, SS_KATEGORI, SS_REG_SESSION_ID, SS_REG_DATA].forEach(k =>
    sessionStorage.removeItem(k)
  );
};

// Membaca riwayat pesan percakapan dari sessionStorage saat inisialisasi
const loadInitialMessages = (): Message[] => {
  try {
    const raw = sessionStorage.getItem(SS_MESSAGES);
    if (raw) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
      }
    }
  } catch { /* ignore */ }
  return INITIAL_MESSAGES;
};

// ── Chatbot Widget ─────────────────────────────────────────────────────────────

const ChatbotWidget = () => {
  const [isOpen, setIsOpen]   = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(loadInitialMessages);
  const [input, setInput]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pastikan Chat Session ID ada sejak awal
  useEffect(() => {
    getOrCreateChatSessionId();
  }, []);

  // Simpan riwayat percakapan ke sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem(SS_MESSAGES, JSON.stringify(messages));
      } catch { /* ignore */ }
    }
  }, [messages]);

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

    const userText = text.trim();

    // Tambah pesan user
    setMessages(prev => [...prev, {
      id: nextId(), sender: 'user', text: userText, timestamp: new Date(),
    }]);
    setInput('');
    setShowQuickReplies(false);
    setIsLoading(true);

    try {
      // Baca state dari sessionStorage
      const chatSessionId = getOrCreateChatSessionId();
      const regSessionId  = ssGet(SS_REG_SESSION_ID);
      const flow          = ssGet(SS_FLOW) as FlowState;
      const step          = ssGet(SS_STEP) as StepState;
      const pendaftaranId = ssGet(SS_PENDAFTARAN_ID);
      const kategori      = ssGet(SS_KATEGORI);
      const regDataRaw    = ssGet(SS_REG_DATA);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: Record<string, any> = {
        pertanyaan:      userText,
        chat_session_id: chatSessionId,
        reg_session_id:  regSessionId,
        flow:            flow,
        step:            step,
        pendaftaran_id:  pendaftaranId,
        kategori:        kategori,
      };

      // Sertakan reg_data jika sedang dalam flow registrasi aktif
      if (flow === 'registrasi' && regDataRaw) {
        try { payload.reg_data = JSON.parse(regDataRaw); } catch { /* ignore */ }
      }

      const res = await axios.post('http://localhost:8080/chatbot', payload);
      const data = res.data?.data ?? {};

      const jawaban       = data.jawaban    ?? 'Maaf, saya tidak bisa menjawab saat ini.';
      const nextFlow      = (data.flow      ?? '') as FlowState;
      const nextStep      = (data.step      ?? '') as StepState;
      const nextPendId    = data.pendaftaran_id ?? '';
      const nextRegSessId = data.reg_session_id ?? '';
      const nextNomorUmr  = data.nomor_pendaftaran ?? nextPendId ?? '';

      // Update sessionStorage
      if (nextFlow === 'pengaduan') {
        if (nextStep === 'done' || nextStep === 'error') {
          sessionStorage.removeItem(SS_FLOW);
          sessionStorage.removeItem(SS_STEP);
          sessionStorage.removeItem(SS_KATEGORI);
        } else {
          ssSet(SS_FLOW, 'pengaduan');
          ssSet(SS_STEP, nextStep);
          if (nextPendId) ssSet(SS_PENDAFTARAN_ID, nextPendId);
          if (nextStep.startsWith('ask_isi_')) {
            const kat = nextStep.replace('ask_isi_', '');
            ssSet(SS_KATEGORI, kat);
          }
        }
      } else if (nextFlow === 'registrasi') {
        // Sedang aktif dalam tahapan pengumpulan data pendaftaran
        ssSet(SS_FLOW, 'registrasi');
        ssSet(SS_STEP, nextStep);
        if (nextRegSessId) {
          ssSet(SS_REG_SESSION_ID, nextRegSessId);
        }
        if (data.reg_data) {
          ssSet(SS_REG_DATA, JSON.stringify(data.reg_data));
        }
      } else {
        // nextFlow === '' : Pendaftaran selesai, dibatalkan, atau percakapan umum
        // Bersihkan state form sementara pendaftaran, chat session & riwayat tetap utuh!
        ssClearRegistration();

        // Jika pendaftaran berhasil dibuat
        if (nextStep === 'selesai' && nextNomorUmr) {
          ssSet(SS_NOMOR_UMR, nextNomorUmr);
          ssSet(SS_PENDAFTARAN_ID, nextNomorUmr);
          try {
            const prev = JSON.parse(sessionStorage.getItem(SS_REGISTERED_UMRS) || '[]');
            if (!prev.includes(nextNomorUmr)) {
              prev.push(nextNomorUmr);
              sessionStorage.setItem(SS_REGISTERED_UMRS, JSON.stringify(prev));
            }
          } catch { /* ignore */ }
          // Tampilkan opsi quick reply kembali
          setShowQuickReplies(true);
        } else if (nextStep === 'batal') {
          setShowQuickReplies(true);
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
    <div className={`chatbot-widget-container ${isFullscreen && isOpen ? 'is-fullscreen' : ''}`}>
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
      <div className={`chatbot-window ${isOpen ? 'open' : ''} ${isFullscreen ? 'fullscreen' : ''}`}>
        {/* Header */}
        <div className="chatbot-header">
          <div className="chatbot-header-inner">
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
            <div className="chatbot-header-actions">
              <button
                type="button"
                className="header-action-btn fullscreen-btn"
                onClick={() => {
                  setIsFullscreen((prev) => !prev);
                  setTimeout(scrollToBottom, 60);
                }}
                aria-label={isFullscreen ? 'Kecilkan Tampilan' : 'Layar Penuh'}
                title={isFullscreen ? 'Kecilkan Tampilan' : 'Layar Penuh'}
              >
                {isFullscreen ? <FiMinimize2 size={17} /> : <FiMaximize2 size={17} />}
              </button>
              <button
                type="button"
                className="header-action-btn close-btn"
                onClick={() => {
                  setIsOpen(false);
                  setIsFullscreen(false);
                }}
                aria-label="Tutup"
                title="Tutup Chat"
              >
                <FiX size={19} />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="chatbot-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message-row ${msg.sender}`}>
              {msg.sender === 'bot' && (
                <div className="bot-avatar-sm">🤖</div>
              )}
              <div className="message-body">
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
              <div className="message-body">
                <div className="message-bubble bot typing-bubble">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
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
        <div className="chatbot-input-wrapper">
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
    </div>
  );
};

export default ChatbotWidget;
