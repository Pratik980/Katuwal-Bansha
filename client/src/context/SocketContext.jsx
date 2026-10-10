// src/context/SocketContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const socketInstance = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      toast.success('Connected to real-time server');
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
      toast.error('Disconnected from real-time server');
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      toast.error('Failed to connect to real-time server');
    });

    const refreshNotifications = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    };

    // Listen for notifications
    socketInstance.on('notification:new', (notification) => {
      toast.success(notification.message || 'New notification');
      refreshNotifications();
    });
    ['notification:read', 'notification:all_read', 'notification:deleted', 'notification:cleared'].forEach((event) => {
      socketInstance.on(event, refreshNotifications);
    });

    // Member lists and family trees follow every member change
    const refreshMemberData = () => {
      ['members', 'members-dropdown', 'members-tree', 'members-for-families', 'familyTree', 'member'].forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
    };

    // Listen for member updates (the notification above already tells the user)
    socketInstance.on('member:created', refreshMemberData);
    socketInstance.on('member:updated', refreshMemberData);

    socketInstance.on('member:deleted', refreshMemberData);

    // Listen for donation updates
    socketInstance.on('donation:created', (donation) => {
      toast.success(`New donation received: ${donation.amount}`);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [queryClient]);

  const joinRoom = (room) => {
    if (socket && isConnected) {
      socket.emit('join', { room });
    }
  };

  const leaveRoom = (room) => {
    if (socket && isConnected) {
      socket.emit('leave', { room });
    }
  };

  const emit = (event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
      return () => socket.off(event, callback);
    }
    return () => {};
  };

  return (
    <SocketContext.Provider
      value={{ socket, isConnected, joinRoom, leaveRoom, emit, on }}
    >
      {children}
    </SocketContext.Provider>
  );
};