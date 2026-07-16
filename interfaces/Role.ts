import type { DbRole } from '@/lib/roles';

export interface RoleInterface {
  role: DbRole;
  province: string;
  permissions: string[];
  createdAt?: Date;
  updatedAt?: Date;
}
