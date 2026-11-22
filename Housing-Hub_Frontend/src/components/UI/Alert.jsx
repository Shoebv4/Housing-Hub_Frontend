import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

const TONE_CLASSES = {
  info: 'border-line bg-surface-muted text-muted',
  success: 'border-green-200 bg-green-50 text-green-700 dark:border-green-500/25 dark:bg-green-500/10 dark:text-green-300',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300',
  danger: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/25 dark:bg-red-500/10 dark:text-red-300'
};

const Alert = ({ tone = 'info', title, className, children }) => {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={clsx(
        'rounded-xl border px-4 py-3 text-sm',
        TONE_CLASSES[tone],
        className
      )}
    >
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </div>
  );
};

Alert.propTypes = {
  tone: PropTypes.oneOf(['info', 'success', 'warning', 'danger']),
  title: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node.isRequired
};

export default Alert;
