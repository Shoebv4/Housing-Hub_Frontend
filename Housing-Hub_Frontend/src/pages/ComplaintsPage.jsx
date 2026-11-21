import React from 'react';
import ComplaintsList from '../components/ComplaintsList';
import ProtectedRoute from '../components/ProtectedRoute';

const ComplaintsPage = () => {
  return (
    <ProtectedRoute requiredRoles={['admin', 'resident']}>
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-2xl font-bold mb-6">Complaints</h1>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <ComplaintsList />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default ComplaintsPage;
