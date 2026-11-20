import {
  Home,
  Building2,
  Users,
  MessageSquare,
  Bell,
  Calendar,
  UserCheck,
  Shield
} from 'lucide-react';

export const getMenuItems = (role) => {
  switch (role) {
    case 'super_admin':
      return [
        { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: Building2, label: 'Societies', path: '/societies' },
        { icon: Shield, label: 'Admins', path: '/admins' }
      ];
    case 'admin':
      return [
        { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: Building2, label: 'Wings & Flats', path: '/wings-flats' },
        { icon: Users, label: 'Residents', path: '/residents' },
        { icon: Shield, label: 'Security Staff', path: '/security-staff' },
        { icon: MessageSquare, label: 'Complaints', path: '/complaints' },
        { icon: Bell, label: 'Announcements', path: '/announcements' },
        { icon: Calendar, label: 'Amenities', path: '/amenities' },
        { icon: UserCheck, label: 'Visitors', path: '/visitors-log' }
      ];
    case 'resident':
      return [
        { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: Bell, label: 'Announcements', path: '/announcements' },
        { icon: MessageSquare, label: 'Complaints', path: '/complaints' },
        { icon: Calendar, label: 'Amenities', path: '/amenities' },
        { icon: UserCheck, label: 'Visitors', path: '/visitors' }
      ];
    case 'security_staff':
      return [
        { icon: Home, label: 'Dashboard', path: '/dashboard' },
        { icon: UserCheck, label: 'Visitor Entry', path: '/visitor-entry' },
        { icon: Users, label: 'Visitors Log', path: '/visitors-log' }
      ];
    default:
      return [];
  }
};
