import React from 'react';
import ComplaintsList from '../components/Complaints/ComplaintsList';
import ProtectedRoute from '../components/ProtectedRoute';
import { Card, PageHeader } from '../components/UI';

const ComplaintsPage = () => {
  return (
    <ProtectedRoute requiredRoles={['admin', 'resident']}>
      <div className="page-container">
        <PageHeader title="Complaints" subtitle="Track and resolve resident complaints" />
        <Card>
          <ComplaintsList />
        </Card>
      </div>
    </ProtectedRoute>
  );
};

export default ComplaintsPage;
