// hooks/useBuxoroOrgans.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

interface Bolim {
  _id: string;
  province: string;
  bolim: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface BolimlarResponse {
  message: string;
  bolimlar: Bolim[];
}

export const useBolimlar = () => {
  return useQuery<Bolim[], Error>({
    queryKey: ['bolimlar'],
    queryFn: async () => {
      const response = await api('/api/nameklatura/get-bolim', {
        method: 'GET',
      });

      const data = (await response.json()) as BolimlarResponse;
      return data.bolimlar ?? [];
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  });
};
