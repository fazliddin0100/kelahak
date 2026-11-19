-- Admin amallari jurnali: security_logs ga yangi tur
ALTER TYPE "SecurityEventType" ADD VALUE IF NOT EXISTS 'admin_action';
