# AI Gateway & Multi-Provider Chatbot
## Project Blueprint & Technical Reference

Dokumen ini menjadi referensi pengembangan aplikasi AI Chatbot yang terhubung dengan berbagai provider AI melalui satu sistem terpusat (AI Gateway).

---

## 1. Project Overview

### Tujuan
Membangun aplikasi AI Chatbot yang dapat menggunakan berbagai provider AI dan secara otomatis berpindah provider atau API key ketika terjadi limit, quota exhaustion, atau gangguan layanan.

### Fokus utama
- Menggunakan provider AI yang menyediakan free tier.
- Mendukung beberapa API key dari provider yang sama.
- Automatic fallback antar-provider.
- Monitoring penggunaan token dan request.
- Manajemen model AI.
- Pengelolaan percakapan pengguna.
- Sistem yang mudah dikembangkan dengan menambahkan provider baru.

---

## 2. Supported AI Providers

Provider yang direncanakan untuk integrasi awal:

| Provider | Kegunaan |
|---|---|
| Groq | Prioritas untuk inference cepat |
| Google Gemini | Alternatif model AI dengan free tier |
| Cloudflare Workers AI | Alternatif inference berbasis Cloudflare |
| OpenRouter | Akses ke berbagai model melalui satu API |
| NVIDIA NIM | Provider tambahan untuk eksperimen |

Referensi resmi:
- Groq: https://console.groq.com/
- Gemini: https://aistudio.google.com/
- Cloudflare: https://developers.cloudflare.com/workers-ai/
- OpenRouter: https://openrouter.ai/
- NVIDIA: https://build.nvidia.com/

Catatan: Batas penggunaan, model gratis, dan ketentuan setiap provider dapat berubah. Periksa kebijakan terbaru sebelum digunakan.

---

## 3. System Architecture

### Gambaran alur

User Chat Interface  
↓  
Backend API  
↓  
AI Gateway / Request Manager  
↓  
Provider Manager  
↓  
API Key Manager  
↓  
Provider AI  
↓  
Response Handler  
↓  
User Chat Interface

### Modul utama

1. **Chat Interface**
   - Input pesan.
   - Menampilkan respons AI.
   - Riwayat percakapan.
   - Informasi model yang sedang digunakan.

2. **AI Gateway**
   - Menerima permintaan dari frontend.
   - Menentukan provider dan model.
   - Mengatur fallback.
   - Menangani retry dan timeout.

3. **Provider Manager**
   - Mengelola daftar provider.
   - Menyediakan adapter untuk setiap provider.
   - Menyamakan format request dan response.

4. **API Key Manager**
   - Menyimpan beberapa API key.
   - Melakukan rotasi key.
   - Mengelola status dan cooldown.
   - Mencatat error penggunaan.

5. **Usage Monitor**
   - Menghitung jumlah request.
   - Mencatat estimasi token.
   - Menampilkan penggunaan setiap provider.
   - Memantau status API key.

---

## 4. Provider Integration

Setiap provider sebaiknya menggunakan adapter dengan interface yang seragam.

Contoh fungsi standar:

- `sendMessage()`
- `listModels()`
- `checkConnection()`
- `normalizeResponse()`
- `handleError()`

Dengan pendekatan ini, penambahan provider baru tidak perlu mengubah keseluruhan sistem.

---

## 5. API Key Management

Sistem mendukung banyak API key untuk satu provider.

Contoh konfigurasi environment:

```env
GROQ_API_KEY_1=
GROQ_API_KEY_2=

GEMINI_API_KEY_1=
GEMINI_API_KEY_2=

OPENROUTER_API_KEY_1=
OPENROUTER_API_KEY_2=

CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=
```

Status API key:

| Status | Keterangan |
|---|---|
| ACTIVE | Dapat digunakan |
| RATE_LIMITED | Terkena batas request sementara |
| QUOTA_EXHAUSTED | Kuota telah habis |
| INVALID | API key tidak valid |
| DISABLED | Dinonaktifkan |
| ERROR | Mengalami error |

Data monitoring yang disarankan:
- Provider.
- Nama atau identifier key.
- Status.
- Last used.
- Last error.
- Total request.
- Estimasi token.
- Waktu cooldown atau reset jika tersedia.

**Catatan:** Banyak API key tidak selalu berarti kuota bertambah. Batas penggunaan dapat diterapkan pada level akun, project, organisasi, atau endpoint provider.

---

## 6. Automatic Failover & Retry

Ketika satu provider atau API key gagal, sistem mencoba alternatif yang tersedia.

### Contoh alur

