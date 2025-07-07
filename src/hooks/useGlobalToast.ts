'use client';

import toast from 'react-hot-toast';

export type ToastType = 'success' | 'error' | 'info';

export function useGlobalToast() {
  const showToast = (message: string, type: ToastType = 'info') => {
    switch (type) {
      case 'success':
        return toast.success(message);
      case 'error':
        return toast.error(message);
      case 'info':
      default:
        return toast(message, {
          icon: 'ℹ️',
          style: {
            background: '#1D4ED8',
            color: '#fff',
          },
        });
    }
  };

  return {
    showToast,
    // Also expose the raw toast methods for more advanced usage
    toast,
  };
}