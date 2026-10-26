import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { migrate } from './migrate.js';

export async function seed() {
  console.log('Seeding database with initial users and inquiries...');
  await migrate();

  const salt = await bcrypt.genSalt(10);
  const agentPassHash = await bcrypt.hash('NinjaPass123!', salt);
  const supervisorPassHash = await bcrypt.hash('NinjaBoss123!', salt);

  // Clear existing data for clean seed
  await pool.query('TRUNCATE TABLE inquiry_activity, inquiries, users RESTART IDENTITY CASCADE');

  // Insert Users
  const userRes = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES 
      ('Sarah Jenkins', 'sarah@coffeeninja.com', $1, 'agent'),
      ('Alex Rivera', 'alex@coffeeninja.com', $1, 'agent'),
      ('Elena Rostova', 'elena@coffeeninja.com', $2, 'supervisor')
     RETURNING id, name, email, role`,
    [agentPassHash, supervisorPassHash]
  );

  const sarah = userRes.rows.find((u) => u.email === 'sarah@coffeeninja.com');
  const alex = userRes.rows.find((u) => u.email === 'alex@coffeeninja.com');
  const elena = userRes.rows.find((u) => u.email === 'elena@coffeeninja.com');

  console.log(`Seeded ${userRes.rows.length} users:`);
  userRes.rows.forEach((u) => console.log(`  - [${u.role.toUpperCase()}] ${u.name} <${u.email}>`));

  // Insert Inquiries
  const inquiriesData = [
    {
      customer_name: 'Liam Walker',
      customer_contact: 'liam.walker@example.com',
      subject: 'Cold brew batch sour taste',
      description: 'Customer noted that their 12-pack batch #CB-409 tastes overly acidic. Wants replacement or brew parameter check.',
      status: 'In Progress',
      assigned_to: sarah.id,
      created_by: sarah.id,
      version: 1,
      resolution_notes: null,
      created_at: new Date(Date.now() - 3600000 * 5)
    },
    {
      customer_name: 'Sophia Chen',
      customer_contact: '+1 555-019-2834',
      subject: 'Wholesale delivery schedule query',
      description: 'Cafe partner requesting to adjust delivery window from Tuesday 9am to Thursday 7am for weekly bean dispatch.',
      status: 'New',
      assigned_to: alex.id,
      created_by: alex.id,
      version: 1,
      resolution_notes: null,
      created_at: new Date(Date.now() - 3600000 * 3)
    },
    {
      customer_name: 'Marcus Sterling',
      customer_contact: 'marcus.s@outlook.com',
      subject: 'Espresso machine grinder calibration issue',
      description: 'Need guide on recalibrating the conical burrs on the Ninja Pro Grinder v2 after cleaning.',
      status: 'New',
      assigned_to: null, // Shared unassigned pool
      created_by: sarah.id,
      version: 1,
      resolution_notes: null,
      created_at: new Date(Date.now() - 3600000 * 2)
    },
    {
      customer_name: 'Amara Patel',
      customer_contact: 'amara.patel@workmail.com',
      subject: 'Invoice correction for order #CN-9921',
      description: 'Requested corporate tax exemption adjustment on quarterly office subscription invoice.',
      status: 'Resolved',
      assigned_to: sarah.id,
      created_by: sarah.id,
      version: 2,
      resolution_notes: 'Verified tax-exempt certificate #TX-883. Reissued invoice and credited $42.50 to company balance.',
      created_at: new Date(Date.now() - 3600000 * 24)
    }
  ];

  for (const inq of inquiriesData) {
    const insertInqRes = await pool.query(
      `INSERT INTO inquiries (customer_name, customer_contact, subject, description, status, assigned_to, created_by, version, resolution_notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
       RETURNING id`,
      [
        inq.customer_name,
        inq.customer_contact,
        inq.subject,
        inq.description,
        inq.status,
        inq.assigned_to,
        inq.created_by,
        inq.version,
        inq.resolution_notes,
        inq.created_at
      ]
    );

    const inqId = insertInqRes.rows[0].id;

    // Seed activity history
    await pool.query(
      `INSERT INTO inquiry_activity (inquiry_id, user_id, action, details, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        inqId,
        inq.created_by,
        'CREATED',
        JSON.stringify({ note: 'Inquiry initially captured in system' }),
        inq.created_at
      ]
    );

    if (inq.status === 'Resolved') {
      await pool.query(
        `INSERT INTO inquiry_activity (inquiry_id, user_id, action, details, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          inqId,
          sarah.id,
          'STATUS_CHANGE',
          JSON.stringify({
            previous_status: 'In Progress',
            new_status: 'Resolved',
            resolution_notes: inq.resolution_notes
          }),
          new Date(Date.now() - 3600000 * 12)
        ]
      );
    }
  }

  console.log(`✅ Successfully seeded database with ${inquiriesData.length} sample inquiries and activities.`);
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}
