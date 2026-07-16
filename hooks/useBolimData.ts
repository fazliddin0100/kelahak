// hooks/useBuxoroOrgans.ts
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

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
      const bolimlar = data.bolimlar ?? [];
      return bolimlar;
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 1,
  });
};
