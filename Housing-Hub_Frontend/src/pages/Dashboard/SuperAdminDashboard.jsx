import React, { useEffect, useState } from 'react';
import { Building2, Users, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Table from '../../components/UI/Table';
import Modal from '../../components/UI/Modal';
import Input from '../../components/UI/Input';
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
    { icon: AlertCircle, label: 'Pending Verification', value: loading ? '—' : String(societies.length - verifiedCount), color: 'bg-yellow-500' },
    { icon: Users, label: 'Total Admins', value: loading ? '—' : String(admins.length), color: 'bg-purple-500' }
  ];

  const handleExport = () => {
    downloadCsv(
      'societies.csv',
      ['Society', 'Admin', 'City', 'State', 'Verified'],
      societies.map(society => [
        society.name,
        adminBySociety.get(society.societyId)?.name || '',
        society.city || '',
        society.state || '',
        society.isVerified ? 'Yes' : 'No'
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage societies and administrators</p>
        </div>
        <Button onClick={openAdminModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Admin
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Societies Table */}
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">All Societies</h2>
          <div className="flex space-x-2">
            <Button variant="secondary" size="sm" onClick={handleExport} disabled={societies.length === 0}>
              Export
            </Button>
            <Button variant="primary" size="sm" onClick={openCreateSociety}>
              <Plus className="h-4 w-4 mr-1" />
              New Society
            </Button>
          </div>
        </div>

        <Table headers={['Society Name', 'Admin', 'City', 'Status', 'Actions']}>
          {loading ? (
            <tr>
              <td colSpan={5} className="px-6 py-6 text-center text-gray-500">Loading societies...</td>
            </tr>
          ) : societies.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-6 text-center text-gray-500">No societies registered yet.</td>
            </tr>
          ) : (
            societies.map(society => {
              const admin = adminBySociety.get(society.societyId);
              const busy = busyId === society.societyId;

              return (
                <tr key={society.societyId} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <Building2 className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="font-medium text-gray-900">{society.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{admin?.name || '—'}</td>
                  <td className="px-6 py-4 text-gray-600">{society.city || '—'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        society.isVerified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {society.isVerified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
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
        title="Create New Admin"
      >
        <form className="space-y-4" onSubmit={handleAdminSubmit}>
          {modalError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {modalError}
            </div>
          )}
          <Input
            label="Name"
            value={adminForm.name}
            onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
            placeholder="Enter admin name"
            required
          />
          <Input
            label="Email"
            type="email"
            value={adminForm.email}
            onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
            placeholder="Enter admin email"
            required
          />
          <Input
            label="Phone"
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
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Society</label>
            <select
              value={adminForm.societyId}
              onChange={(e) => setAdminForm({ ...adminForm, societyId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select a society</option>
              {societies.map(society => (
                <option key={society.societyId} value={society.societyId}>{society.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowAdminModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Admin'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Create / Edit Society Modal */}
      <Modal
        isOpen={showSocietyModal}
        onClose={() => setShowSocietyModal(false)}
        title={editingSocietyId ? 'Edit Society' : 'New Society'}
      >
        <form className="space-y-4" onSubmit={handleSocietySubmit}>
          {modalError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {modalError}
            </div>
          )}
          <Input
            label="Society Name"
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
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Country"
              value={societyForm.country}
              onChange={(e) => setSocietyForm({ ...societyForm, country: e.target.value })}
              placeholder="Country"
              required
            />
            <Input
              label="Pincode"
              value={societyForm.pincode}
              onChange={(e) => setSocietyForm({ ...societyForm, pincode: e.target.value })}
              placeholder="Pincode"
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowSocietyModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : editingSocietyId ? 'Save Changes' : 'Create Society'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SuperAdminDashboard;
