import { requireApiAuth, isAuthError } from '@/lib/apiAuth';
import {
  findLetterRecipientCandidates,
  findUsersInProvinceCaseInsensitive,
} from '@/lib/db/user';
import { isCommanderRole } from '@/lib/roles';
import {
  isRoleLikeDepartment,
  isSameOrganAndProvince,
  isSameUnitAsCommander,
  normalizeUnitText,
} from '@/lib/unitPeerMatch';
import { type NextRequest, NextResponse } from 'next/server';

function normalizeRole(role: string | undefined | null): string {
  return normalizeUnitText(role ?? '').replace(/[\s_-]/g, '');
}

/** Faqat yuqori komandirlar tanlash ro‘yxatidan chiqariladi */
const TOP_COMMANDER_ROLES = new Set([
  'commander',
  'deputycommander',
  'komandir',
]);

type PeerScope = 'unit' | 'organ' | 'letter-recipients';

/** Hujjat tahriri / yuborish: joriy user viloyati va bo‘limidagi xodimlar */
export async function GET(request: NextRequest) {
  try {
    const scopeParam = request.nextUrl.searchParams.get('scope');
    const scope: PeerScope =
      scopeParam === 'organ' ? 'organ'
      : scopeParam === 'letter-recipients' ? 'letter-recipients'
      : 'unit';

    const auth = await requireApiAuth(request);
    if (isAuthError(auth)) return auth;
    const { user } = auth;


    const personal = user.personal;
    const job = user.job;
    if (!personal?.province) {
      return NextResponse.json(
        { message: 'Viloyat ma’lumoti topilmadi' },
        { status: 400 }
      );
    }

    const users =
      scope === 'letter-recipients' ?
        await findLetterRecipientCandidates(personal.province)
      : await findUsersInProvinceCaseInsensitive(personal.province);

    const anchorPersonal = {
      province: personal.province ?? '',
    };
    const anchorJob = {
      organ: job?.organ ?? '',
      department: job?.department ?? '',
    };

    const result = users
      .filter((u) => {
        const p = u.personal;
        const j = u.job;

        if (!p || !j) return false;
        if (j.isUserTrue === false) return false;

        if (scope === 'letter-recipients') {
          const isCurrentProvince =
            normalizeUnitText(p.province) ===
            normalizeUnitText(personal.province);
          return isCurrentProvince || isCommanderRole(j.role?.role);
        }

        if (scope === 'organ') {
          return isSameOrganAndProvince(
            anchorPersonal,
            anchorJob,
            { province: p.province ?? '' },
            { organ: j.organ }
          );
        }

        const roleName = normalizeRole(j.role?.role);
        if (TOP_COMMANDER_ROLES.has(roleName)) return false;
        if (isRoleLikeDepartment(j.department)) return false;

        return isSameUnitAsCommander(
          anchorPersonal,
          anchorJob,
          { province: p.province ?? '' },
          { organ: j.organ, department: j.department }
        );
      })
      .map((u) => {
        const p = u.personal!;
        const j = u.job!;
        return {
          userId: u.id,
          personal: {
            name: p.name ?? '',
            fName: p.fName ?? '',
            sName: p.sName ?? '',
            province: p.province ?? personal.province,
          },
          job: {
            position: j.position ?? '',
            organ: j.organ ?? '',
            department: j.department ?? '',
            militaryRank: j.militaryRank ?? '',
          },
          fullName: [p.fName, p.name, p.sName].filter(Boolean).join(' '),
          province: p.province ?? personal.province,
          organ: j.organ ?? job?.organ ?? '',
          department: j.department ?? job?.department ?? '',
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'uz'));

    return NextResponse.json(
      {
        users: result,
        scope,
        province: personal.province,
        organ: job?.organ ?? '',
        department: job?.department ?? '',
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Serverda xatolik';
    return NextResponse.json({ message: 'Serverda xatolik', error: message }, {
      status: 500,
    });
  }
}
