'use client';

import { SaSectionShell } from './shared';
import { BookOpen, CheckCircle2 } from 'lucide-react';

const TASKS = [
  {
    title: 'Birinchi SuperAdmin yaratish',
    body: '.env faylga SUPERADMIN_BOOTSTRAP_KEY=... qo‘ying. /superadmin/register sahifasida kalit bilan ro‘yxatdan o‘ting.',
  },
  {
    title: 'Kotibiyat xodimlari',
    body: 'Lavozim/bo‘limda «kotibiyat» bo‘lganlar ro‘yxatdan keyin darhol /sign-in orqali /kotibiyat ga kira oladi (login/parol yetarli).',
  },
  {
    title: 'Oddiy foydalanuvchilar',
    body: 'user, komandir va boshqalar isUserTrue=true bo‘lguncha kira olmaydi. SuperAdmin «Foydalanuvchilar» bo‘limidan ruxsat beradi.',
  },
  {
    title: 'Kotibiyat paneli (/admin)',
    body: 'Tasdiqlangan adminlar ref_token bilan nomenklatura, buyruqlar va arxiv bilan ishlaydi. IP bloklash va xavfsizlik monitoringi faqat SuperAdmin «Xavfsizlik» bo‘limida.',
  },
  {
    title: 'Komandir va foydalanuvchi panellari',
    body: 'Komandir: /komandir — kelgan hujjatlar, navbat bilan yuborish. User: /user — shaxsiy hujjatlar.',
  },
  {
    title: 'Xavfsizlik',
    body: '«Xavfsizlik» bo‘limida shubhali/bot IP larni «Bloklash» tugmasi bilan to‘sing — middleware barcha API larda rad etadi. Faqat ro‘yxatdan o‘tgan foydalanuvchi token/ref_token bilan API ga kira oladi.',
  },
];

export default function SuperAdminGuide() {
  return (
    <SaSectionShell
      title="SuperAdmin qo‘llanmasi"
      description="Ushbu sayt uchun bajariladigan asosiy vazifalar"
      icon={BookOpen}
      iconClassName="bg-slate-100 text-[#102c50]">
      <ol className="space-y-4 p-6">
        {TASKS.map((t, i) => (
          <li
            key={t.title}
            className="flex gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#102c50] text-sm font-bold text-white">
              {i + 1}
            </span>
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-slate-800">
                <CheckCircle2 className="size-4 text-[#102c50]" />
                {t.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {t.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </SaSectionShell>
  );
}
