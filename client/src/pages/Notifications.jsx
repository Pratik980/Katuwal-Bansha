import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAllNotifications,
} from '../api/notifications';
import Button from '../components/Button';
import { formatDistanceToNow } from 'date-fns';
import { CheckIcon, TrashIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BellIcon, CurrencyDollarIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../context/LanguageContext';

const PAGE_SIZE = 20;

// The list refreshes itself: SocketContext reloads these queries whenever a
// notification is added, read or deleted, here or by someone else.
const Notifications = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', page],
    queryFn: () => getNotifications({ page, limit: PAGE_SIZE }),
    placeholderData: (previous) => previous,
  });

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread', 'list'],
    queryFn: () => getNotifications({ limit: 1, isRead: false }),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
  };

  const markAsReadMutation = useMutation({ mutationFn: markAsRead, onSuccess: refresh });
  const markAllAsReadMutation = useMutation({ mutationFn: markAllAsRead, onSuccess: refresh });
  const deleteMutation = useMutation({ mutationFn: deleteNotification, onSuccess: refresh });
  const deleteManyMutation = useMutation({
    mutationFn: deleteAllNotifications,
    onSuccess: () => {
      setPage(1);
      refresh();
    },
  });

  const notifications = data?.data || [];
  const total = data?.pagination?.total || 0;
  const pages = Math.max(1, data?.pagination?.pages || 1);
  const unreadCount = unreadData?.pagination?.total || 0;

  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);

  const handleDeleteRead = () => {
    if (window.confirm(t('delete_read_confirm'))) deleteManyMutation.mutate({ isRead: true });
  };

  const handleDeleteAll = () => {
    if (window.confirm(t('delete_all_confirm'))) deleteManyMutation.mutate({});
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'donation_added':
        return <CurrencyDollarIcon className="h-6 w-6 text-green-500" />;
      case 'member_added':
      case 'member_updated':
        return <UserGroupIcon className="h-6 w-6 text-blue-500" />;
      default:
        return <BellIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('notifications')}</h1>
          <p className="text-gray-600">
            {t('notifications_subtitle')}
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                {unreadCount} {t('unread')}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCircleIcon className="h-4 w-4 mr-1" />
              {t('mark_all_read')}
            </Button>
          )}
          {total > unreadCount && (
            <Button variant="outline" size="sm" onClick={handleDeleteRead} disabled={deleteManyMutation.isPending}>
              <TrashIcon className="h-4 w-4 mr-1" />
              {t('delete_read')}
            </Button>
          )}
          {total > 0 && (
            <Button variant="danger" size="sm" onClick={handleDeleteAll} disabled={deleteManyMutation.isPending}>
              <TrashIcon className="h-4 w-4 mr-1" />
              {t('delete_all')}
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BellIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p>{t('no_notifications')}</p>
            <p className="text-sm mt-1">{t('all_caught_up')}</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification._id}
              className={`p-4 flex items-start justify-between hover:bg-gray-50 transition-colors ${
                !notification.isRead ? 'bg-blue-50 border-l-4 border-blue-500' : ''
              }`}
            >
              <div className="flex items-start space-x-3 flex-1">
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h4 className="text-sm font-semibold text-gray-900">
                      {notification.title}
                    </h4>
                    {!notification.isRead && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {t('new_badge')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1 break-words">
                    {notification.message}
                  </p>
                  <div className="flex items-center space-x-4 mt-2">
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1 ml-4">
                {!notification.isRead && (
                  <button
                    onClick={() => markAsReadMutation.mutate(notification._id)}
                    className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                    title={t('mark_as_read')}
                  >
                    <CheckIcon className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteMutation.mutate(notification._id)}
                  className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                  title={t('delete')}
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {t('page_of')} {page} {t('of')} {pages} ({total})
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              {t('previous')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>
              {t('next')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
