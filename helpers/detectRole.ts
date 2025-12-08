// @/helpers/detectRole.ts

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
    .replace(/‘/g, "'")
    .replace(/\s+/g, ' ') // ortiqcha bo‘shliqlarni tozalash
    .trim();

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
    'hujjat',
  ].some((w) => p.includes(w));

  if (isSecretariat) return 'admin';

  // ------------------- KALIT SO‘ZLAR ------------------- //
  const isCommander = [
    "qo'mondon",
    'qomondon',
    'komandir',
    'komandiri',
    'rais',
    'raisi',
    'xizmat raisi',
    'раис',
    'раиси',
    'командир',
    'командири',
    'командири',
    "bosh qo'mondon",
    'general',
    'generali',
    'qism komandiri',
    'harbiy qisim komandiri',
  ].some((w) => p.includes(w));

  const isDeputyCommander = [
    "qo'mondon o'rinbosari",
    "komandir o'rinbosari",
    "komandiri o'rinbosari",
    "qo'mondonning o'rinbosari",
    'qomondon orinbosari',
    'заместитель командира',
    'замком',
    "o'rinbosar komandir",
    "orinbosar qo'mondon",
  ].some((w) => p.includes(w));

  const isChief = [
    'boshliq',
    'boshlig‘i',
    'бошлиғи',
    'начальник',
    'руководитель',
    'bosh',
  ].some((w) => p.includes(w));

  const isDeputy = [
    "o'rinbosar",
    'orinbosar',
    'у̀ринбосар',
    'заместитель',
    'зам',
    "o'rinbosari",
  ].some((w) => p.includes(w));

  const isDepartment = ["bo'lim", 'bolim', 'bo‘lim', 'бўлим', 'отдел'].some(
    (w) => p.includes(w)
  );
  const isBrigade = ['brigada', 'бригада'].some((w) => p.includes(w));
  const isBattalion = ['batalyon', 'батальон'].some((w) => p.includes(w));
  const isCompany = ['rota', 'рота', 'vzvod', 'взвод'].some((w) =>
    p.includes(w)
  );

  // ------------------- ROLE ANIQLASH QOIDALARI ------------------- //

  // 1. Qo‘mondon o‘rinbosari (avval, chunki "komandir" so‘zini o‘z ichiga oladi)
  if (isDeputyCommander) return 'deputyCommander';

  // 2. Brigada, batalyon, yoki rota komandirlari
  if (isCommander && (isBrigade || isBattalion || isCompany))
    return 'commander';

  // 3. Boshqa komandirlar (masalan, harbiy qisim komandiri)
  if (isCommander) return 'commander';

  // 4. Bo‘lim boshlig‘i
  if (isChief && isDepartment) return 'departmentCommander';

  // 5. Bo‘lim boshlig‘i o‘rinbosari
  if (isDeputy && isDepartment) return 'departmentDeputy';

  // 6. Oddiy boshliq (bo‘limsiz ham yuqori lavozim)
  if (isChief) return 'commander';

  // 7. Ofitserlar, serjantlar, askarlar → oddiy user
  const isOfficer = [
    'ofitser',
    'офицер',
    'leytenant',
    'kapitan',
    'mayor',
    'podpolkovnik',
    'polkovnik',
  ].some((w) => p.includes(w));

  const isSergeant = ['serjant', 'сержант', 'yefreyt', 'ефрейтор'].some((w) =>
    p.includes(w)
  );
  const isSoldier = ['askar', 'soldat', 'солдат', 'xizmatchi'].some((w) =>
    p.includes(w)
  );

  if (isOfficer || isSergeant || isSoldier) return 'user';

  // 8. Agar hech narsa topilmasa
  return 'user';
}
