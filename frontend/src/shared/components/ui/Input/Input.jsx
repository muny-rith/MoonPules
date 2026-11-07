import React, { useState, useRef, forwardRef } from 'react';
import { Search, Eye, EyeOff, X } from 'lucide-react';
import Skeleton from '../Skeleton';
import '../Form.css';

export const InputSkeleton = ({ label, className = '', fullWidth = true }) => (
  <div
    className={`form-group form-group--skeleton ${className}`.trim()}
    style={{ width: fullWidth ? '100%' : undefined }}
  >
    {label && (
      <div style={{ marginBottom: '6px' }}>
        <Skeleton variant="text" width={80} height={15} />
      </div>
    )}
    <div
      className="form-input-wrapper form-input-wrapper--skeleton"
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        height: '38px',
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '8px',
        boxSizing: 'border-box',
      }}
    >
      <Skeleton variant="text" width="60%" height={18} />
    </div>
  </div>
);

/**
 * Enterprise Input Component
 * Supports left/right icons, search mode, password toggle, static or floating labels.
 */
const Input = forwardRef(
  (
    {
      label,
      floatingLabel = false,
      size = 'md',
      type = 'text',
      value,
      onChange,
      onClear,
      isClearable = false,
      error,
      leftIcon,
      rightIcon,
      isPasswordToggle = false,
      enterKeyHint,
      onKeyDown,
      className = '',
      loading = false,
      placeholder = '',
      ...props
    },
    forwardedRef
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const internalRef = useRef(null);

    if (loading) {
      return <InputSkeleton label={label} className={className} />;
    }

    const inputType = isPasswordToggle
      ? showPassword
        ? 'text'
        : 'password'
      : type;

    // Resolve left icon
    const renderLeftIcon = () => {
      if (leftIcon === 'search' || type === 'search') {
        return <Search size={16} color="#94a3b8" />;
      }
      return leftIcon;
    };

    const resolvedLeftIcon = renderLeftIcon();

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.currentTarget.blur();
      }
      if (onKeyDown) {
        onKeyDown(e);
      }
    };

    const setRef = (node) => {
      internalRef.current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    };

    const hasLeftIcon = Boolean(resolvedLeftIcon);
    const canClear = isClearable && Boolean(value);
    const hasRightIcon = Boolean(rightIcon || isPasswordToggle || canClear);

    return (
      <div className={`form-group ${!label ? 'm-0' : ''} ${className}`.trim()}>
        {label && !floatingLabel && <label className="form-label">{label}</label>}

        <div
          className={`input-wrapper ${size ? `input-${size}` : ''} ${error ? 'error' : ''} ${
            hasLeftIcon ? 'has-left-icon' : ''
          } ${hasRightIcon ? 'has-right-icon' : ''}`.trim()}
        >
          {/* Left Icon */}
          {resolvedLeftIcon && <span className="icon left">{resolvedLeftIcon}</span>}

          <input
            ref={setRef}
            type={inputType}
            className="input"
            value={value ?? ''}
            onChange={onChange}
            onKeyDown={handleKeyDown}
            enterKeyHint={enterKeyHint || (type === 'search' ? 'search' : 'done')}
            placeholder={floatingLabel ? ' ' : placeholder}
            {...props}
          />

          {Boolean(label && floatingLabel) && (
            <label className="floating-label">{label}</label>
          )}

          {/* Right Icon OR Clear Button OR Password Toggle */}
          {canClear ? (
            <span
              className="icon right clickable"
              onClick={(e) => {
                e.stopPropagation();
                if (onClear) onClear();
                else if (onChange) onChange({ target: { value: '' } });
                internalRef.current?.focus();
              }}
              title="Clear input"
            >
              <X size={14} />
            </span>
          ) : isPasswordToggle ? (
            <span
              className="icon right clickable"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </span>
          ) : (
            rightIcon && <span className="icon right">{rightIcon}</span>
          )}
        </div>

        {error && <span className="error-text">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
Input.Skeleton = InputSkeleton;

export default Input;
export { Input };

