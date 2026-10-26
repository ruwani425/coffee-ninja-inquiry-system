import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StatusBadge } from '../components/StatusBadge';
import { NewInquiryModal } from '../components/NewInquiryModal';
import { InquiryFilter } from '../components/InquiryFilter';

describe('Frontend User Interactions & UI States', () => {
  it('renders StatusBadge with the correct status text and style class', () => {
    const { rerender } = render(<StatusBadge status="New" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('New');
    expect(screen.getByTestId('status-badge')).toHaveClass('badge-new');

    rerender(<StatusBadge status="In Progress" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('In Progress');
    expect(screen.getByTestId('status-badge')).toHaveClass('badge-in-progress');

    rerender(<StatusBadge status="Resolved" />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent('Resolved');
    expect(screen.getByTestId('status-badge')).toHaveClass('badge-resolved');
  });

  it('Situation 1 UI Guide: NewInquiryModal validates empty inputs and guides the user with inline errors', () => {
    const handleClose = vi.fn();
    const handleCreated = vi.fn();

    render(
      <NewInquiryModal
        isOpen={true}
        onClose={handleClose}
        onCreated={handleCreated}
        users={[]}
      />
    );

    // Click submit without entering data
    const submitBtn = screen.getByRole('button', { name: /save inquiry/i });
    fireEvent.click(submitBtn);

    // Verify UI validation guidance messages are rendered
    expect(screen.getByText(/customer name must be at least 2 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/please provide a valid contact email or phone number/i)).toBeInTheDocument();
    expect(screen.getByText(/subject must be at least 3 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/please provide a short description/i)).toBeInTheDocument();

    // Verify handleCreated was NOT called because of validation failure
    expect(handleCreated).not.toHaveBeenCalled();
  });

  it('User Interaction: InquiryFilter updates search query and triggers status filter selection', () => {
    const setSearch = vi.fn();
    const setStatus = vi.fn();
    const setScope = vi.fn();

    render(
      <InquiryFilter
        search=""
        setSearch={setSearch}
        status="All"
        setStatus={setStatus}
        scope="all"
        setScope={setScope}
        totalCount={5}
      />
    );

    // Test search input typing
    const searchInput = screen.getByPlaceholderText(/search by customer, contact, or subject/i);
    fireEvent.change(searchInput, { target: { value: 'cold brew' } });
    expect(setSearch).toHaveBeenCalledWith('cold brew');

    // Test clicking a status filter button
    const inProgressBtn = screen.getByRole('button', { name: /^in progress$/i });
    fireEvent.click(inProgressBtn);
    expect(setStatus).toHaveBeenCalledWith('In Progress');

    // Test clicking scope filter
    const mineBtn = screen.getByRole('button', { name: /assigned to me/i });
    fireEvent.click(mineBtn);
    expect(setScope).toHaveBeenCalledWith('mine');
  });
});
