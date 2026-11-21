import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { useLiveEvents } from '../hooks/useLiveEvents';
import Table from '../components/UI/Table';

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
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Visitors Log</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}
        <Table headers={[
          { label: 'Name', align: 'left' },
          { label: 'Flat', align: 'center' },
          { label: 'Purpose', align: 'left' },
          { label: 'Entry Time', align: 'left' },
          { label: 'Exit Time', align: 'left' },
          { label: 'Vehicle', align: 'center' },
          { label: 'Type', align: 'center' },
          { label: 'Recorded By', align: 'left' }
        ]}>
          {visitors.map(visitor => (
            <tr key={visitor.visitorId} className="hover:bg-gray-50">
              <td className="px-6 py-4 font-medium text-gray-900">{visitor.name}</td>
              <td className="px-6 py-4 text-center">{flats.find(f => f.flatId === visitor.flatId)?.flatNumber || '-'}</td>
              <td className="px-6 py-4">{visitor.purpose}</td>
              <td className="px-6 py-4">{visitor.entryTime ? new Date(visitor.entryTime).toLocaleString() : '-'}</td>
              <td className="px-6 py-4">{visitor.exitTime ? new Date(visitor.exitTime).toLocaleString() : '-'}</td>
              <td className="px-6 py-4 text-center">{visitor.vehicleNo || '-'}</td>
              <td className="px-6 py-4 text-center">{visitor.visitorType}</td>
              <td className="px-6 py-4">{visitor.recordedByName || '-'}</td>
            </tr>
          ))}
        </Table>
        {loading && <div className="text-gray-600 mt-4">Loading...</div>}
        {!loading && visitors.length === 0 && <div className="text-gray-600 mt-4">No visitors found.</div>}
    </div>
  );
};

export default VisitorsLogPage;
