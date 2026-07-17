import { Link } from "react-router-dom";
import "./Home.css";

// ── Data ───────────────────────────────────────────────────────────────────────

const WHY_ITEMS = [
  {
    icon: "🏅",
    cls: "why-card-icon-1",
    title: "Legal dan Terpercaya",
    text: "Beroperasi secara resmi serta berkomitmen menjalankan layanan sesuai ketentuan yang berlaku.",
  },
  {
    icon: "🕌",
    cls: "why-card-icon-2",
    title: "Pembimbing Berpengalaman",
    text: "Setiap rombongan didampingi ustadz/ustadzah berpengalaman yang siap membimbing selama perjalanan.",
  },
  {
    icon: "🏨",
    cls: "why-card-icon-3",
    title: "Hotel Bintang 4-5",
    text: "Penginapan mewah pilihan yang berlokasi strategis, dekat Masjidil Haram dan Masjid Nabawi.",
  },
  {
    icon: "✈️",
    cls: "why-card-icon-4",
    title: "Penerbangan Langsung",
    text: "Kami menggunakan maskapai terpilih dengan penerbangan direct untuk kenyamanan perjalanan Anda.",
  },
  {
    icon: "📱",
    cls: "why-card-icon-5",
    title: "Sistem Digital Modern",
    text: "Kelola pendaftaran, pembayaran, dan dokumen Anda secara mudah melalui portal digital kami.",
  },
  {
    icon: "💝",
    cls: "why-card-icon-6",
    title: "Pelayanan Penuh Hati",
    text: "Kami melayani Anda dengan sepenuh hati, memastikan setiap momen ibadah menjadi kenangan indah.",
  },
];

const PROCESS_STEPS = [
  { icon: "📋", num: 1, name: "Pilih Paket", sub: "Lihat paket sesuai kebutuhan" },
  { icon: "📝", num: 2, name: "Daftar Online", sub: "Isi formulir pendaftaran" },
  { icon: "💳", num: 3, name: "Bayar DP", sub: "Transfer minimal Rp 5 juta" },
  { icon: "📄", num: 4, name: "Lengkapi Dokumen", sub: "Upload paspor & dokumen" },
  { icon: "🛫", num: 5, name: "Berangkat!", sub: "Perjalanan suci dimulai" },
];

const TESTIMONIALS = [
  {
    text: "Alhamdulillah, perjalanan umroh bersama Bonita sangat berkesan. Pembimbing sangat sabar dan hotel pilihan sangat nyaman. Sangat direkomendasikan!",
    name: "Ibu Siti Aminah",
    kota: "Bandung, Jawa Barat",
    paket: "Paket Reguler 12 Hari",
    initial: "S",
    stars: 5,
  },
  {
    text: "Sistem digital Bonita memudahkan proses pendaftaran. Semua dokumen bisa diupload online, dan tim Bonita sangat responsif menjawab pertanyaan.",
    name: "Bapak Ahmad Fauzi",
    kota: "Surabaya, Jawa Timur",
    paket: "Paket Premium 15 Hari",
    initial: "A",
    stars: 5,
  },
  {
    text: "Ini umroh kedua kami bersama Bonita. Pelayanan semakin baik, ustadz pembimbing luar biasa, dan penginapan sangat dekat dengan Masjidil Haram.",
    name: "Keluarga Bapak Rahmat",
    kota: "Jakarta Selatan",
    paket: "Paket Keluarga 14 Hari",
    initial: "R",
    stars: 5,
  },
];

// ── Component ──────────────────────────────────────────────────────────────────

