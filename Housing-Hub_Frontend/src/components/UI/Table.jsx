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
    <div className={clsx('table-frame', className)}>
      <table>
        <thead>
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
                  scope="col"
                  className={ALIGN_CLASSES[align]}
                >
                  {label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
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
