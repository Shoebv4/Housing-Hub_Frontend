import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';
import { Alert, Button, Input, Table } from '../UI';
import { useAuth } from '../../contexts/AuthContext';

const WingsList = () => {
    const { user } = useAuth();
    const [wings, setWings] = useState([]);
    const [society, setSociety] = useState(null);
    const [form, setForm] = useState({ name: '', totalFloors: '', flatsPerFloor: '' });
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
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/wings`, {
                headers: getAuthHeaders()
            });
            if (!res.ok) throw new Error('Failed to load wings');
            const data = await res.json();
            setWings(data.filter(w => w.societyId === user.societyId));
        } catch {
            setError('Failed to load wings');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSociety();
        fetchWings();
        // eslint-disable-next-line
    }, [user?.societyId]);

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const payload = {
                name: form.name,
                totalFloors: form.totalFloors ? parseInt(form.totalFloors, 10) : null,
                flatsPerFloor: form.flatsPerFloor ? parseInt(form.flatsPerFloor, 10) : null,
                societyId: user.societyId
            };
            let url = `${API_BASE_URL}/wings`;
            let method = 'POST';
            if (editingId) {
                url = `${API_BASE_URL}/wings/${editingId}`;
                method = 'PUT';
                payload.wingId = editingId;
            }
            const res = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to save wing');
            setForm({ name: '', totalFloors: '', flatsPerFloor: '' });
            setEditingId(null);
            fetchWings();
        } catch {
            setError('Failed to save wing');
        }
        setLoading(false);
    };

    // Helper to check if a wing has any flats (for user guidance)
    const hasFlats = async (wingId) => {
        try {
            const res = await fetch(`${API_BASE_URL}/flats`, { headers: getAuthHeaders() });
            if (!res.ok) return false;
            const data = await res.json();
            return data.some(f => f.wingId === wingId);
        } catch {
            return false;
        }
    };

    const handleDelete = async id => {
        setError('');
        setLoading(true);
        // Check if this wing has any flats before attempting delete
        const flatsExist = await hasFlats(id);
        if (flatsExist) {
            setError('Cannot delete wing: there are flats assigned to this wing.');
            setLoading(false);
            return;
        }
        if (!window.confirm('Delete this wing?')) {
            setLoading(false);
            return;
        }
        try {
            await fetch(`${API_BASE_URL}/wings/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            fetchWings();
        } catch {
            setError('Failed to delete wing');
        }
        setLoading(false);
    };

    const handleEdit = wing => {
        setForm({
            name: wing.name,
            totalFloors: wing.totalFloors || '',
            flatsPerFloor: wing.flatsPerFloor || ''
        });
        setEditingId(wing.wingId);
    };

    return (
        <div>
            {society && (
                <div className="mb-4 rounded-xl border border-line bg-surface-muted p-3 text-ink">
                    <span className="font-medium">Society:</span> {society.name}
                </div>
            )}
            <form onSubmit={handleSubmit} className="form-row">
                <Input label="Wing name" id="wing-name" name="name" value={form.name} onChange={handleChange} placeholder="Wing name" required />
                <Input label="Total floors" id="wing-totalFloors" name="totalFloors" value={form.totalFloors} onChange={handleChange} placeholder="Total floors" type="number" min="1" required />
                <Input label="Flats per floor" id="wing-flatsPerFloor" name="flatsPerFloor" value={form.flatsPerFloor} onChange={handleChange} placeholder="Flats per floor" type="number" min="1" required />
                <Button type="submit" variant="primary" disabled={loading}>
                    {editingId ? 'Update Wing' : 'Add Wing'}
                </Button>
                {editingId && (
                    <Button type="button" variant="secondary" onClick={() => { setForm({ name: '', totalFloors: '', flatsPerFloor: '' }); setEditingId(null); }}>
                        Cancel
                    </Button>
                )}
            </form>
            {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
            <Table headers={[
                { label: 'Wing', align: 'left' },
                { label: 'Total floors', align: 'center' },
                { label: 'Flats per floor', align: 'center' },
                { label: 'Actions', align: 'center' }
            ]}>
                {wings.map(wing => (
                    <tr key={wing.wingId}>
                        <td className="font-medium text-ink">{wing.name}</td>
                        <td className="text-center">{wing.totalFloors}</td>
                        <td className="text-center">{wing.flatsPerFloor}</td>
                        <td>
                            <div className="flex flex-wrap items-center justify-center gap-2">
                                <Button type="button" variant="secondary" onClick={() => handleEdit(wing)} size="sm">Edit</Button>
                                <Button type="button" variant="danger" onClick={() => handleDelete(wing.wingId)} size="sm">Delete</Button>
                            </div>
                        </td>
                    </tr>
                ))}
                {wings.length === 0 && (
                    <tr><td colSpan={4} className="text-center text-muted">No wings have been added yet</td></tr>
                )}
            </Table>
        </div>
    );
};

export default WingsList;
