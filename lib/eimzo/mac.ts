/**
 * Kompyuterning MAC manzili (E-IMZO sertifikatiga yoziladi).
 * Brauzer MAC ni o'qiy olmaydi — superadmin user kompyuteridagi `ipconfig /all`
 * («Physical Address») qiymatini qo'lda kiritadi.
 */

/** MAC sertifikatdagi serialNumber (2.5.4.5) maydonida saqlanadi */
export const MAC_OID = '2.5.4.5';

/** «aa:bb:cc:dd:ee:ff», «AA-BB-…», «aabb.ccdd.eeff» → «AA-BB-CC-DD-EE-FF»; noto'g'ri bo'lsa null */
export function normalizeMac(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const hex = input.trim().replace(/[\s:.-]/g, '').toUpperCase();
  if (!/^[0-9A-F]{12}$/.test(hex)) return null;
  if (hex === '000000000000' || hex === 'FFFFFFFFFFFF') return null;
  // Multicast manzil (birinchi baytning eng kichik biti 1) — tarmoq kartasiga tegishli emas
  if (parseInt(hex.slice(0, 2), 16) & 1) return null;
  return hex.match(/.{2}/g)!.join('-');
}

/** Sertifikat subject matnidan («serialNumber=AA-BB-…») MAC ni oladi */
export function macFromSubject(subject: string): string {
  const m = /(?:^|[\n,]\s*)serialNumber=([0-9A-F-]{17})/i.exec(subject);
  return m ? m[1].toUpperCase() : '';
}
