import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';
import { Alert, Button, Input, Table } from '../UI';
import { useAuth } from '../../contexts/AuthContext';

const SecurityStaffList = () => {
  const { user } = useAuth();
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
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

  // Fetch security staff for admin's society only
  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Failed to load security staff');
      const data = await res.json();
      setStaff(data.filter(s => s.role === 'security_staff' && s.societyId === user.societyId));
    } catch {
      setError('Failed to load security staff');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
    // eslint-disable-next-line
  }, [user?.societyId]);

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
        role: 'security_staff',
        societyId: user.societyId
      };
      let url = `${API_BASE_URL}/users`;
      let method = 'POST';
      if (editingId) {
        url = `${API_BASE_URL}/users/${editingId}`;
        method = 'PUT';
        payload.userId = editingId;
        delete payload.password; // Don't send password on update
      }
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save security staff');
      setForm({ name: '', email: '', phone: '', password: '' });
      setEditingId(null);
      fetchStaff();
    } catch {
      setError('Failed to save security staff');
    }
    setLoading(false);
  };

  const handleEdit = staffMember => {
    setForm({
      name: staffMember.name,
      email: staffMember.email,
      phone: staffMember.phone,
      password: '',
    });
    setEditingId(staffMember.userId);
  };

  const handleDelete = async id => {
    if (!window.confirm('Delete this security staff member?')) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/users/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      fetchStaff();
    } catch {
      setError('Failed to delete security staff');
    }
    setLoading(false);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="form-row">
        <Input label="Name" id="staff-name" name="name" value={form.name} onChange={handleChange} placeholder="Name" required />
        <Input label="Email" id="staff-email" name="email" value={form.email} onChange={handleChange} placeholder="Email" type="email" error={emailError} required />
        <Input label="Phone" id="staff-phone" name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" error={phoneError} required />
        {!editingId && (
          <Input label="Password" id="staff-password" name="password" value={form.password} onChange={handleChange} placeholder="Password" type="password" error={passwordError} required />
        )}
        <Button type="submit" variant="primary" disabled={loading}>
          {editingId ? 'Update Staff' : 'Add Staff'}
        </Button>
        {editingId && (
          <Button type="button" variant="secondary" onClick={() => { setForm({ name: '', email: '', phone: '', password: '' }); setEditingId(null); }}>
            Cancel
          </Button>
        )}
      </form>
      {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
      <Table headers={[
        { label: 'Name', align: 'left' },
        { label: 'Email', align: 'left' },
        { label: 'Phone', align: 'center' },
        { label: 'Actions', align: 'center' }
      ]}>
        {staff.map(s => (
          <tr key={s.userId}>
            <td className="font-medium text-ink">{s.name}</td>
            <td className="text-muted">{s.email}</td>
            <td className="text-center">{s.phone}</td>
            <td>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button type="button" variant="secondary" onClick={() => handleEdit(s)} size="sm">Edit</Button>
                <Button type="button" variant="danger" onClick={() => handleDelete(s.userId)} size="sm">Delete</Button>
              </div>
            </td>
          </tr>
        ))}
        {staff.length === 0 && (
          <tr><td colSpan={4} className="text-center text-muted">No security staff accounts yet</td></tr>
        )}
      </Table>
    </div>
  );
};

export default SecurityStaffList;
