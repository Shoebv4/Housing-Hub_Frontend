import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, PageHeader, Select, Table, Tabs } from '../../components/UI';
import BillStatusBadge from '../../components/Maintenance/BillStatusBadge';
import BillFormModal from '../../components/Maintenance/BillFormModal';
import PaymentModal from '../../components/Maintenance/PaymentModal';
import GenerateBillsModal from '../../components/Maintenance/GenerateBillsModal';
import RateFormModal from '../../components/Maintenance/RateFormModal';
import { useAuth } from '../../contexts/AuthContext';
import { apiDelete, apiGet, apiPut } from '../../utils/api';
import { formatCurrencyPrecise, formatDate, getMaintenanceBillStatus } from '../../utils/format';

const BILL_HEADERS = [
  { label: 'Flat No.', align: 'center' },
  { label: 'Wing', align: 'center' },
  { label: 'Resident', align: 'left' },
  { label: 'Period', align: 'left' },
  { label: 'Due Date', align: 'center' },
  { label: 'Amount', align: 'right' },
  { label: 'Status', align: 'center' },
  { label: 'Paid On', align: 'center' },
  { label: 'Actions', align: 'center' }
];

const RATE_HEADERS = [
  { label: 'Wing', align: 'left' },
  { label: 'Rate / sqft', align: 'right' },
  { label: 'Effective from', align: 'center' },
  { label: 'Effective to', align: 'center' },
  { label: 'Status', align: 'center' },
  { label: 'Actions', align: 'center' }
];

