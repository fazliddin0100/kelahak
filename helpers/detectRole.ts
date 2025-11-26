export function detectRole(position: string): string {
  if (!position) return 'user';

  const pos = position.toLowerCase();

  const p = pos
    .replace(/ў/g, "o'")
    .replace(/о‘/g, "o'")
    .replace(/оʻ/g, "o'")
    .replace(/қ/g, 'q')
    .replace(/ғ/g, 'g')
    .replace(/’/g, "'")
    .replace(/‘/g, "'");

  // ------------------- KOTIBIYAT / SECRETARIAT ------------------- //

  const isSecretariat = [
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
    'hujjat', // hujjat bilan ishlovchi xodimlar
  ].some((w) => p.includes(w));

  if (isSecretariat) return 'admin';

  // ------------------- KALIT SO‘ZLAR (HARBIY) ------------------- //

  const isCommander = [
    "qo'mondon",
    'qomondon',
    'rais',
    'raisi',
    'xizmat raisi',
    'раис',
    'раиси',
    'командири',
    'komandiri',
    'komandir',
    'komanduyushchego',
    'начальник службы',
    "bosh qo'mondon",
    'general',
    'generali',
  ].some((w) => p.includes(w));

  const isDeputyCommander = [
    "qo'mondon o'rinbosari",
    "komandiri o'rinbosari",
    "boshlig’i o'rinbosari",
    'qomondon orinbosari',
    'заместитель командира',
    'замком',
    "o'rinbosar qo'mondon",
    "orinbosar qo'mondon",
  ].some((w) => p.includes(w));

  const isChief = [
    'boshliq',
    'boshlig’i',
    'бошлиғи',
    'начальник',
    'руководитель',
  ].some((w) => p.includes(w));

  const isDeputy = [
    "o'rinbosar",
    'orinbosar',
    'у̀ринбосар',
    'заместитель',
    'зам',
  ].some((w) => p.includes(w));

  const isDepartment = ["bo'lim", 'bolim', 'bo‘lim', 'бўлим', 'отдел'].some(
    (w) => p.includes(w)
  );

  const isBrigade = ['brigada', 'бригада'].some((w) => p.includes(w));

  const isBattalion = ['batalyon', 'батальон'].some((w) => p.includes(w));

  const isCompany = ['rota', 'рота', 'vzvod', 'vzbod', 'взвод'].some((w) =>
    p.includes(w)
  );

  const isSeniorOfficer = [
    'katta ofitser',
    'senior officer',
    'старший офицер',
  ].some((w) => p.includes(w));

  const isOfficer = [
    'ofitser',
    'офицер',
    'лейтенант',
    'капитан',
    'major',
    'mayor',
    'майор',
    'podpolkovnik',
    'подполковник',
    'polkovnik',
    'полковник',
  ].some((w) => p.includes(w));

  const isSergeant = [
    'serjant',
    'сержант',
    'солдат-сержант',
    'yeldor',
    'yeldosh',
    'ефрейтор',
  ].some((w) => p.includes(w));

  const isSoldier = [
    'askar',
    'soldat',
    'солдат',
    'harbiy xizmatchi',
    'служащий',
  ].some((w) => p.includes(w));

  // ------------------- ROLE ANIQLASH QOIDALARI ------------------- //

  // 1. Bosh qo‘mondonlar (General, Korpus qo‘mondoni)
  if (
    isCommander &&
    (p.includes('bosh') || p.includes('general') || p.includes('raisi'))
  ) {
    return 'commander';
  }

  // 2. Otryad, brigada, batalyon qo‘mondoni
  if (isCommander && (isBrigade || isBattalion || isCompany)) {
    return 'commander';
  }

  // 3. Qo‘mondon o‘rinbosari
  if (isDeputyCommander) return 'deputyCommander';

  // 4. Harbiy bo‘lim boshlig‘i (Начальник отдела)
  if (isChief && isDepartment) return 'departmentCommander';

  // 5. Harbiy bo‘lim boshlig‘i o‘rinbosari
  if (isDeputy && isDepartment) return 'departmentDeputy';

  // 6. Harbiy boshqarma (Начальник управления)
  if (isChief && !isDepartment && !isDeputy) return 'commander';

  // 7. Boshqarma boshlig‘i o‘rinbosari
  if (isChief && isDeputy) return 'deputyCommander';

  // 8. Katta ofitser
  if (isSeniorOfficer) return 'user';

  // 9. Oddiy ofitserlar
  if (isOfficer) return 'user';

  // 10. Serjantlar
  if (isSergeant) return 'user';

  // 11. Oddiy askarlar / harbiy xizmatchilar
  if (isSoldier) return 'user';

  // 12. Default
  return 'user';
}
