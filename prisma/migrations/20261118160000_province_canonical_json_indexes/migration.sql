-- 1) Viloyat nomlarini rasmiy yozilishga keltirish (lib/registrationConstants.ts dagi ro'yxat).
--    Endi filtrlar aniq tenglik bilan ishlaydi va ownerRegion indekslari qo'llanadi.
--    Solishtirish: bo'sh joylarsiz, katta-kichik harfga befarq, apostrof turlari (’ ʻ ' `) -> ‘.

CREATE TEMP TABLE canonical_provinces (name TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE);
INSERT INTO canonical_provinces (name, key)
SELECT v, lower(translate(v, '’ʻ''`', '‘‘‘‘'))
FROM unnest(ARRAY[
  'Andijon', 'Buxoro', 'Farg‘ona', 'Jizzax', 'Qashqadaryo', 'Qoraqalpog‘iston', 'Navoiy',
  'Namangan', 'Samarqand', 'Sirdaryo', 'Surxondaryo', 'Toshkent', 'Toshkent viloyati', 'Xorazm'
]) AS v;

-- Registratsiya hisoblagichlari: bir viloyat+yil uchun ikki yozuv bo'lsa, katta raqam saqlanadi.
UPDATE "registration_counters" AS c
SET "seq" = GREATEST(c."seq", o."seq"), "updatedAt" = CURRENT_TIMESTAMP
FROM "registration_counters" AS o
JOIN canonical_provinces cp ON cp.key = lower(translate(trim(o."ownerRegion"), '’ʻ''`', '‘‘‘‘'))
WHERE c."ownerRegion" = cp.name AND c."year" = o."year" AND o."ownerRegion" <> cp.name;

DELETE FROM "registration_counters" AS o
USING canonical_provinces cp, "registration_counters" AS c
WHERE cp.key = lower(translate(trim(o."ownerRegion"), '’ʻ''`', '‘‘‘‘'))
  AND o."ownerRegion" <> cp.name
  AND c."ownerRegion" = cp.name AND c."year" = o."year";

UPDATE "registration_counters" AS t SET "ownerRegion" = cp.name
FROM canonical_provinces cp
WHERE cp.key = lower(translate(trim(t."ownerRegion"), '’ʻ''`', '‘‘‘‘')) AND t."ownerRegion" <> cp.name;

-- Registratsiyalar: unikal kalit buzilmasa
UPDATE "registrations" AS t SET "ownerRegion" = cp.name
FROM canonical_provinces cp
WHERE cp.key = lower(translate(trim(t."ownerRegion"), '’ʻ''`', '‘‘‘‘')) AND t."ownerRegion" <> cp.name
  AND NOT EXISTS (
    SELECT 1 FROM "registrations" r
    WHERE r."ownerRegion" = cp.name AND r."year" = t."year" AND r."documentId" = t."documentId"
  );

-- Qolgan jadvallarda unikal cheklov yo'q
UPDATE "documents" t SET "ownerRegion" = cp.name FROM canonical_provinces cp
WHERE cp.key = lower(translate(trim(t."ownerRegion"), '’ʻ''`', '‘‘‘‘')) AND t."ownerRegion" <> cp.name;
UPDATE "documents" t SET "sourceRegion" = cp.name FROM canonical_provinces cp
WHERE t."sourceRegion" IS NOT NULL AND cp.key = lower(translate(trim(t."sourceRegion"), '’ʻ''`', '‘‘‘‘')) AND t."sourceRegion" <> cp.name;
UPDATE "personals" t SET "province" = cp.name FROM canonical_provinces cp
WHERE cp.key = lower(translate(trim(t."province"), '’ʻ''`', '‘‘‘‘')) AND t."province" <> cp.name;
UPDATE "roles" t SET "province" = cp.name FROM canonical_provinces cp
WHERE cp.key = lower(translate(trim(t."province"), '’ʻ''`', '‘‘‘‘')) AND t."province" <> cp.name;
UPDATE "bolims" t SET "province" = cp.name FROM canonical_provinces cp
WHERE cp.key = lower(translate(trim(t."province"), '’ʻ''`', '‘‘‘‘')) AND t."province" <> cp.name;
UPDATE "bolinmas" t SET "province" = cp.name FROM canonical_provinces cp
WHERE cp.key = lower(translate(trim(t."province"), '’ʻ''`', '‘‘‘‘')) AND t."province" <> cp.name;
UPDATE "nomeklatura" t SET "ownerRegion" = cp.name FROM canonical_provinces cp
WHERE cp.key = lower(translate(trim(t."ownerRegion"), '’ʻ''`', '‘‘‘‘')) AND t."ownerRegion" <> cp.name;
UPDATE "files" t SET "ownerRegion" = cp.name FROM canonical_provinces cp
WHERE t."ownerRegion" IS NOT NULL AND cp.key = lower(translate(trim(t."ownerRegion"), '’ʻ''`', '‘‘‘‘')) AND t."ownerRegion" <> cp.name;

DROP TABLE canonical_provinces;

-- 2) JSON maydonlar bo'yicha qidiruv uchun GIN indekslar (imzolovchilar, qabul qiluvchilar)
CREATE INDEX "documents_approvers_gin" ON "documents" USING GIN ("approvers" jsonb_path_ops);
CREATE INDEX "documents_receiver_gin" ON "documents" USING GIN ("receiver" jsonb_path_ops);
CREATE INDEX "documents_forwardedTo_gin" ON "documents" USING GIN ("forwardedTo" jsonb_path_ops);
CREATE INDEX "documents_author_gin" ON "documents" USING GIN ("author" jsonb_path_ops);
CREATE INDEX "documents_sender_gin" ON "documents" USING GIN ("sender" jsonb_path_ops);
