import { useEffect, useState } from 'react'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  onClose: () => void
}

export function Toast({ message, type = 'success', onClose }: ToastProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const duration = type === 'error' ? 6000 : 3500
    const t = setTimeout(() => {
      setVisible(false)
      setTimeout(onClose, 300)
    }, duration)
    return () => clearTimeout(t)
  }, [onClose, type])

  const colors = {
    success: 'bg-success',
    error: 'bg-error',
    info: 'bg-primary',
  }

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
  }

  return (
    <div
      className={`fixed top-5 left-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-medium shadow-lg transition-all duration-300 ${colors[type]} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
      style={{ transform: `translateX(-50%) ${visible ? 'translateY(0)' : 'translateY(-8px)'}`, maxWidth: '360px', width: 'calc(100% - 32px)' }}
    >
      <span className="text-base">{icons[type]}</span>
      <span>{message}</span>
    </div>
  )
}

// Hook to use toasts
import { useState as useStateHook } from 'react'

interface ToastState {
  message: string
  type: 'success' | 'error' | 'info'
  id: number
}

export function useToast() {
  const [toasts, setToasts] = useStateHook<ToastState[]>([])

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { message, type, id }])
  }

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const ToastContainer = () => (
    <>
      {toasts.map(t => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
      ))}
    </>
  )

  return { showToast, ToastContainer }
}
