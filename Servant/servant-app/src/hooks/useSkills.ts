import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export type Skill = {
  id: number;
  code: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
};

export function useSkills() {
  return useQuery({
    queryKey: ['skills', 'public'],
    queryFn: async () => {
      const res = await api.get('/skills/public');
      const list = res.data?.data?.skills;
      if (!Array.isArray(list)) {
        throw new Error('Invalid skills response');
      }
      return list as Skill[];
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
