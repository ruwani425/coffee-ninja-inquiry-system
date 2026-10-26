const API_BASE = '/api';

/**
 * Universal fetch wrapper that manages JWT headers and formats standard error responses.
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('coffee_ninja_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(data.message || 'An unexpected error occurred');
      error.status = response.status;
      error.code = data.error;
      error.details = data.details;
      error.current_version = data.current_version;
      error.current_status = data.current_status;
      error.existingId = data.existingId;
      throw error;
    }

    return data;
  } catch (err) {
    throw err;
  }
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  getCurrentUser: () => request('/auth/me'),

  getUsers: () => request('/auth/users'),

  // Inquiries
  getInquiries: ({ search = '', status = 'All', scope = 'all' } = {}) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (status && status !== 'All') params.append('status', status);
    if (scope && scope !== 'all') params.append('scope', scope);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/inquiries${query}`);
  },

  getInquiryById: (id) => request(`/inquiries/${id}`),

  createInquiry: (inquiryData, allowDuplicate = false) => {
    const query = allowDuplicate ? '?allow_duplicate=true' : '';
    return request(`/inquiries${query}`, {
      method: 'POST',
      body: JSON.stringify(inquiryData)
    });
  },

  updateStatus: (id, { status, expected_version, resolution_notes, note }) =>
    request(`/inquiries/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, expected_version, resolution_notes, note })
    }),

  assignInquiry: (id, { assigned_to, expected_version }) =>
    request(`/inquiries/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assigned_to, expected_version })
    })
};
