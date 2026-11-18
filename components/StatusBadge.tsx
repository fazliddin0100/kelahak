import { cn } from '@/lib/utils';

const NEUTRAL = 'bg-slate-100 text-slate-600 ring-slate-200';
const NEW = 'bg-sky-100 text-sky-700 ring-sky-200';
const WARN = 'bg-amber-100 text-amber-700 ring-amber-200';
const OK = 'bg-emerald-100 text-emerald-700 ring-emerald-200';
const MOVE = 'bg-violet-100 text-violet-700 ring-violet-200';
const WORK = 'bg-indigo-100 text-indigo-800 ring-indigo-200';
const BAD = 'bg-red-100 text-red-700 ring-red-200';

/** Hujjat holati: foydalanuvchiga ko'rinadigan nom va rang. */
const STATUS: Record<string, { label: string; tone: string }> = {
  yangi: { label: 'Yangi', tone: NEW },
  created: { label: 'Yaratildi', tone: NEW },
  signed: { label: 'Imzolangan', tone: WARN },
  registered: { label: 'Ro‘yxatga olindi', tone: OK },
  qabul_qilindi: { label: 'Qabul qilindi', tone: 'bg-teal-100 text-teal-800 ring-teal-200' },
  ishjildda: { label: 'Ish jildda', tone: WORK },
  imzolandi: { label: 'Tasdiqlandi', tone: OK },
  'rad etildi': { label: 'Rad etildi', tone: BAD },
  arxivlangan: { label: 'Arxivda', tone: NEUTRAL },
  forwarded: { label: 'Yuborildi', tone: MOVE },
  resolved: { label: 'Bajarildi', tone: OK },
  replied: { label: 'Javob berildi', tone: OK },
  deleted: { label: 'O‘chirilgan', tone: NEUTRAL },
  in_progress: { label: 'Ishlanmoqda', tone: WORK },
  in_review: { label: 'Ko‘rib chiqilmoqda', tone: WARN },
  in_reviewed: { label: 'Ko‘rib chiqildi', tone: OK },
  in_progress_review: { label: 'Ko‘rib chiqilmoqda', tone: WARN },
  in_progress_reviewed: { label: 'Ko‘rib chiqildi', tone: WORK },
  in_progress_forward: { label: 'Yo‘naltirilmoqda', tone: MOVE },
  in_progress_resolve: { label: 'Hal qilinmoqda', tone: WORK },
  in_progress_reply: { label: 'Javob tayyorlanmoqda', tone: WORK },
  in_progress_forward_review: { label: 'Yo‘naltirilmoqda', tone: MOVE },
  in_progress_resolve_review: { label: 'Hal qilinmoqda', tone: WORK },
  in_progress_reply_review: { label: 'Javob tayyorlanmoqda', tone: WORK },
  received_copy: { label: 'Nusxa qabul qilindi', tone: 'bg-teal-100 text-teal-800 ring-teal-200' },
};

export function getStatusLabel(status?: string | null) {
  if (!status) return 'Nomaʼlum';
  return STATUS[status]?.label ?? status.replace(/_/g, ' ');
}

export default function StatusBadge({
  status,
  className,
}: {
  status?: string | null;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        (status && STATUS[status]?.tone) || NEUTRAL,
        className
      )}>
      {getStatusLabel(status)}
    </span>
  );
}
