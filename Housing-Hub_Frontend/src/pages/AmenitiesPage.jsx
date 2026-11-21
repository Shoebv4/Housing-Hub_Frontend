import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../contexts/AuthContext';
import { Alert, Badge, Button, Card, Input, PageHeader, Select, Table, Tabs } from '../components/UI';

const emptyForm = {
    name: '',
    description: '',
    hourlyRate: '',
    maxCapacity: '',
    openingTime: '',
    closingTime: ''
};

const emptyBookingForm = {
    amenityId: '',
    date: '',
    startTime: '',
    endTime: ''
};

const STATUS_OPTIONS = ['Pending', 'Approved', 'Rejected', 'Completed', 'Cancelled'];

const BOOKING_STATUS_TONES = {
    Pending: 'warning',
    Approved: 'success',
    Rejected: 'danger',
    Completed: 'success',
    Cancelled: 'neutral'
};

const bookingStatusTone = status => BOOKING_STATUS_TONES[status] || 'neutral';

const AmenitiesPage = () => {
    const { user } = useAuth();
    const [tab, setTab] = useState('amenities');
    const [amenities, setAmenities] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showBooking, setShowBooking] = useState(null); // amenityId or null
    const [bookingForm, setBookingForm] = useState(emptyBookingForm);
    const [bookings, setBookings] = useState([]);
    const [bookingError, setBookingError] = useState('');
    const [bookingLoading, setBookingLoading] = useState(false);
    const [statusEdit, setStatusEdit] = useState({}); // { [bookingId]: status }
    const [transactionInputs, setTransactionInputs] = useState({}); // { [bookingId]: transactionId }

    if (!user || (user.role !== 'admin' && user.role !== 'resident')) {
        return <div>Access Denied. You don't have permission to access this page.</div>;
    }

    const getAuthHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
    });

    const fetchAmenities = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/amenities`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to load amenities');
            const data = await res.json();
            // Only show amenities for the user's society
            setAmenities(data.filter(a => a.societyId === user.societyId));
        } catch (err) {
            setError(err.message);
        }
    };

    const fetchBookings = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/bookings`, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error('Failed to load bookings');
            const data = await res.json();
            // For resident, filter by userId; for admin, show all returned by backend (already filtered by society)
            if (user.role === 'resident') {
                setBookings(data.filter(b => b.userId === user.userId));
            } else {
                setBookings(data);
            }
        } catch (err) {
            setBookingError(err.message);
        }
    };

    useEffect(() => { fetchAmenities(); fetchBookings(); }, []);

    // Amenity form logic
    const handleChange = e => {
        const { name, value } = e.target;
        setForm({ ...form, [name]: value });
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const formatTime = t => t && t.length === 5 ? t + ':00' : t;
            const payload = {
                name: form.name,
                description: form.description,
                hourlyRate: parseFloat(form.hourlyRate),
                maxCapacity: parseInt(form.maxCapacity, 10),
                openingTime: formatTime(form.openingTime),
                closingTime: formatTime(form.closingTime),
                societyId: user.societyId
            };
            let url = `${API_BASE_URL}/amenities`;
            let method = 'POST';
            if (editingId) {
                url = `${API_BASE_URL}/amenities/${editingId}`;
                method = 'PUT';
            }
            const res = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to save amenity');
            setForm(emptyForm);
            setEditingId(null);
            fetchAmenities();
        } catch {
            setError('Failed to save amenity');
        }
        setLoading(false);
    };

    const handleEdit = amenity => {
        setForm({
            name: amenity.name,
            description: amenity.description || '',
            hourlyRate: amenity.hourlyRate || '',
            maxCapacity: amenity.maxCapacity || '',
            openingTime: amenity.openingTime || '',
            closingTime: amenity.closingTime || ''
        });
        setEditingId(amenity.amenityId);
    };

    const handleDelete = async id => {
        if (!window.confirm('Delete this amenity?')) return;
        setLoading(true);
        try {
            await fetch(`${API_BASE_URL}/amenities/${id}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            fetchAmenities();
        } catch {
            setError('Failed to delete amenity');
        }
        setLoading(false);
    };

    // Booking logic
    const openBooking = amenityId => {
        setShowBooking(amenityId);
        setBookingForm({ amenityId, date: '', startTime: '', endTime: '' });
        setBookingError('');
    };
    const closeBooking = () => {
        setShowBooking(null);
        setBookingForm(emptyBookingForm);
        setBookingError('');
    };
    const handleBookingChange = e => {
        const { name, value } = e.target;
        setBookingForm({ ...bookingForm, [name]: value });
    };
    const handleBookingSubmit = async e => {
        e.preventDefault();
        setBookingError('');
        setBookingLoading(true);
        try {
            const formatTime = t => t && t.length === 5 ? t + ':00' : t;
            const formatDate = d => d && d.length === 10 ? d : undefined;
            const payload = {
                amenityId: Number(bookingForm.amenityId),
                userId: Number(user.userId),
                flatId: user.flatId ? Number(user.flatId) : null,
                startDate: formatDate(bookingForm.date),
                endDate: formatDate(bookingForm.date),
                startTime: formatTime(bookingForm.startTime),
                endTime: formatTime(bookingForm.endTime),
                status: 'Pending',
                paid: false,
                transactionId: 'N/A' // Use non-empty string to satisfy backend validation
            };
            console.log('Booking payload:', payload);
            const res = await fetch(`${API_BASE_URL}/bookings`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const errText = await res.text();
                setBookingError('Failed to book amenity: ' + errText);
                throw new Error('Failed to book amenity: ' + errText);
            }
            closeBooking();
            fetchBookings();
        } catch (err) {
            setBookingError(err.message || 'Failed to book amenity');
        }
        setBookingLoading(false);
    };

    // Resident transaction ID update logic
    const handleTransactionInputChange = (bookingId, value) => {
        setTransactionInputs(prev => ({ ...prev, [bookingId]: value }));
    };
    const handleTransactionSubmit = async (booking) => {
        setBookingError('');
        setBookingLoading(true);
        try {
            const payload = {
                ...booking,
                transactionId: transactionInputs[booking.bookingId] || '',
                paid: true
            };
            const res = await fetch(`${API_BASE_URL}/bookings/${booking.bookingId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to update transaction ID');
            setTransactionInputs(prev => ({ ...prev, [booking.bookingId]: '' }));
            fetchBookings();
        } catch {
            setBookingError('Failed to update transaction ID');
        }
        setBookingLoading(false);
    };

    // Admin booking status logic
    const handleStatusChange = (bookingId, status) => {
        setStatusEdit(prev => ({ ...prev, [bookingId]: status }));
    };
    const handleStatusUpdate = async (booking) => {
        const newStatus = statusEdit[booking.bookingId] || booking.status;
        if (newStatus === booking.status) return;
        setLoading(true);
        try {
            // Only send fields required for update
            const payload = {
                status: newStatus,
                paid: booking.paid,
                transactionId: booking.transactionId,
                userId: booking.userId,
                flatId: booking.flatId,
                amenityId: booking.amenityId,
                createdAt: booking.createdAt,
                startDate: booking.startDate,
                endDate: booking.endDate,
                startTime: booking.startTime,
                endTime: booking.endTime,
                amount: booking.amount
            };
            const res = await fetch(`${API_BASE_URL}/bookings/${booking.bookingId}`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Failed to update status');
            fetchBookings();
        } catch {
            setError('Failed to update status');
        }
        setLoading(false);
    };

    return (
        <div className="page-container">
            <PageHeader title="Amenities & Bookings" subtitle="Manage amenities and resident bookings" />
            <Tabs
                tabs={user.role === 'admin' ? [
                    { value: 'amenities', label: 'Amenities' },
                    { value: 'bookings', label: 'Bookings' }
                ] : [
                    { value: 'amenities', label: 'Amenities' }
                ]}
                value={tab}
                onChange={setTab}
                ariaLabel="Amenities views"
            />
            <Card>
                {tab === 'amenities' && (
                    <>
                        {user.role === 'admin' && (
                            <form onSubmit={handleSubmit} className="form-row">
                                <Input label="Name" name="name" id="name" value={form.name} onChange={handleChange} placeholder="Name" required />
                                <Input label="Description" name="description" id="description" value={form.description} onChange={handleChange} placeholder="Description" />
                                <Input label="Hourly Rate" name="hourlyRate" id="hourlyRate" value={form.hourlyRate} onChange={handleChange} placeholder="Hourly Rate" type="number" min="0" step="0.01" required />
                                <Input label="Max Capacity" name="maxCapacity" id="maxCapacity" value={form.maxCapacity} onChange={handleChange} placeholder="Max Capacity" type="number" min="1" required />
                                <Input label="Opening Time" name="openingTime" id="openingTime" value={form.openingTime} onChange={handleChange} type="time" required />
                                <Input label="Closing Time" name="closingTime" id="closingTime" value={form.closingTime} onChange={handleChange} type="time" required />
                                <Button type="submit" variant="primary" disabled={loading}>{editingId ? 'Update' : 'Add'}</Button>
                                {editingId && (
                                    <Button type="button" variant="secondary" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</Button>
                                )}
                            </form>
                        )}
                        {error && <Alert tone="danger" className="mb-4">{error}</Alert>}
                        <Table headers={[
                            { label: 'Name', align: 'left' },
                            { label: 'Description', align: 'left' },
                            { label: 'Hourly Rate', align: 'right' },
                            { label: 'Max Capacity', align: 'center' },
                            { label: 'Opening Time', align: 'center' },
                            { label: 'Closing Time', align: 'center' },
                            user.role === 'admin'
                                ? { label: 'Actions', align: 'center' }
                                : { label: 'Book', align: 'center' }
                        ]}>
                            {amenities.map(a => (
                                <tr key={a.amenityId}>
                                    <td className="font-medium text-ink">{a.name}</td>
                                    <td>{a.description}</td>
                                    <td className="text-right">{a.hourlyRate}</td>
                                    <td className="text-center">{a.maxCapacity}</td>
                                    <td className="text-center">{a.openingTime}</td>
                                    <td className="text-center">{a.closingTime}</td>
                                    {user.role === 'admin' && (
                                        <td>
                                            <div className="flex flex-wrap items-center justify-center gap-2">
                                                <Button type="button" variant="secondary" onClick={() => handleEdit(a)} size="sm">Edit</Button>
                                                <Button type="button" variant="danger" onClick={() => handleDelete(a.amenityId)} size="sm">Delete</Button>
                                            </div>
                                        </td>
                                    )}
                                    {user.role === 'resident' && (
                                        <td className="align-top">
                                            <div className="flex justify-center">
                                                <Button type="button" variant="primary" size="sm" onClick={() => openBooking(a.amenityId)}>Book</Button>
                                            </div>
                                            {showBooking === a.amenityId && (
                                                <form onSubmit={handleBookingSubmit} className="mt-3 space-y-3 rounded-xl bg-surface-muted p-3">
                                                    <Input label="Date" name="date" id="date" type="date" value={bookingForm.date} onChange={handleBookingChange} required />
                                                    <Input label="Start Time" name="startTime" id="startTime" type="time" value={bookingForm.startTime} onChange={handleBookingChange} required />
                                                    <Input label="End Time" name="endTime" id="endTime" type="time" value={bookingForm.endTime} onChange={handleBookingChange} required />
                                                    <div className="flex gap-2">
                                                        <Button type="submit" variant="primary" size="sm" disabled={bookingLoading}>Confirm</Button>
                                                        <Button type="button" variant="secondary" size="sm" onClick={closeBooking}>Cancel</Button>
                                                    </div>
                                                    {bookingError && <p className="text-xs text-red-600 dark:text-red-400">{bookingError}</p>}
                                                </form>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {amenities.length === 0 && (
                                <tr><td colSpan={7} className="text-center text-muted">No amenities found.</td></tr>
                            )}
                        </Table>
                        {user.role === 'resident' && (
                            <div className="mt-8 space-y-3">
                                <h2 className="text-lg font-semibold tracking-tight text-ink">My Amenity Bookings</h2>
                                {bookingError && <Alert tone="danger">{bookingError}</Alert>}
                                <Table headers={[
                                    { label: 'Amenity', align: 'left' },
                                    { label: 'Date', align: 'center' },
                                    { label: 'Start Time', align: 'center' },
                                    { label: 'End Time', align: 'center' },
                                    { label: 'Status', align: 'center' },
                                    { label: 'Paid', align: 'center' },
                                    { label: 'Transaction ID', align: 'left' },
                                    { label: 'Amount', align: 'right' },
                                    { label: 'Actions', align: 'center' }
                                ]}>
                                    {bookings.map(b => {
                                        const amenity = amenities.find(a => a.amenityId === b.amenityId);
                                        return (
                                            <tr key={b.bookingId}>
                                                <td className="font-medium text-ink">{amenity ? amenity.name : b.amenityId}</td>
                                                <td className="text-center">{b.startDate}</td>
                                                <td className="text-center">{b.startTime}</td>
                                                <td className="text-center">{b.endTime}</td>
                                                <td className="text-center">
                                                    <Badge tone={bookingStatusTone(b.status)}>{b.status}</Badge>
                                                </td>
                                                <td className="text-center">
                                                    <Badge tone={b.paid ? 'success' : 'warning'}>{b.paid ? 'Paid' : 'Unpaid'}</Badge>
                                                </td>
                                                <td>{b.transactionId || '-'}</td>
                                                <td className="text-right">{b.amount != null ? b.amount.toFixed(2) : '-'}</td>
                                                <td className="text-center">
                                                    {b.status === 'Pending' && (
                                                        <Button
                                                            type="button"
                                                            variant="danger"
                                                            size="sm"
                                                            onClick={async () => {
                                                                try {
                                                                    const payload = { ...b, status: 'Cancelled' };
                                                                    const res = await fetch(`${API_BASE_URL}/bookings/${b.bookingId}`, {
                                                                        method: 'PUT',
                                                                        headers: getAuthHeaders(),
                                                                        body: JSON.stringify(payload)
                                                                    });
                                                                    if (!res.ok) throw new Error('Failed to cancel booking');
                                                                    fetchBookings();
                                                                } catch {
                                                                    setBookingError('Failed to cancel booking');
                                                                }
                                                            }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}
                                                    {b.status === 'Approved' && (
                                                        <Button
                                                            type="button"
                                                            variant="danger"
                                                            size="sm"
                                                            style={{ opacity: 0.5, pointerEvents: 'none', cursor: 'not-allowed' }}
                                                            disabled
                                                        >
                                                            Cancel
                                                        </Button>
                                                    )}
                                                    {b.status !== 'Cancelled' && !b.paid && (
                                                        <div className="mt-2 flex flex-col gap-2">
                                                            <input
                                                                type="text"
                                                                placeholder="Enter Transaction ID"
                                                                value={transactionInputs[b.bookingId] || ''}
                                                                onChange={e => handleTransactionInputChange(b.bookingId, e.target.value)}
                                                                className="w-full rounded-xl border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-ink placeholder:text-faint focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="primary"
                                                                size="sm"
                                                                disabled={!transactionInputs[b.bookingId] || bookingLoading}
                                                                onClick={() => handleTransactionSubmit(b)}
                                                            >
                                                                Submit
                                                            </Button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {bookings.length === 0 && (
                                        <tr><td colSpan={9} className="text-center text-muted">No bookings found.</td></tr>
                                    )}
                                </Table>
                            </div>
                        )}
                    </>
                )}
                {tab === 'bookings' && user.role === 'admin' && (
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold tracking-tight text-ink">Amenity Bookings</h2>
                        {bookingError && <Alert tone="danger">{bookingError}</Alert>}
                        <Table headers={[
                            { label: 'Booking ID', align: 'center' },
                            { label: 'Amenity', align: 'left' },
                            { label: 'User Name', align: 'left' },
                            { label: 'Date', align: 'center' },
                            { label: 'Start Time', align: 'center' },
                            { label: 'End Time', align: 'center' },
                            { label: 'Status', align: 'center' },
                            { label: 'Paid', align: 'center' },
                            { label: 'Transaction ID', align: 'left' },
                            { label: 'Amount', align: 'right' },
                            { label: 'Actions', align: 'center' }
                        ]}>
                            {bookings.map(b => {
                                const amenity = amenities.find(a => a.amenityId === b.amenityId);
                                return (
                                    <tr key={b.bookingId}>
                                        <td className="text-center">{b.bookingId}</td>
                                        <td className="font-medium text-ink">{amenity ? amenity.name : b.amenityId}</td>
                                        <td>{b.userName || '-'}</td>
                                        <td className="text-center">{b.startDate}</td>
                                        <td className="text-center">{b.startTime}</td>
                                        <td className="text-center">{b.endTime}</td>
                                        <td className="text-center">
                                            <Badge tone={bookingStatusTone(b.status)}>{b.status}</Badge>
                                        </td>
                                        <td className="text-center">
                                            <Badge tone={b.paid ? 'success' : 'warning'}>{b.paid ? 'Paid' : 'Unpaid'}</Badge>
                                        </td>
                                        <td>{b.transactionId || '-'}</td>
                                        <td className="text-right">{b.amount != null ? b.amount.toFixed(2) : '-'}</td>
                                        <td>
                                            <Select
                                                hideLabel
                                                label={`Update booking ${b.bookingId} status`}
                                                containerClassName="mx-auto w-full max-w-[10rem]"
                                                value={statusEdit[b.bookingId] || b.status}
                                                onChange={e => handleStatusChange(b.bookingId, e.target.value)}
                                                disabled={b.status === 'Cancelled'}
                                            >
                                                {STATUS_OPTIONS.map(opt => (
                                                    <option key={opt} value={opt} disabled={opt === 'Cancelled'}>{opt}</option>
                                                ))}
                                            </Select>
                                        </td>
                                    </tr>
                                );
                            })}
                            {bookings.length === 0 && (
                                <tr><td colSpan={11} className="text-center text-muted">No bookings found.</td></tr>
                            )}
                        </Table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AmenitiesPage;
