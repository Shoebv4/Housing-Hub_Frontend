import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  Calendar,
  FileText,
  Users,
  CheckCircle,
  Clock,
  Plus
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Modal from '../../components/UI/Modal';
import Input from '../../components/UI/Input';
import { useAuth } from '../../contexts/AuthContext';
import { useLiveEvents } from '../../hooks/useLiveEvents';
import { apiGet, apiPost } from '../../utils/api';
import { formatCurrency, formatTime, parseDate, timeAgo } from '../../utils/format';

const emptyComplaint = {
  title: '',
  description: '',
  category: 'maintenance'
};

const ResidentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [showBillsModal, setShowBillsModal] = useState(false);
  const [newComplaint, setNewComplaint] = useState(emptyComplaint);
  const [submitting, setSubmitting] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [billing, setBilling] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      const results = await Promise.allSettled([
        apiGet('/complaints'),
        apiGet('/bookings'),
        apiPost('/billingreport/generate', {}),
        apiGet('/announcements'),
        apiGet('/visitors'),
        apiGet('/flats')
      ]);
      if (cancelled) return;

      const [complaintsResult, bookingsResult, billingResult, announcementsResult, visitorsResult, flatsResult] = results;

      if (complaintsResult.status === 'fulfilled') setComplaints(complaintsResult.value || []);
      if (bookingsResult.status === 'fulfilled') setBookings(bookingsResult.value || []);
      if (billingResult.status === 'fulfilled') setBilling(billingResult.value || []);
      if (announcementsResult.status === 'fulfilled') setAnnouncements(announcementsResult.value || []);
      if (visitorsResult.status === 'fulfilled') setVisitors(visitorsResult.value || []);
      if (flatsResult.status === 'fulfilled') setFlats(flatsResult.value || []);

      // Billing can legitimately be unavailable when the resident has no occupied flat,
      // so only surface failures from the other dashboard feeds.
      const failure = [
        complaintsResult,
        bookingsResult,
        announcementsResult,
        visitorsResult,
        flatsResult
      ].find(result => result.status === 'rejected');

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

  const refreshVisitors = async () => {
    try {
      const data = await apiGet('/visitors');
      setVisitors(data || []);
    } catch {
      // Keep the current data when a background refresh fails.
    }
  };

  const refreshAnnouncements = async () => {
    try {
      const data = await apiGet('/announcements');
      setAnnouncements(data || []);
    } catch {
      // Keep the current data when a background refresh fails.
    }
  };

  const refreshBilling = async () => {
    try {
      const data = await apiPost('/billingreport/generate', {});
      setBilling(data || []);
    } catch {
      // Keep the current data when a background refresh fails.
    }
  };

  const handleLiveEvent = (event) => {
    if (event.type === 'visitor.created' || event.type === 'visitor.exited') {
      const visitor = event.data;
      if (!visitor?.visitorId) return;

      setVisitors(previous => {
        const index = previous.findIndex(item => item.visitorId === visitor.visitorId);
        if (index === -1) return [visitor, ...previous];

        const next = previous.slice();
        next[index] = { ...next[index], ...visitor };
        return next;
      });
      return;
    }

    if (event.type === 'announcement.created') {
      refreshAnnouncements();
    } else if (event.type === 'bill.created') {
      refreshBilling();
    }
  };

  useLiveEvents({
    eventTypes: ['visitor.created', 'visitor.exited', 'announcement.created', 'bill.created'],
    onEvent: handleLiveEvent,
    onReconnect: () => {
      refreshVisitors();
      refreshAnnouncements();
      refreshBilling();
    }
  });

  const myComplaints = complaints.filter(complaint => complaint.raisedBy === user?.userId);
  const openComplaints = myComplaints.filter(
    complaint => !['Resolved', 'Closed', 'Rejected'].includes(complaint.status)
  );

  const myBookings = bookings.filter(booking => booking.userId === user?.userId);
  const activeBookings = myBookings.filter(booking => {
    if (['Rejected', 'Cancelled'].includes(booking.status)) return false;
    const endDate = parseDate(booking.endDate);
    return !endDate || endDate >= new Date(new Date().setHours(0, 0, 0, 0));
  });

  const billingReport = Array.isArray(billing) ? billing[0] : billing;
  const pendingAmount = Number(billingReport?.totalPendingAmount) || 0;
  const paidAmount = Math.max((Number(billingReport?.totalAmount) || 0) - pendingAmount, 0);

  const myFlat = flats.find(flat => flat.flatId === user?.flatId);
  const myWingId = myFlat?.wingId ?? myFlat?.wing?.wingId;

  const visibleAnnouncements = announcements
    .filter(announcement => {
      if (announcement.isGlobal) {
        return announcement.societyId == null || announcement.societyId === user?.societyId;
      }
      if (announcement.societyId !== user?.societyId) return false;
      if ((announcement.targetFlatIds || []).includes(user?.flatId)) return true;
      if (myWingId && (announcement.targetWingIds || []).map(Number).includes(Number(myWingId))) return true;
      return false;
    })
    .sort((a, b) => (parseDate(b.createdAt)?.getTime() || 0) - (parseDate(a.createdAt)?.getTime() || 0))
    .slice(0, 3);

  const recentVisitors = [...visitors]
    .sort((a, b) => (parseDate(b.entryTime)?.getTime() || 0) - (parseDate(a.entryTime)?.getTime() || 0))
    .slice(0, 3);

  const stats = [
    { icon: CheckCircle, label: 'Bills Paid', value: loading ? '—' : formatCurrency(paidAmount), color: 'bg-green-500' },
    { icon: Clock, label: 'Pending Bills', value: loading ? '—' : formatCurrency(pendingAmount), color: 'bg-yellow-500' },
    { icon: MessageSquare, label: 'Open Complaints', value: loading ? '—' : String(openComplaints.length), color: 'bg-blue-500' },
    { icon: Calendar, label: 'Active Bookings', value: loading ? '—' : String(activeBookings.length), color: 'bg-purple-500' }
  ];

  const handleSubmitComplaint = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const created = await apiPost('/complaints', {
        title: newComplaint.title,
        description: newComplaint.description,
        category: newComplaint.category
      });
      setComplaints(previous => [created, ...previous]);
      setNewComplaint(emptyComplaint);
      setShowComplaintModal(false);
    } catch (err) {
      setError(err.message || 'Failed to submit complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here's what's happening</p>
        </div>
        <Button onClick={() => setShowComplaintModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Raise Complaint
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

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
        {/* Announcements */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Latest Announcements</h2>
            <Link to="/announcements" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-gray-500">Loading announcements...</p>
            ) : visibleAnnouncements.length === 0 ? (
              <p className="text-sm text-gray-500">No announcements for your flat yet.</p>
            ) : (
              visibleAnnouncements.map(announcement => (
                <div key={announcement.aid} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{announcement.title}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      announcement.isGlobal
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {announcement.isGlobal ? 'Global' : 'Society'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{announcement.content}</p>
                  <p className="text-xs text-gray-500">{timeAgo(announcement.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Recent Visitors */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Visitors</h2>
            <Link to="/visitors" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View All
            </Link>
          </div>
          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-gray-500">Loading visitors...</p>
            ) : recentVisitors.length === 0 ? (
              <p className="text-sm text-gray-500">No visitors recorded for your flat yet.</p>
            ) : (
              recentVisitors.map(visitor => (
                <div key={visitor.visitorId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{visitor.name}</p>
                      <p className="text-sm text-gray-600">{visitor.purpose}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">{formatTime(visitor.entryTime)}</p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      visitor.exitTime
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {visitor.exitTime ? 'Exited' : 'Inside'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="primary" className="h-16 flex-col" onClick={() => navigate('/amenities')}>
            <Calendar className="h-5 w-5 mb-1" />
            Book Amenity
          </Button>
          <Button variant="secondary" className="h-16 flex-col" onClick={() => setShowBillsModal(true)}>
            <FileText className="h-5 w-5 mb-1" />
            View Bills
          </Button>
          <Button variant="warning" className="h-16 flex-col" onClick={() => navigate('/complaints')}>
            <MessageSquare className="h-5 w-5 mb-1" />
            My Complaints
          </Button>
          <Button variant="success" className="h-16 flex-col" onClick={() => navigate('/visitors')}>
            <Users className="h-5 w-5 mb-1" />
            Visitors
          </Button>
        </div>
      </Card>

      {/* Bills Modal */}
      <Modal
        isOpen={showBillsModal}
        onClose={() => setShowBillsModal(false)}
        title="My Bills"
      >
        {billingReport ? (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Flat</span>
              <span className="font-medium text-gray-900">{billingReport.flatNumber || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Maintenance charges</span>
              <span className="text-gray-900">{formatCurrency(billingReport.maintenanceCharges)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending maintenance</span>
              <span className="text-gray-900">{formatCurrency(billingReport.pendingMaintenanceAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amenity charges</span>
              <span className="text-gray-900">{formatCurrency(billingReport.amenityCharges)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pending amenity</span>
              <span className="text-gray-900">{formatCurrency(billingReport.pendingAmenityAmount)}</span>
            </div>
            <hr className="border-gray-200" />
            <div className="flex justify-between font-semibold text-gray-900">
              <span>Total</span>
              <span>{formatCurrency(billingReport.totalAmount)}</span>
            </div>
            <div className="flex justify-between font-semibold text-red-600">
              <span>Outstanding</span>
              <span>{formatCurrency(billingReport.totalPendingAmount)}</span>
            </div>
            <p className="text-xs text-gray-500">Online payment is not available yet.</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">No billing information is available for your flat.</p>
        )}
        <div className="flex justify-end pt-4">
          <Button variant="secondary" onClick={() => setShowBillsModal(false)}>Close</Button>
        </div>
      </Modal>

      {/* Complaint Modal */}
      <Modal
        isOpen={showComplaintModal}
        onClose={() => setShowComplaintModal(false)}
        title="Raise New Complaint"
      >
        <form className="space-y-4" onSubmit={handleSubmitComplaint}>
          <Input
            label="Title"
            value={newComplaint.title}
            onChange={(e) => setNewComplaint({ ...newComplaint, title: e.target.value })}
            placeholder="Brief description of the issue"
            required
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Category</label>
            <select
              value={newComplaint.category}
              onChange={(e) => setNewComplaint({ ...newComplaint, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="maintenance">Maintenance</option>
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="security">Security</option>
              <option value="cleaning">Cleaning</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={newComplaint.description}
              onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Detailed description of the issue..."
              required
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowComplaintModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ResidentDashboard;
