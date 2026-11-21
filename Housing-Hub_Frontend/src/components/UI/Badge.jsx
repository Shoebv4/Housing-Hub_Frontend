import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

const TONE_CLASSES = {
  neutral: 'border-line bg-surface-muted text-muted',
  brand: 'border-transparent bg-accent-soft text-accent',
  success: 'border-green-200 bg-green-100 text-green-800 dark:border-green-500/25 dark:bg-green-500/15 dark:text-green-300',
  warning: 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/15 dark:text-amber-300',
  danger: 'border-red-200 bg-red-100 text-red-800 dark:border-red-500/25 dark:bg-red-500/15 dark:text-red-300'
};

const Badge = ({ tone = 'neutral', className, children }) => {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        TONE_CLASSES[tone],
        className
      )}
    >
      {children}
    </span>
  );
};

Badge.propTypes = {
  tone: PropTypes.oneOf(['neutral', 'brand', 'success', 'warning', 'danger']),
  className: PropTypes.string,
  children: PropTypes.node.isRequired
};

export default Badge;
