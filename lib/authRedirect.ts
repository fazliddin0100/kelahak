import { isCommanderRole } from '@/lib/roles';

export function getPostLoginPath(data: {
  department?: string | null;
  role?: string | null;
}): string {
  if (data.department === 'kotibiyat' && data.role === 'admin') {
    return '/kotibiyat';
  }
  if (data.department === 'komandir' || isCommanderRole(data.role ?? '')) {
    return '/komandir';
  }
  if (data.role === 'superAdmin') {
    return '/superadmin/panel';
  }
  return '/user';
}
