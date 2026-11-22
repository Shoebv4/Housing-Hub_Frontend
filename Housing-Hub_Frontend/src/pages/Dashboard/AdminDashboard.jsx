import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Users,
  MessageSquare,
  Wrench,
  Calendar,
  FileText,
  TrendingUp,
  AlertTriangle,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Card, Modal, PageHeader, Table } from '../../components/UI';
import { useAuth } from '../../contexts/AuthContext';
import { useLiveEvents } from '../../hooks/useLiveEvents';
import { useSociety } from '../../hooks/useSociety';
import { apiGet, apiPost } from '../../utils/api';
import { downloadCsv } from '../../utils/export';
import { formatCurrency, formatDate, parseDate, timeAgo } from '../../utils/format';

const AdminDashboard = () => {
  const { user } = useAuth();
  const society = useSociety();
  const navigate = useNavigate();
  const [flats, setFlats] = useState([]);
  const [users, setUsers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showBillsModal, setShowBillsModal] = useState(false);
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      const results = await Promise.allSettled([
        apiGet('/flats'),
        apiGet('/users'),
        apiGet('/complaints'),
        apiGet('/bookings'),
        apiGet('/amenities')
      ]);
      if (cancelled) return;

      const [flatsResult, usersResult, complaintsResult, bookingsResult, amenitiesResult] = results;

      if (flatsResult.status === 'fulfilled') setFlats(flatsResult.value || []);
      if (usersResult.status === 'fulfilled') setUsers(usersResult.value || []);
      if (complaintsResult.status === 'fulfilled') setComplaints(complaintsResult.value || []);
      if (bookingsResult.status === 'fulfilled') setBookings(bookingsResult.value || []);
      if (amenitiesResult.status === 'fulfilled') setAmenities(amenitiesResult.value || []);

      const failure = results.find(result => result.status === 'rejected');
      if (failure) {
        setError(failure.reason?.message || 'Some dashboard data could not be loaded.');
      }

      setLoading(false);
    };

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshComplaints = async () => {
    try {
      const data = await apiGet('/complaints');
      setComplaints(data || []);
    } catch {
      // Keep the current data when a background refresh fails.
    }
  };

  const refreshBookings = async () => {
    try {
      const data = await apiGet('/bookings');
      setBookings(data || []);
    } catch {
      // Keep the current data when a background refresh fails.
    }
  };

  const handleLiveEvent = (event) => {
    if (event.type.startsWith('complaint.')) {
      refreshComplaints();
    } else if (event.type.startsWith('booking.')) {
      refreshBookings();
    }
  };

  useLiveEvents({
    eventTypes: ['complaint.created', 'complaint.updated', 'booking.created', 'booking.updated', 'booking.deleted'],
    onEvent: handleLiveEvent,
    onReconnect: () => {
      refreshComplaints();
      refreshBookings();
    }
  });

  const societyId = user?.societyId;

  const societyFlats = useMemo(
    () => (societyId == null
      ? []
      : flats.filter(flat => flat.wing?.societyId === societyId)),
    [flats, societyId]
  );

  const flatIds = useMemo(
    () => new Set(societyFlats.map(flat => flat.flatId)),
    [societyFlats]
  );

  const flatNumberById = useMemo(() => {
    const map = new Map();
    societyFlats.forEach(flat => map.set(flat.flatId, flat.flatNumber));
    return map;
  }, [societyFlats]);

  const societyResidents = useMemo(
    () => users.filter(account => account.role === 'resident' && account.societyId === societyId),
    [users, societyId]
  );

  const residentIds = useMemo(
    () => new Set(societyResidents.map(account => account.userId)),
    [societyResidents]
  );

  const societyBookings = useMemo(
    () => bookings.filter(booking => flatIds.has(booking.flatId) || residentIds.has(booking.userId)),
    [bookings, flatIds, residentIds]
  );

  const openComplaints = useMemo(
    () => complaints.filter(complaint => complaint.status === 'Pending' || complaint.status === 'InProgress'),
    [complaints]
  );

  const amenityNames = useMemo(
    () => new Map(amenities.map(amenity => [amenity.amenityId, amenity.name])),
    [amenities]
  );

  const recentActivities = useMemo(() => {
    const activities = [
      ...complaints.map(complaint => ({
        key: `complaint-${complaint.complaintId}`,
        type: 'complaint',
        message: `${complaint.raisedByName || 'A resident'} raised "${complaint.title}"`,
        timestamp: complaint.createdAt
      })),
      ...societyBookings.map(booking => ({
        key: `booking-${booking.bookingId}`,
        type: 'booking',
        message: `${booking.userName || 'A resident'} booked ${amenityNames.get(booking.amenityId) || 'an amenity'}`,
        timestamp: booking.createdAt || booking.startDate
      }))
    ];

    return activities
      .filter(activity => activity.timestamp)
      .sort((a, b) => (parseDate(b.timestamp)?.getTime() || 0) - (parseDate(a.timestamp)?.getTime() || 0));
  }, [complaints, societyBookings, amenityNames]);

  const visibleActivities = showAllActivities ? recentActivities : recentActivities.slice(0, 5);

  const revenueMonths = useMemo(() => {
    const now = new Date();
    const months = [];

    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      months.push({
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleString('en-IN', { month: 'short' }),
        total: 0
      });
    }

    const byKey = new Map(months.map(month => [month.key, month]));

    societyBookings.forEach(booking => {
      if (booking.paid !== true) return;
      const date = parseDate(booking.startDate || booking.createdAt);
      if (!date) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const month = byKey.get(key);
      if (month) month.total += Number(booking.amount) || 0;
    });

    return months;
  }, [societyBookings]);

  const maxRevenue = Math.max(...revenueMonths.map(month => month.total), 0);
  const currentRevenue = revenueMonths[revenueMonths.length - 1]?.total || 0;
  const previousRevenue = revenueMonths[revenueMonths.length - 2]?.total || 0;
  const revenueChange = previousRevenue > 0
    ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
    : null;

  const stats = [
    { icon: Building2, label: 'Total Flats', value: loading ? '—' : String(societyFlats.length), color: 'bg-blue-500' },
    { icon: Users, label: 'Residents', value: loading ? '—' : String(societyResidents.length), color: 'bg-green-500' },
    { icon: MessageSquare, label: 'Open Complaints', value: loading ? '—' : String(openComplaints.length), color: 'bg-red-500' },
    { icon: Calendar, label: 'Amenity Bookings', value: loading ? '—' : String(societyBookings.length), color: 'bg-purple-500' }
  ];

  const handleExportReport = async () => {
    setExporting(true);
    setError('');

    try {
      const report = await apiPost('/billingreport/generate', {});
      const rows = (Array.isArray(report) ? report : []).map(item => [
        item.flatNumber,
        item.name,
        item.phone,
        item.maintenanceCharges,
        item.pendingMaintenanceAmount,
        item.amenityCharges,
        item.pendingAmenityAmount,
        item.totalAmount,
        item.totalPendingAmount
      ]);

      downloadCsv(
        `billing-report-${new Date().toISOString().slice(0, 10)}.csv`,
        ['Flat', 'Resident', 'Phone', 'Maintenance', 'Pending Maintenance', 'Amenity', 'Pending Amenity', 'Total', 'Total Pending'],
        rows
      );
    } catch (err) {
      setError(err.message || 'Failed to generate the billing report.');
    } finally {
      setExporting(false);
    }
  };

  const handleOpenBills = async () => {
    setShowBillsModal(true);
    setBillsLoading(true);
    setError('');

    try {
      const allBills = await apiGet('/maintenance/bills');
      setBills((Array.isArray(allBills) ? allBills : []).filter(bill => flatIds.has(bill.flatId)));
    } catch (err) {
      setBills([]);
      setError(err.message || 'Failed to load maintenance bills.');
    } finally {
      setBillsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        subtitle={society?.name ? (
          <span className="flex items-center">
            <Building2 className="mr-1.5 h-4 w-4" />
            {society.name}
          </span>
        ) : undefined}
        actions={(
          <>
            <Button variant="secondary" onClick={handleExportReport} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export Report'}
            </Button>
            <Button variant="primary" onClick={() => navigate('/announcements')}>
              Create Announcement
            </Button>
          </>
        )}
      />

      {error && <Alert tone="danger">{error}</Alert>}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <div className="flex items-center">
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted">{stat.label}</p>
                  <p className="text-2xl font-semibold tracking-tight text-ink tabular-nums">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activities */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold tracking-tight text-ink">Recent Activities</h2>
            {recentActivities.length > 5 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAllActivities(value => !value)}
              >
                {showAllActivities ? 'Show Less' : 'View All'}
              </Button>
            )}
          </div>
          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-faint">Loading recent activity...</p>
            ) : visibleActivities.length === 0 ? (
              <p className="text-sm text-faint">No recent activity yet.</p>
            ) : (
              visibleActivities.map(activity => (
                <div key={activity.key} className="flex items-start space-x-3 p-3 bg-surface-muted rounded-xl">
                  <div className={`p-2 rounded-xl ${
                    activity.type === 'complaint'
                      ? 'bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300'
                      : 'bg-accent-soft text-accent'
                  }`}>
                    {activity.type === 'complaint'
                      ? <AlertTriangle className="h-4 w-4" />
                      : <Calendar className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-ink">{activity.message}</p>
                    <p className="text-xs text-faint mt-1">{timeAgo(activity.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card>
          <h2 className="text-lg font-semibold tracking-tight text-ink mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="primary" className="h-16" onClick={() => navigate('/residents')}>
              <span className="flex flex-col items-center gap-1">
                <Users className="h-5 w-5 shrink-0" />
                Add Resident
              </span>
            </Button>
            <Button variant="secondary" className="h-16" onClick={() => navigate('/security-staff')}>
              <span className="flex flex-col items-center gap-1">
                <ShieldCheck className="h-5 w-5 shrink-0" />
                Manage Staff
              </span>
            </Button>
            <Button variant="secondary" className="h-16" onClick={() => navigate('/complaints')}>
              <span className="flex flex-col items-center gap-1">
                <MessageSquare className="h-5 w-5 shrink-0" />
                Complaints
              </span>
            </Button>
            <Button variant="primary" className="h-16" onClick={() => navigate('/visitors')}>
              <span className="flex flex-col items-center gap-1">
                <UserCheck className="h-5 w-5 shrink-0" />
                Visitors
              </span>
            </Button>
            <Button
              variant="success"
              className="h-16"
              onClick={handleExportReport}
              disabled={exporting}
            >
              <span className="flex flex-col items-center gap-1">
                <FileText className="h-5 w-5 shrink-0" />
                Generate Bills
              </span>
            </Button>
            <Button variant="warning" className="h-16" onClick={handleOpenBills}>
              <span className="flex flex-col items-center gap-1">
                <Wrench className="h-5 w-5 shrink-0" />
                Maintenance
              </span>
            </Button>
          </div>
        </Card>
      </div>

      {/* Monthly Revenue */}
      <Card>
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-ink">Monthly Revenue</h2>
            <p className="text-sm text-faint mt-1">Paid amenity bookings in your society</p>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className={`h-5 w-5 ${revenueChange !== null && revenueChange < 0 ? 'text-red-600' : 'text-green-600'}`} />
            {loading ? (
              <span className="text-sm font-medium text-faint">Loading...</span>
            ) : revenueChange === null ? (
              <span className="text-sm font-medium text-faint">No prior month data</span>
            ) : (
              <span className={`text-sm font-medium ${revenueChange < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {revenueChange >= 0 ? '+' : ''}{revenueChange}% from last month
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-faint">Loading revenue...</p>
        ) : maxRevenue === 0 ? (
          <div className="h-64 bg-surface-muted rounded-xl flex items-center justify-center p-6">
            <p className="text-center text-faint">No paid bookings recorded in the last six months.</p>
          </div>
        ) : (
          <div className="flex items-end gap-2 h-64 sm:gap-4">
            {revenueMonths.map(month => (
              <div key={month.key} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-xs font-medium text-muted mb-1">
                  {month.total ? formatCurrency(month.total) : ''}
                </span>
                <div
                  className="w-full rounded-t-lg bg-primary"
                  style={{ height: `${Math.max((month.total / maxRevenue) * 100, 2)}%` }}
                  title={`${month.label}: ${formatCurrency(month.total)}`}
                />
                <span className="text-xs text-faint mt-2">{month.label}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Maintenance Bills Modal */}
      <Modal
        isOpen={showBillsModal}
        onClose={() => setShowBillsModal(false)}
        title="Maintenance Bills"
        size="lg"
      >
        {billsLoading ? (
          <p className="text-sm text-faint">Loading maintenance bills...</p>
        ) : bills.length === 0 ? (
          <p className="text-sm text-faint">No maintenance bills recorded for your society yet.</p>
        ) : (
          <Table headers={[
            { label: 'Flat', align: 'center' },
            { label: 'Period', align: 'left' },
            { label: 'Due Date', align: 'center' },
            { label: 'Amount', align: 'right' },
            { label: 'Status', align: 'center' }
          ]}>
            {bills.map(bill => (
              <tr key={bill.mbid}>
                <td className="font-medium text-ink text-center">
                  {flatNumberById.get(bill.flatId) || '—'}
                </td>
                <td className="text-muted">
                  {formatDate(bill.periodStart)} – {formatDate(bill.periodEnd)}
                </td>
                <td className="text-muted text-center">{formatDate(bill.dueDate)}</td>
                <td className="text-ink text-right">{formatCurrency(bill.amount)}</td>
                <td className="text-center">
                  <Badge tone={bill.paid ? 'success' : 'warning'}>
                    {bill.paid ? 'Paid' : 'Pending'}
                  </Badge>
                </td>
              </tr>
            ))}
          </Table>
        )}
        <div className="flex justify-end pt-4">
          <Button variant="secondary" onClick={() => setShowBillsModal(false)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
