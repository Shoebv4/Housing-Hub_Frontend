import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useLiveEvents } from '../hooks/useLiveEvents';
import { Alert, Badge, PageHeader, Table } from '../components/UI';
import { formatVisitorType } from '../utils/format';

const VisitorsLogPage = () => {
  const { user } = useAuth();
  const [flats, setFlats] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  useEffect(() => {
    fetchFlats();
    // fetchVisitors will be called after flats are loaded
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (user && (user.role === 'resident' ? flats.length > 0 : true)) {
      fetchVisitors();
    }
    // eslint-disable-next-line
  }, [flats]);

  const fetchFlats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/flats`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load flats');
      setFlats(await res.json());
    } catch {
      setFlats([]);
    }
  };

  const fetchVisitors = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/visitors`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load visitors');
      let data = await res.json();
      if (user.role === 'resident') {
        // Only show visitors for resident's flat(s)
        const userFlatIds = user.flatId ? [user.flatId] : flats.filter(f => f.ownerId === user.userId).map(f => f.flatId);
        data = data.filter(v => userFlatIds.includes(v.flatId));
      }
      setVisitors(data);
    } catch (err) {
      setError(err.message || 'Error loading visitors');
    }
    setLoading(false);
  };

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

  useLiveEvents({
    eventTypes: ['visitor.created', 'visitor.exited'],
    onEvent: handleLiveEvent,
    onReconnect: fetchVisitors
  });

  return (
    <div className="page-container">
      <PageHeader
        backTo="/dashboard"
        title={user.role === 'security_staff' ? 'Visitor Log' : 'Visitors'}
        subtitle={
          user.role === 'resident'
            ? 'See visitors registered for your flat'
            : user.role === 'security_staff'
              ? 'Review recorded visitor entries and exits'
              : 'Review visitor activity across your society'
        }
      />
      {error && <Alert tone="danger">{error}</Alert>}
        <Table headers={[
          { label: 'Name', align: 'left' },
          { label: 'Flat No.', align: 'center' },
          { label: 'Purpose', align: 'left' },
          { label: 'Entry Time', align: 'left' },
          { label: 'Exit Time', align: 'left' },
          { label: 'Vehicle', align: 'center' },
          { label: 'Type', align: 'center' },
          { label: 'Recorded By', align: 'left' }
        ]}>
          {visitors.map(visitor => (
            <tr key={visitor.visitorId}>
              <td className="font-medium text-ink">{visitor.name}</td>
              <td className="text-center">{flats.find(f => f.flatId === visitor.flatId)?.flatNumber || '-'}</td>
              <td>{visitor.purpose}</td>
              <td>{visitor.entryTime ? new Date(visitor.entryTime).toLocaleString() : '-'}</td>
              <td>{visitor.exitTime ? new Date(visitor.exitTime).toLocaleString() : '-'}</td>
              <td className="text-center">{visitor.vehicleNo || '-'}</td>
              <td className="text-center">
                <Badge tone="neutral">{formatVisitorType(visitor.visitorType)}</Badge>
              </td>
              <td>{visitor.recordedByName || '-'}</td>
            </tr>
          ))}
        </Table>
        {loading && <div className="text-muted">Loading...</div>}
        {!loading && visitors.length === 0 && (
          <div className="text-muted">
            {user.role === 'resident'
              ? 'No visitors recorded for your flat yet'
              : user.role === 'security_staff'
                ? 'No visitor records yet'
                : 'No visitor activity recorded yet'}
          </div>
        )}
    </div>
  );
};

export default VisitorsLogPage;
