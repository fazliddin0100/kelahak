/** Bir martalik E-IMZO paketining ilova darajasidagi shifrlash konteksti (AAD) */
export function packageContext(id: string): string {
  return `eimzo_pkg_${id}`;
}
