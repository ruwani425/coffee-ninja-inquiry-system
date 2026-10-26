import test, { describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { pool } from '../src/config/db.js';
import { seed } from '../src/db/seed.js';

describe('Coffee Ninja Customer Inquiry Management - Backend Business & Security Rules', () => {
  let sarahToken;
  let alexToken;
  let elenaToken;
  let sarahInquiryId;
  let alexInquiryId;

  before(async () => {
    // Re-seed database before test run
    await seed();

    // Login Sarah (Agent)
    const sarahLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'sarah@coffeeninja.com', password: 'NinjaPass123!' });
    sarahToken = sarahLogin.body.token;

    // Login Alex (Agent)
    const alexLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alex@coffeeninja.com', password: 'NinjaPass123!' });
    alexToken = alexLogin.body.token;

    // Login Elena (Supervisor)
    const elenaLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'elena@coffeeninja.com', password: 'NinjaBoss123!' });
    elenaToken = elenaLogin.body.token;

    // Get an inquiry assigned to Sarah
    const inqRes = await pool.query("SELECT id FROM inquiries WHERE customer_name = 'Liam Walker'");
    sarahInquiryId = inqRes.rows[0].id;

    // Get an inquiry assigned to Alex
    const alexInqRes = await pool.query("SELECT id FROM inquiries WHERE customer_name = 'Sophia Chen'");
    alexInquiryId = alexInqRes.rows[0].id;
  });

  after(async () => {
    await pool.end();
  });

  test('Security Rule: Unauthorized request without JWT token is rejected with 401', async () => {
    const res = await request(app)
      .get(`/api/inquiries/${sarahInquiryId}`);
    
    assert.equal(res.status, 401);
    assert.equal(res.body.error, 'UNAUTHORIZED');
  });

  test('Security Rule (Situation 3): Agent cannot access another agent\'s assigned inquiry (returns 403 Forbidden)', async () => {
    // Alex attempts to access Sarah's inquiry directly
    const res = await request(app)
      .get(`/api/inquiries/${sarahInquiryId}`)
      .set('Authorization', `Bearer ${alexToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'FORBIDDEN');
    assert.match(res.body.message, /Access denied/i);
  });

  test('Security Rule: Supervisor CAN access any inquiry regardless of assignment', async () => {
    const res = await request(app)
      .get(`/api/inquiries/${sarahInquiryId}`)
      .set('Authorization', `Bearer ${elenaToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.inquiry.id, sarahInquiryId);
  });

  test('Validation Rule (Situation 1): Reject inquiry creation when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/inquiries')
      .set('Authorization', `Bearer ${sarahToken}`)
      .send({
        customer_name: '', // Too short
        customer_contact: 'x', // Invalid contact
        subject: '', // Missing
        description: 'short' // Too short
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'VALIDATION_ERROR');
    assert.ok(res.body.details.customer_name);
    assert.ok(res.body.details.customer_contact);
    assert.ok(res.body.details.subject);
  });

  test('Business Rule (Situation 2): Optimistic concurrency control rejects stale update with 409 Conflict', async () => {
    // Fetch inquiry version
    const initial = await request(app)
      .get(`/api/inquiries/${sarahInquiryId}`)
      .set('Authorization', `Bearer ${sarahToken}`);
    
    const staleVersion = initial.body.inquiry.version;

    // Simulate Tab 1 updating status from In Progress to Resolved
    const tab1Update = await request(app)
      .patch(`/api/inquiries/${sarahInquiryId}/status`)
      .set('Authorization', `Bearer ${sarahToken}`)
      .send({
        status: 'Resolved',
        expected_version: staleVersion,
        resolution_notes: 'Resolved batch replacement'
      });
    assert.equal(tab1Update.status, 200);

    // Simulate Tab 2 trying to update using the now-stale version
    const tab2Update = await request(app)
      .patch(`/api/inquiries/${sarahInquiryId}/status`)
      .set('Authorization', `Bearer ${sarahToken}`)
      .send({
        status: 'In Progress',
        expected_version: staleVersion,
        resolution_notes: 'Conflicting update attempt'
      });

    assert.equal(tab2Update.status, 409);
    assert.equal(tab2Update.body.error, 'STALE_DATA_CONFLICT');
    assert.match(tab2Update.body.message, /modified by another user/i);
  });

  test('Lifecycle Rule: Invalid status transitions are rejected with 400 Bad Request', async () => {
    // Unassigned inquiry (Marcus Sterling is in 'New' status)
    const inqRes = await pool.query("SELECT id FROM inquiries WHERE customer_name = 'Marcus Sterling'");
    const marcusId = inqRes.rows[0].id;

    // Attempt invalid direct transition from 'New' directly to 'Resolved'
    const res = await request(app)
      .patch(`/api/inquiries/${marcusId}/status`)
      .set('Authorization', `Bearer ${sarahToken}`)
      .send({
        status: 'Resolved',
        resolution_notes: 'Direct jump attempt'
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'INVALID_STATUS_TRANSITION');
    assert.match(res.body.message, /Cannot transition status from 'New' to 'Resolved'/);
  });

  test('Trustworthiness: Requesting non-existent inquiry returns 404', async () => {
    const res = await request(app)
      .get('/api/inquiries/999999')
      .set('Authorization', `Bearer ${elenaToken}`);

    assert.equal(res.status, 404);
    assert.equal(res.body.error, 'NOT_FOUND');
  });

  test('Trustworthiness: Requesting invalid non-integer inquiry ID returns 400 Bad Request', async () => {
    const res = await request(app)
      .get('/api/inquiries/not-a-number')
      .set('Authorization', `Bearer ${elenaToken}`);

    assert.equal(res.status, 400);
    assert.equal(res.body.error, 'INVALID_ID_FORMAT');
  });
});
