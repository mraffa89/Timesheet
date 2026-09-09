import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar" }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!dialogRef.current) return;
    if (isOpen) {
      dialogRef.current.showModal();
    } else {
      dialogRef.current.close();
    }
  }, [isOpen]);

  // Fallback close behavior when clicking backdrop
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleBackdropClick = (e) => {
      if (e.target === dialog) {
        onClose();
      }
    };

    dialog.addEventListener('click', handleBackdropClick);
    return () => {
      dialog.removeEventListener('click', handleBackdropClick);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <dialog 
      ref={dialogRef} 
      onClose={onClose} 
      onClick={(e) => {
        const rect = dialogRef.current?.getBoundingClientRect();
        if (rect && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) {
          onClose();
        }
      }}
      aria-labelledby="confirm-title" 
      className="confirm-dialog"
    >
      <div className="confirm-dialog-content">
        <div className="confirm-dialog-icon">
          <AlertTriangle size={32} />
        </div>
        
        <div className="text-center">
          <h3 id="confirm-title" style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>{title}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.4' }}>{message}</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '1rem' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            style={{ flex: 1 }} 
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            type="button" 
            className="btn btn-danger" 
            style={{ flex: 1 }} 
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </dialog>
  );
}
