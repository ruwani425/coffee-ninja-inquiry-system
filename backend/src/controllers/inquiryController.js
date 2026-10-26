import { z } from 'zod';
import { pool } from '../config/db.js';

// Input Validation Schemas
export const createInquirySchema = z.object({
  customer_name: z.string().trim().min(2, 'Customer name must be at least 2 characters').max(120),
  customer_contact: z.string().trim().min(5, 'Contact details must be at least 5 characters (email or phone)'),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(200),
  description: z.string().trim().min(5, 'Description must be at least 5 characters'),
  assigned_to: z.number().int().positive().nullable().optional()
});

export const updateStatusSchema = z.object({
  status: z.enum(['New', 'In Progress', 'Resolved'], {
    errorMap: () => ({ message: 'Status must be one of: New, In Progress, Resolved' })
  }),
  expected_version: z.number().int().positive().optional(),
  resolution_notes: z.string().trim().optional(),
  note: z.string().trim().optional()
});

export const assignInquirySchema = z.object({
  assigned_to: z.number().int().positive().nullable(),
  expected_version: z.number().int().positive().optional()
});

// Allowed State Machine Transitions
const ALLOWED_TRANSITIONS = {
  'New': ['In Progress'],
  'In Progress': ['Resolved', 'New'], // Can return to New if unassigned/paused, or Resolved
  'Resolved': ['In Progress'] // Can be reopened into In Progress
};

/**
 * Helper to check inquiry access permission.
 * Rule:
 * - Supervisors can view/edit any inquiry.
 * - Agents can view/edit unassigned inquiries or inquiries assigned to themselves.
 * - Agents CANNOT access inquiries assigned to another agent.
 */
function checkInquiryAccess(inquiry, user) {
  if (user.role === 'supervisor') return true;
  if (!inquiry.assigned_to) return true; // Open unassigned pool
  return inquiry.assigned_to === user.id;
}

/**
 * GET /api/inquiries
 * List inquiries with optional search, status filtering, and scope filtering.
 */
