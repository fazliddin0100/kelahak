import { useEffect, useState } from 'react';
import { IUserPopulated } from '@/types/user';

export const useKotibiyatUsers = () => {
  const [users, setUsers] = useState<IUserPopulated[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/users/kotibiyat');
        const json = await res.json();
        setUsers(json.users || []);
      } catch (err) {
        console.error('Failed to fetch kotibiyat users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { users, loading };
};
