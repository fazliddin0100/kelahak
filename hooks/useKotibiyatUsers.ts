import { useEffect, useState } from 'react';
import { IUserPopulated } from '@/types/user';

export const useKotibiyatUsers = () => {
  const [users, setUsers] = useState<IUserPopulated[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('/api/users/kotibiyat', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
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
