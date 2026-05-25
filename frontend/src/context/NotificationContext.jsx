import React, { createContext, useState, useContext, useCallback } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      
      {/* Toast Alert Portal */}
      <div className="toast-container">
        {notifications.map(n => (
          <div 
            key={n.id} 
            className={`toast toast-${n.type}`}
            onClick={() => removeNotification(n.id)}
            style={{ cursor: 'pointer' }}
          >
            <div>
              {n.type === 'success' && '✅'}
              {n.type === 'error' && '❌'}
              {n.type === 'warning' && '⚠️'}
              {n.type === 'info' && 'ℹ️'}
            </div>
            <div>{n.message}</div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
