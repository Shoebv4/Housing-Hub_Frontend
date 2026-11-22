import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Button, Input, Modal, Select } from '../UI';
import { apiPost, apiPut } from '../../utils/api';
import { toDateInputValue } from '../../utils/format';

const getDefaultForm = () => {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 10);

  return {
    flatId: '',
    periodStart: toDateInputValue(periodStart),
    periodEnd: toDateInputValue(periodEnd),
    dueDate: toDateInputValue(dueDate),
    amount: '',
    paid: false,
    paidDate: '',
    transactionId: ''
  };
};

const BillFormModal = ({ isOpen, onClose, bill, flats, onSaved }) => {
  const [form, setForm] = useState(getDefaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setError('');
    if (bill) {
      setForm({
        flatId: bill.flatId != null ? String(bill.flatId) : '',
        periodStart: bill.periodStart || '',
        periodEnd: bill.periodEnd || '',
        dueDate: bill.dueDate || '',
        amount: bill.amount != null ? String(bill.amount) : '',
        paid: bill.paid === true,
        paidDate: bill.paidDate || '',
        transactionId: bill.transactionId || ''
      });
    } else {
      setForm(getDefaultForm());
    }
  }, [isOpen, bill]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setError('');
    setForm((previous) => {
      const next = {
        ...previous,
        [name]: type === 'checkbox' ? checked : value
      };

      if (name === 'paid') {
        if (checked && !previous.paidDate) {
          next.paidDate = toDateInputValue(new Date());
        }
        if (!checked) {
          next.paidDate = '';
          next.transactionId = '';
        }
      }

      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const amount = Number(form.amount);
    if (!form.flatId) {
      setError('Select a flat.');
      return;
    }
    if (!form.periodStart || !form.periodEnd) {
      setError('Enter the billing period.');
      return;
    }
    if (form.periodEnd < form.periodStart) {
      setError('Period end must be on or after period start.');
      return;
    }
    if (!form.dueDate) {
      setError('Enter a due date.');
      return;
    }
    if (form.dueDate < form.periodStart) {
      setError('Due date must be on or after period start.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    if (form.paid && !form.transactionId.trim()) {
      setError('Enter a transaction ID for the payment.');
      return;
    }
    if (form.paid && !form.paidDate) {
      setError('Enter the payment date.');
      return;
    }

    const payload = {
      mbid: bill?.mbid ?? 0,
      flatId: Number(form.flatId),
      mfid: bill?.mfid ?? null,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      dueDate: form.dueDate,
      amount,
      paid: form.paid,
      paidDate: form.paid ? form.paidDate : null,
      transactionId: form.paid ? form.transactionId.trim() : ''
    };

    setSaving(true);
    try {
      if (bill?.mbid) {
        await apiPut(`/maintenance/bills/${bill.mbid}`, payload);
      } else {
        await apiPost('/maintenance/bills', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save the bill.');
    } finally {
      setSaving(false);
    }
  };

  const sortedFlats = [...flats].sort((a, b) => (
    `${a.wing?.name || ''} ${a.flatNumber || ''}`.localeCompare(`${b.wing?.name || ''} ${b.flatNumber || ''}`)
  ));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={bill ? 'Edit Maintenance Bill' : 'Add Maintenance Bill'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Flat"
            name="flatId"
            value={form.flatId}
            onChange={handleChange}
            required
          >
            <option value="">Select flat</option>
            {sortedFlats.map(flat => (
              <option key={flat.flatId} value={flat.flatId}>
                {flat.wing?.name ? `${flat.wing.name} - ` : ''}
                {flat.flatNumber}
                {flat.area ? ` (${flat.area} sq ft)` : ''}
              </option>
            ))}
          </Select>
          <Input
            label="Amount"
            name="amount"
            type="number"
            min="0.01"
            step="0.01"
            value={form.amount}
            onChange={handleChange}
            placeholder="Bill amount"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="Period start"
            name="periodStart"
            type="date"
            value={form.periodStart}
            onChange={handleChange}
            required
          />
          <Input
            label="Period end"
            name="periodEnd"
            type="date"
            value={form.periodEnd}
            onChange={handleChange}
            required
          />
          <Input
            label="Due date"
            name="dueDate"
            type="date"
            value={form.dueDate}
            onChange={handleChange}
            required
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            name="paid"
            checked={form.paid}
            onChange={handleChange}
            className="h-4 w-4 rounded border-line-strong text-accent focus:ring-ring"
          />
          Mark as paid
        </label>

        {form.paid && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Paid date"
              name="paidDate"
              type="date"
              value={form.paidDate}
              onChange={handleChange}
              required
            />
            <Input
              label="Transaction ID"
              name="transactionId"
              value={form.transactionId}
              onChange={handleChange}
              maxLength={100}
              placeholder="Payment reference"
              required
            />
          </div>
        )}

        {error && <Alert tone="danger">{error}</Alert>}

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Bill'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

BillFormModal.propTypes = {
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
    paid: PropTypes.bool,
    paidDate: PropTypes.string,
    transactionId: PropTypes.string
  }),
  flats: PropTypes.arrayOf(PropTypes.shape({
    flatId: PropTypes.number.isRequired,
    flatNumber: PropTypes.string,
    area: PropTypes.number,
    wing: PropTypes.shape({
      name: PropTypes.string
    })
  })).isRequired,
  onSaved: PropTypes.func.isRequired
};

export default BillFormModal;
