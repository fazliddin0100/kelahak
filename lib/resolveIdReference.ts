/** Normalize a string ID or a legacy JSON reference shape. */
export function resolveIdReference(ref: unknown): string | null {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'object' && ref !== null) {
    if ('$oid' in ref && typeof (ref as { $oid: unknown }).$oid === 'string') {
      return (ref as { $oid: string }).$oid;
    }
    if ('_id' in ref) {
      const id = (ref as { _id: unknown })._id;
      if (typeof id === 'string') return id;
      if (id && typeof id === 'object' && 'toString' in id) {
        return String(id);
      }
    }
    if ('toString' in ref && typeof ref.toString === 'function') {
      const s = ref.toString();
      if (s && s !== '[object Object]') return s;
    }
  }
  return null;
}
