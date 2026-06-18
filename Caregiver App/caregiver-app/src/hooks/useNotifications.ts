import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export type AppNotification = {
  id: number;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  data: { bookingId?: number } | null;
  createdAt: string;
};

export function useNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.data.notifications as AppNotification[];
    },
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 15000 : false,
  });
}
