import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

const Card = ({ children, className, padding = 'md' }) => {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-8'
  };

  return (
    <div
      className={clsx(
        'rounded-2xl border border-line bg-surface shadow-card',
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
};

Card.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  padding: PropTypes.oneOf(['sm', 'md', 'lg'])
};

export default Card;
