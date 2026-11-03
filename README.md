# Mini Wallet — Exam Penyaluran Kerja (Dibimbing FWD Batch 12)

Mini Wallet API & Dashboard: register/login (JWT), cek saldo, top-up, transfer, riwayat transaksi.

## Tech Stack
- Backend: Node.js, Express 5, PostgreSQL (`pg`), JWT, bcrypt
- Frontend: React (Vite) — *menyusul*

## Cara Menjalankan Backend
```bash
cd backend
npm install
cp .env.example .env        # lalu isi DATABASE_URL & JWT_SECRET
npm run db:init             # membuat tabel dari database/schema.sql
npm run dev                 # server di http://localhost:3000
```
Cek: buka `http://localhost:3000/api/health`