1. User mengirim pesan.
2. Gateway memilih provider utama.
3. API Key Manager memilih key aktif.
4. Request dikirim ke provider.
5. Jika berhasil, respons dikembalikan.
6. Jika gagal, error dianalisis.
7. Sistem mencoba key lain atau provider alternatif.
8. Jika semua alternatif gagal, tampilkan pesan error yang sesuai.

### Error handling

| HTTP Status | Penanganan |
|---|---|
| 400 | Request tidak valid, jangan retry otomatis tanpa perubahan |
| 401 | Tandai key bermasalah |
| 403 | Periksa izin atau akses |
| 402 | Periksa billing atau kredit |
| 429 | Periksa rate limit dan cooldown |
| 500 | Retry terbatas |
| 502 / 503 | Coba provider alternatif |

Gunakan:
- Exponential backoff.
- Retry-After jika tersedia.
- Maximum retry.
- Timeout.
- Cooldown.
- Pencegahan infinite retry.

---

## 7. Model Management

Sistem perlu memiliki daftar model yang tersedia dari masing-masing provider.

Informasi model:
- Provider.
- Model ID.
- Nama model.
- Context window jika diketahui.
- Kemampuan model.
- Status aktif.
- Kategori penggunaan.

Contoh kategori:
- Fast response.
- General purpose.
- Reasoning.
- Coding.
- Lightweight.

Sistem dapat menggunakan model ringan untuk pertanyaan sederhana dan model yang lebih kuat untuk kebutuhan kompleks.

---

## 8. Conversation Management

Fitur percakapan:
- Membuat percakapan baru.
- Menyimpan riwayat chat.
- Mengganti judul percakapan.
- Menghapus percakapan.
- Mengirim ulang pesan.
- Mempertahankan konteks percakapan.

Perlu diperhatikan bahwa ketika provider berganti, riwayat percakapan harus tetap dikirim dalam format yang sesuai dengan provider tujuan.

---

## 9. Usage Monitoring

Dashboard monitoring disarankan menampilkan:

- Total request.
- Total token.
- Penggunaan per provider.
- Penggunaan per API key.
- Jumlah error.
- Provider yang sedang aktif.
- API key yang sedang cooldown.
- Riwayat penggunaan.

Jika provider tidak menyediakan informasi penggunaan token secara lengkap, tampilkan sebagai estimasi dan beri label yang jelas.

---

## 10. Security

Hal-hal yang wajib diperhatikan:

- API key hanya disimpan di backend.
- Jangan pernah mengirim API key ke frontend.
- Gunakan environment variables atau secret manager.
- Jangan commit file `.env` ke GitHub.
- Validasi input dari pengguna.
- Terapkan autentikasi dan otorisasi.
- Batasi request untuk mencegah penyalahgunaan.
- Jangan menyimpan API key dalam log.
- Gunakan HTTPS.

---

## 11. Suggested Backend Endpoints

Contoh rancangan endpoint:

| Method | Endpoint | Fungsi |
|---|---|---|
| POST | `/api/chat` | Mengirim pesan |
| GET | `/api/conversations` | Mengambil riwayat percakapan |
| POST | `/api/conversations` | Membuat percakapan |
| DELETE | `/api/conversations/:id` | Menghapus percakapan |
| GET | `/api/providers` | Daftar provider |
| GET | `/api/models` | Daftar model |
| GET | `/api/usage` | Data penggunaan |
| GET | `/api/health` | Status sistem |

Endpoint administrasi untuk mengelola API key harus dilindungi autentikasi dan otorisasi.

---

## 12. Suggested MongoDB Collections

### `providers`
Menyimpan konfigurasi provider.

### `api_keys`
Menyimpan referensi dan metadata API key. Untuk production, rahasia API key harus dienkripsi atau disimpan di secret manager.

### `models`
Menyimpan daftar model dari setiap provider.

### `conversations`
Menyimpan data percakapan.

### `messages`
Menyimpan pesan user dan respons AI.

### `usage_logs`
Mencatat request, penggunaan token, provider, model, dan status respons.

---

## 13. Frontend UI/UX References

Bagian ini menjadi acuan desain frontend sebelum implementasi.

### A. Figma Community — Referensi utama

**Link:** https://www.figma.com/community

Figma Community menyediakan banyak file desain dan template komunitas yang dapat digunakan sebagai referensi. Cari desain yang memiliki tampilan dashboard modern, layout konsisten, dan komponen yang mudah diadaptasi.

Kata kunci pencarian yang disarankan:

- AI Chat Dashboard
- AI Chatbot UI
- SaaS Dashboard
- Admin Dashboard
- AI Assistant
- Chat Application
- Analytics Dashboard
- Dark Dashboard UI

