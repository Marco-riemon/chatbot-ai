# AI Gateway & Multi-Provider Chatbot

Aplikasi AI Gateway & Chatbot Multi-Provider dengan arsitektur tangguh yang mendukung **automatic failover**, **rotasi API key**, **cooldown rate limit**, **pelacakan token & analitik**, serta antarmuka modern SaaS Dark Dashboard. Dibangun mengacu pada blueprint [framework.md](file:///Users/ngtc/Documents/Project/AI%20Chat%20Bot/framework.md).

---

## 🚀 Fitur Utama

1. **AI Gateway & Request Manager**
   - Rute terpusat untuk seluruh model dan provider AI.
   - **Automatic Failover**: Jika provider utama (misal: Groq) mengalami rate limit (429), quota habis (402), atau server timeout, gateway secara otomatis berpindah ke provider alternatif (**Gemini → OpenRouter → Cloudflare → NVIDIA**) tanpa menghilangkan konteks percakapan.
   - Audit trail lengkap ditampilkan di antarmuka jika terjadi perpindahan fallback.

2. **Multi-Key Management & Rotation**
   - Mendukung banyak API key per provider (`GROQ_API_KEY_1`, `GROQ_API_KEY_2`, dll.).
   - Rotasi otomatis memilih kunci dengan beban penggunaan terendah.
   - Deteksi status cerdas: `ACTIVE`, `RATE_LIMITED` (dengan cooldown countdown), `QUOTA_EXHAUSTED`, `INVALID`, `DISABLED`, `ERROR`.
   - Isolasi keamanan: API key hanya diproses pada backend server dan selalu di-masking (`gsk_***`) saat ditampilkan ke pengguna.

3. **5 Provider AI Terintegrasi**
   - **Groq** (LPU ultra-fast inference: `openai/gpt-oss-20b`, `qwen/qwen3.8-27b`, `openai/gpt-oss-120b`, dll.)
   - **Google Gemini** (`gemini-2.0-flash`, `gemini-1.5-flash`, `gemini-1.5-pro`)
   - **OpenRouter** (`meta-llama/llama-3.2-3b-instruct:free`, `deepseek/deepseek-r1:free`, dll.)
   - **Cloudflare Workers AI** (`@cf/meta/llama-3-8b-instruct`, dll.)
   - **NVIDIA NIM** (`meta/llama-3.1-8b-instruct`, dll.)

4. **Response Quality & Intent Engine (Quality Blueprint)**
   - **System Prompt Studio & Versioning**: Baseline terstandarisasi dengan instruksi komunikasi luwes, aturan anti-halusinasi ketat, dan instruksi sesuai jenis pertanyaan.
   - **Context Manager**: Sliding window otomatis untuk mencegah context overflow, pembentukan ringkasan percakapan (*conversation summary*) untuk memori jangka panjang, serta kompatibilitas riwayat multi-turn lintas provider.
   - **Intent Detection & Intelligent Model Routing**: Menganalisis pertanyaan secara otomatis (`technical_coding`, `calculation`, `current_info`, `troubleshooting`, `explanation`, `recommendation`, `follow_up`) dan memilih model terbaik (Reasoning vs Fast Response).
   - **Tool Calling & Knowledge Retrieval (RAG)**: Integrasi *Calculator Tool* untuk akurasi numerik dan *Document Retrieval* untuk pencarian dokumen internal (`framework.md`, `quality-blueprint.md`, `README.md`) lengkap dengan sumber terverifikasi.
   - **Response Quality Evaluation & Benchmark**: Penilaian 1-5 bintang per pesan (*Accuracy*, *Relevance*, *Naturalness*, *Context Awareness*) dan pengujian otomatis dengan test dataset terstandarisasi.

5. **Modern SaaS Dark Dashboard (UI/UX)**
   - **AI Chat**: Percakapan real-time dengan Intent Badge, Tools Used Badge, Rating Modal, Markdown rendering, dan selector Auto Router.
   - **Quality & Evaluation**: Scoreboard kualitas, Prompt Version Manager, dan Test Dataset Runner.
   - **Overview Dashboard**: Metrik total request, akumulasi token, average latency, dan status live provider.
   - **Providers & Models**: Ping latency real-time, saklar enable/disable provider, dan katalog model.
   - **API Key Manager**: Tabel status kunci, hitung mundur cooldown, reset cooldown, dan form tambah custom key.
   - **Usage & Analytics**: Log audit rinci per pesan, token prompt vs completion, dan status filter.
   - **Gateway Settings**: Panduan konfigurasi `.env` dan parameter failover.

6. **Penyimpanan Lokal Persisten**
   - Menggunakan embedded store atomik di `data/store.json` (menyimpan percakapan, pesan, custom keys, usage logs, prompt versions, response evaluations, dan status override). Siap pakai tanpa dependensi database eksternal.

---

## 🛠️ Cara Menjalankan

### 1. Konfigurasi Environment (`.env`)
File `.env` sudah disediakan dengan kunci Groq aktif dan template kosong untuk provider lainnya:

```env
# 1. GROQ PROVIDER
GROQ_API_KEY_1=
GROQ_API_KEY_2=
GROQ_API_KEY_3=

# 2. GOOGLE GEMINI PROVIDER
GEMINI_API_KEY_1=
GEMINI_API_KEY_2=

# 3. OPENROUTER PROVIDER
OPENROUTER_API_KEY_1=
OPENROUTER_API_KEY_2=

# 4. CLOUDFLARE WORKERS AI PROVIDER
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=

# 5. NVIDIA NIM PROVIDER
NVIDIA_API_KEY_1=
NVIDIA_API_KEY_2=

# Gateway Configuration
GATEWAY_DEFAULT_PROVIDER=groq
GATEWAY_MAX_RETRIES=3
GATEWAY_TIMEOUT_MS=30000
GATEWAY_COOLDOWN_SECONDS=60
```

### 2. Jalankan Mode Development atau Production

```bash
# Jalankan mode development
npm run dev

# Atau jalankan build production
npm run build
npm start
```

Buka browser di **[http://localhost:3000](http://localhost:3000)**.

---

## 📡 REST API Endpoints

| Method | Endpoint | Keterangan |
|---|---|---|
| `POST` | `/api/chat` | Mengirim prompt ke AI Gateway (mendukung fallback & multi-turn) |
| `GET` | `/api/conversations` | Mengambil seluruh daftar percakapan |
| `POST` | `/api/conversations` | Membuat percakapan baru |
| `GET` | `/api/conversations/:id` | Mengambil riwayat pesan percakapan tertentu |
| `DELETE`| `/api/conversations/:id` | Menghapus percakapan |
| `GET` | `/api/providers` | Mengambil daftar provider, status aktif, dan jumlah kunci |
| `POST` | `/api/providers` | Mengaktifkan/menonaktifkan provider tertentu |
| `GET` | `/api/models` | Mengambil daftar model AI terintegrasi |
| `GET` | `/api/keys` | Mengambil daftar API key (termasker aman) beserta statusnya |
| `POST` | `/api/keys` | Menambah API key baru, mereset status cooldown, atau menonaktifkan |
| `GET` | `/api/prompts` | Mengambil daftar versi system prompt terdaftar & prompt aktif |
| `POST` | `/api/prompts` | Mengaktifkan versi prompt atau menyimpan template prompt baru |
| `GET` | `/api/evaluations` | Mengambil statistik skor kualitas respon (Akurasi, Relevansi, dll.) |
| `POST` | `/api/evaluations` | Menyimpan penilaian rating 1-5 bintang & feedback per pesan |
| `GET` | `/api/benchmark` | Mengambil daftar test cases dataset pengujian |
| `POST` | `/api/benchmark` | Menjalankan pengujian otomatis untuk mengukur kepatuhan model |
| `GET` | `/api/usage` | Ringkasan metrik penggunaan token, latency, dan audit log |
| `GET` | `/api/health` | Tes koneksi (ping latency) ke provider |

