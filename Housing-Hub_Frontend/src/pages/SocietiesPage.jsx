import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Badge, Button, Card, Input, PageHeader, Table } from '../components/UI';

const emptyForm = {
    name: '',
    address: '',
    state: '',
    country: '',
    city: '',
    pincode: ''
};

const SocietiesPage = () => {
    const { user } = useAuth();
    const [societies, setSocieties] = useState([]);
    const [admins, setAdmins] = useState({});
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (user?.role !== 'super_admin') return <div>Access Denied</div>;

    const getAuthHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    });

    const fetchSocieties = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/societies`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to load societies');
            const societiesData = await res.json();
            setSocieties(societiesData);
            // Fetch all admins and map by societyId
            const resAdmins = await fetch(`${API_BASE_URL}/users`, { headers: getAuthHeaders() });
            let adminsArr = [];
            if (resAdmins.ok) {
                adminsArr = await resAdmins.json();
            }
            const adminMap = {};
            societiesData.forEach(society => {
                const admin = adminsArr.find(a => a.role === 'admin' && a.societyId === society.societyId);
                adminMap[society.societyId] = admin ? admin.name : '-';
            });
            setAdmins(adminMap);
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => { fetchSocieties(); }, []);

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleAdd = async e => {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/societies`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(form)
            });
            if (!res.ok) throw new Error('Failed to add society');
            setForm(emptyForm);
            fetchSocieties();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleEdit = society => {
        setEditingId(society.societyId);
        setForm({
            name: society.name,
            address: society.address,
            state: society.state,
            country: society.country,
            city: society.city,
            pincode: society.pincode
        });
    };

    const handleUpdate = async e => {
        e.preventDefault();
        setError('');
        try {
            const payload = { ...form, societyId: editingId };
            const res = await fetch(`${API_BASE_URL}/societies/${editingId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to update society');
            setEditingId(null);
            setForm(emptyForm);
            fetchSocieties();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDelete = async id => {
        if (!window.confirm('Delete this society?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/societies/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to delete society');
            fetchSocieties();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleApprove = async (society) => {
        setError('');
        try {
            const payload = {
                societyId: society.societyId,
                name: society.name,
                address: society.address,
                state: society.state,
                country: society.country,
                city: society.city,
                pincode: society.pincode,
                isVerified: !society.isVerified // toggle
            };
            const res = await fetch(`${API_BASE_URL}/societies/${society.societyId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to update verification');
            fetchSocieties();
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="page-container">
            <PageHeader backTo="/dashboard" title="Societies" subtitle="Review and manage registered societies" />
            <Card>
                <form onSubmit={editingId ? handleUpdate : handleAdd} className="form-row">
                    <Input label="Society name" id="society-name" name="name" value={form.name} onChange={handleChange} placeholder="Society name" required />
                    <Input label="Address" id="society-address" name="address" value={form.address} onChange={handleChange} placeholder="Address" required />
                    <Input label="State" id="society-state" name="state" value={form.state} onChange={handleChange} placeholder="State" required />
                    <Input label="Country" id="society-country" name="country" value={form.country} onChange={handleChange} placeholder="Country" required />
                    <Input label="City" id="society-city" name="city" value={form.city} onChange={handleChange} placeholder="City" required />
                    <Input label="PIN code" id="society-pincode" name="pincode" value={form.pincode || ''} onChange={handleChange} placeholder="PIN code" required />
                    <Button type="submit" variant="primary" disabled={loading}>{editingId ? 'Update Society' : 'Add Society'}</Button>
                    {editingId && (
                        <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</Button>
                    )}
                </form>
                {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
                <Table headers={[
                    { label: 'Society Name', align: 'left' },
                    { label: 'Address', align: 'left' },
                    { label: 'State', align: 'left' },
                    { label: 'Country', align: 'left' },
                    { label: 'City', align: 'left' },
                    { label: 'PIN code', align: 'center' },
                    { label: 'Created At', align: 'center' },
                    { label: 'Primary Admin', align: 'left' },
                    { label: 'Verified', align: 'center' },
                    { label: 'Actions', align: 'center' }
                ]}>
                    {societies.map(society => (
                        <tr key={society.societyId}>
                            <td className="font-medium text-ink">{society.name}</td>
                            <td>{society.address}</td>
                            <td>{society.state}</td>
                            <td>{society.country}</td>
                            <td>{society.city}</td>
                            <td className="text-center">{society.pincode}</td>
                            <td className="text-center text-muted">{society.createdAt ? new Date(society.createdAt + 'Z').toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '-'}</td>
                            <td>{admins[society.societyId] || '-'}</td>
                            <td className="text-center">
                                <Badge tone={society.isVerified ? 'success' : 'warning'}>{society.isVerified ? 'Verified' : 'Unverified'}</Badge>
                            </td>
                            <td>
                                <div className="flex flex-wrap items-center justify-center gap-2">
                                    <Button type="button" variant="secondary" onClick={() => handleEdit(society)} size="sm">Edit</Button>
                                    <Button type="button" variant="danger" onClick={() => handleDelete(society.societyId)} size="sm">Delete</Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={society.isVerified ? 'secondary' : 'success'}
                                        onClick={() => handleApprove(society)}
                                    >
                                        {society.isVerified ? 'Unverify' : 'Verify'}
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {societies.length === 0 && (
                        <tr><td colSpan={10} className="text-center text-muted">No societies registered yet</td></tr>
                    )}
                </Table>
            </Card>
        </div>
    );
};

export default SocietiesPage;
