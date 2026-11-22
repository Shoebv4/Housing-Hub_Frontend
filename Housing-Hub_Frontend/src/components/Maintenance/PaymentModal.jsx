import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Button, Input, Modal } from '../UI';
import { apiPut } from '../../utils/api';
import { formatCurrencyPrecise, formatDate, toDateInputValue } from '../../utils/format';

const PaymentModal = ({ isOpen, onClose, bill, flatLabel, onSaved }) => {
  const [paidDate, setPaidDate] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || !bill) return;

    setPaidDate(bill.paidDate || toDateInputValue(new Date()));
    setTransactionId(bill.transactionId || '');
    setError('');
  }, [isOpen, bill]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!bill) return;

    if (!bill.flatId || bill.amount == null || !bill.periodStart || !bill.periodEnd || !bill.dueDate) {
      setError('This bill is missing details required to record a payment. Edit the bill first.');
      return;
    }
    if (!paidDate) {
      setError('Enter the payment date.');
      return;
    }
    if (!transactionId.trim()) {
      setError('Enter the transaction ID.');
      return;
    }

    const payload = {
      mbid: bill.mbid,
      flatId: bill.flatId,
      mfid: bill.mfid ?? null,
      periodStart: bill.periodStart,
      periodEnd: bill.periodEnd,
      dueDate: bill.dueDate,
      amount: bill.amount,
      paid: true,
      paidDate,
      transactionId: transactionId.trim()
    };

    setSaving(true);
    try {
      await apiPut(`/maintenance/bills/${bill.mbid}`, payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record the payment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment">
      <form onSubmit={handleSubmit} className="space-y-4">
        {bill && (
          <div className="rounded-xl border border-line bg-surface-muted px-4 py-3 text-sm">
            <p className="font-medium text-ink">{flatLabel || 'Maintenance bill'}</p>
            <p className="mt-1 text-muted">
              {formatCurrencyPrecise(bill.amount)} due {formatDate(bill.dueDate)}
            </p>
          </div>
        )}

        <Input
          label="Paid date"
          type="date"
          value={paidDate}
          onChange={event => setPaidDate(event.target.value)}
          required
        />
        <Input
          label="Transaction ID"
          value={transactionId}
          onChange={event => setTransactionId(event.target.value)}
          maxLength={100}
          placeholder="Payment reference"
          required
        />

        {error && <Alert tone="danger">{error}</Alert>}

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="success" disabled={saving}>
            {saving ? 'Recording...' : 'Record Payment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

PaymentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  bill: PropTypes.shape({
    mbid: PropTypes.number,
    flatId: PropTypes.number,
    mfid: PropTypes.number,
    periodStart: PropTypes.string,
    periodEnd: PropTypes.string,
    dueDate: PropTypes.string,
    amount: PropTypes.number,
    paidDate: PropTypes.string,
    transactionId: PropTypes.string
  }),
  flatLabel: PropTypes.string,
  onSaved: PropTypes.func.isRequired
};

export default PaymentModal;
