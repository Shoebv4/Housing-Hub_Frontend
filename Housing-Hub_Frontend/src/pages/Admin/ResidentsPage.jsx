import React, { useState } from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import ResidentsList from '../../components/Admin/ResidentsList';

const ResidentsPage = () => {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <div className="mx-auto w-full max-w-5xl">
        <h1 className="text-2xl font-bold mb-6">Residents Management</h1>
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <ResidentsList />
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default ResidentsPage;