export const listInquiries = async (req, res, next) => {
  try {
    const { search, status, scope } = req.query;
    const user = req.user;

    const conditions = [];
    const params = [];

    // Role-based filtering:
    // If agent and no specific filter, only show unassigned or assigned to this agent
    if (user.role === 'agent') {
      if (scope === 'mine') {
        params.push(user.id);
        conditions.push(`i.assigned_to = $${params.length}`);
      } else if (scope === 'unassigned') {
        conditions.push(`i.assigned_to IS NULL`);
      } else {
        // Shared accessible pool: unassigned OR assigned to current agent
        params.push(user.id);
        conditions.push(`(i.assigned_to IS NULL OR i.assigned_to = $${params.length})`);
      }
    } else {
      // Supervisor can filter by scope if desired
      if (scope === 'mine') {
        params.push(user.id);
        conditions.push(`i.assigned_to = $${params.length}`);
      } else if (scope === 'unassigned') {
        conditions.push(`i.assigned_to IS NULL`);
      }
    }

    // Status filter
    if (status && status !== 'All') {
      params.push(status);
      conditions.push(`i.status = $${params.length}`);
    }

    // Search filter across customer name, contact, subject, and description
    if (search && search.trim() !== '') {
      params.push(`%${search.trim().toLowerCase()}%`);
      const pIdx = params.length;
      conditions.push(
        `(LOWER(i.customer_name) LIKE $${pIdx} OR LOWER(i.customer_contact) LIKE $${pIdx} OR LOWER(i.subject) LIKE $${pIdx} OR LOWER(i.description) LIKE $${pIdx})`
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT 
        i.id,
        i.customer_name,
        i.customer_contact,
        i.subject,
        i.description,
        i.status,
        i.version,
        i.resolution_notes,
        i.created_at,
        i.updated_at,
        i.assigned_to,
        assignee.name AS assigned_to_name,
        creator.name AS created_by_name
      FROM inquiries i
      LEFT JOIN users assignee ON i.assigned_to = assignee.id
      LEFT JOIN users creator ON i.created_by = creator.id
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN i.status = 'New' THEN 1
          WHEN i.status = 'In Progress' THEN 2
          ELSE 3
        END,
        i.created_at DESC
    `;

    const result = await pool.query(sql, params);

    res.json({
      inquiries: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/inquiries/:id
 * Retrieve single inquiry and its full audit trail timeline. Enforces access rules.
 */
export const getInquiryById = async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const inquiryId = parseInt(rawId, 10);

    if (isNaN(inquiryId) || inquiryId <= 0) {
      return res.status(400).json({
        error: 'INVALID_ID_FORMAT',
        message: 'The inquiry ID provided in the URL is invalid. It must be a positive integer.'
      });
    }

    const inqResult = await pool.query(
      `SELECT 
        i.*,
        assignee.name AS assigned_to_name,
        assignee.email AS assigned_to_email,
        creator.name AS created_by_name
       FROM inquiries i
       LEFT JOIN users assignee ON i.assigned_to = assignee.id
       LEFT JOIN users creator ON i.created_by = creator.id
       WHERE i.id = $1`,
      [inquiryId]
    );

    if (inqResult.rows.length === 0) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Inquiry #${inquiryId} does not exist.`
      });
    }

    const inquiry = inqResult.rows[0];

    // Enforce Ownership and Access Control
    if (!checkInquiryAccess(inquiry, req.user)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `Access denied. Inquiry #${inquiryId} is assigned to another staff member (${inquiry.assigned_to_name || 'different agent'}).`
      });
    }

    // Retrieve activity history for this inquiry
    const activityResult = await pool.query(
      `SELECT 
        act.id,
        act.action,
        act.details,
        act.created_at,
        u.name AS user_name,
        u.role AS user_role
       FROM inquiry_activity act
       LEFT JOIN users u ON act.user_id = u.id
       WHERE act.inquiry_id = $1
       ORDER BY act.created_at ASC`,
      [inquiryId]
    );

    res.json({
      inquiry,
      activity: activityResult.rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/inquiries
 * Create a new customer inquiry with validation and deduplication policy.
 */
export const createInquiry = async (req, res, next) => {
  try {
    const data = createInquirySchema.parse(req.body);
    const allowDuplicate = req.query.allow_duplicate === 'true';

    // Duplicate Check Policy:
    // Check if an active inquiry with the same contact & subject was created in the last 24 hours
    const duplicateCheck = await pool.query(
      `SELECT id, customer_name, subject, created_at, status
       FROM inquiries
       WHERE LOWER(customer_contact) = LOWER($1)
         AND LOWER(subject) = LOWER($2)
         AND status != 'Resolved'
         AND created_at > NOW() - INTERVAL '24 hours'
       LIMIT 1`,
      [data.customer_contact.trim(), data.subject.trim()]
    );

    if (duplicateCheck.rows.length > 0 && !allowDuplicate) {
      const existing = duplicateCheck.rows[0];
      return res.status(409).json({
        error: 'DUPLICATE_INQUIRY',
        message: `A recent active inquiry for this customer with the same subject already exists (#${existing.id}: "${existing.subject}"). Please check the existing record.`,
        existingId: existing.id
      });
    }

    // Insert new inquiry
    const result = await pool.query(
      `INSERT INTO inquiries (
        customer_name,
        customer_contact,
        subject,
        description,
        status,
        assigned_to,
        created_by,
        version
      ) VALUES ($1, $2, $3, $4, 'New', $5, $6, 1)
      RETURNING *`,
      [
        data.customer_name.trim(),
        data.customer_contact.trim(),
        data.subject.trim(),
        data.description.trim(),
        data.assigned_to || null,
        req.user.id
      ]
    );

    const newInquiry = result.rows[0];

    // Log creation activity
    await pool.query(
      `INSERT INTO inquiry_activity (inquiry_id, user_id, action, details)
       VALUES ($1, $2, 'CREATED', $3)`,
      [
        newInquiry.id,
        req.user.id,
        JSON.stringify({
          note: 'Inquiry registered in system',
          assigned_to: newInquiry.assigned_to
        })
      ]
    );

    res.status(201).json({
      message: 'Inquiry created successfully.',
      inquiry: newInquiry
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/inquiries/:id/status
 * Updates the lifecycle status of an inquiry.
 * Enforces state machine rules, access control, and optimistic concurrency check.
 */
export const updateInquiryStatus = async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const inquiryId = parseInt(rawId, 10);

    if (isNaN(inquiryId) || inquiryId <= 0) {
      return res.status(400).json({
        error: 'INVALID_ID_FORMAT',
        message: 'The inquiry ID provided in the URL is invalid.'
      });
    }

    const { status: newStatus, expected_version, resolution_notes, note } = updateStatusSchema.parse(req.body);

    // Fetch existing inquiry
    const existingRes = await pool.query('SELECT * FROM inquiries WHERE id = $1', [inquiryId]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: `Inquiry #${inquiryId} does not exist.`
      });
    }

    const inquiry = existingRes.rows[0];

    // Access control check
    if (!checkInquiryAccess(inquiry, req.user)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'Access denied: You cannot modify inquiries assigned to another team member.'
      });
    }

    // Optimistic Concurrency Check (Stale Data Handling)
    if (expected_version !== undefined && expected_version !== inquiry.version) {
      return res.status(409).json({
        error: 'STALE_DATA_CONFLICT',
        message: `This inquiry was modified by another user (current version: ${inquiry.version}, your version: ${expected_version}). Please refresh to see the latest changes.`,
        current_version: inquiry.version,
        current_status: inquiry.status
      });
    }

    // State Transition Rules Check
    const currentStatus = inquiry.status;

    if (currentStatus === newStatus) {
      return res.status(400).json({
        error: 'SAME_STATUS',
        message: `Inquiry is already in '${currentStatus}' status.`
      });
    }

    const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowedNext.includes(newStatus)) {
      return res.status(400).json({
        error: 'INVALID_STATUS_TRANSITION',
        message: `Cannot transition status from '${currentStatus}' to '${newStatus}'. Allowed transitions from '${currentStatus}': ${allowedNext.length > 0 ? allowedNext.join(', ') : 'None'}.`
      });
    }

    // If resolving, optional/suggested resolution notes
    const finalResolutionNotes = newStatus === 'Resolved' 
      ? (resolution_notes?.trim() || inquiry.resolution_notes || 'Resolved by staff')
      : inquiry.resolution_notes;

    // Auto-assign to acting user if transitioning from New to In Progress and currently unassigned
    let assignedTo = inquiry.assigned_to;
    if (currentStatus === 'New' && newStatus === 'In Progress' && !assignedTo) {
      assignedTo = req.user.id;
    }

    // Update inquiry with incremented version
    const updateRes = await pool.query(
      `UPDATE inquiries
       SET status = $1,
           resolution_notes = $2,
           assigned_to = $3,
           version = version + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [newStatus, finalResolutionNotes, assignedTo, inquiryId]
    );

    const updatedInquiry = updateRes.rows[0];

    // Record audit log
    await pool.query(
      `INSERT INTO inquiry_activity (inquiry_id, user_id, action, details)
       VALUES ($1, $2, 'STATUS_CHANGE', $3)`,
      [
        inquiryId,
        req.user.id,
        JSON.stringify({
          previous_status: currentStatus,
          new_status: newStatus,
          resolution_notes: finalResolutionNotes,
          note: note?.trim() || null
        })
      ]
    );

    res.json({
      message: `Status successfully updated to '${newStatus}'.`,
      inquiry: updatedInquiry
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/inquiries/:id/assign
 * Assign an inquiry to a team member or self.
 */
export const assignInquiry = async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const inquiryId = parseInt(rawId, 10);

    if (isNaN(inquiryId) || inquiryId <= 0) {
      return res.status(400).json({
        error: 'INVALID_ID_FORMAT',
        message: 'Invalid inquiry ID.'
      });
    }

    const { assigned_to, expected_version } = assignInquirySchema.parse(req.body);

    const existingRes = await pool.query('SELECT * FROM inquiries WHERE id = $1', [inquiryId]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Inquiry not found.'
      });
    }

    const inquiry = existingRes.rows[0];

    // Access rule: Only supervisors or current assignee or unassigned can reassign
    if (req.user.role !== 'supervisor' && inquiry.assigned_to && inquiry.assigned_to !== req.user.id) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'You cannot reassign an inquiry assigned to another staff member.'
      });
    }

    if (expected_version !== undefined && expected_version !== inquiry.version) {
      return res.status(409).json({
        error: 'STALE_DATA_CONFLICT',
        message: 'Record was modified by another user. Please refresh.',
        current_version: inquiry.version
      });
    }

    // Verify assigned user exists if not null
    let targetUserName = 'Unassigned';
    if (assigned_to !== null) {
      const uRes = await pool.query('SELECT name FROM users WHERE id = $1', [assigned_to]);
      if (uRes.rows.length === 0) {
        return res.status(400).json({
          error: 'USER_NOT_FOUND',
          message: 'The selected staff member does not exist.'
        });
      }
      targetUserName = uRes.rows[0].name;
    }

    const updateRes = await pool.query(
      `UPDATE inquiries
       SET assigned_to = $1,
           version = version + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [assigned_to, inquiryId]
    );

    await pool.query(
      `INSERT INTO inquiry_activity (inquiry_id, user_id, action, details)
       VALUES ($1, $2, 'ASSIGNED', $3)`,
      [
        inquiryId,
        req.user.id,
        JSON.stringify({
          assigned_to,
          assigned_to_name: targetUserName
        })
      ]
    );

    res.json({
      message: `Inquiry assigned to ${targetUserName}.`,
      inquiry: updateRes.rows[0]
    });
  } catch (error) {
    next(error);
  }
};
