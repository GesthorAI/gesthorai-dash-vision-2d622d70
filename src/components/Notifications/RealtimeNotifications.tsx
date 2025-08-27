import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Bell, Users, TrendingUp, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Notification {
  id: string;
  type: 'new_leads' | 'search_completed' | 'status_update' | 'high_score_lead';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  leadCount?: number;
  searchId?: string;
}

export const RealtimeNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Listen to leads table changes
    const leadsChannel = supabase
      .channel('leads-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const lead = payload.new;
          
          const notification: Notification = {
            id: `lead-${lead.id}`,
            type: lead.score >= 8 ? 'high_score_lead' : 'new_leads',
            title: lead.score >= 8 ? 'Lead de Alta Qualidade!' : 'Novo Lead Captado',
            message: lead.score >= 8 
              ? `${lead.name} (${lead.business}) - Score: ${lead.score}`
              : `${lead.name} de ${lead.business}`,
            timestamp: new Date().toISOString(),
            read: false,
            leadCount: 1
          };

          setNotifications(prev => [notification, ...prev.slice(0, 49)]);
          setUnreadCount(prev => prev + 1);

          // Show toast notification
          toast.success(notification.title, {
            description: notification.message,
            action: {
              label: "Ver Lead",
              onClick: () => {
                // Navigate to lead details
              }
            }
          });
        }
      )
      .subscribe();

    // Listen to searches table changes
    const searchesChannel = supabase
      .channel('searches-notifications')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'searches',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const search = payload.new;
          
          if (search.status === 'concluida') {
            const notification: Notification = {
              id: `search-${search.id}`,
              type: 'search_completed',
              title: 'Busca Concluída!',
              message: `${search.total_leads} leads encontrados para ${search.niche} em ${search.city}`,
              timestamp: new Date().toISOString(),
              read: false,
              leadCount: search.total_leads,
              searchId: search.id
            };

            setNotifications(prev => [notification, ...prev.slice(0, 49)]);
            setUnreadCount(prev => prev + 1);

            toast.success(notification.title, {
              description: notification.message,
              action: {
                label: "Ver Leads",
                onClick: () => {
                  // Navigate to leads with search filter
                }
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(searchesChannel);
    };
  }, [user]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
    setUnreadCount(0);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'new_leads':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'search_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'high_score_lead':
        return <TrendingUp className="h-4 w-4 text-yellow-500" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-hidden z-50 shadow-lg">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Notificações</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Marcar todas como lidas
                </Button>
              )}
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma notificação ainda</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b cursor-pointer hover:bg-muted/50 ${
                    !notification.read ? 'bg-blue-50/50' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    {getIcon(notification.type)}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${!notification.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.timestamp).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
};