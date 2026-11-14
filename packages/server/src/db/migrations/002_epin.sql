-- E-PIN: yönetimin ürettiği ÇP yükleme kodları (bir kez kullanılır)
CREATE TABLE IF NOT EXISTS epin_codes (
  code TEXT PRIMARY KEY,
  cp INT NOT NULL CHECK (cp > 0),
  note TEXT,
  created_by BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_by_char BIGINT,
  used_by_account BIGINT,
  used_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS epin_created ON epin_codes(created_at DESC);
