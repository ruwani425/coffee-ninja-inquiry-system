# Engineering Decisions & Trade-Offs

## 1. Core Assumptions
1. **Team Structure & Access Ownership**:
   - The business operates with two distinct staff tiers: **Support Agents** (`agent`) and **Supervisors** (`supervisor`).
   - *Rule*: Agents have access to the shared unassigned inbox and inquiries specifically assigned to them. An agent cannot view or modify inquiries assigned to another agent. Supervisors have unrestricted access across all tickets to reassign, oversee, and reopen resolved inquiries.
   - *Enforcement*: Enforced at the PostgreSQL query and Express middleware level (`403 Forbidden` response), preventing bypass through direct URL or API calls.

2. **Customer Contact Uniqueness**:
   - Customers may submit inquiries via email or phone. Rather than building a heavyweight CRM engine, a pragmatic policy is adopted: if an active (unresolved) inquiry exists with the same contact and subject within the last 24 hours, the API rejects it with `409 Conflict` (with an override option if confirmed).

---

## 2. Key Design Choices

### Choice 1: Explicit State Machine for Inquiry Lifecycle
- **Decision**: Transitions are restricted to valid business states:
  - `New` → `In Progress`
  - `In Progress` → `Resolved` (with required resolution notes)
  - `Resolved` → `In Progress` (Reopened with reason)
  - Direct jumps like `New` → `Resolved` or `Resolved` → `New` are rejected with `400 Bad Request`.
- **Why**: Prevents inquiries from being bypassed or marked done without investigation, ensuring accountability and clean data.

### Choice 2: Optimistic Concurrency Control for Stale Data (Situation 2)
- **Decision**: Added an integer `version` column to the `inquiries` table. Every update increments the version. When a client submits a status or assignment change, it supplies `expected_version`. If another browser tab or agent has updated the ticket, the server returns `409 Conflict` with the latest record state.
- **Why**: Avoids "last write wins" data loss when two staff members collaborate or keep the same inquiry open in multiple tabs.

### Choice 3: Append-Only Activity Log (`inquiry_activity`)
- **Decision**: In addition to updating the status column, every transition, assignment, or note writes to an immutable `inquiry_activity` table.
- **Why**: Directly solves the problem statement: *"Staff sometimes lose track of who is handling a request, whether it has been addressed, and what happened last."* The timeline in the UI displays the exact chronological record of actions and staff involved.

---

## 3. Trade-off Accepted
- **Polling / Refetching vs. WebSockets**:
  - *Decision*: We used optimistic concurrency checks with explicit refresh alerts rather than full bi-directional WebSockets (Socket.io) or Server-Sent Events (SSE).
  - *Trade-off*: Real-time updates do not instantly re-render in other open tabs until the user interacts or manually refreshes. However, this dramatically simplifies infrastructure, keeps database connection pooling lean, eliminates complex socket reconnect/authentication lifecycle issues, and strictly meets the assessment brief's guidance (*"For the stale-data case, a short written explanation of your chosen handling is acceptable; you do not need to implement real-time updates"*).

---

## 4. What Would Be Improved Next
1. **Pagination & Server-side Sorting**: Currently, inquiries are retrieved in batch. For large volume (1,000+ tickets), cursor-based pagination would be added.
2. **File Attachments**: Allowing staff or customers to attach screenshots or PDF invoices (stored in S3 / Cloud Storage).
3. **Automated SLA Timers**: Highlighting inquiries that remain in `New` status for more than 4 hours.

---

## 5. Use of AI and Outside Resources
- **Where AI Helped**:
  - AI assisted in scaffolding boilerplate Express routes, configuring Vitest setup for React 18, and structuring the CSS token palette for the warm Coffee Ninja theme.
- **Suggestion Evaluated**:
  - *Suggestion*: AI initially suggested allowing any signed-in user to view and edit all inquiries and implementing a complex fuzzy search algorithm with external libraries.
  - *Decision*: **Rejected/Changed**. In accordance with the prompt's call for engineering judgement and ownership rules, we defined a strict, role-based boundary (`agent` vs `supervisor`) with backend enforcement (Situation 3), and implemented clean SQL ILIKE query filtering instead of bringing in heavy external search engines.
