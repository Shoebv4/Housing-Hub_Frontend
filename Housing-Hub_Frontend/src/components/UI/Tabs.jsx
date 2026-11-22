import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

const Tabs = ({ tabs, value, onChange, ariaLabel = 'Views', className }) => {
  const handleKeyDown = (event, index) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + direction + tabs.length) % tabs.length;
    onChange(tabs[nextIndex].value);
    const buttons = event.currentTarget.parentElement?.querySelectorAll('[role="tab"]');
    buttons?.[nextIndex]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={clsx(
        'inline-flex flex-wrap items-center gap-1 rounded-xl border border-line bg-surface-muted p-1',
        className
      )}
    >
      {tabs.map((tab, index) => {
        const isActive = value === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.value)}
            onKeyDown={event => handleKeyDown(event, index)}
            className={clsx(
              'rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50',
              isActive
                ? 'bg-surface text-accent shadow-card'
                : 'text-muted hover:text-ink'
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

Tabs.propTypes = {
  tabs: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    disabled: PropTypes.bool
  })).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string,
  className: PropTypes.string
};

export default Tabs;
