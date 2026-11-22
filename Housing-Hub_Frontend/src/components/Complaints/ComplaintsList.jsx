import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../config';
import { Alert, Badge, Button, Input, Select, Table } from '../UI';
import { useAuth } from '../../contexts/AuthContext';

const CATEGORIES = [
    'Plumbing',
    'Electrical',
    'Cleaning',
    'Security',
    'Other'
];

const ComplaintsList = () => {
    const { user } = useAuth();
    const [complaints, setComplaints] = useState([]);
    const [flats, setFlats] = useState([]);
    const [wings, setWings] = useState([]);
    const [filterWing, setFilterWing] = useState('');
    const [form, setForm] = useState({ title: '', description: '', category: CATEGORIES[0] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Auth headers for GET/POST requests
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    // Fetch wings for admin's society only
    const fetchWings = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/wings`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to load wings');
            const data = await res.json();
            setWings(data.filter(w => w.societyId === user.societyId));
        } catch {
            setWings([]);
        }
    };

    // Fetch flats for user's society only
    const fetchFlats = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/flats`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to load flats');
            const data = await res.json();
            setFlats(data.filter(f => f.wing && f.wing.societyId === user.societyId));
        } catch {
            setFlats([]);
        }
    };

    // Fetch complaints for user's society only, with wing filter for admin
    const fetchComplaints = async () => {
        setLoading(true);
        try {
            let url = `${API_BASE_URL}/complaints`;
            if (user.role === 'admin' && filterWing) {
                url += `?wingId=${filterWing}`;
            }
            const res = await fetch(url, { headers: getAuthHeaders() });
            if (!res.ok) {
                let errorMsg = 'Failed to load complaints';
                try {
                    const errData = await res.json();
                    errorMsg += ': ' + (errData.message || JSON.stringify(errData));
                } catch (e) {
                    errorMsg += ` (HTTP ${res.status})`;
                }
                throw new Error(errorMsg);
            }
            let data = await res.json();
            // Resident: only see own complaints
            if (user.role === 'resident') {
                data = data.filter(c => c.raisedBy === user.userId);
            }
            setComplaints(data);
        } catch (err) {
            setError(err.message || 'Failed to load complaints');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchFlats();
        if (user.role === 'admin') fetchWings();
        // eslint-disable-next-line
    }, [user?.societyId]);

    useEffect(() => {
        fetchComplaints();
        // eslint-disable-next-line
    }, [flats, filterWing]);

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    // Admin: update status
    const handleStatusUpdate = async (id, status) => {
        setLoading(true);
        try {
            await fetch(`${API_BASE_URL}/complaints/${id}/status`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify({ status })
            });
            fetchComplaints();
        } catch {
            setError('Failed to update status');
        }
        setLoading(false);
    };

    // Resident: create complaint
    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const payload = {
                title: form.title,
                description: form.description,
                category: form.category
            };
            let url = `${API_BASE_URL}/complaints`;
            let method = 'POST';
            const res = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to save complaint');
            setForm({ title: '', description: '', category: CATEGORIES[0] });
            fetchComplaints();
        } catch {
            setError('Failed to save complaint');
        }
        setLoading(false);
    };

    const STATUS_TONES = {
        Pending: 'warning',
        InProgress: 'brand',
        Resolved: 'success',
        Rejected: 'danger'
    };
    const statusTone = status => STATUS_TONES[status] || 'neutral';
    const statusLabel = status => (status === 'InProgress' ? 'In Progress' : status);

    const headers = [
        { label: 'Title', align: 'left' },
        { label: 'Category', align: 'center' },
        { label: 'Description', align: 'left' },
        ...(user.role === 'admin' ? [
            { label: 'Flat No.', align: 'center' },
            { label: 'Wing', align: 'center' }
        ] : []),
        { label: 'Status', align: 'center' },
        { label: 'Created At', align: 'center' },
        { label: 'Resolved At', align: 'center' },
        ...(user.role === 'admin' ? [
            { label: 'Raised By', align: 'left' },
            { label: 'Actions', align: 'center' }
        ] : [])
    ];

    return (
        <div>
            {user.role === 'admin' && (
                <div className="mb-4 w-full sm:w-56">
                    <Select label="Filter by wing" value={filterWing} onChange={e => setFilterWing(e.target.value)}>
                        <option value="">All wings</option>
                        {wings.map(w => (
                            <option key={w.wingId} value={w.wingId}>{w.name}</option>
                        ))}
                    </Select>
                </div>
            )}
            {user.role === 'resident' && (
                <form onSubmit={handleSubmit} className="form-row">
                    <Input label="Title" id="complaint-title" name="title" value={form.title} onChange={handleChange} placeholder="Title" required />
                    <Select label="Category" id="complaint-category" name="category" value={form.category} onChange={handleChange} required>
                        {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </Select>
                    <Input label="Description" id="complaint-description" name="description" value={form.description} onChange={handleChange} placeholder="Description" required />
                    <Button type="submit" variant="primary" disabled={loading}>Submit Complaint</Button>
                </form>
            )}
            {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
            <Table headers={headers}>
                {complaints.map(complaint => {
                    const flat = flats.find(f => f.flatId === complaint.flatId);
                    return (
                        <tr key={complaint.complaintId}>
                            <td className="font-medium text-ink">{complaint.title}</td>
                            <td className="text-center">{complaint.category}</td>
                            <td>{complaint.description}</td>
                            {user.role === 'admin' && <td className="text-center">{flat?.flatNumber || '-'}</td>}
                            {user.role === 'admin' && <td className="text-center">{flat?.wing?.name || '-'}</td>}
                            <td className="text-center">
                                <Badge tone={statusTone(complaint.status)}>{statusLabel(complaint.status)}</Badge>
                            </td>
                            <td className="text-center text-muted">{
                                complaint.createdAt ? (() => {
                                    const d = new Date(complaint.createdAt);
                                    const day = String(d.getDate()).padStart(2, '0');
                                    const month = String(d.getMonth() + 1).padStart(2, '0');
                                    const year = d.getFullYear();
                                    const time = d.toLocaleTimeString('en-IN');
                                    return `${day}/${month}/${year} ${time}`;
                                })() : '-'
                            }</td>
                            <td className="text-center text-muted">{
                                complaint.resolvedAt ? (() => {
                                    const d = new Date(complaint.resolvedAt);
                                    const day = String(d.getDate()).padStart(2, '0');
                                    const month = String(d.getMonth() + 1).padStart(2, '0');
                                    const year = d.getFullYear();
                                    const time = d.toLocaleTimeString('en-IN');
                                    return `${day}/${month}/${year} ${time}`;
                                })() : '-'
                            }</td>
                            {user.role === 'admin' && <td>{complaint.raisedByName || '-'}</td>}
                            {user.role === 'admin' && (
                                <td>
                                    <Select
                                        hideLabel
                                        label={`Update status for complaint ${complaint.complaintId}`}
                                        containerClassName="mx-auto w-full max-w-[10rem]"
                                        value={complaint.status}
                                        onChange={e => handleStatusUpdate(complaint.complaintId, e.target.value)}
                                    >
                                        <option value="Pending">Pending</option>
                                        <option value="InProgress">In Progress</option>
                                        <option value="Resolved">Resolved</option>
                                        <option value="Rejected">Rejected</option>
                                    </Select>
                                </td>
                            )}
                        </tr>
                    );
                })}
                {complaints.length === 0 && (
                    <tr>
                        <td colSpan={user.role === 'admin' ? 10 : 6} className="text-center text-muted">
                            {user.role === 'admin'
                                ? (filterWing ? 'No complaints match the selected wing' : 'No complaints have been raised yet')
                                : "You haven't raised any complaints yet"}
                        </td>
                    </tr>
                )}
            </Table>
        </div>
    );
};

export default ComplaintsList;