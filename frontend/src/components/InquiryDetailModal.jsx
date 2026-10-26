import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { StatusBadge } from './StatusBadge';
import {
  X,
  User,
  Mail,
  Clock,
  History,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Loader2,
  ShieldAlert
} from 'lucide-react';

export const InquiryDetailModal = ({ inquiryId, onClose, onUpdated, currentUser, users }) => {
  const [inquiry, setInquiry] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Status transition state
  const [selectedStatus, setSelectedStatus] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [reopenNote, setReopenNote] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState(null);

  // Stale data conflict state
  const [staleConflict, setStaleConflict] = useState(null);

  // Assignee state
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [assignUpdating, setAssignUpdating] = useState(false);

  const fetchDetails = async () => {
    setLoading(true);
    setError(null);
    setStaleConflict(null);
    setStatusError(null);

    try {
      const data = await api.getInquiryById(inquiryId);
      setInquiry(data.inquiry);
      setActivity(data.activity || []);
      setSelectedStatus(data.inquiry.status);
      setSelectedAssignee(data.inquiry.assigned_to ? String(data.inquiry.assigned_to) : '');
      setResolutionNotes(data.inquiry.resolution_notes || '');
    } catch (err) {
      setError({
        status: err.status,
        code: err.code,
        message: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (inquiryId) {
      fetchDetails();
    }
  }, [inquiryId]);

  if (!inquiryId) return null;

  const handleStatusChange = async (newStatus) => {
    setStatusError(null);
    setStaleConflict(null);
    setStatusUpdating(true);

    try {
      const payload = {
        status: newStatus,
        expected_version: inquiry.version,
        resolution_notes: newStatus === 'Resolved' ? resolutionNotes : undefined,
        note: inquiry.status === 'Resolved' && newStatus === 'In Progress' ? reopenNote : undefined
      };

      const res = await api.updateStatus(inquiry.id, payload);
      setInquiry(res.inquiry);
      setSelectedStatus(res.inquiry.status);
      setReopenNote('');
      if (onUpdated) onUpdated(res.inquiry);
      // Refresh audit trail
      const freshData = await api.getInquiryById(inquiry.id);
      setActivity(freshData.activity || []);
    } catch (err) {
      if (err.status === 409 && err.code === 'STALE_DATA_CONFLICT') {
        setStaleConflict({
          message: err.message,
          currentVersion: err.current_version,
          currentStatus: err.current_status
        });
      } else {
        setStatusError(err.message || 'Failed to update status');
      }
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAssigneeChange = async (assigneeId) => {
    setAssignUpdating(true);
    try {
      const assigned_to = assigneeId ? parseInt(assigneeId, 10) : null;
      const res = await api.assignInquiry(inquiry.id, {
        assigned_to,
        expected_version: inquiry.version
      });
      setInquiry(res.inquiry);
      setSelectedAssignee(res.inquiry.assigned_to ? String(res.inquiry.assigned_to) : '');
      if (onUpdated) onUpdated(res.inquiry);
      const freshData = await api.getInquiryById(inquiry.id);
      setActivity(freshData.activity || []);
    } catch (err) {
      if (err.status === 409) {
        setStaleConflict({ message: err.message });
      } else {
        setStatusError(err.message || 'Failed to reassign');
      }
    } finally {
      setAssignUpdating(false);
    }
  };

  // Determine available lifecycle transitions
  const getNextTransitions = () => {
    if (!inquiry) return [];
    if (inquiry.status === 'New') return [{ status: 'In Progress', label: 'Start Progress' }];
    if (inquiry.status === 'In Progress') return [
      { status: 'Resolved', label: 'Mark as Resolved' },
      { status: 'New', label: 'Reset to New' }
    ];
    if (inquiry.status === 'Resolved') return [{ status: 'In Progress', label: 'Reopen Inquiry' }];
    return [];
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="inquiry-detail-title">
      <div className="modal-content" style={{ maxWidth: '780px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 id="inquiry-detail-title">
              {inquiry ? `Inquiry #${inquiry.id}` : 'Inquiry Details'}
            </h2>
            {inquiry && <StatusBadge status={inquiry.status} />}
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto', color: 'var(--coffee-500)' }} />
              <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>Loading inquiry details...</p>
            </div>
          )}

          {error && (
            <div>
              {error.status === 403 ? (
                <div className="alert alert-danger" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                    <ShieldAlert size={20} />
                    <span>Access Denied (403 Forbidden)</span>
                  </div>
                  <p>{error.message}</p>
                  <p style={{ fontSize: '0.8rem', color: '#7f1d1d' }}>
                    Coffee Ninja Access Policy: Support Agents can only access unassigned inquiries or inquiries assigned to their account. Elena (Supervisor) has full access across all inquiries.
                  </p>
                </div>
              ) : (
                <div className="alert alert-danger">
                  <AlertCircle size={18} />
                  <span>{error.message}</span>
                </div>
              )}
            </div>
          )}

          {inquiry && !loading && (
            <div>
              {/* Situation 2: Stale Data Warning Banner */}
              {staleConflict && (
                <div className="stale-banner" role="alert">
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                    <AlertTriangle size={20} color="#c2410c" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <strong style={{ color: '#9a3412', display: 'block' }}>Stale Data Detected (Conflict 409)</strong>
                      <span style={{ fontSize: '0.86rem', color: '#7c2d12' }}>{staleConflict.message}</span>
                    </div>
                  </div>
                  <button
                    className="btn-secondary"
                    onClick={fetchDetails}
                    style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', padding: '0.45rem 0.8rem' }}
                    id="refresh-conflict-btn"
                  >
                    <RefreshCw size={14} />
                    <span>Reload Latest</span>
                  </button>
                </div>
              )}

              {/* Status Error Banner */}
              {statusError && (
                <div className="alert alert-danger" role="alert">
                  <AlertCircle size={18} />
                  <span>{statusError}</span>
                </div>
              )}

              {/* Subject & Customer Details */}
              <div style={{ marginBottom: '1.5rem', background: 'var(--coffee-50)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--coffee-950)', marginBottom: '0.5rem' }}>
                  {inquiry.subject}
                </h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <User size={15} />
                    <strong>Customer:</strong> {inquiry.customer_name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Mail size={15} />
                    <strong>Contact:</strong> {inquiry.customer_contact}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={15} />
                    <strong>Logged:</strong> {new Date(inquiry.created_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-dim)', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                  Inquiry Description
                </h4>
                <div style={{ padding: '1rem', background: '#fff', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', fontSize: '0.94rem', whiteSpace: 'pre-wrap' }}>
                  {inquiry.description}
                </div>
              </div>

              {/* Resolution Notes if Resolved */}
              {inquiry.resolution_notes && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#166534', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
                    Resolution Notes
                  </h4>
                  <div style={{ padding: '0.9rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', fontSize: '0.9rem', color: '#14532d' }}>
                    {inquiry.resolution_notes}
                  </div>
                </div>
              )}

              {/* Lifecycle Actions & Assignment Panel */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.75rem', padding: '1.25rem', background: 'var(--coffee-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                {/* Status Transitions */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--coffee-900)', marginBottom: '0.6rem' }}>
                    Lifecycle Actions (Current: {inquiry.status})
                  </h4>

                  {inquiry.status === 'In Progress' && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>
                        Resolution Summary (required to resolve)
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Refunded tax, replaced bean batch #409"
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                      />
                    </div>
                  )}

                  {inquiry.status === 'Resolved' && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>
                        Reason for Reopening
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Customer replied with additional questions"
                        value={reopenNote}
                        onChange={(e) => setReopenNote(e.target.value)}
                        style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem' }}
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {getNextTransitions().map((t) => (
                      <button
                        key={t.status}
                        className={t.status === 'Resolved' ? 'btn-primary' : 'btn-secondary'}
                        onClick={() => handleStatusChange(t.status)}
                        disabled={statusUpdating}
                        id={`btn-transition-${t.status.toLowerCase().replace(' ', '-')}`}
                      >
                        {statusUpdating ? <Loader2 size={14} className="animate-spin" /> : null}
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Assignment Management */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--coffee-900)', marginBottom: '0.6rem' }}>
                    Staff Ownership
                  </h4>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                      className="form-select"
                      value={selectedAssignee}
                      onChange={(e) => handleAssigneeChange(e.target.value)}
                      disabled={assignUpdating || (currentUser?.role !== 'supervisor' && inquiry.assigned_to && inquiry.assigned_to !== currentUser?.id)}
                      id="assignee-select"
                      style={{ fontSize: '0.88rem' }}
                    >
                      <option value="">Unassigned (Shared Inbox)</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>

                    {/* Quick Assign to Me */}
                    {currentUser && inquiry.assigned_to !== currentUser.id && (
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => handleAssigneeChange(String(currentUser.id))}
                        disabled={assignUpdating}
                        style={{ whiteSpace: 'nowrap', fontSize: '0.82rem', padding: '0.6rem 0.8rem' }}
                        id="assign-to-me-btn"
                      >
                        Assign to me
                      </button>
                    )}
                  </div>
                  {currentUser?.role !== 'supervisor' && inquiry.assigned_to && inquiry.assigned_to !== currentUser?.id && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', display: 'block' }}>
                      Only supervisors can reassign inquiries owned by other agents.
                    </span>
                  )}
                </div>
              </div>

              {/* Audit Trail / Activity History Timeline */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <History size={16} color="var(--coffee-700)" />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--coffee-950)' }}>
                    Activity Timeline & Audit Trail
                  </h4>
                </div>

                <div className="timeline">
                  {activity.map((act) => {
                    const dt = act.details || {};
                    return (
                      <div key={act.id} className="timeline-item">
                        <div className="timeline-dot"></div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <span className="timeline-user">{act.user_name || 'System Staff'}</span>
                            <span className="timeline-time">
                              {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <div>
                            {act.action === 'CREATED' && <span>Initial inquiry recorded into system.</span>}
                            {act.action === 'STATUS_CHANGE' && (
                              <div>
                                Transitioned status from <strong>{dt.previous_status}</strong> to <strong>{dt.new_status}</strong>.
                                {dt.resolution_notes && (
                                  <div style={{ marginTop: '4px', fontStyle: 'italic', color: '#166534' }}>
                                    "{dt.resolution_notes}"
                                  </div>
                                )}
                                {dt.note && (
                                  <div style={{ marginTop: '4px', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                                    Note: "{dt.note}"
                                  </div>
                                )}
                              </div>
                            )}
                            {act.action === 'ASSIGNED' && (
                              <span>Assigned inquiry to <strong>{dt.assigned_to_name || 'Unassigned'}</strong>.</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} id="close-detail-modal-btn">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
