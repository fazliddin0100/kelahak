/** F.I.Sh. ni hujjat uchun qisqa ko'rinishga keltirish: "R.R. Raximov" */

function isPatronymicPart(part: string): boolean {
  return /(?:ovich|evich|ovna|evna|ogli|ogly|qizi)$/i.test(part.trim().replace(/['‘’ʻʼ`]/g, ''));
}

/** O'zbek/rus familiya qo'shimchalari: Raximov, Aliyeva, Karimova, Navoiy, Toshpo'latov ... */
function isSurnamePart(part: string): boolean {
  return /(?:ov|ev|yov|yev|ova|eva|yova|yeva|iy|skiy|skaya)$/i.test(part.trim().replace(/[.,]$/, ''));
}

/**
 * Birinchi so'z familiyami? Avval familiya qo'shimchasi bo'yicha; ikkalasi ham (yoki hech biri)
 * mos kelsa — ism va ota ismi bosh harfi bo'yicha; aniqlab bo'lmasa tizimning asosiy tartibi
 * (Familiya Ism Sharif).
 */
function surnameComesFirst(a: string, b: string, patronymic: string): boolean {
  const aSur = isSurnamePart(a);
  const bSur = isSurnamePart(b);
  if (aSur !== bSur) return aSur;
  const p = patronymic.charAt(0).toLowerCase();
  const aSame = a.charAt(0).toLowerCase() === p;
  const bSame = b.charAt(0).toLowerCase() === p;
  if (aSame !== bSame) return bSame; // ism ota ismi bilan bir xil harfdan boshlanadi
  return true;
}

export function formatShortName(fullName?: string): string {
  if (!fullName?.trim()) return '';
  const twoLetterPrefixes = ['Sh', 'Ch', 'Dj', 'Zh', 'Kh'];
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0];
  }

  const fmt = (part: string) =>
    !part ? ''
    : twoLetterPrefixes.includes(part.substring(0, 2)) ? part.substring(0, 2)
    : part.charAt(0).toUpperCase();

  // Qisqa ko'rinish: Ism + Ota ismi bosh harfi, Familiya to'liq: "R.R. Raximov".
  // Tizimda F.I.Sh. ikki tartibda uchraydi ("Raximov Raxim Raximovich" va eski
  // "Raxim Raximov Raximovich"), shuning uchun familiya qo'shimchasidan aniqlanadi.
  if (parts.length >= 3) {
    const a = parts[0] ?? '';
    const b = parts[1] ?? '';
    const otaLast = parts[parts.length - 1] ?? '';

    if (isPatronymicPart(otaLast)) {
      const familiyaFirst = surnameComesFirst(a, b, parts[2] ?? otaLast);
      const familiya = familiyaFirst ? a : b;
      const ism = familiyaFirst ? b : a;
      const otaInitial = fmt(parts.slice(2).join(' '));
      const ismInitial = fmt(ism);
      return otaInitial ?
          `${ismInitial}.${otaInitial}. ${familiya}`.trim()
        : `${ismInitial}. ${familiya}`.trim();
    }
  }

  if (parts.length === 2) {
    const [a, b] = parts;
    // "Familiya Ism" yoki "Ism Familiya"
    return isSurnamePart(a) && !isSurnamePart(b) ? `${fmt(b)}. ${a}`.trim() : `${fmt(a)}. ${b}`.trim();
  }

  return fullName.trim();
}