Prioritaskan desain yang memiliki:
- Sidebar navigation.
- Chat interface.
- Dashboard analytics.
- Provider management.
- API key management.
- Usage monitoring.
- Responsive layout.

Perhatikan lisensi dan ketentuan masing-masing file komunitas sebelum menggunakan atau memodifikasinya.

### B. Referensi desain tambahan

| Platform | Kegunaan | Link |
|---|---|---|
| SaaSUI | Inspirasi desain aplikasi SaaS | https://saasui.design/ |
| Dribbble | Referensi visual dashboard dan chatbot | https://dribbble.com/tags/dashboard |
| Behance | Studi kasus UI/UX dan desain produk | https://www.behance.net/search/projects/saas%20dashboard |
| Lapa Ninja | Inspirasi desain website dan landing page | https://www.lapa.ninja/ |

### C. Referensi aplikasi nyata

Gunakan aplikasi berikut sebagai referensi pola interaksi dan tata letak:

- OpenRouter: https://openrouter.ai/
- Groq Console: https://console.groq.com/
- Cloudflare Dashboard: https://dash.cloudflare.com/
- Vercel: https://vercel.com/

### D. UI Component Libraries

Library berikut dapat membantu implementasi desain ke dalam frontend.

| Library | Fungsi | Link |
|---|---|---|
| shadcn/ui | Komponen UI siap pakai | https://ui.shadcn.com/ |
| Tailwind CSS | Styling dan layout | https://tailwindcss.com/ |
| Lucide | Icon library | https://lucide.dev/ |
| Magic UI | Komponen dan animasi UI | https://magicui.design/ |
| Aceternity UI | Komponen UI modern | https://ui.aceternity.com/ |
| Tremor | Komponen dashboard dan chart | https://tremor.so/ |

### E. Rekomendasi arah desain

Konsep desain yang disarankan:

- Modern SaaS Dashboard.
- Minimalist.
- Clean interface.
- Dark mode sebagai pilihan tema.
- Sidebar navigation.
- Card-based layout.
- Konsistensi spacing dan typography.
- Responsif untuk desktop dan tablet.

Contoh struktur halaman:

```text
Dashboard
├── Overview
├── AI Chat
├── Providers
│   ├── Provider List
│   ├── API Keys
│   └── Models
├── Usage & Analytics
├── Conversations
└── Settings
```

**Prioritas referensi:** Gunakan Figma Community untuk mencari desain dasar, SaaSUI untuk inspirasi, dan shadcn/ui sebagai salah satu pilihan implementasi komponen.

---

## 14. Development Roadmap

### Phase 1 — Basic Chat
- Membuat frontend chatbot.
- Membuat backend API.
- Integrasi satu provider.
- Menampilkan respons AI.

### Phase 2 — Multi Provider
- Integrasi beberapa provider.
- Membuat adapter standar.
- Menambahkan pemilihan model.

### Phase 3 — API Key Management
- Mendukung banyak API key.
- Rotasi key.
- Status key.
- Cooldown.

### Phase 4 — Automatic Failover
- Error handling.
- Retry mechanism.
- Provider fallback.
- Timeout management.

### Phase 5 — Monitoring
- Usage dashboard.
- Request logs.
- Token monitoring.
- Provider health status.

### Phase 6 — UI/UX Improvement
- Menyempurnakan desain berdasarkan referensi Figma.
- Responsive layout.
- Dark/light mode.
- Loading state dan error state.
- Peningkatan pengalaman pengguna.

---

## 15. Definition of Done

Project dianggap mencapai MVP ketika:

- [ ] User dapat mengirim pesan melalui chatbot.
- [ ] Backend dapat terhubung ke minimal dua provider.
- [ ] Sistem dapat menggunakan beberapa API key.
- [ ] Sistem dapat melakukan fallback ketika provider gagal.
- [ ] Riwayat percakapan tetap terjaga saat provider berganti.
- [ ] Penggunaan request tercatat.
- [ ] API key aman dan tidak terekspos ke frontend.
- [ ] Dashboard dapat menampilkan status provider dan API key.

---

## 16. Future Development

Pengembangan lanjutan yang dapat dipertimbangkan:

- Model routing berdasarkan jenis pertanyaan.
- Automatic model selection.
- Streaming response.
- Export percakapan.
- Multi-user account.
- Role-based access control.
- Budget dan usage limit per user.
- Redis untuk caching dan pengelolaan cooldown.
- Integrasi provider tambahan.
- Evaluasi kualitas respons antar-model.

---

**Dokumen ini merupakan blueprint awal.** Implementasi sebaiknya dilakukan bertahap, dimulai dari chatbot sederhana dengan satu provider, kemudian dikembangkan menjadi AI Gateway multi-provider dengan sistem fallback dan monitoring.