const Home = () => {
  const scrollToContact = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById("kontak")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="home-page">

      {/* ════════════════════════════════════════
          1. HERO
         ════════════════════════════════════════ */}
      <section className="hero" id="hero">
        <div className="hero-content">
          {/* Left */}
          <div className="hero-left">
            <div className="hero-badge">
              <div className="hero-badge-dot" />
              Terpercaya Sejak 2015
            </div>

            <h1 className="hero-title">
              Wujudkan{" "}
              <span className="hero-title-gold">Ibadah Umroh</span>
              <br />
              Impian Anda
            </h1>

            <p className="hero-desc">
              Bonita hadir sebagai mitra perjalanan umroh terpercaya Anda.
              Dengan pengalaman lebih dari satu dekade, kami memastikan setiap
              langkah perjalanan suci Anda berjalan lancar, khusyu, dan berkesan.
            </p>

            <div className="hero-cta-row">
              <Link to="/paket" className="btn-hero-primary">
                🕌 Lihat Paket Umroh
              </Link>
              <a href="#kontak" className="btn-hero-outline" onClick={scrollToContact}>
                Hubungi Kami
              </a>
            </div>
          </div>

          {/* Right */}
          <div className="hero-right">
            <div style={{ position: "relative" }}>
              <div className="hero-card-main">
                <div className="hero-card-header">
                  <div className="hero-card-icon">🕌</div>
                  <div>
                    <div className="hero-card-title">Bonita Umroh</div>
                    <div className="hero-card-sub">Perjalanan Ibadah Terpercaya</div>
                  </div>
                </div>
                <div className="hero-features-grid">
                  {[
                    { icon: "✈️", name: "Penerbangan Langsung" },
                    { icon: "🏨", name: "Hotel Bintang 4-5" },
                    { icon: "👨‍🏫", name: "Pembimbing Ahli" },
                    { icon: "📱", name: "Portal Digital" },
                  ].map((f) => (
                    <div className="hero-feature-item" key={f.name}>
                      <div className="hero-feature-icon">{f.icon}</div>
                      <div className="hero-feature-name">{f.name}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating badges */}
              <div className="hero-stat-float hero-stat-float-1">
                <div className="hero-stat-float-icon">👥</div>
                <div>
                  <div className="hero-stat-float-val">5.000+</div>
                  <div className="hero-stat-float-label">Jamaah Berangkat</div>
                </div>
              </div>

              <div className="hero-stat-float hero-stat-float-2">
                <div className="hero-stat-float-icon">⭐</div>
                <div>
                  <div className="hero-stat-float-val">4.9/5.0</div>
                  <div className="hero-stat-float-label">Rating Kepuasan</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="hero-scroll">
          <div className="hero-scroll-line" />
          <span>Scroll</span>
        </div>
      </section>

      {/* ════════════════════════════════════════
          2. STATS BAR
         ════════════════════════════════════════ */}
      <div className="stats-bar">
        <div className="stats-bar-inner">
          {[
            { num: "10+", label: "Tahun Pengalaman" },
            { num: "5.000+", label: "Jamaah Diberangkatkan" },
            { num: "98%", label: "Tingkat Kepuasan" },
            { num: "20+", label: "Paket Tersedia" },
          ].map((s) => (
            <div className="stat-item" key={s.label}>
              <div className="stat-number">{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════
          3. TENTANG BONITA
         ════════════════════════════════════════ */}
      <section className="about-section" id="tentang">
        <div className="section-container">
          <div className="about-grid">
            {/* Visual */}
            <div className="about-visual">
              <div className="about-img-frame">
                <div className="about-img-inner">
                  <div className="about-mosque-icon">🕌</div>
                  <div className="about-img-text">
                    "Perjalanan terbaik adalah<br />perjalanan menuju Allah"
                  </div>
                </div>
              </div>
              <div className="about-year-badge">
                <div className="year">2015</div>
                <div className="year-label">Berdiri Sejak</div>
              </div>
            </div>

            {/* Text */}
            <div className="about-text">
              <div className="section-tag">🌙 Tentang Kami</div>
              <h2 className="about-title">
                Lebih dari Sekedar<br />Perjalanan Wisata
              </h2>
              <p className="about-desc">
                Bonita Umroh adalah perusahaan perjalanan umroh yang didirikan dengan
                semangat untuk membantu masyarakat Indonesia menunaikan ibadah umroh
                dengan mudah, nyaman, dan sesuai syariat Islam.
              </p>
              <p className="about-desc">
                Dengan pengalaman lebih dari satu dekade dan ribuan jamaah yang telah
                kami berangkatkan, kami memahami bahwa setiap jamaah memiliki kebutuhan
                yang berbeda. Karena itulah, kami menyediakan berbagai pilihan paket
                dengan fasilitas yang dapat disesuaikan.
              </p>

              <div className="about-highlights">
                {[
                  { text: <><strong>Izin Resmi PPIU</strong> dari Kementerian Agama RI</> },
                  { text: <><strong>Tim profesional</strong> dengan sertifikasi resmi pendamping umroh</> },
                  { text: <><strong>Kemitraan langsung</strong> dengan hotel-hotel premium di Makkah & Madinah</> },
                  { text: <><strong>Sistem digital terintegrasi</strong> untuk kemudahan pendaftaran online</> },
                ].map((h, i) => (
                  <div className="about-highlight-item" key={i}>
                    <div className="about-highlight-dot">✓</div>
                    <div className="about-highlight-text">{h.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          4. VISI & MISI
         ════════════════════════════════════════ */}
      <section className="visi-misi-section" id="visi-misi">
        <div className="section-container">
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <div className="section-tag" style={{ background: "rgba(201,168,76,0.12)", color: "#e8c97e" }}>
              🌟 Visi & Misi
            </div>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.8rem, 3vw, 2.5rem)",
              fontWeight: 800,
              color: "#fff",
              letterSpacing: "-0.02em",
            }}>
              Fondasi Nilai Kami
            </h2>
          </div>

          <div className="visi-misi-grid">
            {/* Visi */}
            <div className="vm-card">
              <div className="vm-card-header">
                <div className="vm-icon vm-icon-visi">🌙</div>
                <div>
                  <div className="vm-card-label">Visi</div>
                  <div className="vm-card-title">Menjadi Pilihan Utama</div>
                </div>
              </div>
              <p className="vm-card-text">
                Menjadi penyelenggara perjalanan ibadah umrah yang terpercaya, profesional, dan berorientasi pada kepuasan 
                jamaah dengan memberikan pelayanan berkualitas sesuai syariat Islam.
              </p>
              <div style={{
                background: "rgba(201,168,76,0.1)",
                border: "1px solid rgba(201,168,76,0.25)",
                borderRadius: "12px",
                padding: "1rem 1.25rem",
                fontSize: "0.88rem",
                color: "rgba(255,255,255,0.75)",
                fontStyle: "italic",
                lineHeight: 1.6
              }}>
                "Mengantarkan umat menuju Baitullah dengan penuh ketenangan dan kebahagiaan."
              </div>
            </div>

            {/* Misi */}
            <div className="vm-card">
              <div className="vm-card-header">
                <div className="vm-icon vm-icon-misi">🎯</div>
                <div>
                  <div className="vm-card-label">Misi</div>
                  <div className="vm-card-title">Langkah Nyata Kami</div>
                </div>
              </div>
              <div className="vm-misi-list">
                {[
                  "Menyelenggarakan layanan umrah yang aman, nyaman, dan sesuai dengan ketentuan syariat",
                  "Memberikan pelayanan prima melalui sumber daya manusia yang profesional dan berintegritas",
                  "Menghadirkan inovasi layanan untuk memudahkan proses pendaftaran hingga kepulangan jamaah",
                  "Membangun hubungan jangka panjang dengan jamaah berdasarkan kepercayaan, kejujuran, dan tanggung jawab",
                  "Berkontribusi dalam meningkatkan kualitas pelayanan ibadah umrah di Indonesia",
                ].map((m, i) => (
                  <div className="vm-misi-item" key={i}>
                    <div className="vm-misi-check">✓</div>
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          5. KENAPA BONITA
         ════════════════════════════════════════ */}
      <section className="why-section" id="kenapa-bonita">
        <div className="section-container">
          <div className="why-header">
            <div className="section-tag">💎 Keunggulan Kami</div>
            <h2 className="why-title">Kenapa Memilih Bonita?</h2>
            <p className="why-desc">
              Kami hadir bukan hanya sebagai penyedia layanan umroh, tapi sebagai
              sahabat perjalanan ibadah Anda yang terpercaya.
            </p>
          </div>

          <div className="why-grid">
            {WHY_ITEMS.map((item) => (
              <div className="why-card" key={item.title}>
                <div className={`why-card-icon ${item.cls}`}>{item.icon}</div>
                <div className="why-card-title">{item.title}</div>
                <div className="why-card-text">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          6. PROSES IBADAH
         ════════════════════════════════════════ */}
      <section className="process-section">
        <div className="section-container">
          <div className="process-header">
            <div className="section-tag">🚀 Alur Pendaftaran</div>
            <h2 className="process-title">Mudah, Cepat, Terpercaya</h2>
            <p className="process-desc">
              Hanya 5 langkah untuk memulai perjalanan suci Anda bersama Bonita.
            </p>
          </div>

          <div className="process-steps">
            {PROCESS_STEPS.map((step) => (
              <div className="process-step" key={step.num}>
                <div className="process-step-circle">
                  {step.icon}
                  <div className="process-step-num">{step.num}</div>
                </div>
                <div className="process-step-name">{step.name}</div>
                <div className="process-step-sub">{step.sub}</div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: "3rem" }}>
            <Link
              to="/daftar"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "1rem 2.5rem",
                background: "linear-gradient(135deg, #0f5132, #1a6b43)",
                color: "#fff",
                borderRadius: "14px",
                fontWeight: 700,
                fontSize: "1rem",
                textDecoration: "none",
                boxShadow: "0 8px 24px rgba(15,81,50,0.3)",
                transition: "all 0.25s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 12px 32px rgba(15,81,50,0.4)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = "";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 8px 24px rgba(15,81,50,0.3)";
              }}
            >
              📝 Daftar Sekarang
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          7. TESTIMONIAL
         ════════════════════════════════════════ */}
      <section className="testimonial-section">
        <div className="section-container">
          <div className="testimonial-header">
            <div className="section-tag" style={{ background: "rgba(201,168,76,0.12)", color: "#e8c97e" }}>
              💬 Testimoni
            </div>
            <h2 className="testimonial-title">Kata Jamaah Kami</h2>
            <p className="testimonial-sub">
              Kepuasan jamaah adalah motivasi terbesar kami untuk terus berkembang.
            </p>
          </div>

          <div className="testimonial-grid">
            {TESTIMONIALS.map((t) => (
              <div className="testimonial-card" key={t.name}>
                <div className="testimonial-stars">
                  {"⭐".repeat(t.stars)}
                </div>
                <p className="testimonial-text">"{t.text}"</p>
                <div className="testimonial-author">
                  <div className="testimonial-avatar">{t.initial}</div>
                  <div>
                    <div className="testimonial-name">{t.name}</div>
                    <div className="testimonial-kota">{t.kota}</div>
                    <div className="testimonial-paket">{t.paket}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          8. KONTAK
         ════════════════════════════════════════ */}
      <section className="contact-section" id="kontak">
        <div className="section-container">
          <div className="contact-grid">
            {/* Left — Info */}
            <div className="contact-left">
              <div className="section-tag">📞 Kontak</div>
              <h2 className="contact-title">Siap Membantu<br />Perjalanan Anda</h2>
              <p className="contact-desc">
                Tim kami siap melayani Anda dari Senin–Sabtu, pukul 08.00–17.00 WIB.
                Jangan ragu untuk menghubungi kami untuk konsultasi gratis.
              </p>

              <div className="contact-info-list">
                <a
                  href="https://wa.me/6281234567890"
                  target="_blank"
                  rel="noreferrer"
                  className="contact-info-item"
                >
                  <div className="contact-info-icon contact-info-icon-wa">💬</div>
                  <div>
                    <div className="contact-info-label">WhatsApp</div>
                    <div className="contact-info-val">+62 812-3456-7890</div>
                  </div>
                </a>

                <a href="mailto:info@bonitaumroh.com" className="contact-info-item">
                  <div className="contact-info-icon contact-info-icon-email">✉️</div>
                  <div>
                    <div className="contact-info-label">Email</div>
                    <div className="contact-info-val">info@bonitaumroh.com</div>
                  </div>
                </a>

                <div className="contact-info-item" style={{ cursor: "default" }}>
                  <div className="contact-info-icon contact-info-icon-loc">📍</div>
                  <div>
                    <div className="contact-info-label">Alamat Kantor</div>
                    <div className="contact-info-val">Jalan Raya Kapeh Panji.49b, Jambu Air, Kec. Banuhampu, Kabupaten Agam, Sumatera Barat 26181</div>
                  </div>
                </div>

                <a
                  href="https://instagram.com/bonitaumroh"
                  target="_blank"
                  rel="noreferrer"
                  className="contact-info-item"
                >
                  <div className="contact-info-icon contact-info-icon-ig">📸</div>
                  <div>
                    <div className="contact-info-label">Instagram</div>
                    <div className="contact-info-val">@bonitaumroh</div>
                  </div>
                </a>
              </div>
            </div>

            {/* Right — CTA Card */}
            <div>
              <div className="contact-cta-card">
                <div className="contact-cta-icon">🕌</div>
                <div className="contact-cta-title">
                  Mulai Perjalanan<br />Umroh Anda Sekarang
                </div>
                <p className="contact-cta-text">
                  Daftarkan diri Anda hari ini dan dapatkan konsultasi gratis
                  dari tim profesional Bonita. Wujudkan impian ibadah umroh
                  Anda bersama kami.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                  <Link to="/paket" className="contact-cta-btn">
                    🌙 Lihat Paket Umroh
                  </Link>
                  <Link to="/daftar" className="contact-cta-btn-outline">
                    📝 Daftar Sekarang
                  </Link>
                </div>
              </div>

              {/* Office hours */}
              <div style={{
                marginTop: "1.25rem",
                background: "#f8fafc",
                border: "1.5px solid #e8edf5",
                borderRadius: "16px",
                padding: "1.25rem 1.5rem",
              }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.75rem" }}>
                  🕐 Jam Operasional
                </div>
                {[
                  { hari: "Senin – Jumat", jam: "08.00 – 17.00 WIB" },
                  { hari: "Sabtu", jam: "08.00 – 15.00 WIB" },
                  { hari: "Minggu & Libur", jam: "Tutup" },
                ].map((h) => (
                  <div key={h.hari} style={{
                    display: "flex", justifyContent: "space-between",
                    fontSize: "0.875rem", padding: "0.35rem 0",
                    borderBottom: "1px solid #f1f5f9",
                  }}>
                    <span style={{ color: "#374151" }}>{h.hari}</span>
                    <span style={{ color: h.jam === "Tutup" ? "#ef4444" : "#059669", fontWeight: 600 }}>{h.jam}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════
          FOOTER
         ════════════════════════════════════════ */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div>
            <div className="footer-brand-name">🕌 Bonita Umroh</div>
            <p className="footer-brand-tagline">
              Mitra perjalanan ibadah umroh terpercaya Anda. Melayani dengan hati,
              memberangkatkan dengan amanah.
            </p>
          </div>

          <div>
            <div className="footer-col-title">Navigasi</div>
            <div className="footer-links">
              <a href="#hero">Beranda</a>
              <a href="#tentang">Tentang Kami</a>
              <a href="#visi-misi">Visi & Misi</a>
              <a href="#kenapa-bonita">Keunggulan</a>
              <a href="#kontak">Kontak</a>
            </div>
          </div>

          <div>
            <div className="footer-col-title">Layanan</div>
            <div className="footer-links">
              <Link to="/paket">Paket Umroh</Link>
              <Link to="/daftar">Pendaftaran</Link>
              <Link to="/portal">Portal Jamaah</Link>
              <Link to="/paket">Cek Status</Link>
            </div>
          </div>

          <div>
            <div className="footer-col-title">Legal</div>
            <div className="footer-links">
              <a href="#">Syarat & Ketentuan</a>
              {/* <a href="#">Kebijakan Privasi</a>
              <a href="#">Kebijakan Refund</a> */}
              <a href="#">FAQ</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-copy">
            © {new Date().getFullYear()} Bonita Umroh. All rights reserved.
          </div>
          <div className="footer-love">
            Dibuat dengan <span>❤️</span> untuk jamaah Indonesia
          </div>
        </div>
      </footer>

    </div>
  );
};

export default Home;
