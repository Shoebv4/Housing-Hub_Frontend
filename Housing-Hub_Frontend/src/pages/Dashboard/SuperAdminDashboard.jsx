import React, { useEffect, useState } from 'react';
import { Building2, Users, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import Table from '../../components/UI/Table';
import Modal from '../../components/UI/Modal';
import Input from '../../components/UI/Input';
import { apiGet } from '../../utils/api';

const SuperAdminDashboard = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    phone: '',
    societyId: ''
  });
  const [societies, setSocieties] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
  }, []);

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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage societies and administrators</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
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
            <Button variant="secondary" size="sm">Export</Button>
            <Button variant="primary" size="sm">
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
                      <Button variant="secondary" size="sm">Edit</Button>
                      {!society.isVerified && (
                        <Button variant="success" size="sm">Verify</Button>
                      )}
                      <Button variant="danger" size="sm">Delete</Button>
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
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Admin"
      >
        <form className="space-y-4">
          <Input
            label="Name"
            value={newAdmin.name}
            onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
            placeholder="Enter admin name"
          />
          <Input
            label="Email"
            type="email"
            value={newAdmin.email}
            onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
            placeholder="Enter admin email"
          />
          <Input
            label="Phone"
            value={newAdmin.phone}
            onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
            placeholder="Enter phone number"
          />
          <Input
            label="Society ID"
            value={newAdmin.societyId}
            onChange={(e) => setNewAdmin({ ...newAdmin, societyId: e.target.value })}
            placeholder="Enter society ID"
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary">Create Admin</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SuperAdminDashboard;
