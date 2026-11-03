DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS wallets;
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS transaction_type;

CREATE TYPE transaction_type AS ENUM ('TOPUP', 'TRANSFER');

CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  username   VARCHAR(30)  NOT NULL UNIQUE,
  email      VARCHAR(100) NOT NULL UNIQUE,
  phone      VARCHAR(15)  NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,            -- hash bcrypt, bukan password asli
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE wallets (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance    BIGINT  NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wallets_balance_non_negative CHECK (balance >= 0)
);

CREATE TABLE transactions (
  id                 SERIAL PRIMARY KEY,
  type               transaction_type NOT NULL,
  amount             BIGINT  NOT NULL,
  sender_wallet_id   INTEGER REFERENCES wallets(id),          -- NULL kalau TOPUP
  receiver_wallet_id INTEGER NOT NULL REFERENCES wallets(id),
  description        VARCHAR(255),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT transactions_amount_positive CHECK (amount > 0),

  CONSTRAINT transactions_sender_rule CHECK (
    (type = 'TOPUP'    AND sender_wallet_id IS NULL) OR
    (type = 'TRANSFER' AND sender_wallet_id IS NOT NULL)
  ),
  -- Tidak boleh transfer ke diri sendiri
  CONSTRAINT transactions_no_self_transfer CHECK (sender_wallet_id IS DISTINCT FROM receiver_wallet_id)
);

-- Index supaya query riwayat per wallet tetap cepat walau datanya banyak
CREATE INDEX idx_transactions_sender   ON transactions (sender_wallet_id, created_at DESC);
CREATE INDEX idx_transactions_receiver ON transactions (receiver_wallet_id, created_at DESC);
