import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import './Modal.css';

/**
 * Modal Header Subcomponent
 */
export const ModalHeader = ({ title, description, children, onClose, className = '' }) => (
  <div className={`ui-modal-header ${className}`.trim()}>
    <div className="ui-modal-header-text">
      {title && <h3 className="ui-modal-title">{title}</h3>}
      {description && <p className="ui-modal-desc">{description}</p>}
      {children}
    </div>
    {onClose && (
      <button
        type="button"
        className="ui-modal-close"
        onClick={onClose}
        aria-label="Close modal"
        title="Close (Esc)"
      >
        <X size={18} />
      </button>
    )}
  </div>
);

/**
 * Modal Body Subcomponent
 */
export const ModalBody = ({ children, className = '', style = {} }) => (
  <div className={`ui-modal-body ${className}`.trim()} style={style}>
    {children}
  </div>
);

/**
 * Modal Footer Subcomponent
 */
export const ModalFooter = ({ children, className = '', style = {} }) => (
  <div className={`ui-modal-footer ${className}`.trim()} style={style}>
    {children}
  </div>
);

/**
 * Enterprise Modal Component
 * 
 * Supports both composable children:
 * <Modal isOpen onClose>
 *   <Modal.Header title="..." />
 *   <Modal.Body>...</Modal.Body>
 *   <Modal.Footer>...</Modal.Footer>
 * </Modal>
 * 
 * And shorthand props:
 * <Modal isOpen onClose title="..." description="..." footer={<Button>OK</Button>}>
 *   Content
 * </Modal>
 */
export const Modal = ({
  isOpen = false,
  onClose,
  title,
  description,
  footer,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEsc = true,
  className = '',
  contentClassName = '',
  style = {},
  contentStyle = {},
}) => {
  const contentRef = useRef(null);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e) => {
      if (closeOnEsc && e.key === 'Escape') {
        e.stopPropagation();
        if (onClose) onClose();
      }
    },
    [closeOnEsc, onClose]
  );

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      if (onClose) onClose();
    }
  };

  const isComposable = !title && !description && !footer;

  return (
    <div
      className={`ui-modal-overlay ${className}`.trim()}
      onClick={handleOverlayClick}
      style={style}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={contentRef}
        className={`ui-modal-content ui-modal-content--${size} ${contentClassName}`.trim()}
        style={contentStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {isComposable ? (
          children
        ) : (
          <>
            {(title || description || onClose) && (
              <ModalHeader
                title={title}
                description={description}
                onClose={onClose}
              />
            )}
            <ModalBody>{children}</ModalBody>
            {footer && <ModalFooter>{footer}</ModalFooter>}
          </>
        )}
      </div>
    </div>
  );
};

Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

export default Modal;

