import React, { useEffect, useState } from 'react';
import { Building2, Users, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { Alert, Badge, Button, Card, Input, Modal, PageHeader, Select, Table } from '../../components/UI';
import { apiDelete, apiGet, apiPost, apiPut } from '../../utils/api';
import { downloadCsv } from '../../utils/export';

const emptySociety = { name: '', address: '', city: '', state: '', country: 'India', pincode: '' };
const emptyAdmin = { name: '', email: '', phone: '', password: '', societyId: '' };

const SuperAdminDashboard = () => {
  const [societies, setSocieties] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminForm, setAdminForm] = useState(emptyAdmin);
  const [showSocietyModal, setShowSocietyModal] = useState(false);
  const [editingSocietyId, setEditingSocietyId] = useState(null);
  const [societyForm, setSocietyForm] = useState(emptySociety);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError('');

      const results = await Promise.allSettled([apiGet('/societies'), apiGet('/users')]);
      if (cancelled) return;

      const [societiesResult, usersResult] = results;

      if (societiesResult.status === 'fulfilled' && Array.isArray(societiesResult.value)) {
        setSocieties(societiesResult.value);
      }
      if (usersResult.status === 'fulfilled' && Array.isArray(usersResult.value)) {
        setAdmins(usersResult.value.filter(user => user.role === 'admin'));
      }

      const failure = results.find(result => result.status === 'rejected');
      if (failure) {
        setError(failure.reason?.message || 'Unable to load dashboard data.');
      }

      setLoading(false);
    };

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const refresh = () => setRefreshKey(key => key + 1);

  const adminBySociety = new Map();
  admins.forEach(admin => {
    if (admin.societyId != null && !adminBySociety.has(admin.societyId)) {
      adminBySociety.set(admin.societyId, admin);
    }
  });

  const verifiedCount = societies.filter(society => society.isVerified).length;

  const stats = [
    { icon: Building2, label: 'Total Societies', value: loading ? '—' : String(societies.length), color: 'bg-blue-500' },
    { icon: CheckCircle, label: 'Verified Societies', value: loading ? '—' : String(verifiedCount), color: 'bg-green-500' },
    { icon: AlertCircle, label: 'Unverified Societies', value: loading ? '—' : String(societies.length - verifiedCount), color: 'bg-yellow-500' },
    { icon: Users, label: 'Total Admins', value: loading ? '—' : String(admins.length), color: 'bg-purple-500' }
  ];

  const handleExport = () => {
    downloadCsv(
      'societies.csv',
      ['Society', 'Primary Admin', 'City', 'State', 'Verification'],
      societies.map(society => [
        society.name,
        adminBySociety.get(society.societyId)?.name || '',
        society.city || '',
        society.state || '',
        society.isVerified ? 'Verified' : 'Unverified'
      ])
    );
  };

  const openAdminModal = () => {
    setAdminForm(emptyAdmin);
    setModalError('');
    setShowAdminModal(true);
  };

  const handleAdminSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setModalError('');

    try {
      await apiPost('/users', {
        name: adminForm.name.trim(),
        email: adminForm.email.trim(),
        phone: adminForm.phone.trim(),
        password: adminForm.password,
        role: 'admin',
        societyId: Number(adminForm.societyId),
        isVerified: true
      });
      setShowAdminModal(false);
      setAdminForm(emptyAdmin);
      refresh();
    } catch (err) {
      setModalError(err.message || 'Failed to create admin.');
    } finally {
      setSaving(false);
    }
  };

  const openCreateSociety = () => {
    setEditingSocietyId(null);
    setSocietyForm(emptySociety);
    setModalError('');
    setShowSocietyModal(true);
  };

  const openEditSociety = (society) => {
    setEditingSocietyId(society.societyId);
    setSocietyForm({
      name: society.name || '',
      address: society.address || '',
      city: society.city || '',
      state: society.state || '',
      country: society.country || '',
      pincode: society.pincode ?? ''
    });
    setModalError('');
    setShowSocietyModal(true);
  };

  const handleSocietySubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setModalError('');

    const payload = {
      name: societyForm.name.trim(),
      address: societyForm.address.trim(),
      city: societyForm.city.trim(),
      state: societyForm.state.trim(),
      country: societyForm.country.trim(),
      pincode: societyForm.pincode === '' ? null : Number(societyForm.pincode)
    };

    try {
      if (editingSocietyId) {
        const existing = societies.find(society => society.societyId === editingSocietyId);
        await apiPut(`/societies/${editingSocietyId}`, {
          societyId: editingSocietyId,
          ...payload,
          isVerified: existing?.isVerified ?? false
        });
      } else {
        await apiPost('/societies', payload);
      }
      setShowSocietyModal(false);
      setSocietyForm(emptySociety);
      setEditingSocietyId(null);
      refresh();
    } catch (err) {
      setModalError(err.message || 'Failed to save society.');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (society) => {
    setBusyId(society.societyId);
    setError('');

    try {
      await apiPut(`/societies/${society.societyId}`, {
        societyId: society.societyId,
        name: society.name,
        address: society.address || '',
        city: society.city || '',
        state: society.state || '',
        country: society.country || '',
        pincode: society.pincode ?? null,
        isVerified: true
      });
      refresh();
    } catch (err) {
      setError(err.message || 'Failed to verify society.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (society) => {
    if (!window.confirm(`Delete "${society.name}"? This cannot be undone.`)) return;

    setBusyId(society.societyId);
    setError('');

    try {
      await apiDelete(`/societies/${society.societyId}`);
      refresh();
    } catch (err) {
      setError(err.message || 'Failed to delete society.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Overview"
        subtitle="Manage societies, admins, and verification across the platform"
        actions={(
          <Button onClick={openAdminModal}>
            <Plus className="h-4 w-4" />
            Add Admin
          </Button>
        )}
      />

      {error && <Alert tone="danger">{error}</Alert>}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <div className="flex items-center">
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted">{stat.label}</p>
                  <p className="text-2xl font-semibold tracking-tight text-ink tabular-nums">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Societies Table */}
      <Card>
        <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-ink">Registered Societies</h2>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={societies.length === 0}>
              Export
            </Button>
            <Button variant="primary" size="sm" onClick={openCreateSociety}>
              <Plus className="h-4 w-4 mr-1" />
              Add Society
            </Button>
          </div>
        </div>

        <Table headers={[
          { label: 'Society Name', align: 'left' },
          { label: 'Primary Admin', align: 'left' },
          { label: 'City', align: 'left' },
          { label: 'Status', align: 'center' },
          { label: 'Actions', align: 'center' }
        ]}>
          {loading ? (
            <tr>
              <td colSpan={5} className="text-center text-faint">Loading societies...</td>
            </tr>
          ) : societies.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center text-faint">No societies registered yet.</td>
            </tr>
          ) : (
            societies.map(society => {
              const admin = adminBySociety.get(society.societyId);
              const busy = busyId === society.societyId;

              return (
                <tr key={society.societyId}>
                  <td>
                    <div className="flex items-center">
                      <Building2 className="h-5 w-5 text-faint mr-3" />
                      <span className="font-medium text-ink">{society.name}</span>
                    </div>
                  </td>
                  <td className="text-muted">{admin?.name || '—'}</td>
                  <td className="text-muted">{society.city || '—'}</td>
                  <td className="text-center">
                    <Badge tone={society.isVerified ? 'success' : 'warning'}>
                      {society.isVerified ? 'Verified' : 'Unverified'}
                    </Badge>
                  </td>
                  <td>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEditSociety(society)} disabled={busy}>
                        Edit
                      </Button>
                      {!society.isVerified && (
                        <Button variant="success" size="sm" onClick={() => handleVerify(society)} disabled={busy}>
                          {busy ? 'Verifying...' : 'Verify'}
                        </Button>
                      )}
                      <Button variant="danger" size="sm" onClick={() => handleDelete(society)} disabled={busy}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </Table>
      </Card>

      {/* Create Admin Modal */}
      <Modal
        isOpen={showAdminModal}
        onClose={() => setShowAdminModal(false)}
        title="Add Admin"
      >
        <form className="space-y-4" onSubmit={handleAdminSubmit}>
          {modalError && <Alert tone="danger">{modalError}</Alert>}
          <Input
            label="Name"
            value={adminForm.name}
            onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
            placeholder="Enter admin name"
            required
          />
          <Input
            label="Email address"
            type="email"
            value={adminForm.email}
            onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
            placeholder="Enter admin email"
            required
          />
          <Input
            label="Phone number"
            value={adminForm.phone}
            onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
            placeholder="Enter phone number"
            required
          />
          <Input
            label="Password"
            type="password"
            value={adminForm.password}
            onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
            placeholder="Set an initial password"
            required
          />
          <Select
            label="Society"
            value={adminForm.societyId}
            onChange={(e) => setAdminForm({ ...adminForm, societyId: e.target.value })}
            required
          >
            <option value="">Select a society</option>
            {societies.map(society => (
              <option key={society.societyId} value={society.societyId}>{society.name}</option>
            ))}
          </Select>
          <div className="flex flex-wrap justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowAdminModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : 'Add Admin'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create / Edit Society Modal */}
      <Modal
        isOpen={showSocietyModal}
        onClose={() => setShowSocietyModal(false)}
        title={editingSocietyId ? 'Edit Society' : 'Add Society'}
      >
        <form className="space-y-4" onSubmit={handleSocietySubmit}>
          {modalError && <Alert tone="danger">{modalError}</Alert>}
          <Input
            label="Society name"
            value={societyForm.name}
            onChange={(e) => setSocietyForm({ ...societyForm, name: e.target.value })}
            placeholder="Enter society name"
            required
          />
          <Input
            label="Address"
            value={societyForm.address}
            onChange={(e) => setSocietyForm({ ...societyForm, address: e.target.value })}
            placeholder="Enter street address"
            required
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="City"
              value={societyForm.city}
              onChange={(e) => setSocietyForm({ ...societyForm, city: e.target.value })}
              placeholder="City"
              required
            />
            <Input
              label="State"
              value={societyForm.state}
              onChange={(e) => setSocietyForm({ ...societyForm, state: e.target.value })}
              placeholder="State"
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Country"
              value={societyForm.country}
              onChange={(e) => setSocietyForm({ ...societyForm, country: e.target.value })}
              placeholder="Country"
              required
            />
            <Input
              label="PIN code"
              value={societyForm.pincode}
              onChange={(e) => setSocietyForm({ ...societyForm, pincode: e.target.value })}
              placeholder="PIN code"
            />
          </div>
          <div className="flex flex-wrap justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowSocietyModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : editingSocietyId ? 'Save Changes' : 'Add Society'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SuperAdminDashboard;