const MaintenancePage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('bills');
  const [wings, setWings] = useState([]);
  const [flats, setFlats] = useState([]);
  const [users, setUsers] = useState([]);
  const [fees, setFees] = useState([]);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [wingFilter, setWingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [billModal, setBillModal] = useState({ open: false, bill: null });
  const [paymentModal, setPaymentModal] = useState({ open: false, bill: null });
  const [generateOpen, setGenerateOpen] = useState(false);
  const [rateModal, setRateModal] = useState({ open: false, rate: null });

  const loadData = async () => {
    setLoading(true);
    setError('');

    const results = await Promise.allSettled([
      apiGet('/wings'),
      apiGet('/flats'),
      apiGet('/users'),
      apiGet('/maintenance/fees'),
      apiGet('/maintenance/bills')
    ]);

    const [wingsResult, flatsResult, usersResult, feesResult, billsResult] = results;

    if (wingsResult.status === 'fulfilled') setWings(wingsResult.value || []);
    if (flatsResult.status === 'fulfilled') setFlats(flatsResult.value || []);
    if (usersResult.status === 'fulfilled') setUsers(usersResult.value || []);
    if (feesResult.status === 'fulfilled') setFees(feesResult.value || []);
    if (billsResult.status === 'fulfilled') setBills(billsResult.value || []);

    const failure = results.find(result => result.status === 'rejected');
    if (failure) {
      setError(failure.reason?.message || 'Some maintenance data could not be loaded.');
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshBills = async () => {
    try {
      const data = await apiGet('/maintenance/bills');
      setBills(data || []);
    } catch (err) {
      setError(err.message || 'Failed to refresh maintenance bills.');
    }
  };

  const refreshFees = async () => {
    try {
      const data = await apiGet('/maintenance/fees');
      setFees(data || []);
    } catch (err) {
      setError(err.message || 'Failed to refresh maintenance rates.');
    }
  };

  const societyId = user?.societyId;

  const societyWings = useMemo(() => wings
    .filter(wing => Number(wing.societyId) === Number(societyId))
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))), [wings, societyId]);

  const societyWingIds = useMemo(
    () => new Set(societyWings.map(wing => Number(wing.wingId))),
    [societyWings]
  );

  const societyFlats = useMemo(() => flats.filter(flat => (
    societyWingIds.has(Number(flat.wingId))
    || Number(flat.wing?.societyId) === Number(societyId)
  )), [flats, societyWingIds, societyId]);

  const societyFlatIds = useMemo(
    () => new Set(societyFlats.map(flat => Number(flat.flatId))),
    [societyFlats]
  );

  const societyFees = useMemo(
    () => fees.filter(fee => societyWingIds.has(Number(fee.wingId))),
    [fees, societyWingIds]
  );

  const societyBills = useMemo(
    () => bills.filter(bill => societyFlatIds.has(Number(bill.flatId))),
    [bills, societyFlatIds]
  );

  const wingById = useMemo(
    () => new Map(societyWings.map(wing => [Number(wing.wingId), wing])),
    [societyWings]
  );

  const flatById = useMemo(
    () => new Map(societyFlats.map(flat => [Number(flat.flatId), flat])),
    [societyFlats]
  );

  const residentNamesByFlatId = useMemo(() => {
    const namesByFlat = new Map();

    users
      .filter(account => (
        account.role === 'resident'
        && Number(account.societyId) === Number(societyId)
        && account.flatId != null
      ))
      .forEach(account => {
        const key = Number(account.flatId);
        const names = namesByFlat.get(key) || [];
        names.push(account.name);
        namesByFlat.set(key, names);
      });

    return new Map([...namesByFlat.entries()].map(([flatId, names]) => [flatId, names.join(', ')]));
  }, [users, societyId]);

  const totalBilled = useMemo(
    () => societyBills.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0),
    [societyBills]
  );

  const collected = useMemo(
    () => societyBills.reduce((sum, bill) => (
      sum + (bill.paid === true ? (Number(bill.amount) || 0) : 0)
    ), 0),
    [societyBills]
  );

  const overdueAmount = useMemo(
    () => societyBills.reduce((sum, bill) => (
      sum + (getMaintenanceBillStatus(bill) === 'Overdue' ? (Number(bill.amount) || 0) : 0)
    ), 0),
    [societyBills]
  );

  const filteredBills = useMemo(() => societyBills
    .filter(bill => {
      const flat = flatById.get(Number(bill.flatId));
      if (wingFilter && String(flat?.wingId ?? '') !== wingFilter) return false;
      if (statusFilter && getMaintenanceBillStatus(bill) !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const periodCompare = String(b.periodStart || '').localeCompare(String(a.periodStart || ''));
      if (periodCompare !== 0) return periodCompare;
      return String(b.dueDate || '').localeCompare(String(a.dueDate || ''));
    }), [societyBills, flatById, wingFilter, statusFilter]);

  const sortedFees = useMemo(() => [...societyFees].sort((a, b) => {
    const wingCompare = String(wingById.get(Number(a.wingId))?.name || '')
      .localeCompare(String(wingById.get(Number(b.wingId))?.name || ''));
    if (wingCompare !== 0) return wingCompare;
    return String(b.effectiveFrom || '').localeCompare(String(a.effectiveFrom || ''));
  }), [societyFees, wingById]);

  const stats = [
    { label: 'Total Billed', value: totalBilled },
    { label: 'Collected', value: collected },
    { label: 'Outstanding', value: Math.max(totalBilled - collected, 0) },
    { label: 'Overdue', value: overdueAmount }
  ];

  const paymentBill = paymentModal.bill;
  const paymentFlat = paymentBill ? flatById.get(Number(paymentBill.flatId)) : null;
  const paymentWing = paymentFlat ? wingById.get(Number(paymentFlat.wingId)) : null;
  const paymentLabel = paymentFlat
    ? `${paymentWing?.name ? `${paymentWing.name} - ` : ''}${paymentFlat.flatNumber}`
    : '';

  const openBillModal = (bill = null) => setBillModal({ open: true, bill });
  const closeBillModal = () => setBillModal({ open: false, bill: null });
  const closePaymentModal = () => setPaymentModal({ open: false, bill: null });
  const openRateModal = (rate = null) => setRateModal({ open: true, rate });
  const closeRateModal = () => setRateModal({ open: false, rate: null });

  const handleGenerated = (result) => {
    setSuccess(
      result.generatedCount > 0
        ? `Generated ${result.generatedCount} maintenance bill${result.generatedCount === 1 ? '' : 's'}.`
        : 'No new maintenance bills were generated.'
    );
    refreshBills();
  };

  const handleDeleteBill = async (bill) => {
    if (!window.confirm('Delete this maintenance bill?')) return;

    setError('');
    setSuccess('');
    try {
      await apiDelete(`/maintenance/bills/${bill.mbid}`);
      await refreshBills();
    } catch (err) {
      setError(err.message || 'Failed to delete the maintenance bill.');
    }
  };

  const handleToggleRate = async (rate) => {
    if (rate.isActive === true && !window.confirm(
      'Deactivate this rate? Bill generation will skip its wing until another active rate covers the period.'
    )) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      await apiPut(`/maintenance/fees/${rate.mfid}`, {
        mfid: rate.mfid,
        wingId: rate.wingId,
        ratePerSqft: rate.ratePerSqft,
        effectiveFrom: rate.effectiveFrom,
        effectiveTo: rate.effectiveTo || null,
        isActive: rate.isActive !== true,
        createdBy: rate.createdBy ?? null
      });
      await refreshFees();
    } catch (err) {
      setError(err.message || 'Failed to update the maintenance rate.');
    }
  };

  return (
    <div className="page-container">
      <PageHeader
        backTo="/dashboard"
        title="Maintenance"
        subtitle="Set wing rates, generate bills, and record payments"
      />

      {error && <Alert tone="danger">{error}</Alert>}
      {success && <Alert tone="success">{success}</Alert>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(stat => (
          <Card key={stat.label}>
            <p className="text-sm font-medium text-muted">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink tabular-nums">
              {loading ? '—' : formatCurrencyPrecise(stat.value)}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            tabs={[
              { value: 'bills', label: 'Bills' },
              { value: 'rates', label: 'Rates' }
            ]}
            value={tab}
            onChange={setTab}
            ariaLabel="Maintenance views"
          />

          {tab === 'bills' ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="primary"
                onClick={() => setGenerateOpen(true)}
                disabled={societyWings.length === 0}
              >
                Generate Bills
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => openBillModal()}
                disabled={societyFlats.length === 0}
              >
                Add Bill
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={() => openRateModal()}
              disabled={societyWings.length === 0}
            >
              Add Rate
            </Button>
          )}
        </div>

        {tab === 'bills' ? (
          <div className="mt-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
              <Select
                label="Wing"
                value={wingFilter}
                onChange={event => setWingFilter(event.target.value)}
              >
                <option value="">All wings</option>
                {societyWings.map(wing => (
                  <option key={wing.wingId} value={wing.wingId}>{wing.name}</option>
                ))}
              </Select>
              <Select
                label="Status"
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value)}
              >
                <option value="">All statuses</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Overdue">Overdue</option>
              </Select>
            </div>

            {loading ? (
              <p className="mt-4 text-sm text-faint">Loading maintenance bills...</p>
            ) : (
              <Table headers={BILL_HEADERS} className="mt-4">
                {filteredBills.map(bill => {
                  const flat = flatById.get(Number(bill.flatId));
                  const wing = flat ? wingById.get(Number(flat.wingId)) : null;
                  const residentName = residentNamesByFlatId.get(Number(bill.flatId));

                  return (
                    <tr key={bill.mbid}>
                      <td className="font-medium text-ink text-center">{flat?.flatNumber || '—'}</td>
                      <td className="text-center">{wing?.name || '—'}</td>
                      <td>{residentName || '—'}</td>
                      <td className="text-muted">
                        {formatDate(bill.periodStart)} – {formatDate(bill.periodEnd)}
                      </td>
                      <td className="text-center text-muted">{formatDate(bill.dueDate)}</td>
                      <td className="text-right text-ink tabular-nums">
                        {formatCurrencyPrecise(bill.amount)}
                      </td>
                      <td className="text-center">
                        <BillStatusBadge bill={bill} />
                      </td>
                      <td className="text-center text-muted">{formatDate(bill.paidDate)}</td>
                      <td>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          {bill.paid !== true && (
                            <Button
                              type="button"
                              variant="success"
                              size="sm"
                              onClick={() => setPaymentModal({ open: true, bill })}
                            >
                              Record Payment
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => openBillModal(bill)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteBill(bill)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredBills.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted">
                      No maintenance bills match these filters
                    </td>
                  </tr>
                )}
              </Table>
            )}
          </div>
        ) : (
          <div className="mt-5">
            {loading ? (
              <p className="text-sm text-faint">Loading maintenance rates...</p>
            ) : (
              <Table headers={RATE_HEADERS}>
                {sortedFees.map(rate => {
                  const wing = wingById.get(Number(rate.wingId));

                  return (
                    <tr key={rate.mfid}>
                      <td className="font-medium text-ink">{wing?.name || '—'}</td>
                      <td className="text-right tabular-nums">{formatCurrencyPrecise(rate.ratePerSqft)}</td>
                      <td className="text-center text-muted">{formatDate(rate.effectiveFrom)}</td>
                      <td className="text-center text-muted">{formatDate(rate.effectiveTo)}</td>
                      <td className="text-center">
                        <Badge tone={rate.isActive === true ? 'success' : 'neutral'}>
                          {rate.isActive === true ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => openRateModal(rate)}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant={rate.isActive === true ? 'warning' : 'success'}
                            size="sm"
                            onClick={() => handleToggleRate(rate)}
                          >
                            {rate.isActive === true ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {sortedFees.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted">
                      No maintenance rates configured yet
                    </td>
                  </tr>
                )}
              </Table>
            )}
          </div>
        )}
      </Card>

      <BillFormModal
        isOpen={billModal.open}
        bill={billModal.bill}
        flats={societyFlats}
        onClose={closeBillModal}
        onSaved={refreshBills}
      />
      <PaymentModal
        isOpen={paymentModal.open}
        bill={paymentModal.bill}
        flatLabel={paymentLabel}
        onClose={closePaymentModal}
        onSaved={refreshBills}
      />
      <GenerateBillsModal
        isOpen={generateOpen}
        wings={societyWings}
        onClose={() => setGenerateOpen(false)}
        onGenerated={handleGenerated}
      />
      <RateFormModal
        isOpen={rateModal.open}
        rate={rateModal.rate}
        wings={societyWings}
        currentUserId={user?.userId}
        onClose={closeRateModal}
        onSaved={refreshFees}
      />
    </div>
  );
};

export default MaintenancePage;
