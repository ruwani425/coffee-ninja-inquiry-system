import React, { useState } from 'react';
import { api } from '../services/api';
import { X, AlertCircle, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

export const NewInquiryModal = ({ isOpen, onClose, onCreated, users }) => {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_contact: '',
    subject: '',
    description: '',
    assigned_to: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.customer_name.trim() || formData.customer_name.trim().length < 2) {
      errs.customer_name = 'Customer name must be at least 2 characters';
    }
    if (!formData.customer_contact.trim() || formData.customer_contact.trim().length < 5) {
      errs.customer_contact = 'Please provide a valid contact email or phone number (min 5 characters)';
    }
    if (!formData.subject.trim() || formData.subject.trim().length < 3) {
      errs.subject = 'Subject must be at least 3 characters';
    }
    if (!formData.description.trim() || formData.description.trim().length < 5) {
      errs.description = 'Please provide a short description (min 5 characters)';
    }
    return errs;
  };

  const handleSubmit = async (e, forceDuplicate = false) => {
    if (e) e.preventDefault();
    setDuplicateWarning(null);

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const payload = {
        customer_name: formData.customer_name.trim(),
        customer_contact: formData.customer_contact.trim(),
        subject: formData.subject.trim(),
        description: formData.description.trim(),
        assigned_to: formData.assigned_to ? parseInt(formData.assigned_to, 10) : null
      };

      const res = await api.createInquiry(payload, forceDuplicate);
      onCreated(res.inquiry);
      onClose();
    } catch (err) {
      if (err.status === 409 && err.code === 'DUPLICATE_INQUIRY') {
        setDuplicateWarning({
          message: err.message,
          existingId: err.existingId
        });
      } else if (err.status === 400 && err.details) {
        setErrors(err.details);
      } else {
        setErrors({ general: err.message || 'Failed to submit inquiry. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="new-inquiry-title">
      <div className="modal-content">
        <div className="modal-header">
          <h2 id="new-inquiry-title">Record Customer Inquiry</h2>
          <button className="btn-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={(e) => handleSubmit(e, false)}>
          <div className="modal-body">
            {errors.general && (
              <div className="alert alert-danger" role="alert">
                <AlertCircle size={18} />
                <span>{errors.general}</span>
              </div>
            )}

            {duplicateWarning && (
              <div className="alert alert-warning" role="alert">
                <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, marginBottom: '4px' }}>Potential Duplicate Detected</div>
                  <div>{duplicateWarning.message}</div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}
                      onClick={() => handleSubmit(null, true)}
                    >
                      Submit Anyway (Allow Duplicate)
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="customer_name">
                Customer Name <span className="required">*</span>
              </label>
              <input
                id="customer_name"
                type="text"
                className={`form-input ${errors.customer_name ? 'error' : ''}`}
                placeholder="e.g. Liam Walker"
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              />
              {errors.customer_name && (
                <div className="field-error">
                  <AlertCircle size={14} />
                  <span>{errors.customer_name}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="customer_contact">
                Customer Contact (Email or Phone) <span className="required">*</span>
              </label>
              <input
                id="customer_contact"
                type="text"
                className={`form-input ${errors.customer_contact ? 'error' : ''}`}
                placeholder="e.g. liam@example.com or +1 555-019-2834"
                value={formData.customer_contact}
                onChange={(e) => setFormData({ ...formData, customer_contact: e.target.value })}
              />
              {errors.customer_contact && (
                <div className="field-error">
                  <AlertCircle size={14} />
                  <span>{errors.customer_contact}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="subject">
                Subject <span className="required">*</span>
              </label>
              <input
                id="subject"
                type="text"
                className={`form-input ${errors.subject ? 'error' : ''}`}
                placeholder="e.g. Cold brew batch sour taste"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
              {errors.subject && (
                <div className="field-error">
                  <AlertCircle size={14} />
                  <span>{errors.subject}</span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="description">
                Description <span className="required">*</span>
              </label>
              <textarea
                id="description"
                rows={3}
                className={`form-textarea ${errors.description ? 'error' : ''}`}
                placeholder="Describe the customer request, issue, or feedback..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              {errors.description && (
                <div className="field-error">
                  <AlertCircle size={14} />
                  <span>{errors.description}</span>
                </div>
              )}
            </div>

            {users && users.length > 0 && (
              <div className="form-group">
                <label className="form-label" htmlFor="assigned_to">
                  Assign Staff Member (Optional)
                </label>
                <select
                  id="assigned_to"
                  className="form-select"
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                >
                  <option value="">Leave unassigned (Shared team inbox)</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading} id="submit-inquiry-btn">
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                'Save Inquiry'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
