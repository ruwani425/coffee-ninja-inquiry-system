import React from 'react';
import { StatusBadge } from './StatusBadge';
import { User, Mail, Clock, ArrowRight } from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const InquiryCard = ({ inquiry, onClick }) => {
  return (
    <div
      className="inquiry-card"
      onClick={() => onClick(inquiry)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onClick(inquiry);
      }}
      aria-label={`Inquiry #${inquiry.id}: ${inquiry.subject}`}
      data-testid={`inquiry-card-${inquiry.id}`}
    >
      <div className="card-top">
        <div>
          <span className="inquiry-id">#{inquiry.id}</span>
          <h2 className="card-subject">{inquiry.subject}</h2>
          <div className="card-customer">
            <User size={14} />
            <span style={{ fontWeight: 600 }}>{inquiry.customer_name}</span>
            <span>•</span>
            <Mail size={14} />
            <span>{inquiry.customer_contact}</span>
          </div>
        </div>
        <StatusBadge status={inquiry.status} />
      </div>

      <p className="card-desc">{inquiry.description}</p>

      <div className="card-footer">
        <div className={`card-assignee ${!inquiry.assigned_to_name ? 'unassigned' : ''}`}>
          <User size={14} />
          <span>{inquiry.assigned_to_name ? `Assigned to: ${inquiry.assigned_to_name}` : 'Unassigned'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={13} />
          <span>{formatDate(inquiry.created_at)}</span>
        </div>
      </div>
    </div>
  );
};
