export enum DocumentStatus {
    YANGI = "yangi", // Yangi yaratilgan hujjat, hali ishlov berilmagan
    CREATED = "created", // Tizimda yaratilgan, lekin hali boshqa jarayonga o‘tmagan
    SIGNED = "signed", // Muallif yoki mas'ul tomonidan imzolangan
    REGISTERED = "registered", // Rasmiy tarzda ro‘yxatga olingan hujjat
    APPROVED = "imzolandi", // Yuqori bosqich tomonidan tasdiqlangan yoki imzolangan
    REJECTED = "rad etildi", // Hujjat rad etilgan yoki qabul qilinmagan
    ARCHIVED = "arxivlangan", // Ish jildiga yakunlangan, hujjat arxivga topshirilgan
    FORWARDED = "forwarded", // Hujjat boshqa shaxs yoki bo‘limga yuborilgan
    RESOLVED = "resolved", // Hujjat asosida masala yoki topshiriq bajarilgan
    REPLIED = "replied", // Hujjatga javob yuborilgan
    DELETED = "deleted", // Hujjat tizimdan o‘chirib tashlangan
    IN_PROGRESS = "in_progress", // Hujjat ustida ish olib borilmoqda
    IN_REVIEW = "in_review", // Hujjat tekshirish uchun ko‘rib chiqilmoqda
    IN_REVIEWED = "in_reviewed", // Hujjat tekshiruvdan o‘tgan
    IN_PROGRESS_REVIEW = "in_progress_review", // Ish jarayonida va ayni paytda ko‘rib chiqilmoqda
    IN_PROGRESS_REVIEWED = "in_progress_reviewed", // Ish davom etmoqda, hujjat tekshirilgan
    IN_PROGRESS_FORWARD = "in_progress_forward", // Hujjat yo‘naltirilmoqda, ish jarayonida
    IN_PROGRESS_RESOLVE = "in_progress_resolve", // Masala hal qilinmoqda, ish davom etmoqda
    IN_PROGRESS_REPLY = "in_progress_reply", // Javob tayyorlanmoqda, ish jarayonida
    IN_PROGRESS_FORWARD_REVIEW = "in_progress_forward_review", // Yo‘naltirilmoqda va tekshirilmoqda
    IN_PROGRESS_RESOLVE_REVIEW = "in_progress_resolve_review", // Hal qilinmoqda va tekshirilmoqda
    IN_PROGRESS_REPLY_REVIEW = "in_progress_reply_review", // Javob tayyorlanmoqda va tekshirilmoqda
    RECEIVED_COPY = "received_copy", // Nusxa qabul qilindi va kiruvchi hujjat sifatida ro‘yxatga olindi
}

export const DocumentStatusValues = [
    "yangi",
    "created",
    "signed",
    "registered",
    "imzolandi",
    "rad etildi",
    "arxivlangan",
    "forwarded",
    "resolved",
    "replied",
    "deleted",
    "in_progress",
    "in_review",
    "in_reviewed",
    "in_progress_review",
    "in_progress_reviewed",
    "in_progress_forward",
    "in_progress_resolve",
    "in_progress_reply",
    "in_progress_forward_review",
    "in_progress_resolve_review",
    "in_progress_reply_review",
    "received_copy",
] as const;

export type DocumentStatusType = typeof DocumentStatusValues[number];