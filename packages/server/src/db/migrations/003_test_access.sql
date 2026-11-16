-- Bakımda / kapalıyken giriş izni (yönetimin seçtiği test oyuncuları) ve kayıt listesi için sıralama dizini
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS test_access BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS accounts_created ON accounts(created_at DESC);
