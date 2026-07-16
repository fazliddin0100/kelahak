// @/helpers/detectRole.ts

/** Matnni solishtirish uchun normallashtirish */
function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/ў/g, "o'")
    .replace(/о‘/g, "o'")
    .replace(/оʻ/g, "o'")
    .replace(/қ/g, 'q')
    .replace(/ғ/g, 'g')
    .replace(/ҳ/g, 'h')
    .replace(/’/g, "'")
    .replace(/‘/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * So‘z yoki iborani butun so‘z sifatida qidirish (boshqarma ≠ bosh).
 * Qisqa tokenlar (≤4) uchun word-boundary majburiy.
 */
function hasPhrase(text: string, phrase: string): boolean {
  const t = normalizeText(text);
  const q = normalizeText(phrase);
  if (!q) return false;

  if (q.length <= 4) {
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      `(?:^|[\\s,./(\\[]|-)${escaped}(?:$|[\\s,./)\\]]|-)`,
      'i'
    );
    return re.test(t);
  }

  return t.includes(q);
}

function hasAnyPhrase(text: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => hasPhrase(text, phrase));
}

/** Kadrlar, moliya va h.k. — hujjat komandir oqimiga kirmaydi */
const ADMINISTRATIVE_UNIT_PHRASES = [
  'kadrlar',
  'kadr bolimi',
  'kadr xizmati',
  'buxgalteriya',
  'moliya',
  'moliyaviy',
  'axborot',
  'matbuot',
  'tibbiyot',
  'shifoxona',
  'tibbiy',
  'oshxona',
  'taminot',
  'logistika',
  'transport',
  "xo'jalik",
  'xojalik',
  'yuridik',
  'huquqiy',
  'audit',
  'arxiv',
  'tarjima',
  'talim',
  "o'quv",
  'profilaktika',
  'psixolog',
  'maishiy',
  'kommunal',
  'ijtimoiy',
  'maorif',
] as const;

/** Harbiy qism / bo‘lim boshlig‘i — komandir paneli */
const MILITARY_OPERATIONAL_PHRASES = [
  'harbiy',
  'qism',
  'qarang',
  'brigada',
  'batalyon',
  'rota',
  'vzvod',
  'otryad',
  "qo'mondonlik",
  'komandirlik',
  'nazorat',
  'operativ',
  'razvedka',
  'maxsus',
  'chegara',
  'garnizon',
] as const;

function isAdministrativeUnit(text: string): boolean {
  return hasAnyPhrase(text, ADMINISTRATIVE_UNIT_PHRASES);
}

type RoleFlags = {
  isCommander: boolean;
  isDeputyCommander: boolean;
  isChief: boolean;
  isDeputy: boolean;
  isDepartmentHead: boolean;
  isBrigade: boolean;
  isBattalion: boolean;
  isCompany: boolean;
  isOfficer: boolean;
  isSergeant: boolean;
  isSoldier: boolean;
  isStaff: boolean;
};

function collectRoleFlags(p: string): RoleFlags {
  const isCommander = hasAnyPhrase(p, [
    "qo'mondon",
    'qomondon',
    "bosh qo'mondon",
    'komandir',
    'komandiri',
    'xizmat raisi',
    'hokimiyat raisi',
    'tuman raisi',
    'viloyat raisi',
    'командир',
    'командири',
    'генерал',
    'general',
    'generali',
    'qism komandiri',
    'harbiy qisim komandiri',
    'brigada komandiri',
    'batalyon komandiri',
  ]);

  const isDeputyCommander = hasAnyPhrase(p, [
    "qo'mondon o'rinbosari",
    "komandir o'rinbosari",
    "komandiri o'rinbosari",
    "qo'mondonning o'rinbosari",
    'qomondon orinbosari',
    'заместитель командира',
    'замком',
    "o'rinbosar komandir",
    "orinbosar qo'mondon",
  ]);

  const isChief = hasAnyPhrase(p, [
    'boshliq',
    "boshlig'i",
    'boshligi',
    'бошлиғи',
    'начальник',
    'руководитель',
    "bo'lim boshlig",
    'bolim boshlig',
    "bo'lim boshlig'i",
  ]);

  const isDeputy = hasAnyPhrase(p, [
    "o'rinbosar",
    'orinbosar',
    'уринбосар',
    'заместитель',
    "o'rinbosari",
    "bo'lim boshlig'i o'rinbosar",
    'bolim boshlig\'i orinbosar',
  ]);

  const isDepartmentHead = hasAnyPhrase(p, [
    "bo'lim boshlig",
    'bolim boshlig',
    "bo'lim boshlig'i",
    'bolim boshligi',
    "bo'lim boshlig'i",
  ]);

  const isBrigade = hasAnyPhrase(p, ['brigada', 'бригада']);
  const isBattalion = hasAnyPhrase(p, ['batalyon', 'батальон']);
  const isCompany = hasAnyPhrase(p, ['rota', 'рота', 'vzvod', 'взвод']);

  const isOfficer = hasAnyPhrase(p, [
    'ofitser',
    'офицер',
    'leytenant',
    'letenant',
    'kapitan',
    'mayor',
    'podpolkovnik',
    'polkovnik',
    'kichik leytenant',
    'katta leytenant',
    'starshiy leytenant',
  ]);

  const isSergeant = hasAnyPhrase(p, [
    'serjant',
    'сержант',
    'yefreyt',
    'yefreitor',
    'ефрейтор',
    'kichik serjant',
    'katta serjant',
    'starshina',
    'praporshik',
  ]);

  const isSoldier = hasAnyPhrase(p, [
    'askar',
    'soldat',
    'солдат',
    'xizmatchi',
    'ryadovoy',
    'рядовой',
  ]);

  const isStaff =
    hasAnyPhrase(p, [
      'mutaxassis',
      'mutaxassislik',
      'xodim',
      'ishchi',
      'kotib',
      'hisobchi',
      'dasturchi',
      'operator',
      'haydovchi',
      'texnik',
      'navbatchi',
    ]) && !isCommander && !isDeputyCommander && !isChief;

  return {
    isCommander,
    isDeputyCommander,
    isChief,
    isDeputy,
    isDepartmentHead,
    isBrigade,
    isBattalion,
    isCompany,
    isOfficer,
    isSergeant,
    isSoldier,
    isStaff,
  };
}

