import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';
import { Alert, Badge, Button, Input, Select, Table } from '../UI';
import { useAuth } from '../../contexts/AuthContext';

const ResidentsList = () => {
  const { user } = useAuth();
  const [residents, setResidents] = useState([]);
  const [flats, setFlats] = useState([]);
  const [wings, setWings] = useState([]);
  const [society, setSociety] = useState(null);
  const [filterWing, setFilterWing] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', flatId: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

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

  // Fetch flats for admin's society only
  const fetchFlats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/flats`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to load flats');
      const data = await res.json();
      setFlats(data.filter(f => f.wing && f.wing.societyId === user.societyId));
    } catch {
      setFlats([]);
    }
  };

  // Fetch residents for admin's society only
  const fetchResidents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to load residents');
      const data = await res.json();
      setResidents(data.filter(r => r.role === 'resident' && r.societyId === user.societyId));
    } catch {
      setError('Failed to load residents');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSociety();
    fetchWings();
    fetchFlats();
    fetchResidents();
    // eslint-disable-next-line
  }, [user?.societyId]);

  // Filter residents by selected wing
  const filteredResidents = filterWing
    ? residents.filter(r => {
        const flat = flats.find(f => f.flatId === r.flatId);
        return flat && String(flat.wingId) === filterWing;
      })
    : residents;

  const handleChange = e => {
    const { name, value } = e.target;
    if (name === 'phone') {
      if (!/^\d{0,10}$/.test(value)) return;
      setPhoneError(value.length === 10 ? '' : 'Phone number must be exactly 10 digits');
    }
    if (name === 'email') {
      setEmailError(value.includes('@') && value.endsWith('.com') ? '' : 'Email must contain @ and end with .com');
    }
    if (name === 'password') {
      const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
      setPasswordError(passwordPattern.test(value)
        ? ''
        : 'Password must have 1 uppercase, 1 lowercase, 1 number, 1 special character');
    }
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (!/^\d{10}$/.test(form.phone)) {
      setError('Phone number must be exactly 10 digits');
      setLoading(false);
      return;
    }
    if (!form.email.includes('@') || !form.email.endsWith('.com')) {
      setError('Email must contain @ and end with .com');
      setLoading(false);
      return;
    }
    const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;
    if (!editingId && !passwordPattern.test(form.password)) {
      setError('Password must have 1 uppercase, 1 lowercase, 1 number, 1 special character');
      setLoading(false);
      return;
    }
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: 'resident',
        societyId: user.societyId,
        flatId: form.flatId ? parseInt(form.flatId, 10) : null
      };
      let url = `${API_BASE_URL}/users`;
      let method = 'POST';
      if (editingId) {
        url = `${API_BASE_URL}/users/${editingId}`;
        method = 'PUT';
        payload.userId = editingId;
        delete payload.password; // Don't send password on update
      }
      // Restrict update/delete to admin's own society
      if (editingId) {
        const resident = residents.find(r => r.userId === editingId);
        if (resident && resident.societyId !== user.societyId) {
          setError('You can only edit residents from your own society.');
          setLoading(false);
          return;
        }
      }
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save resident');
      setForm({ name: '', email: '', phone: '', password: '', flatId: '' });
      setEditingId(null);
      fetchResidents();
    } catch {
      setError('Failed to save resident');
    }
    setLoading(false);
  };

  const handleEdit = resident => {
    if (resident.societyId !== user.societyId) {
      setError('You can only edit residents from your own society.');
      return;
    }
    setForm({
      name: resident.name,
      email: resident.email,
      phone: resident.phone,
      password: '',
      flatId: resident.flatId ? String(resident.flatId) : ''
    });
    setEditingId(resident.userId);
  };

  const handleDelete = async id => {
    const resident = residents.find(r => r.userId === id);
    if (!resident || resident.societyId !== user.societyId) {
      setError('You can only delete residents from your own society.');
      return;
    }
    if (!window.confirm('Delete this resident?')) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchResidents();
    } catch {
      setError('Failed to delete resident');
    }
    setLoading(false);
  };

  return (
    <div>
      {society && (
        <div className="mb-4 rounded-xl border border-line bg-surface-muted p-3 text-ink">
          <span className="font-medium">Society:</span> {society.name}
        </div>
      )}
      <form onSubmit={handleSubmit} className="form-row">
        <Input label="Name" id="resident-name" name="name" value={form.name} onChange={handleChange} placeholder="Name" required />
        <Input label="Email" id="resident-email" name="email" value={form.email} onChange={handleChange} placeholder="Email" type="email" error={emailError} required />
        <Input label="Phone" id="resident-phone" name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" error={phoneError} required />
        {!editingId && (
          <Input label="Password" id="resident-password" name="password" value={form.password} onChange={handleChange} placeholder="Password" type="password" error={passwordError} required />
        )}
        <Select label="Flat" id="resident-flatId" name="flatId" value={form.flatId} onChange={handleChange} required>
          <option value="">Select flat</option>
          {flats.filter(f => f.status === 'Vacant').map(f => (
            <option key={f.flatId} value={f.flatId}>{f.flatNumber} (Floor {f.floorNumber})</option>
          ))}
        </Select>
        <Button type="submit" variant="primary" disabled={loading}>
          {editingId ? 'Update Resident' : 'Add Resident'}
        </Button>
        {editingId && (
          <Button type="button" variant="secondary" onClick={() => { setForm({ name: '', email: '', phone: '', password: '', flatId: '' }); setEditingId(null); }}>
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
      <Table headers={[
        { label: 'Name', align: 'left' },
        { label: 'Email', align: 'left' },
        { label: 'Phone', align: 'center' },
        { label: 'Flat No.', align: 'center' },
        { label: 'Verified', align: 'center' },
        { label: 'Actions', align: 'center' }
      ]}>
        {filteredResidents.map(resident => (
          <tr key={resident.userId}>
            <td className="font-medium text-ink">{resident.name}</td>
            <td className="text-muted">{resident.email}</td>
            <td className="text-center">{resident.phone}</td>
            <td className="text-center">{flats.find(f => f.flatId === resident.flatId)?.flatNumber || '-'}</td>
            <td className="text-center">
              <Badge tone={resident.isVerified ? 'success' : 'warning'}>{resident.isVerified ? 'Verified' : 'Unverified'}</Badge>
            </td>
            <td>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button type="button" variant="secondary" onClick={() => handleEdit(resident)} size="sm">Edit</Button>
                <Button type="button" variant="danger" onClick={() => handleDelete(resident.userId)} size="sm">Delete</Button>
                <Button type="button" size="sm" variant={resident.isVerified ? 'secondary' : 'success'} onClick={async () => {
                  setLoading(true);
                  try {
                    const payload = { ...resident, isVerified: !resident.isVerified };
                    await fetch(`${API_BASE_URL}/users/${resident.userId}`, {
                      method: 'PUT',
                      headers: getAuthHeaders(),
                      body: JSON.stringify(payload)
                    });
                    fetchResidents();
                  } catch {
                    setError('Failed to update verification status');
                  }
                  setLoading(false);
                }}>{resident.isVerified ? 'Unverify' : 'Verify'}</Button>
              </div>
            </td>
          </tr>
        ))}
        {filteredResidents.length === 0 && (
          <tr>
            <td colSpan={6} className="text-center text-muted">
              {filterWing ? 'No residents match the selected wing' : 'No resident accounts yet'}
            </td>
          </tr>
        )}
      </Table>
    </div>
  );
};

export default ResidentsList;
