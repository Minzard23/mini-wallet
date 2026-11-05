# 💳 Mini Wallet

Aplikasi dompet digital sederhana: **register & login (JWT)**, **cek saldo**, **top-up**, **transfer ke user lain** (berdasarkan email / nomor HP), **riwayat transaksi**, serta **mutasi rekening dengan download PDF**.

Dibuat sebagai **Take Home Test — Exam Penyaluran Kerja**, Full Stack Web Development Bootcamp **Dibimbing.id Batch 12**.

| | Link |
|---|---|
| 🌐 Aplikasi (Frontend) | https://mini-wallet-app-lilac.vercel.app |
| ⚙️ API (Backend) | https://mini-wallet-phi.vercel.app/api/health |
| 📦 Repository | https://github.com/Minzard23/mini-wallet |

---

## ✨ Fitur

**Autentikasi**
- Register dengan validasi: format email, password minimal 8 karakter, username / email / nomor HP unik
- Login menghasilkan **JWT** yang disimpan di **cookie httpOnly** (tidak bisa dibaca JavaScript → aman dari XSS)
- Logout & cek sesi (`/me`) — sesi tetap aktif saat halaman di-refresh

**Wallet**
- Lihat saldo
- Top-up saldo
- Transfer ke user lain berdasarkan **email atau nomor HP**
- Riwayat transaksi (uang masuk & keluar)
- **Mutasi rekening**: filter periode & jenis, ringkasan total, **download PDF** *(fitur tambahan)*

**Keamanan & integritas data**
- **Database transaction** (`BEGIN` / `COMMIT` / `ROLLBACK`) pada top-up, transfer, dan register
- Saldo **tidak pernah minus** — dijaga 3 lapis:
  1. Validasi input di frontend & backend
  2. Query atomik `UPDATE ... WHERE balance >= amount` (aman dari *race condition*)
  3. Constraint database `CHECK (balance >= 0)`
- Semua endpoint wallet diproteksi **middleware auth**; user A **tidak bisa** melihat mutasi user B (id user diambil dari token, bukan dari input)
- Password di-hash dengan **bcrypt**
- **Parameterized query** (`$1, $2`) → aman dari SQL Injection

**UX**
- Pesan error spesifik di setiap field (mis. *"Nominal harus berupa angka."*)
- Tombol submit **disabled** sebelum input valid
- **Loading state** mencegah klik berulang (spam klik 5x → tetap 1 transaksi)
- Responsif di HP

---

## 🛠️ Tech Stack

