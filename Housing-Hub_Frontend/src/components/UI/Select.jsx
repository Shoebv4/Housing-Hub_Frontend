import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import { Check, ChevronDown } from 'lucide-react';

const MENU_MAX_HEIGHT = 256;
const VIEWPORT_PADDING = 12;

const collectOptions = (children, options = []) => {
  React.Children.forEach(children, child => {
    if (!React.isValidElement(child)) return;

    if (child.type === React.Fragment) {
      collectOptions(child.props.children, options);
      return;
    }

    if (child.type !== 'option') return;

    const { value, disabled, children: label } = child.props;
    options.push({
      key: child.key ?? options.length,
      value: value !== undefined ? String(value) : String(label ?? ''),
      label: label ?? (value !== undefined ? String(value) : ''),
      disabled: Boolean(disabled)
    });
  });

  return options;
};

const Select = ({
  label,
  error,
  helperText,
  hideLabel = false,
  id,
  className,
  containerClassName,
  children,
  name,
  value,
  defaultValue,
  onChange,
  required = false,
  disabled = false,
  ...props
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const errorId = `${selectId}-error`;
  const helperId = `${selectId}-helper`;
  const listboxId = `${selectId}-listbox`;

  const options = useMemo(() => collectOptions(children), [children]);

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() => {
    if (defaultValue !== undefined) return String(defaultValue);
    return options[0]?.value ?? '';
  });
  const selectedValue = isControlled ? String(value ?? '') : internalValue;

  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [menuPosition, setMenuPosition] = useState(null);

  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);

  const selectedIndex = options.findIndex(option => option.value === selectedValue);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;
  const firstEnabledIndex = options.findIndex(option => !option.disabled);

  const positionMenu = () => {
    const trigger = triggerRef.current;
    if (!trigger) return null;

    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
    const spaceAbove = rect.top - VIEWPORT_PADDING;
    const openUp = spaceBelow < Math.min(MENU_MAX_HEIGHT, 200) && spaceAbove > spaceBelow;
    const available = Math.max(96, openUp ? spaceAbove : spaceBelow);

    return {
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      maxHeight: Math.min(MENU_MAX_HEIGHT, available),
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 8 }
        : { top: rect.bottom + 8 })
    };
  };

  const openMenu = (preferredIndex) => {
    if (disabled) return;

    const position = positionMenu();
    if (!position) return;

    const fallbackIndex = firstEnabledIndex >= 0 ? firstEnabledIndex : 0;
    const initialIndex = preferredIndex >= 0 && !options[preferredIndex]?.disabled
      ? preferredIndex
      : fallbackIndex;

    setMenuPosition(position);
    setActiveIndex(initialIndex);
    setIsOpen(true);
  };

  const closeMenu = useCallback((returnFocus = false) => {
    setIsOpen(false);
    setMenuPosition(null);
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  const selectOption = (index) => {
    const option = options[index];
    if (!option || option.disabled) return;

    if (option.value !== selectedValue) {
      if (!isControlled) setInternalValue(option.value);
      onChange?.({ target: { name, value: option.value } });
    }

    closeMenu();
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (disabled && isOpen) closeMenu();
  }, [disabled, isOpen, closeMenu]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (
        triggerRef.current?.contains(event.target) ||
        menuRef.current?.contains(event.target)
      ) {
        return;
      }
      closeMenu();
    };

    const handleScroll = (event) => {
      if (menuRef.current?.contains(event.target)) return;
      closeMenu();
    };

    const handleResize = () => closeMenu();

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, closeMenu]);

  useEffect(() => {
    if (!isOpen || activeIndex < 0) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, activeIndex]);

  const moveActive = (direction) => {
    if (!options.length) return;

    let nextIndex = activeIndex;
    for (let step = 0; step < options.length; step += 1) {
      nextIndex = (nextIndex + direction + options.length) % options.length;
      if (!options[nextIndex].disabled) {
        setActiveIndex(nextIndex);
        return;
      }
    }
  };

  const handleKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (isOpen) {
          moveActive(1);
        } else {
          openMenu(selectedIndex);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          moveActive(-1);
        } else {
          openMenu(selectedIndex);
        }
        break;
      case 'Home':
        if (isOpen) {
          event.preventDefault();
          setActiveIndex(firstEnabledIndex >= 0 ? firstEnabledIndex : 0);
        }
        break;
      case 'End': {
        if (isOpen) {
          event.preventDefault();
          let lastIndex = options.length - 1;
          while (lastIndex >= 0 && options[lastIndex].disabled) lastIndex -= 1;
          if (lastIndex >= 0) setActiveIndex(lastIndex);
        }
        break;
      }
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (isOpen) {
          if (activeIndex >= 0) selectOption(activeIndex);
        } else {
          openMenu(selectedIndex);
        }
        break;
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          event.stopPropagation();
          closeMenu(true);
        }
        break;
      case 'Tab':
        if (isOpen) closeMenu();
        break;
      default:
        break;
    }
  };

  const handleTriggerClick = () => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu(selectedIndex);
    }
  };

  const controlClasses = clsx(
    'w-full rounded-xl border bg-surface px-3 py-2.5 pr-9 text-left text-sm text-ink transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-faint',
    error ? 'border-red-400 focus:ring-red-500' : 'border-line-strong',
    className
  );

  return (
    <div className={clsx('space-y-1.5', containerClassName)}>
      {label && !hideLabel && (
        <label htmlFor={selectId} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        {/* Keep a native control in the form so required validation still works. */}
        {required && (
          <select
            aria-hidden="true"
            tabIndex={-1}
            name={name}
            value={selectedValue}
            onChange={() => {}}
            required
            disabled={disabled}
            className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
          >
            {children}
          </select>
        )}
        <button
          type="button"
          id={selectId}
          ref={triggerRef}
          {...props}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          aria-owns={isOpen ? listboxId : undefined}
          aria-activedescendant={isOpen && activeIndex >= 0 ? `${selectId}-option-${activeIndex}` : undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          aria-label={hideLabel ? label : undefined}
          aria-required={required || undefined}
          disabled={disabled}
          onClick={handleTriggerClick}
          onKeyDown={handleKeyDown}
          className={clsx(controlClasses, 'flex items-center')}
        >
          <span className={clsx('block min-w-0 flex-1 truncate', selectedOption ? '' : 'text-faint')}>
            {selectedOption ? selectedOption.label : ''}
          </span>
        </button>
        <ChevronDown
          aria-hidden="true"
          className={clsx(
            'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </div>
      {error && (
        <p id={errorId} className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p id={helperId} className="text-sm text-muted">{helperText}</p>
      )}

      {/* Portal the menu so table and modal overflow cannot clip it. */}
      {isOpen && menuPosition && createPortal(
        <div
          ref={menuRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          style={menuPosition}
          aria-label={hideLabel ? label : undefined}
          className="scrollbar-slim z-[60] overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-pop"
        >
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-faint">No options available</p>
          ) : (
            options.map((option, index) => {
              const isSelected = option.value === selectedValue;
              const isActive = index === activeIndex;

              return (
                <div
                  key={option.key}
                  ref={element => { optionRefs.current[index] = element; }}
                  id={`${selectId}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={option.disabled || undefined}
                  onMouseDown={event => event.preventDefault()}
                  onMouseEnter={() => {
                    if (!option.disabled) setActiveIndex(index);
                  }}
                  onClick={() => selectOption(index)}
                  className={clsx(
                    'flex cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-colors',
                    option.disabled
                      ? 'cursor-not-allowed text-faint'
                      : isSelected
                        ? 'bg-accent-soft font-medium text-accent'
                        : isActive
                          ? 'bg-surface-hover text-ink'
                          : 'text-ink'
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  {isSelected && <Check className="h-4 w-4 flex-shrink-0" aria-hidden="true" />}
                </div>
              );
            })
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

Select.propTypes = {
  label: PropTypes.string,
  error: PropTypes.string,
  helperText: PropTypes.string,
  hideLabel: PropTypes.bool,
  id: PropTypes.string,
  className: PropTypes.string,
  containerClassName: PropTypes.string,
  children: PropTypes.node.isRequired,
  name: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  defaultValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func,
  required: PropTypes.bool,
  disabled: PropTypes.bool
};

export default Select;
