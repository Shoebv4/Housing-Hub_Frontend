import React from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import ResidentsList from '../../components/Admin/ResidentsList';
import { Card, PageHeader } from '../../components/UI';

const ResidentsPage = () => {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <div className="page-container">
        <PageHeader title="Residents" subtitle="Manage resident accounts and flat assignments" />
        <Card>
          <ResidentsList />
        </Card>
      </div>
    </ProtectedRoute>
  );
};

export default ResidentsPage;
