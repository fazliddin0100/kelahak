/** Viloyat / organ / bo‘lim matnlarini solishtirish uchun */
export function normalizeUnitText(value: string | undefined | null): string {
  if (!value) return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/[''ʻ`’]/g, "'")
    .replace(/\s+/g, ' ');
}

const ROLE_LIKE_DEPARTMENTS = new Set([
  'komandir',
  'commander',
  'kotibiyat',
  'admin',
  'user',
  'superadmin',
]);

export function isRoleLikeDepartment(department: string | undefined | null): boolean {
  return ROLE_LIKE_DEPARTMENTS.has(normalizeUnitText(department));
}

type PeerJob = {
  organ?: string;
  department?: string;
  isUserTrue?: boolean;
};

type PeerPersonal = {
  province?: string;
};

/** Komandir bilan bir xil «joy»da (viloyat + organ yoki bo‘lim) */
export function isSameUnitAsCommander(
  commanderPersonal: PeerPersonal,
  commanderJob: PeerJob,
  targetPersonal: PeerPersonal,
  targetJob: PeerJob
): boolean {
  const cmdProvince = normalizeUnitText(commanderPersonal.province);
  const tgtProvince = normalizeUnitText(targetPersonal.province);
  if (!cmdProvince || cmdProvince !== tgtProvince) return false;

  const cmdOrgan = normalizeUnitText(commanderJob.organ);
  const tgtOrgan = normalizeUnitText(targetJob.organ);
  const cmdDept = normalizeUnitText(commanderJob.department);
  const tgtDept = normalizeUnitText(targetJob.department);

  if (cmdOrgan && tgtOrgan && cmdOrgan === tgtOrgan) return true;

  if (!isRoleLikeDepartment(commanderJob.department) && cmdDept && cmdDept === tgtDept) {
    return true;
  }

  return false;
}

/** Bir xil viloyat va organ (bo‘limdan qat’i nazar) */
export function isSameOrganAndProvince(
  anchorPersonal: PeerPersonal,
  anchorJob: Pick<PeerJob, 'organ'>,
  targetPersonal: PeerPersonal,
  targetJob: Pick<PeerJob, 'organ'>
): boolean {
  const anchorProvince = normalizeUnitText(anchorPersonal.province);
  const targetProvince = normalizeUnitText(targetPersonal.province);
  if (!anchorProvince || anchorProvince !== targetProvince) return false;

  const anchorOrgan = normalizeUnitText(anchorJob.organ);
  const targetOrgan = normalizeUnitText(targetJob.organ);
  if (!anchorOrgan || !targetOrgan) return false;

  return anchorOrgan === targetOrgan;
}
