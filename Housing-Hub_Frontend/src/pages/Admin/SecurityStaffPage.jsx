import React from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import SecurityStaffList from '../../components/Admin/SecurityStaffList';

const SecurityStaffPage = () => {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-2xl font-bold mb-6">Security Staff Management</h1>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <SecurityStaffList />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default SecurityStaffPage;