function isMilitaryOperationalContext(p: string, flags: RoleFlags): boolean {
  if (flags.isCommander || flags.isDeputyCommander) return true;
  if (flags.isBrigade || flags.isBattalion || flags.isCompany) return true;
  if (hasAnyPhrase(p, MILITARY_OPERATIONAL_PHRASES)) return true;
  return false;
}

/** Bo‘lim boshlig‘i — faqat harbiy/operativ bo‘limlar uchun komandir paneli */
function resolveDepartmentLeaderRole(
  p: string,
  flags: RoleFlags,
  deputy: boolean
): string {
  if (isAdministrativeUnit(p)) {
    return 'user';
  }
  if (!isMilitaryOperationalContext(p, flags)) {
    return 'user';
  }
  return deputy ? 'departmentDeputy' : 'departmentCommander';
}

/**
 * Lavozim, bo‘lim va unvon bo‘yicha rol aniqlash.
 * Ro‘yxatdan o‘tishda: detectRole(position, department, militaryRank)
 */
export function detectRole(
  position: string,
  department = '',
  militaryRank = ''
): string {
  const combined = [position, department, militaryRank].filter(Boolean).join(' ').trim();
  if (!combined) return 'user';

  const p = normalizeText(combined);
  const flags = collectRoleFlags(p);

  // ------------------- KOTIBIYAT / SECRETARIAT ------------------- //
  if (
    hasAnyPhrase(p, [
      'kotibiyat',
      'kotibiyati',
      'kotib',
      'kotibi',
      'котибият',
      'котибияти',
      'сектретариат',
      'секретариат',
      'секретарь',
      'делопроизводитель',
    ])
  ) {
    return 'admin';
  }

  // Oddiy xizmatchi / mutaxassis
  if (flags.isSoldier || flags.isSergeant || flags.isStaff) {
    return 'user';
  }

  // Ofitser unvoni, lekin komandir lavozimi yo‘q
  if (
    flags.isOfficer &&
    !flags.isCommander &&
    !flags.isDeputyCommander &&
    !flags.isChief &&
    !flags.isDepartmentHead
  ) {
    return 'user';
  }

  // Administrativ bo‘lim (kadrlar, moliya, …) — doim oddiy user
  if (
    isAdministrativeUnit(p) &&
    !flags.isCommander &&
    !flags.isDeputyCommander
  ) {
    return 'user';
  }

  if (flags.isDeputyCommander) return 'deputyCommander';

  if (
    flags.isCommander &&
    (flags.isBrigade || flags.isBattalion || flags.isCompany)
  ) {
    return 'commander';
  }

  if (flags.isCommander) return 'commander';

  if (flags.isDepartmentHead) {
    return resolveDepartmentLeaderRole(p, flags, false);
  }

  if (
    flags.isDeputy &&
    hasAnyPhrase(p, [
      "bo'lim boshlig'i o'rinbosar",
      'bolim boshligi orinbosar',
      "bo'lim boshlig",
    ])
  ) {
    return resolveDepartmentLeaderRole(p, flags, true);
  }

  if (flags.isChief) {
    return resolveDepartmentLeaderRole(p, flags, false);
  }

  return 'user';
}
