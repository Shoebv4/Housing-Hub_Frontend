import React from 'react';
import PropTypes from 'prop-types';
import { Badge } from '../UI';
import { getMaintenanceBillStatus } from '../../utils/format';

const STATUS_TONES = {
  Paid: 'success',
  Unpaid: 'warning',
  Overdue: 'danger'
};

const BillStatusBadge = ({ bill, className }) => {
  const status = getMaintenanceBillStatus(bill);

  return (
    <Badge tone={STATUS_TONES[status]} className={className}>
      {status}
    </Badge>
  );
};

BillStatusBadge.propTypes = {
  bill: PropTypes.shape({
    paid: PropTypes.bool,
    dueDate: PropTypes.string
  }).isRequired,
  className: PropTypes.string
};

export default BillStatusBadge;
