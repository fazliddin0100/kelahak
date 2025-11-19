// hooks/useDepartments.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Department {
  _id: string;
  province: string;
  bolinma: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface DepartmentsResponse {
  message: string;
  bolinmalar: Department[];
}

export const useDepartments = () => {
  return useQuery<Department[], Error>({
    queryKey: ['bolinmalar'],
    queryFn: async () => {
      const response = await api('/api/nameklatura/get-bolinma', {
        method: 'GET',
      });

      const data = (await response.json()) as DepartmentsResponse;
      return data.bolinmalar ?? [];
    },
    // cache ni butunlay o‘chirib tashlash
    staleTime: 0,
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};
