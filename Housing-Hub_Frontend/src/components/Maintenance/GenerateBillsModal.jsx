import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Alert, Button, Input, Modal, Select } from '../UI';
import { apiPost } from '../../utils/api';
import { formatCurrencyPrecise, toDateInputValue } from '../../utils/format';

const getDefaultForm = () => {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 10);

  return {
    wingId: '',
    periodStart: toDateInputValue(periodStart),
    periodEnd: toDateInputValue(periodEnd),
    dueDate: toDateInputValue(dueDate)
  };
};

const GenerateBillsModal = ({ isOpen, onClose, wings, onGenerated }) => {
  const [form, setForm] = useState(getDefaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    setForm(getDefaultForm());
    setError('');
    setResult(null);
  }, [isOpen]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setError('');
    setForm(previous => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

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

    setSubmitting(true);
    try {
      const response = await apiPost('/maintenance/bills/generate', {
        wingId: form.wingId ? Number(form.wingId) : null,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        dueDate: form.dueDate
      });
      setResult(response);
      onGenerated(response);
    } catch (err) {
      setError(err.message || 'Failed to generate bills.');
      setResult(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate Bills">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-muted">
          Bills are created for occupied flats with a recorded area, using each flat&apos;s area
          and the active rate for its wing. Flats with a bill that overlaps this period are skipped.
        </p>

        <Select
          label="Wing"
          name="wingId"
          value={form.wingId}
          onChange={handleChange}
        >
          <option value="">All wings</option>
          {wings.map(wing => (
            <option key={wing.wingId} value={wing.wingId}>{wing.name}</option>
          ))}
        </Select>

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

        {error && <Alert tone="danger">{error}</Alert>}

        {result && (
          <Alert tone={result.generatedCount > 0 ? 'success' : 'info'}>
            {result.generatedCount > 0
              ? `Generated ${result.generatedCount} bill${result.generatedCount === 1 ? '' : 's'} totalling ${formatCurrencyPrecise(result.totalAmount)}.`
              : 'No new bills were generated.'}
            {result.skippedCount > 0 && (
              ` ${result.skippedCount} flat${result.skippedCount === 1 ? '' : 's'} skipped because a bill already covers this period.`
            )}
            {result.ignoredCount > 0 && (
              ` ${result.ignoredCount} flat${result.ignoredCount === 1 ? '' : 's'} ignored because they are vacant or have no area.`
            )}
          </Alert>
        )}

        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Close
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Generating...' : result ? 'Generate Again' : 'Generate Bills'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

GenerateBillsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  wings: PropTypes.arrayOf(PropTypes.shape({
    wingId: PropTypes.number.isRequired,
    name: PropTypes.string
  })).isRequired,
  onGenerated: PropTypes.func.isRequired
};

export default GenerateBillsModal;
