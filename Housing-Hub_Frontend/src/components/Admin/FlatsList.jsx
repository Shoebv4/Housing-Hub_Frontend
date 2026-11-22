import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';
import { Alert, Badge, Button, Input, Select, Table } from '../UI';
import { useAuth } from '../../contexts/AuthContext';

const FLAT_STATUS_TONES = {
  Registered: 'success',
  Pending: 'warning'
};

const FlatsList = () => {
  const { user } = useAuth();
  const [flats, setFlats] = useState([]);
  const [wings, setWings] = useState([]);
  const [society, setSociety] = useState(null);
  const [filterWing, setFilterWing] = useState('');
  const [form, setForm] = useState({ flatNumber: '', floorNumber: '', area: '', status: 'Pending', wingId: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  // Fetch admin's society info
  const fetchSociety = async () => {
    if (!user?.societyId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/societies/${user.societyId}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to load society');
      const data = await res.json();
      setSociety(data);
    } catch {
      setSociety(null);
    }
  };

  // Fetch wings for admin's society only
  const fetchWings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/wings`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to load wings');
      const data = await res.json();
      setWings(data.filter(w => w.societyId === user.societyId));
    } catch {
      setWings([]);
    }
  };

  // Fetch flats for admin's society only (by filtering wings)
  const fetchFlats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/flats`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to load flats');
      const data = await res.json();
      // Only flats whose wingId is in the admin's society wings
      const allowedWingIds = wings.map(w => w.wingId);
      setFlats(data.filter(f => allowedWingIds.includes(f.wingId)));
    } catch {
      setError('Failed to load flats');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSociety();
    // Fetch wings first, then flats (so we can filter by allowed wings)
    (async () => {
      await fetchWings();
    })();
    // eslint-disable-next-line
  }, [user?.societyId]);

  useEffect(() => {
    if (wings.length > 0) fetchFlats();
    // eslint-disable-next-line
  }, [wings]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        flatNumber: form.flatNumber,
        floorNumber: form.floorNumber,
        area: form.area ? parseFloat(form.area) : null,
        status: form.status,
        wingId: form.wingId ? parseInt(form.wingId, 10) : null
      };
      if (editingId) payload.flatId = editingId;
      // Only allow adding/editing flats for wings in admin's society
      if (!wings.some(w => w.wingId === payload.wingId)) {
        setError('You can only add or edit flats for your own society.');
        setLoading(false);
        return;
      }
      const url = editingId ? `${API_BASE_URL}/flats/${editingId}` : `${API_BASE_URL}/flats`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save flat');
      setForm({ flatNumber: '', floorNumber: '', area: '', status: 'Pending', wingId: '' });
      setEditingId(null);
      fetchFlats();
    } catch {
      setError('Failed to save flat');
    }
    setLoading(false);
  };

  const handleEdit = flat => {
    setForm({
      flatNumber: flat.flatNumber,
      floorNumber: flat.floorNumber,
      area: flat.area || '',
      status: flat.status,
      wingId: flat.wingId ? String(flat.wingId) : ''
    });
    setEditingId(flat.flatId);
  };

  const handleDelete = async id => {
    // Only allow deleting flats for wings in admin's society
    const flat = flats.find(f => f.flatId === id);
    if (!flat || !wings.some(w => w.wingId === flat.wingId)) {
      setError('You can only delete flats for your own society.');
      return;
    }
    if (!window.confirm('Delete this flat?')) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/flats/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchFlats();
    } catch {
      setError('Failed to delete flat');
    }
    setLoading(false);
  };

  const filteredFlats = filterWing
    ? flats.filter(f => String(f.wingId) === filterWing)
    : flats;

  return (
    <div>
      {society && (
        <div className="mb-4 rounded-xl border border-line bg-surface-muted p-3 text-ink">
          <span className="font-medium">Society:</span> {society.name}
        </div>
      )}
      <form onSubmit={handleSubmit} className="form-row">
        <Input label="Flat number" id="flat-flatNumber" name="flatNumber" value={form.flatNumber} onChange={handleChange} placeholder="Flat number" required />
        <Input label="Floor number" id="flat-floorNumber" name="floorNumber" value={form.floorNumber} onChange={handleChange} placeholder="Floor number" required />
        <Input label="Area (sq ft)" id="flat-area" name="area" value={form.area} onChange={handleChange} placeholder="Area (sq ft)" type="number" min="0" step="0.01" required />
        <Select label="Status" id="flat-status" name="status" value={form.status} onChange={handleChange} required>
          <option value="Pending">Pending</option>
          <option value="Registered">Registered</option>
        </Select>
        <Select label="Wing" id="flat-wingId" name="wingId" value={form.wingId} onChange={handleChange} required>
          <option value="">Select wing</option>
          {wings.map(w => (
            <option key={w.wingId} value={w.wingId}>{w.name}</option>
          ))}
        </Select>
        <Button type="submit" variant="primary" disabled={loading}>
          {editingId ? 'Update Flat' : 'Add Flat'}
        </Button>
        {editingId && (
          <Button type="button" variant="secondary" onClick={() => { setForm({ flatNumber: '', floorNumber: '', area: '', status: 'Pending', wingId: '' }); setEditingId(null); }}>
            Cancel
          </Button>
        )}
      </form>
      <div className="mb-4 w-full sm:w-56">
        <Select label="Filter by wing" value={filterWing} onChange={e => setFilterWing(e.target.value)}>
          <option value="">All wings</option>
          {wings.map(w => (
            <option key={w.wingId} value={w.wingId}>{w.name}</option>
          ))}
        </Select>
      </div>
      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
      <Table
        className="text-center"
        headers={[
          { label: 'Flat No.', align: 'center' },
          { label: 'Floor No.', align: 'center' },
          { label: 'Area (sq ft)', align: 'center' },
          { label: 'Status', align: 'center' },
          { label: 'Wing', align: 'center' },
          { label: 'Actions', align: 'center' }
        ]}
      >
        {filteredFlats.map(flat => (
          <tr key={flat.flatId}>
            <td className="font-medium text-ink">{flat.flatNumber}</td>
            <td>{flat.floorNumber}</td>
            <td>{flat.area}</td>
            <td>
              <Badge tone={FLAT_STATUS_TONES[flat.status] || 'neutral'}>{flat.status}</Badge>
            </td>
            <td>{wings.find(w => w.wingId === flat.wingId)?.name || '-'}</td>
            <td>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button type="button" variant="secondary" onClick={() => handleEdit(flat)} size="sm">Edit</Button>
                <Button type="button" variant="danger" onClick={() => handleDelete(flat.flatId)} size="sm">Delete</Button>
              </div>
            </td>
          </tr>
        ))}
        {filteredFlats.length === 0 && (
          <tr><td colSpan={6} className="text-center text-muted">No flats have been added yet</td></tr>
        )}
      </Table>
    </div>
  );
};

export default FlatsList;