| Bagian | Teknologi |
|---|---|
| Frontend | React 19, Vite, React Router, Axios, jsPDF + jspdf-autotable |
| Backend | Node.js, Express 5, JSON Web Token, bcrypt, cookie-parser, cors |
| Database | PostgreSQL ([Neon](https://neon.tech), serverless) dengan driver `pg` |
| Deployment | Vercel (frontend & backend) |
| Tools | Git & GitHub, Postman, VS Code |

---

## 🗂️ ERD

```mermaid
erDiagram
    USERS ||--|| WALLETS : "memiliki"
    WALLETS ||--o{ TRANSACTIONS : "mengirim (sender)"
    WALLETS ||--o{ TRANSACTIONS : "menerima (receiver)"

    USERS {
        serial id PK
        varchar username UK
        varchar email UK
        varchar phone UK
        varchar password "hash bcrypt"
        timestamptz created_at
    }
    WALLETS {
        serial id PK
        int user_id FK, UK
        bigint balance "CHECK >= 0"
        timestamptz updated_at
    }
    TRANSACTIONS {
        serial id PK
        enum type "TOPUP | TRANSFER"
        bigint amount "CHECK > 0"
        int sender_wallet_id FK "NULL jika TOPUP"
        int receiver_wallet_id FK
        varchar description
        timestamptz created_at
    }
```

- **users → wallets (1:1)**: setiap user otomatis punya 1 wallet saat register.
- **wallets → transactions (1:N)**: satu wallet bisa menjadi pengirim / penerima banyak transaksi.
- Index `(sender_wallet_id, created_at)` dan `(receiver_wallet_id, created_at)` agar query riwayat tetap cepat.
- Skema lengkap: [`backend/database/schema.sql`](backend/database/schema.sql)

---

## 🔁 Alur Transfer (Database Transaction)

```mermaid
sequenceDiagram
    participant U as User (React)
    participant API as Backend (Express)
    participant DB as PostgreSQL

    U->>API: POST /api/transfer {recipient, amount}
    API->>API: Middleware auth (cek JWT) + validasi input
    API->>DB: Cari penerima (email / no. HP)
    API->>DB: BEGIN
    API->>DB: UPDATE saldo pengirim -amount WHERE balance >= amount
    alt Saldo tidak cukup (0 baris berubah)
        API->>DB: ROLLBACK
        API-->>U: 400 "Saldo tidak cukup."
    else Saldo cukup
        API->>DB: UPDATE saldo penerima +amount
        API->>DB: INSERT transactions
        API->>DB: COMMIT
        API-->>U: 201 "Transfer berhasil"
    end
    Note over API,DB: Error di langkah mana pun → ROLLBACK (uang pengirim kembali)
```

---

## 📡 API Endpoints

Base URL: `https://mini-wallet-phi.vercel.app/api` (lokal: `http://localhost:3000/api`)

| Method | Endpoint | Auth | Keterangan |
|---|---|:---:|---|
| POST | `/auth/register` | – | Daftar akun (otomatis dibuatkan wallet) |
| POST | `/auth/login` | – | Login, token disimpan di cookie httpOnly |
| POST | `/auth/logout` | – | Hapus cookie token |
| GET | `/auth/me` | ✅ | Data user yang sedang login |
| GET | `/wallet` | ✅ | Lihat saldo |
| POST | `/topup` | ✅ | Tambah saldo |
| POST | `/transfer` | ✅ | Kirim saldo ke user lain |
| GET | `/transactions` | ✅ | Riwayat mutasi. Query opsional: `from`, `to` (YYYY-MM-DD), `direction` (`IN`/`OUT`), `limit` (1–500) |
| GET | `/health` | – | Cek server hidup |

Endpoint ber-auth menerima token dari **cookie** `token` atau header `Authorization: Bearer <token>`.

<details>
<summary><b>Contoh request & response</b></summary>

**POST `/api/auth/register`**
```json
{ "username": "candra", "email": "candra@mail.com", "phone": "081234567890", "password": "rahasia123" }
```
```json
// 201 Created
{ "success": true, "message": "Registrasi berhasil, silakan login", "data": { "id": 1, "username": "candra", "email": "candra@mail.com", "phone": "081234567890", "created_at": "..." } }
```

**POST `/api/topup`**
```json
{ "amount": 100000 }
```
```json
// 201 Created
{ "success": true, "message": "Top-up berhasil", "data": { "amount": 100000, "balance": 100000 } }
```

**POST `/api/transfer`**
```json
{ "recipient": "budi@mail.com", "amount": 30000, "description": "bayar makan" }
```
```json
// 201 Created
{ "success": true, "message": "Transfer Rp30.000 ke budi berhasil", "data": { "transaction_id": 3, "amount": 30000, "receiver": "budi", "balance": 70000, "created_at": "..." } }
```

**Contoh error**
```json
// 422 Unprocessable Entity — POST /api/topup { "amount": "abc" }
{ "success": false, "message": "Nominal harus berupa angka.", "errors": { "amount": "Nominal harus berupa angka." } }

// 400 Bad Request — saldo kurang
{ "success": false, "message": "Saldo tidak cukup." }

// 401 Unauthorized — tanpa token
{ "success": false, "message": "Silakan login terlebih dahulu" }
```
</details>

### Status code

| Kode | Kapan |
|---|---|
| `200` / `201` | Berhasil / data baru dibuat |
| `400` | Format JSON rusak, saldo tidak cukup, transfer ke diri sendiri |
| `401` | Belum login, token palsu / kedaluwarsa, email / password salah |
| `404` | Penerima tidak ditemukan, endpoint tidak ada |
| `422` | Validasi input gagal (format salah, data sudah digunakan) |

### Aturan validasi nominal (top-up & transfer)

| Input | Pesan |
|---|---|
| `""` / tidak dikirim | Nominal tidak boleh kosong. |
| `"abc"`, `"10@"`, `"Rp5000"` | Nominal harus berupa angka. |
| `-5000` | Nominal tidak boleh negatif. |
| `1500.5` | Nominal harus bilangan bulat. |
| `0` | Nominal harus lebih dari 0. |
| `> 10.000.000` | Nominal melebihi batas maksimum transaksi. |

---

## 🚀 Cara Menjalankan (Lokal)

**Prasyarat:** Node.js 20+, Git, database PostgreSQL (lokal atau gratis di [neon.tech](https://neon.tech)).

### 1. Clone
```bash
git clone https://github.com/Minzard23/mini-wallet.git
cd mini-wallet
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env   # Windows: copy .env.example .env
```
Isi `.env`:

| Variabel | Contoh | Keterangan |
|---|---|---|
| `PORT` | `3000` | Port server |
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=verify-full` | Connection string PostgreSQL |
| `DB_SSL` | `true` | `true` untuk database online (Neon), `false` untuk lokal |
| `JWT_SECRET` | *(string acak panjang)* | Buat dengan `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_EXPIRES_IN` | `1d` | Masa berlaku token |
| `CLIENT_URL` | `http://localhost:5173` | Alamat frontend (CORS) |

Buat tabel dengan menjalankan [`database/schema.sql`](backend/database/schema.sql) (via `npm run db:init`, pgAdmin, atau SQL Editor Neon), lalu:
```bash
npm run dev            # http://localhost:3000/api/health
```

### 3. Frontend (terminal baru)
```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```
Saat development, Vite meneruskan request `/api` ke `http://localhost:3000` (lihat `vite.config.js`), sehingga cookie httpOnly berjalan tanpa konfigurasi tambahan.

---

## 📁 Struktur Folder

```
mini-wallet/
├── backend/
│   ├── api/index.js              # entry point serverless (Vercel)
│   ├── database/schema.sql       # struktur tabel, constraint, index
│   └── src/
│       ├── config/db.js          # koneksi PostgreSQL (pool)
│       ├── controllers/          # logika auth & wallet
│       ├── middlewares/auth.js   # verifikasi JWT
│       ├── routes/               # daftar endpoint
│       ├── utils/token.js        # pembuatan JWT & opsi cookie
│       ├── validators/           # aturan validasi input
│       ├── app.js                # konfigurasi Express
│       └── server.js             # menjalankan server (lokal)
└── frontend/
    └── src/
        ├── api/client.js         # instance axios
        ├── context/AuthContext.jsx
        ├── components/           # Navbar, form top-up & transfer, tabel
        ├── pages/                # Login, Register, Dashboard, Mutasi
        └── utils/                # validasi, format Rupiah/tanggal, PDF
```

---

## 👤 Author

**Raza Candra Anwar** — [GitHub @Minzard23](https://github.com/Minzard23)