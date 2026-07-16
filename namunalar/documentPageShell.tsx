import type { ReactNode } from 'react';

/** `embedded`: document-open da bir qator — tashqi fon va min-h-screen yo‘q */
export function DocumentPageShell({
  children,
  embedded,
  outerClassName = 'flex flex-col justify-center items-center min-h-screen bg-gray-100 pt-[75px] pb-[30px] overflow-x-hidden',
}: {
  children: ReactNode;
  embedded?: boolean;
  outerClassName?: string;
}) {
  if (embedded) {
    return <>{children}</>;
  }
  return <div className={outerClassName}>{children}</div>;
}
