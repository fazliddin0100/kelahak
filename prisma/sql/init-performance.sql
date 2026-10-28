-- Katta hujjat aylanmasi uchun PostgreSQL optimizatsiyalari
-- Docker birinchi ishga tushganda avtomatik bajariladi

-- JSONB imzolovchi maydonlari uchun GIN indeks (keyingi bosqichda qo‘llash mumkin)
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_approvers_gin ON documents USING gin (approvers jsonb_path_ops);

-- Faol hujjatlar uchun partial indeks
CREATE INDEX IF NOT EXISTS idx_documents_active_status
  ON documents ("ownerRegion", "createdAt" DESC)
  WHERE status NOT IN ('deleted', 'arxivlangan');

-- Ro‘yxatga olingan hujjatlar
CREATE INDEX IF NOT EXISTS idx_documents_registered
  ON documents ("ownerRegion", year, "registrationIndex")
  WHERE "registrationIndex" IS NOT NULL;

-- Full-text qidiruv (title) — kelajakda
-- CREATE INDEX IF NOT EXISTS idx_documents_title_trgm ON documents USING gin (title gin_trgm_ops);

-- Statistika yangilash
ANALYZE documents;
ANALYZE security_logs;

-- Katta hajm uchun yil bo‘yicha partition (100k+ hujjatda yoqish):
-- ALTER TABLE documents RENAME TO documents_legacy;
-- CREATE TABLE documents (...) PARTITION BY RANGE (year);
-- CREATE TABLE documents_2024 PARTITION OF documents FOR VALUES FROM (2024) TO (2025);

COMMENT ON TABLE document_contents IS 'Hujjat matni alohida — metadata so‘rovlari yengil';
