import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { InquiryFilter } from '../components/InquiryFilter';
import { InquiryCard } from '../components/InquiryCard';
import { NewInquiryModal } from '../components/NewInquiryModal';
import { InquiryDetailModal } from '../components/InquiryDetailModal';
import {
  Plus,
  Inbox,
  AlertCircle,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

export const DashboardPage = () => {
  const { user } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [scopeFilter, setScopeFilter] = useState('all');

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [activeInquiryId, setActiveInquiryId] = useState(null);

  // Check URL query parameters for direct inquiry link (e.g. ?inquiry=2)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const directId = params.get('inquiry');
    if (directId) {
      setActiveInquiryId(directId);
    }
  }, []);

  // Fetch list of inquiries
  const fetchInquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getInquiries({
        search,
        status: statusFilter,
        scope: scopeFilter
      });
      setInquiries(data.inquiries || []);
    } catch (err) {
      setError(err.message || 'Failed to load inquiries.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch staff list for assignment dropdowns
  const fetchUsers = async () => {
    try {
      const res = await api.getUsers();
      setUsers(res.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchInquiries();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, statusFilter, scopeFilter]);

  const handleInquiryCreated = (newInquiry) => {
    fetchInquiries();
    setActiveInquiryId(newInquiry.id);
  };

  const handleInquiryUpdated = () => {
    fetchInquiries();
  };

  const handleOpenDetail = (inquiry) => {
    setActiveInquiryId(inquiry.id);
    const url = new URL(window.location);
    url.searchParams.set('inquiry', inquiry.id);
    window.history.pushState({}, '', url);
  };

  const handleCloseDetail = () => {
    setActiveInquiryId(null);
    const url = new URL(window.location);
    url.searchParams.delete('inquiry');
    window.history.pushState({}, '', url);
  };

  // Count summaries
  const newCount = inquiries.filter((i) => i.status === 'New').length;
  const inProgressCount = inquiries.filter((i) => i.status === 'In Progress').length;
  const resolvedCount = inquiries.filter((i) => i.status === 'Resolved').length;

  return (
    <div>
      <Navbar />

      <main className="main-container">
        {/* Header with Title and Primary Action */}
        <div className="dashboard-header">
          <div className="dashboard-title">
            <h1>Customer Inquiries Workspace</h1>
            <p>
              Signed in as <strong>{user?.name}</strong> ({user?.role}). Manage customer tickets, assign handlers, and track lifecycles.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn-secondary"
              onClick={fetchInquiries}
              title="Refresh inquiries list"
              id="refresh-list-btn"
            >
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
            <button
              className="btn-primary"
              onClick={() => setIsNewModalOpen(true)}
              id="btn-new-inquiry"
            >
              <Plus size={18} />
              <span>Record New Inquiry</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Metric Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}
        >
          <div style={{ background: '#fff', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>TOTAL VISIBLE</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--coffee-950)' }}>{inquiries.length}</div>
          </div>
          <div style={{ background: '#fff', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontSize: '0.8rem', color: '#1d4ed8', fontWeight: 600 }}>NEW TICKETS</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1d4ed8' }}>{newCount}</div>
          </div>
          <div style={{ background: '#fff', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontSize: '0.8rem', color: '#b45309', fontWeight: 600 }}>IN PROGRESS</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#b45309' }}>{inProgressCount}</div>
          </div>
          <div style={{ background: '#fff', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
            <span style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 600 }}>RESOLVED</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#15803d' }}>{resolvedCount}</div>
          </div>
        </div>

        {/* Filter Controls */}
        <InquiryFilter
          search={search}
          setSearch={setSearch}
          status={statusFilter}
          setStatus={setStatusFilter}
          scope={scopeFilter}
          setScope={setScopeFilter}
          totalCount={inquiries.length}
        />

        {/* Error State */}
        {error && (
          <div className="alert alert-danger" role="alert">
            <AlertCircle size={18} />
            <div>
              <strong>Error loading inquiries:</strong> {error}
            </div>
          </div>
        )}

        {/* Loading State: Skeletons */}
        {loading && (
          <div className="inquiries-grid">
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ background: '#fff', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)' }}>
                <div className="skeleton" style={{ height: '20px', width: '30%', marginBottom: '12px' }}></div>
                <div className="skeleton" style={{ height: '24px', width: '60%', marginBottom: '16px' }}></div>
                <div className="skeleton" style={{ height: '16px', width: '90%', marginBottom: '8px' }}></div>
                <div className="skeleton" style={{ height: '16px', width: '75%' }}></div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && inquiries.length === 0 && (
          <div className="empty-state">
            <Inbox className="empty-icon" />
            <h3>No inquiries found</h3>
            <p>
              {search || statusFilter !== 'All' || scopeFilter !== 'all'
                ? "No customer inquiries match your current filter criteria. Try adjusting your search keywords or clearing active filters."
                : "No customer inquiries have been recorded yet. Click 'Record New Inquiry' to register the first customer request."}
            </p>
            {(search || statusFilter !== 'All' || scopeFilter !== 'all') ? (
              <button
                className="btn-secondary"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('All');
                  setScopeFilter('all');
                }}
              >
                Clear All Filters
              </button>
            ) : (
              <button className="btn-primary" onClick={() => setIsNewModalOpen(true)}>
                <Plus size={16} />
                <span>Record New Inquiry</span>
              </button>
            )}
          </div>
        )}

        {/* Inquiries List */}
        {!loading && inquiries.length > 0 && (
          <div className="inquiries-grid" data-testid="inquiries-list">
            {inquiries.map((inq) => (
              <InquiryCard
                key={inq.id}
                inquiry={inq}
                onClick={handleOpenDetail}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        <NewInquiryModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
          onCreated={handleInquiryCreated}
          users={users}
        />

        <InquiryDetailModal
          inquiryId={activeInquiryId}
          onClose={handleCloseDetail}
          onUpdated={handleInquiryUpdated}
          currentUser={user}
          users={users}
        />
      </main>
    </div>
  );
};
