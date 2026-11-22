import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';
import BackButton from './BackButton';

const PageHeader = ({ title, subtitle, meta, actions, backTo, className }) => {
  return (
    <div className={clsx('flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="min-w-0">
        {backTo && <BackButton fallbackTo={backTo} className="mb-2" />}
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        {meta}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
  );
};

PageHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.node,
  meta: PropTypes.node,
  actions: PropTypes.node,
  backTo: PropTypes.string,
  className: PropTypes.string
};

export default PageHeader;
