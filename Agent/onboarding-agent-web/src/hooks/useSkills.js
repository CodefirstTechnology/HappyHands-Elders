import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

export function useSkills() {
  return useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const res = await api.get('/skills')
      return res.data.data.skills
    },
    staleTime: 5 * 60 * 1000,
  })
}
