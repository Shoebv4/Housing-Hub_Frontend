import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Users,
  MessageSquare,
  Wrench,
  Calendar,
  FileText,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import { useAuth } from '../../contexts/AuthContext';
import { apiGet } from '../../utils/api';
import { formatCurrency, parseDate, timeAgo } from '../../utils/format';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [flats, setFlats] = useState([]);
  const [users, setUsers] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      .sort((a, b) => (parseDate(b.timestamp)?.getTime() || 0) - (parseDate(a.timestamp)?.getTime() || 0))
      .slice(0, 5);
  }, [complaints, societyBookings, amenityNames]);

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your society operations</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="secondary">Export Report</Button>
          <Button variant="primary">Create Announcement</Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Add Security Staff Management Link */}
      <div className="mb-6">
        <Link to="/security-staff" className="btn btn-primary">
          Manage Security Staff
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
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
            <h2 className="text-xl font-semibold text-gray-900">Recent Activities</h2>
            <Button variant="secondary" size="sm">View All</Button>
          </div>
          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-gray-500">Loading recent activity...</p>
            ) : recentActivities.length === 0 ? (
              <p className="text-sm text-gray-500">No recent activity yet.</p>
            ) : (
              recentActivities.map(activity => (
                <div key={activity.key} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`p-2 rounded-lg ${
                    activity.type === 'complaint'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-purple-100 text-purple-600'
                  }`}>
                    {activity.type === 'complaint'
                      ? <AlertTriangle className="h-4 w-4" />
                      : <Calendar className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{timeAgo(activity.timestamp)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Button variant="primary" className="h-16 flex-col">
              <Users className="h-5 w-5 mb-1" />
              Add Resident
            </Button>
            <Button variant="secondary" className="h-16 flex-col">
              <MessageSquare className="h-5 w-5 mb-1" />
              View Complaints
            </Button>
            <Button variant="success" className="h-16 flex-col">
              <FileText className="h-5 w-5 mb-1" />
              Generate Bills
            </Button>
            <Button variant="warning" className="h-16 flex-col">
              <Wrench className="h-5 w-5 mb-1" />
              Maintenance
            </Button>
          </div>
        </Card>
      </div>

      {/* Monthly Revenue */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Monthly Revenue</h2>
            <p className="text-sm text-gray-500 mt-1">Paid amenity bookings in your society</p>
          </div>
          <div className="flex items-center space-x-2">
            <TrendingUp className={`h-5 w-5 ${revenueChange !== null && revenueChange < 0 ? 'text-red-600' : 'text-green-600'}`} />
            {loading ? (
              <span className="text-sm font-medium text-gray-500">Loading...</span>
            ) : revenueChange === null ? (
              <span className="text-sm font-medium text-gray-500">No prior month data</span>
            ) : (
              <span className={`text-sm font-medium ${revenueChange < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {revenueChange >= 0 ? '+' : ''}{revenueChange}% from last month
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Loading revenue...</p>
        ) : maxRevenue === 0 ? (
          <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">No paid bookings recorded in the last six months.</p>
          </div>
        ) : (
          <div className="flex items-end gap-4 h-64">
            {revenueMonths.map(month => (
              <div key={month.key} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-xs font-medium text-gray-600 mb-1">
                  {month.total ? formatCurrency(month.total) : ''}
                </span>
                <div
                  className="w-full rounded-t bg-blue-500"
                  style={{ height: `${Math.max((month.total / maxRevenue) * 100, 2)}%` }}
                  title={`${month.label}: ${formatCurrency(month.total)}`}
                />
                <span className="text-xs text-gray-500 mt-2">{month.label}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminDashboard;
