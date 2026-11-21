import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  UserPlus,
  Clock,
  CheckCircle,
  Car,
  Search,
  Plus,
  Building2
} from 'lucide-react';
import { Alert, Badge, Button, Card, Input, Modal, PageHeader, Select, Table } from '../../components/UI';
import { useAuth } from '../../contexts/AuthContext';
import { useLiveEvents } from '../../hooks/useLiveEvents';
import { useSociety } from '../../hooks/useSociety';
import { apiGet, apiPost, apiPut } from '../../utils/api';
import { downloadCsv } from '../../utils/export';
import { formatDateTime, formatDuration, formatTime, isToday, parseDate } from '../../utils/format';

const emptyVisitor = {
  name: '',
  phone: '',
  flatId: '',
  purpose: '',
  vehicleNo: '',
  visitorType: 'guest'
};

const VISITOR_TYPE_TONES = {
  guest: 'success',
  delivery: 'warning',
  service: 'brand',
  vendor: 'neutral'
};

const SecurityDashboard = () => {
  const { user } = useAuth();
  const society = useSociety();
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [newVisitor, setNewVisitor] = useState(emptyVisitor);
  const [visitors, setVisitors] = useState([]);
  const [flats, setFlats] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyVisitorId, setBusyVisitorId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      const results = await Promise.allSettled([apiGet('/visitors'), apiGet('/flats')]);
      if (cancelled) return;

      const [visitorsResult, flatsResult] = results;

      if (visitorsResult.status === 'fulfilled') setVisitors(visitorsResult.value || []);
      if (flatsResult.status === 'fulfilled') setFlats(flatsResult.value || []);

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
  }, [refreshKey]);

  const handleLiveEvent = (event) => {
    const visitor = event?.data;
    if (!visitor?.visitorId) return;

    setVisitors(previous => {
      const index = previous.findIndex(item => item.visitorId === visitor.visitorId);
      if (index === -1) return [visitor, ...previous];

      const next = previous.slice();
      next[index] = { ...next[index], ...visitor };
      return next;
    });
  };

  const liveStatus = useLiveEvents({
    eventTypes: ['visitor.created', 'visitor.exited'],
    onEvent: handleLiveEvent,
    onReconnect: () => setRefreshKey(key => key + 1)
  });

  const liveBadge = liveStatus === 'open'
    ? { label: 'Live updates', tone: 'success', dot: 'bg-green-500 animate-pulse' }
    : liveStatus === 'unauthorized'
      ? { label: 'Sign in again', tone: 'danger', dot: 'bg-red-500' }
      : { label: 'Connecting...', tone: 'warning', dot: 'bg-amber-500' };

  const societyFlats = useMemo(
    () => (user?.societyId
      ? flats.filter(flat => flat.wing?.societyId === user.societyId)
      : flats),
    [flats, user?.societyId]
  );

  const flatNumberById = useMemo(() => {
    const map = new Map();
    societyFlats.forEach(flat => map.set(flat.flatId, flat.flatNumber));
    return map;
  }, [societyFlats]);

  const insideVisitors = useMemo(
    () => visitors.filter(visitor => !visitor.exitTime),
    [visitors]
  );

  const exitedVisitors = useMemo(
    () => visitors.filter(visitor => visitor.exitTime),
    [visitors]
  );

  const todaysEntries = useMemo(
    () => visitors.filter(visitor => isToday(visitor.entryTime)),
    [visitors]
  );

  const vehiclesParked = useMemo(
    () => insideVisitors.filter(visitor => visitor.vehicleNo?.trim()).length,
    [insideVisitors]
  );

  const averageVisitDuration = useMemo(() => {
    const durations = exitedVisitors
      .map(visitor => {
        const entry = parseDate(visitor.entryTime);
        const exit = parseDate(visitor.exitTime);
        return entry && exit ? exit.getTime() - entry.getTime() : 0;
      })
      .filter(duration => duration > 0);

    if (durations.length === 0) return '—';

    const average = durations.reduce((sum, duration) => sum + duration, 0) / durations.length;
    return formatDuration(new Date(0), new Date(average));
  }, [exitedVisitors]);

  const visibleInsideVisitors = useMemo(() => {
    const term = search.trim().toLowerCase();

    return insideVisitors
      .filter(visitor => {
        if (!term) return true;
        const flatNumber = flatNumberById.get(visitor.flatId) || '';
        return [visitor.name, visitor.purpose, visitor.phone, visitor.vehicleNo, flatNumber]
          .some(value => (value || '').toLowerCase().includes(term));
      })
      .sort((a, b) => (parseDate(b.entryTime)?.getTime() || 0) - (parseDate(a.entryTime)?.getTime() || 0));
  }, [insideVisitors, search, flatNumberById]);

  const recentExits = useMemo(
    () => [...exitedVisitors]
      .sort((a, b) => (parseDate(b.exitTime)?.getTime() || 0) - (parseDate(a.exitTime)?.getTime() || 0))
      .slice(0, 5),
    [exitedVisitors]
  );

  const stats = [
    { icon: Users, label: 'Visitors Inside', value: loading ? '—' : String(insideVisitors.length), color: 'bg-blue-500' },
    { icon: UserPlus, label: "Today's Entries", value: loading ? '—' : String(todaysEntries.length), color: 'bg-green-500' },
    { icon: Clock, label: 'Avg. Visit Duration', value: loading ? '—' : averageVisitDuration, color: 'bg-yellow-500' },
    { icon: Car, label: 'Vehicles Parked', value: loading ? '—' : String(vehiclesParked), color: 'bg-purple-500' }
  ];

  const handleVisitorEntry = async (event) => {
    event.preventDefault();

    if (!newVisitor.flatId) {
      setError('Please select a flat for the visitor.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const created = await apiPost('/visitors', {
        flatId: Number(newVisitor.flatId),
        name: newVisitor.name.trim(),
        visitorType: newVisitor.visitorType,
        phone: newVisitor.phone.trim(),
        vehicleNo: newVisitor.vehicleNo.trim(),
        purpose: newVisitor.purpose.trim(),
        entryTime: new Date().toISOString(),
        recordedBy: user?.userId
      });

      setVisitors(previous => [created, ...previous]);
      setNewVisitor(emptyVisitor);
      setShowVisitorModal(false);
    } catch (err) {
      setError(err.message || 'Failed to register visitor entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVisitorExit = async (visitorId) => {
    setBusyVisitorId(visitorId);
    setError('');

    try {
      const updated = await apiPut(`/visitors/exit/${visitorId}`);
      setVisitors(previous => previous.map(visitor => (
        visitor.visitorId === visitorId ? { ...visitor, ...updated } : visitor
      )));
    } catch (err) {
      setError(err.message || 'Failed to mark visitor exit.');
    } finally {
      setBusyVisitorId(null);
    }
  };

  const handleExportLog = () => {
    const rows = visitors.map(visitor => [
      visitor.name,
      flatNumberById.get(visitor.flatId) || '',
      visitor.phone || '',
      visitor.purpose || '',
      visitor.visitorType || '',
      visitor.vehicleNo || '',
      formatDateTime(visitor.entryTime),
      visitor.exitTime ? formatDateTime(visitor.exitTime) : '',
      visitor.exitTime ? formatDuration(visitor.entryTime, visitor.exitTime) : ''
    ]);

    downloadCsv(
      `visitor-log-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Name', 'Flat', 'Phone', 'Purpose', 'Type', 'Vehicle', 'Entry Time', 'Exit Time', 'Duration'],
      rows
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Dashboard"
        subtitle={society?.name ? (
          <span className="flex items-center">
            <Building2 className="mr-1.5 h-4 w-4" />
            {society.name}
          </span>
        ) : undefined}
        actions={(
          <>
            <Badge tone={liveBadge.tone}>
              <span aria-hidden="true" className={`h-2 w-2 rounded-full ${liveBadge.dot}`} />
              {liveBadge.label}
            </Badge>
            <Button onClick={() => setShowVisitorModal(true)}>
              <Plus className="h-4 w-4" />
              New Visitor Entry
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

      {/* Search Bar */}
      <Card padding="sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-faint h-4 w-4" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search visitors by name, flat number, or purpose..."
            className="w-full rounded-xl border border-line-strong bg-surface py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-faint transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </Card>

      {/* Current Visitors */}
      <Card>
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-ink">Current Visitors</h2>
            <Badge tone="brand">{loading ? '…' : insideVisitors.length} Inside</Badge>
          </div>
          <Button variant="secondary" size="sm" onClick={handleExportLog} disabled={visitors.length === 0}>
            Export Log
          </Button>
        </div>

        <Table headers={[
          { label: 'Name', align: 'left' },
          { label: 'Flat', align: 'center' },
          { label: 'Purpose', align: 'left' },
          { label: 'Entry Time', align: 'center' },
          { label: 'Vehicle', align: 'center' },
          { label: 'Type', align: 'center' },
          { label: 'Actions', align: 'center' }
        ]}>
          {loading ? (
            <tr>
              <td colSpan={7} className="text-center text-faint">Loading visitors...</td>
            </tr>
          ) : visibleInsideVisitors.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center text-faint">
                {search ? 'No visitors match your search.' : 'No visitors currently inside.'}
              </td>
            </tr>
          ) : (
            visibleInsideVisitors.map(visitor => (
              <tr key={visitor.visitorId}>
                <td>
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-accent-soft rounded-full flex items-center justify-center mr-3">
                      <Users className="h-4 w-4 text-accent" />
                    </div>
                    <span className="font-medium text-ink">{visitor.name}</span>
                  </div>
                </td>
                <td className="font-medium text-ink text-center">
                  {flatNumberById.get(visitor.flatId) || '—'}
                </td>
                <td className="text-muted">{visitor.purpose}</td>
                <td className="text-muted text-center">{formatTime(visitor.entryTime)}</td>
                <td className="text-center">
                  {visitor.vehicleNo ? (
                    <div className="flex items-center justify-center space-x-2">
                      <Car className="h-4 w-4 text-faint" />
                      <span className="text-muted">{visitor.vehicleNo}</span>
                    </div>
                  ) : (
                    <span className="text-faint">No vehicle</span>
                  )}
                </td>
                <td className="text-center">
                  <Badge tone={VISITOR_TYPE_TONES[visitor.visitorType] || 'neutral'}>
                    {visitor.visitorType}
                  </Badge>
                </td>
                <td className="text-center">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleVisitorExit(visitor.visitorId)}
                    disabled={busyVisitorId === visitor.visitorId}
                  >
                    {busyVisitorId === visitor.visitorId ? 'Exiting...' : 'Exit'}
                  </Button>
                </td>
              </tr>
            ))
          )}
        </Table>
      </Card>

      {/* Recent Exits */}
      <Card>
        <h2 className="text-lg font-semibold tracking-tight text-ink mb-6">Recent Exits</h2>
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-faint">Loading exits...</p>
          ) : recentExits.length === 0 ? (
            <p className="text-sm text-faint">No visitor exits recorded yet.</p>
          ) : (
            recentExits.map(exit => (
              <div key={exit.visitorId} className="flex flex-col gap-3 p-4 bg-surface-muted rounded-xl sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-surface-hover rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-muted" />
                  </div>
                  <div>
                    <p className="font-medium text-ink">{exit.name}</p>
                    <p className="text-sm text-muted">
                      Flat: {flatNumberById.get(exit.flatId) || '—'}
                    </p>
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="font-medium text-ink">{formatDateTime(exit.exitTime)}</p>
                  <p className="text-sm text-muted">
                    Duration: {formatDuration(exit.entryTime, exit.exitTime)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Visitor Entry Modal */}
      <Modal
        isOpen={showVisitorModal}
        onClose={() => setShowVisitorModal(false)}
        title="New Visitor Entry"
        size="lg"
      >
        <form onSubmit={handleVisitorEntry} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Visitor Name"
              value={newVisitor.name}
              onChange={(e) => setNewVisitor({ ...newVisitor, name: e.target.value })}
              placeholder="Enter visitor's full name"
              required
            />
            <Input
              label="Phone Number"
              value={newVisitor.phone}
              onChange={(e) => setNewVisitor({ ...newVisitor, phone: e.target.value })}
              placeholder="Enter phone number"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Flat"
              value={newVisitor.flatId}
              onChange={(e) => setNewVisitor({ ...newVisitor, flatId: e.target.value })}
              helperText={!loading && societyFlats.length === 0 ? 'No flats are available for your society.' : undefined}
              required
            >
              <option value="">Select a flat</option>
              {societyFlats.map(flat => (
                <option key={flat.flatId} value={flat.flatId}>
                  {flat.flatNumber}{flat.wing?.name ? ` — ${flat.wing.name}` : ''}
                </option>
              ))}
            </Select>
            <Select
              label="Visitor Type"
              value={newVisitor.visitorType}
              onChange={(e) => setNewVisitor({ ...newVisitor, visitorType: e.target.value })}
            >
              <option value="guest">Guest</option>
              <option value="delivery">Delivery</option>
              <option value="service">Service</option>
              <option value="vendor">Vendor</option>
            </Select>
          </div>

          <Input
            label="Purpose of Visit"
            value={newVisitor.purpose}
            onChange={(e) => setNewVisitor({ ...newVisitor, purpose: e.target.value })}
            placeholder="Brief description of visit purpose"
            required
          />

          <Input
            label="Vehicle Number (Optional)"
            value={newVisitor.vehicleNo}
            onChange={(e) => setNewVisitor({ ...newVisitor, vehicleNo: e.target.value })}
            placeholder="e.g., MH01AB1234"
          />

          <div className="flex flex-wrap justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowVisitorModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Registering...' : 'Register Entry'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SecurityDashboard;
