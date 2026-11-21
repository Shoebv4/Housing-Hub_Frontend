import React from 'react';
import PropTypes from 'prop-types';
import clsx from 'clsx';

const ALIGN_CLASSES = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right'
};

const Table = ({ headers, children, className }) => {
  return (
    <div className={clsx('overflow-x-auto rounded-xl border border-gray-200', className)}>
      <table className="min-w-full bg-white">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {headers.map((header, index) => {
              const isObject = typeof header === 'object' && header !== null;
              const label = isObject ? header.label : header;
              const align = isObject
                ? header.align || 'left'
                : header === 'Actions' ? 'center' : 'left';

              return (
                <th
                  key={index}
                  className={clsx(
                    'px-4 py-3 text-sm font-semibold text-gray-800 uppercase tracking-wide sm:px-6 sm:py-4',
                    ALIGN_CLASSES[align]
                  )}
                >
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {children}
        </tbody>
      </table>
    </div>
  );
};

Table.propTypes = {
  headers: PropTypes.arrayOf(PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      align: PropTypes.oneOf(['left', 'center', 'right'])
    })
  ])).isRequired,
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

export default Table;
