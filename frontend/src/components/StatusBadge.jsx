import React from 'react';

export const StatusBadge = ({ status }) => {
  const getBadgeClass = (s) => {
    switch (s) {
      case 'New':
        return 'badge-new';
      case 'In Progress':
        return 'badge-in-progress';
      case 'Resolved':
        return 'badge-resolved';
      default:
        return 'badge-new';
    }
  };

  return (
    <span className={`badge ${getBadgeClass(status)}`} data-testid="status-badge">
      <span className="status-dot"></span>
      {status}
    </span>
  );
};
