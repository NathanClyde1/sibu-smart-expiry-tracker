import { randomUUID } from 'node:crypto';
import { db, type UserRow } from './db.js';
import { seedAdmin } from './env.js';
import { hashPassword } from './password.js';
import { seedCategories, seedCentres } from './seed-data.js';

/** Idempotent: safe to run on every deploy. */
export async function runSeed() {
  const existingAdmin = db.prepare('SELECT * FROM users WHERE email = ?').get(seedAdmin.email) as
    | UserRow
    | undefined;

  if (!existingAdmin) {
    db.prepare(
      'INSERT INTO users (id, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)',
    ).run(randomUUID(), seedAdmin.email, await hashPassword(seedAdmin.password), seedAdmin.name, 'admin');
    console.log(`[seed] admin created: ${seedAdmin.email}`);
  } else if (existingAdmin.role !== 'admin') {
    db.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(existingAdmin.id);
    console.log(`[seed] promoted existing account to admin: ${seedAdmin.email}`);
  }

  const centreCount = (db.prepare('SELECT COUNT(*) AS n FROM recycling_centres').get() as { n: number }).n;
  if (centreCount === 0) {
    const insert = db.prepare(
      `INSERT INTO recycling_centres
         (id, name, address, latitude, longitude, opening_hours, accepted_materials, notes, is_verified)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    db.transaction(() => {
      for (const centre of seedCentres) {
        insert.run(
          randomUUID(),
          centre.name,
          centre.address,
          centre.latitude,
          centre.longitude,
          centre.openingHours,
          JSON.stringify(centre.acceptedMaterials),
          centre.notes,
          centre.isVerified ? 1 : 0,
        );
      }
    })();
    console.log(`[seed] ${seedCentres.length} recycling centres inserted`);
  }

  const categoryCount = (db.prepare('SELECT COUNT(*) AS n FROM item_categories').get() as { n: number }).n;
  if (categoryCount === 0) {
    const insert = db.prepare(
      'INSERT INTO item_categories (id, name, disposal_method, description, sort_order) VALUES (?, ?, ?, ?, ?)',
    );
    db.transaction(() => {
      for (const category of seedCategories) {
        insert.run(randomUUID(), category.name, category.disposalMethod, category.description, category.sortOrder);
      }
    })();
    console.log(`[seed] ${seedCategories.length} item categories inserted`);
  }
}
