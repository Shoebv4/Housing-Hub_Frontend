import {
  Home,
  Building2,
  Users,
  MessageSquare,
  Bell,
  Calendar,
  UserCheck,
  Shield,
  Wrench,
  Receipt
} from 'lucide-react';

export const getMenuItems = (role) => {
  switch (role) {
    case 'super_admin':
      return [
        { icon: Home, label: 'Dashboard', path: '/dashboard', section: 'Overview' },
        { icon: Building2, label: 'Societies', path: '/societies', section: 'Administration' },
        { icon: Shield, label: 'Admins', path: '/admins', section: 'Administration' }
      ];
    case 'admin':
      return [
        { icon: Home, label: 'Dashboard', path: '/dashboard', section: 'Overview' },
        { icon: Building2, label: 'Wings & Flats', path: '/wings-flats', section: 'Manage' },
        { icon: Users, label: 'Residents', path: '/residents', section: 'Manage' },
        { icon: Shield, label: 'Security Staff', path: '/security-staff', section: 'Manage' },
        { icon: Wrench, label: 'Maintenance', path: '/maintenance', section: 'Manage' },
        { icon: MessageSquare, label: 'Complaints', path: '/complaints', section: 'Community' },
        { icon: Bell, label: 'Announcements', path: '/announcements', section: 'Community' },
        { icon: Calendar, label: 'Amenities', path: '/amenities', section: 'Community' },
        { icon: UserCheck, label: 'Visitors', path: '/visitors-log', section: 'Community' }
      ];
    case 'resident':
      return [
        { icon: Home, label: 'Dashboard', path: '/dashboard', section: 'Overview' },
        { icon: Bell, label: 'Announcements', path: '/announcements', section: 'Community' },
        { icon: MessageSquare, label: 'Complaints', path: '/complaints', section: 'Community' },
        { icon: Calendar, label: 'Amenities', path: '/amenities', section: 'Community' },
        { icon: Receipt, label: 'Bills', path: '/bills', section: 'Community' },
        { icon: UserCheck, label: 'Visitors', path: '/visitors', section: 'Community' }
      ];
    case 'security_staff':
      return [
        { icon: Home, label: 'Dashboard', path: '/dashboard', section: 'Overview' },
        { icon: UserCheck, label: 'Visitor Entry', path: '/visitor-entry', section: 'Visitors' },
        { icon: Users, label: 'Visitors Log', path: '/visitors-log', section: 'Visitors' }
      ];
    default:
      return [];
  }
};
