import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Card, PageHeader, Table, Tabs } from '../components/UI';
import BillStatusBadge from '../components/Maintenance/BillStatusBadge';
import { useAuth } from '../contexts/AuthContext';
import { useLiveEvents } from '../hooks/useLiveEvents';
import { apiGet } from '../utils/api';
import { formatCurrencyPrecise, formatDate, getMaintenanceBillStatus } from '../utils/format';

const MAINTENANCE_HEADERS = [
  { label: 'Period', align: 'left' },
  { label: 'Due Date', align: 'center' },
  { label: 'Amount', align: 'right' },
  { label: 'Status', align: 'center' },
  { label: 'Paid On', align: 'center' },
  { label: 'Transaction', align: 'left' }
];

const AMENITY_HEADERS = [
  { label: 'Amenity', align: 'left' },
  { label: 'Dates', align: 'center' },
  { label: 'Amount', align: 'right' },
  { label: 'Payment', align: 'center' },
  { label: 'Transaction', align: 'left' }
];

const BillsPage = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState('maintenance');
  const [bills, setBills] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');

    if (!user?.flatId) {
      setBills([]);
      setBookings([]);
      setAmenities([]);
      setFlats([]);
      setError('Your account is not linked to a flat. Contact the society office.');
      setLoading(false);
      return;
    }

    const results = await Promise.allSettled([
      apiGet('/maintenance/bills'),
      apiGet('/bookings'),
      apiGet('/amenities'),
      apiGet('/flats')
    ]);

    const [billsResult, bookingsResult, amenitiesResult, flatsResult] = results;

    if (billsResult.status === 'fulfilled') setBills(billsResult.value || []);
    if (bookingsResult.status === 'fulfilled') setBookings(bookingsResult.value || []);
    if (amenitiesResult.status === 'fulfilled') setAmenities(amenitiesResult.value || []);
    if (flatsResult.status === 'fulfilled') setFlats(flatsResult.value || []);

    const failure = results.find(result => result.status === 'rejected');
    if (failure) {
      setError(failure.reason?.message || 'Some billing data could not be loaded.');
    }

    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.flatId]);

  const refreshBills = async () => {
    if (!user?.flatId) return;

    try {
      const data = await apiGet('/maintenance/bills');
      setBills(data || []);
    } catch {
      // Keep the current bills when a background refresh fails.
    }
  };

  useLiveEvents({
    eventTypes: ['bill.created', 'bill.updated'],
    onEvent: refreshBills,
    onReconnect: loadData,
    enabled: Boolean(user?.flatId)
  });

  const myBills = useMemo(() => bills
    .filter(bill => String(bill.flatId) === String(user?.flatId))
    .sort((a, b) => String(b.periodStart || '').localeCompare(String(a.periodStart || ''))), [bills, user?.flatId]);

  const myBookings = useMemo(() => bookings
    .filter(booking => (
      String(booking.flatId) === String(user?.flatId)
      && (booking.status === 'Approved' || booking.status === 'Completed')
    ))
    .sort((a, b) => String(b.startDate || '').localeCompare(String(a.startDate || ''))), [bookings, user?.flatId]);

  const amenityById = useMemo(
    () => new Map(amenities.map(amenity => [Number(amenity.amenityId), amenity])),
    [amenities]
  );

  const myFlat = useMemo(
    () => flats.find(flat => String(flat.flatId) === String(user?.flatId)),
    [flats, user?.flatId]
  );

  const maintenanceTotal = myBills.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);
  const maintenancePaid = myBills.reduce((sum, bill) => (
    sum + (bill.paid === true ? (Number(bill.amount) || 0) : 0)
  ), 0);
  const amenityTotal = myBookings.reduce((sum, booking) => sum + (Number(booking.amount) || 0), 0);
  const amenityPaid = myBookings.reduce((sum, booking) => (
    sum + (booking.paid === true ? (Number(booking.amount) || 0) : 0)
  ), 0);

  const totalCharges = maintenanceTotal + amenityTotal;
  const totalPaid = maintenancePaid + amenityPaid;
  const outstanding = Math.max(totalCharges - totalPaid, 0);
  const overdueAmount = myBills.reduce((sum, bill) => (
    sum + (getMaintenanceBillStatus(bill) === 'Overdue' ? (Number(bill.amount) || 0) : 0)
  ), 0);

  const stats = [
    { label: 'Total Charges', value: totalCharges },
    { label: 'Paid', value: totalPaid },
    { label: 'Outstanding', value: outstanding },
    { label: 'Overdue', value: overdueAmount }
  ];

  const flatLabel = myFlat
    ? `Flat ${myFlat.wing?.name ? `${myFlat.wing.name} - ` : ''}${myFlat.flatNumber}`
    : '';

  return (
    <div className="page-container">
      <PageHeader
        backTo="/dashboard"
        title="My Bills"
        subtitle={flatLabel
          ? `${flatLabel} · Review your maintenance dues and amenity charges`
          : 'Review your maintenance dues and amenity charges'}
      />

      {error && <Alert tone="danger">{error}</Alert>}

      <Alert tone="info">
        Online payment is not available. Contact the society office to pay.
      </Alert>

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
        <Tabs
          tabs={[
            { value: 'maintenance', label: 'Maintenance' },
            { value: 'amenities', label: 'Amenities' }
          ]}
          value={tab}
          onChange={setTab}
          ariaLabel="Bill types"
        />

        {loading ? (
          <p className="mt-5 text-sm text-faint">Loading your bills...</p>
        ) : tab === 'maintenance' ? (
          <Table headers={MAINTENANCE_HEADERS} className="mt-5">
            {myBills.map(bill => (
              <tr key={bill.mbid}>
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
                <td className="text-muted">{bill.transactionId || '—'}</td>
              </tr>
            ))}
            {myBills.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-muted">
                  No maintenance bills have been generated for your flat yet
                </td>
              </tr>
            )}
          </Table>
        ) : (
          <Table headers={AMENITY_HEADERS} className="mt-5">
            {myBookings.map(booking => {
              const amenity = amenityById.get(Number(booking.amenityId));

              return (
                <tr key={booking.bookingId}>
                  <td className="font-medium text-ink">{amenity?.name || '—'}</td>
                  <td className="text-center text-muted">
                    {formatDate(booking.startDate)} – {formatDate(booking.endDate)}
                  </td>
                  <td className="text-right text-ink tabular-nums">
                    {formatCurrencyPrecise(booking.amount)}
                  </td>
                  <td className="text-center">
                    <Badge tone={booking.paid === true ? 'success' : 'warning'}>
                      {booking.paid === true ? 'Paid' : 'Unpaid'}
                    </Badge>
                  </td>
                  <td className="text-muted">{booking.transactionId || '—'}</td>
                </tr>
              );
            })}
            {myBookings.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-muted">
                  No approved amenity charges yet
                </td>
              </tr>
            )}
          </Table>
        )}
      </Card>
    </div>
  );
};

export default BillsPage;
