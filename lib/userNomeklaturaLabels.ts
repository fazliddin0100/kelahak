export type UserNomeklaturaRelation =
  | 'creator'
  | 'owner'
  | 'author'
  | 'document';

export const USER_NOMEKLATURA_RELATION_LABEL: Record<
  UserNomeklaturaRelation,
  string
> = {
  creator: 'Siz yaratgansiz',
  owner: 'Javobgar',
  author: 'Javobgar (muallif)',
  document: 'Hujjat orqali biriktirilgan',
};
