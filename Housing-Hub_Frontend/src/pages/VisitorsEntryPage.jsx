import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Badge, Button, Card, Input, Modal, PageHeader, Select, Table } from '../components/UI';

const emptyVisitor = {
    name: '',
    phone: '',
    flatId: '',
    purpose: '',
    vehicleNo: '',
    visitorType: 'guest'
};

const VisitorsEntryPage = () => {
    const { user } = useAuth();
    const [flats, setFlats] = useState([]);
    const [visitors, setVisitors] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newVisitor, setNewVisitor] = useState(emptyVisitor);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const getAuthHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    });

    useEffect(() => {
        fetchFlats();
        fetchVisitors();
        // eslint-disable-next-line
    }, []);

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
        try {
            const res = await fetch(`${API_BASE_URL}/visitors`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to load visitors');
            setVisitors(await res.json());
        } catch {
            setVisitors([]);
        }
    };

    const handleVisitorEntry = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // Map frontend value to backend expected value
            const visitorTypeMap = {
                guest: 'Guest',
                delivery: 'Delivery',
                maintenance: 'Maintenance',
                other: 'Other'
            };
            const payload = {
                ...newVisitor,
                visitorType: visitorTypeMap[newVisitor.visitorType] || 'Guest',
                entryTime: new Date().toISOString(),
                recordedBy: user?.userId,
                flatId: newVisitor.flatId ? parseInt(newVisitor.flatId, 10) : null,
                vehicleNo: newVisitor.vehicleNo && newVisitor.vehicleNo.trim() !== '' ? newVisitor.vehicleNo : 'NA'
            };
            const res = await fetch(`${API_BASE_URL}/visitors`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to register visitor');
            setShowModal(false);
            setNewVisitor(emptyVisitor);
            fetchVisitors();
        } catch (err) {
            setError(err.message || 'Error registering visitor');
        }
        setLoading(false);
    };

    return (
        <div className="page-container">
            <PageHeader
                title="Visitor Entry"
                subtitle="Register and track visitor entries"
                actions={<Button onClick={() => setShowModal(true)}>New Visitor Entry</Button>}
            />
            <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Visitor Entry" size="lg">
                <form onSubmit={handleVisitorEntry} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input
                            label="Visitor Name"
                            value={newVisitor.name}
                            onChange={e => setNewVisitor({ ...newVisitor, name: e.target.value })}
                            placeholder="Enter visitor's full name"
                            required
                        />
                        <Input
                            label="Phone Number"
                            value={newVisitor.phone}
                            onChange={e => setNewVisitor({ ...newVisitor, phone: e.target.value })}
                            placeholder="Enter phone number"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Select
                            label="Flat"
                            value={newVisitor.flatId}
                            onChange={e => setNewVisitor({ ...newVisitor, flatId: e.target.value })}
                            required
                        >
                            <option value="">Select Flat</option>
                            {flats.map(f => (
                                <option key={f.flatId} value={f.flatId}>{f.flatNumber}</option>
                            ))}
                        </Select>
                        <Select
                            label="Visitor Type"
                            value={newVisitor.visitorType}
                            onChange={e => setNewVisitor({ ...newVisitor, visitorType: e.target.value })}
                            required
                        >
                            <option value="guest">Guest</option>
                            <option value="delivery">Delivery</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="other">Other</option>
                        </Select>
                    </div>
                    <Input
                        label="Purpose of Visit"
                        value={newVisitor.purpose}
                        onChange={e => setNewVisitor({ ...newVisitor, purpose: e.target.value })}
                        placeholder="Brief description of visit purpose"
                        required
                    />
                    <Input
                        label="Vehicle Number (Optional)"
                        value={newVisitor.vehicleNo}
                        onChange={e => setNewVisitor({ ...newVisitor, vehicleNo: e.target.value })}
                        placeholder="e.g., MH01AB1234"
                        required={false}
                    />
                    {error && <Alert tone="danger">{error}</Alert>}
                    <div className="flex flex-wrap justify-end gap-3 pt-4">
                        <Button variant="secondary" onClick={() => setShowModal(false)} type="button">
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" disabled={loading}>
                            Register Entry
                        </Button>
                    </div>
                </form>
            </Modal>
            <Card>
                <h2 className="mb-4 text-lg font-semibold tracking-tight text-ink">Current Visitors</h2>
                <Table headers={[
                    { label: 'Name', align: 'left' },
                    { label: 'Flat', align: 'center' },
                    { label: 'Purpose', align: 'left' },
                    { label: 'Entry Time', align: 'left' },
                    { label: 'Vehicle', align: 'center' },
                    { label: 'Type', align: 'center' },
                    { label: 'Actions', align: 'center' },
                    { label: 'Recorded By', align: 'left' }
                ]}>
                    {visitors.filter(v => !v.exitTime).map(visitor => (
                        <tr key={visitor.visitorId}>
                            <td className="font-medium text-ink">{visitor.name}</td>
                            <td className="text-center">{flats.find(f => f.flatId === visitor.flatId)?.flatNumber || '-'}</td>
                            <td>{visitor.purpose}</td>
                            <td>{visitor.entryTime ? new Date(visitor.entryTime).toLocaleString() : '-'}</td>
                            <td className="text-center">{visitor.vehicleNo || '-'}</td>
                            <td className="text-center">
                                <Badge tone="neutral">{visitor.visitorType}</Badge>
                            </td>
                            <td className="text-center">
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={async () => {
                                        try {
                                            await fetch(`${API_BASE_URL}/visitors/exit/${visitor.visitorId}`, {
                                                method: 'PUT',
                                                headers: getAuthHeaders()
                                            });
                                            fetchVisitors();
                                        } catch (err) {
                                            alert('Failed to mark exit');
                                        }
                                    }}
                                >
                                    Mark Exit
                                </Button>
                            </td>
                            <td>{visitor.recordedByName || '-'}</td>
                        </tr>
                    ))}
                </Table>
            </Card>
        </div>
    );
};

export default VisitorsEntryPage;