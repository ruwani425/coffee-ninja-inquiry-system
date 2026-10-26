import React from 'react';
import { Search, X, SlidersHorizontal, Filter } from 'lucide-react';

export const InquiryFilter = ({
  search,
  setSearch,
  status,
  setStatus,
  scope,
  setScope,
  totalCount
}) => {
  return (
    <div className="filter-bar" role="search" aria-label="Inquiry filters">
      <div className="search-input-wrapper">
        <Search className="search-icon" size={18} />
        <input
          type="text"
          id="search-inquiries"
          className="search-input"
          placeholder="Search by customer, contact, or subject..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{
              position: 'absolute',
              right: '10px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-dim)'
            }}
            title="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Scope Selector */}
      <div className="filter-group">
        <span className="filter-label">View:</span>
        <div className="segmented-control" role="group" aria-label="Inquiry assignment scope">
          <button
            className={`segmented-btn ${scope === 'all' ? 'active' : ''}`}
            onClick={() => setScope('all')}
            id="scope-all"
          >
            All Shared
          </button>
          <button
            className={`segmented-btn ${scope === 'mine' ? 'active' : ''}`}
            onClick={() => setScope('mine')}
            id="scope-mine"
          >
            Assigned to Me
          </button>
          <button
            className={`segmented-btn ${scope === 'unassigned' ? 'active' : ''}`}
            onClick={() => setScope('unassigned')}
            id="scope-unassigned"
          >
            Unassigned
          </button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="filter-group">
        <span className="filter-label">Status:</span>
        <div className="segmented-control" role="group" aria-label="Inquiry status filter">
          {['All', 'New', 'In Progress', 'Resolved'].map((st) => (
            <button
              key={st}
              className={`segmented-btn ${status === st ? 'active' : ''}`}
              onClick={() => setStatus(st)}
              id={`filter-status-${st.toLowerCase().replace(' ', '-')}`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
