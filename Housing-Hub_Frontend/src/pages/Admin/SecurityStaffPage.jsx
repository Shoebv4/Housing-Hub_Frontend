import React from 'react';
import ProtectedRoute from '../../components/ProtectedRoute';
import SecurityStaffList from '../../components/Admin/SecurityStaffList';
import { Card, PageHeader } from '../../components/UI';

const SecurityStaffPage = () => {
  return (
    <ProtectedRoute requiredRoles={['admin']}>
      <div className="page-container">
        <PageHeader title="Security Staff Management" subtitle="Manage guard accounts for your society" />
        <Card>
          <SecurityStaffList />
        </Card>
      </div>
    </ProtectedRoute>
  );
};

export default SecurityStaffPage;
