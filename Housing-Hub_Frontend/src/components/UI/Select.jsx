import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

const Select = ({
  label,
  error,
  helperText,
  hideLabel = false,
  id,
  className,
  containerClassName,
  children,
  ...props
}) => {
  const generatedId = React.useId();
  const selectId = id || generatedId;
  const errorId = `${selectId}-error`;
  const helperId = `${selectId}-helper`;

  return (
    <div className={clsx('space-y-1.5', containerClassName)}>
      {label && !hideLabel && (
        <label htmlFor={selectId} className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          aria-label={hideLabel ? label : undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={clsx(
            'w-full appearance-none rounded-xl border bg-surface px-3 py-2.5 pr-9 text-sm text-ink transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-faint',
            error ? 'border-red-400 focus:ring-red-500' : 'border-line-strong',
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      </div>
      {error && (
        <p id={errorId} className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {helperText && !error && (
        <p id={helperId} className="text-sm text-muted">{helperText}</p>
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
  children: PropTypes.node.isRequired
};

export default Select;
