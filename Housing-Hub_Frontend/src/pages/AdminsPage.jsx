import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Badge, Button, Card, Input, PageHeader, Select, Table } from '../components/UI';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  password: '',
  societyId: ''
};

const AdminsPage = () => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  if (user?.role !== 'super_admin') return <div>Access Denied</div>;

  const getAuthHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  const fetchAdmins = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load admins');
      const data = await res.json();
      setAdmins(data.filter(a => a.role === 'admin'));
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchSocieties = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/societies`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load societies');
      setSocieties(await res.json());
    } catch (err) {
      setSocieties([]);
    }
  };

  useEffect(() => { fetchAdmins(); fetchSocieties(); }, []);

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
        role: 'admin',
        societyId: form.societyId ? parseInt(form.societyId, 10) : null
      };
      let url = `${API_BASE_URL}/users`;
      let method = 'POST';
      if (editingId) {
        url = `${API_BASE_URL}/users/${editingId}`;
        method = 'PUT';
        payload.userId = editingId;
        delete payload.password;
      }
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save admin');
      setForm(emptyForm);
      setEditingId(null);
      fetchAdmins();
    } catch {
      setError('Failed to save admin');
    }
    setLoading(false);
  };

  const handleEdit = admin => {
    setForm({
      name: admin.name,
      email: admin.email,
      phone: admin.phone,
      password: '',
      societyId: admin.societyId ? String(admin.societyId) : ''
    });
    setEditingId(admin.userId);
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this admin?')) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchAdmins();
    } catch {
      setError('Failed to delete admin');
    }
    setLoading(false);
  };

  const handleVerify = async (admin) => {
    setLoading(true);
    setError('');
    try {
      const payload = { ...admin, isVerified: !admin.isVerified };
      await fetch(`${API_BASE_URL}/users/${admin.userId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      fetchAdmins();
    } catch {
      setError('Failed to update verification status');
    }
    setLoading(false);
  };

  return (
    <div className="page-container">
      <PageHeader title="Admins Management" subtitle="Manage society administrators" />
      <Card>
        <form onSubmit={handleSubmit} className="form-row">
          <Input label="Name" id="admin-name" name="name" value={form.name} onChange={handleChange} placeholder="Name" required />
          <Input label="Email" id="admin-email" name="email" value={form.email} onChange={handleChange} placeholder="Email" type="email" error={emailError} required />
          <Input label="Phone" id="admin-phone" name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" error={phoneError} required />
          {!editingId && (
            <Input label="Password" id="admin-password" name="password" value={form.password} onChange={handleChange} placeholder="Password" type="password" error={passwordError} required />
          )}
          <Select label="Society" id="admin-societyId" name="societyId" value={form.societyId} onChange={handleChange} required>
            <option value="">Select Society</option>
            {societies.map(s => (
              <option key={s.societyId} value={s.societyId}>{s.name}</option>
            ))}
          </Select>
          <Button type="submit" variant="primary" disabled={loading}>{editingId ? 'Update' : 'Add'}</Button>
          {editingId && (
            <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</Button>
          )}
        </form>
        {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
        <Table headers={[
          { label: 'Name', align: 'left' },
          { label: 'Email', align: 'left' },
          { label: 'Phone', align: 'center' },
          { label: 'Society', align: 'left' },
          { label: 'Verified', align: 'center' },
          { label: 'Actions', align: 'center' }
        ]}>
          {admins.map(admin => (
            <tr key={admin.userId}>
              <td className="font-medium text-ink">{admin.name}</td>
              <td className="text-muted">{admin.email}</td>
              <td className="text-center">{admin.phone}</td>
              <td>{societies.find(s => s.societyId === admin.societyId)?.name || '-'}</td>
              <td className="text-center">
                <Badge tone={admin.isVerified ? 'success' : 'warning'}>{admin.isVerified ? 'Yes' : 'No'}</Badge>
              </td>
              <td>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button type="button" variant="secondary" onClick={() => handleEdit(admin)} size="sm">Edit</Button>
                  <Button type="button" variant="danger" onClick={() => handleDelete(admin.userId)} size="sm">Delete</Button>
                  <Button type="button" size="sm" variant={admin.isVerified ? 'secondary' : 'success'} onClick={() => handleVerify(admin)}>{admin.isVerified ? 'Unverify' : 'Verify'}</Button>
                </div>
              </td>
            </tr>
          ))}
          {admins.length === 0 && (
            <tr><td colSpan={6} className="text-center text-muted">No admins found.</td></tr>
          )}
        </Table>
      </Card>
    </div>
  );
};

export default AdminsPage;
