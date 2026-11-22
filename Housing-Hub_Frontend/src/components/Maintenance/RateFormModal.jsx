import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Button, Input, Modal, Select } from '../UI';
import { apiPost, apiPut } from '../../utils/api';
import { toDateInputValue } from '../../utils/format';

const getDefaultForm = () => ({
  wingId: '',
  ratePerSqft: '',
  effectiveFrom: toDateInputValue(new Date()),
  effectiveTo: '',
  isActive: true
});

const RateFormModal = ({ isOpen, onClose, rate, wings, currentUserId, onSaved }) => {
  const [form, setForm] = useState(getDefaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    setError('');
    if (rate) {
      setForm({
        wingId: rate.wingId != null ? String(rate.wingId) : '',
        ratePerSqft: rate.ratePerSqft != null ? String(rate.ratePerSqft) : '',
        effectiveFrom: rate.effectiveFrom || '',
        effectiveTo: rate.effectiveTo || '',
        isActive: rate.isActive === true
      });
    } else {
      setForm(getDefaultForm());
    }
  }, [isOpen, rate]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setError('');
    setForm(previous => ({
      ...previous,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    const rateValue = Number(form.ratePerSqft);
    if (!form.wingId) {
      setError('Select a wing.');
      return;
    }
    if (!Number.isFinite(rateValue) || rateValue <= 0) {
      setError('Enter a rate greater than zero.');
      return;
    }
    if (!form.effectiveFrom) {
      setError('Enter the effective from date.');
      return;
    }
    if (form.effectiveTo && form.effectiveTo < form.effectiveFrom) {
      setError('Effective to must be on or after effective from.');
      return;
    }

    const payload = {
      mfid: rate?.mfid ?? 0,
      wingId: Number(form.wingId),
      ratePerSqft: rateValue,
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || null,
      isActive: form.isActive,
      createdBy: rate?.createdBy ?? currentUserId ?? null
    };

    setSaving(true);
    try {
      if (rate?.mfid) {
        await apiPut(`/maintenance/fees/${rate.mfid}`, payload);
      } else {
        await apiPost('/maintenance/fees', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save the maintenance rate.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={rate ? 'Edit Maintenance Rate' : 'Add Maintenance Rate'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Wing"
          name="wingId"
          value={form.wingId}
          onChange={handleChange}
          disabled={Boolean(rate)}
          required
        >
          <option value="">Select wing</option>
          {wings.map(wing => (
            <option key={wing.wingId} value={wing.wingId}>{wing.name}</option>
          ))}
        </Select>

        <Input
          label="Rate per sqft"
          name="ratePerSqft"
          type="number"
          min="0.01"
          step="0.01"
          value={form.ratePerSqft}
          onChange={handleChange}
          placeholder="Rate per square foot"
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Effective from"
            name="effectiveFrom"
            type="date"
            value={form.effectiveFrom}
            onChange={handleChange}
            required
          />
          <Input
            label="Effective to"
            name="effectiveTo"
            type="date"
            value={form.effectiveTo}
            onChange={handleChange}
            helperText="Leave blank for an open-ended rate."
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            name="isActive"
            checked={form.isActive}
            onChange={handleChange}
            className="h-4 w-4 rounded border-line-strong text-accent focus:ring-ring"
          />
          Active
        </label>

        {error && <Alert tone="danger">{error}</Alert>}

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Rate'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

RateFormModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  rate: PropTypes.shape({
    mfid: PropTypes.number,
    wingId: PropTypes.number,
    ratePerSqft: PropTypes.number,
    effectiveFrom: PropTypes.string,
    effectiveTo: PropTypes.string,
    isActive: PropTypes.bool,
    createdBy: PropTypes.number
  }),
  wings: PropTypes.arrayOf(PropTypes.shape({
    wingId: PropTypes.number.isRequired,
    name: PropTypes.string
  })).isRequired,
  currentUserId: PropTypes.number,
  onSaved: PropTypes.func.isRequired
};

export default RateFormModal;
