import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { db, type CategoryRow, type CentreRow, type DisposalMethod } from '../db.js';
import { authenticate, requireAdmin } from '../auth.js';

export const adminRouter = Router();
adminRouter.use(authenticate, requireAdmin);

const centreSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().min(5).max(300),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  openingHours: z.string().trim().max(200).nullable().optional(),
  acceptedMaterials: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
  isVerified: z.boolean().optional(),
});

const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  disposalMethod: z.enum(['recycle', 'compost', 'general', 'special']),
  description: z.string().trim().max(1000).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

function serializeCentre(row: CentreRow) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    openingHours: row.opening_hours,
    acceptedMaterials: JSON.parse(row.accepted_materials) as string[],
    notes: row.notes,
    isVerified: row.is_verified === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serializeCategory(row: CategoryRow) {
  return {
    id: row.id,
    name: row.name,
    disposalMethod: row.disposal_method,
    description: row.description,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function badRequest(res: import('express').Response, error: z.ZodError) {
  return res.status(400).json({ error: error.issues[0]?.message ?? 'Invalid input' });
}

/* ---------------------------------------------------------------- centres */

adminRouter.get('/centres', (_req, res) => {
  const rows = db.prepare('SELECT * FROM recycling_centres ORDER BY name COLLATE NOCASE').all() as CentreRow[];
  res.json({ centres: rows.map(serializeCentre) });
});

adminRouter.post('/centres', (req, res) => {
  const parsed = centreSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);

  const data = parsed.data;
  const id = randomUUID();
  db.prepare(
    `INSERT INTO recycling_centres
       (id, name, address, latitude, longitude, opening_hours, accepted_materials, notes, is_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    data.name,
    data.address,
    data.latitude,
    data.longitude,
    data.openingHours ?? null,
    JSON.stringify(data.acceptedMaterials ?? []),
    data.notes ?? null,
    data.isVerified === false ? 0 : 1,
  );

  const row = db.prepare('SELECT * FROM recycling_centres WHERE id = ?').get(id) as CentreRow;
  res.status(201).json({ centre: serializeCentre(row) });
});

adminRouter.patch('/centres/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM recycling_centres WHERE id = ?').get(req.params.id) as
    | CentreRow
    | undefined;
  if (!existing) return res.status(404).json({ error: 'Recycling centre not found' });

  const parsed = centreSchema.partial().safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);

  const data = parsed.data;
  db.prepare(
    `UPDATE recycling_centres SET
       name = ?, address = ?, latitude = ?, longitude = ?, opening_hours = ?,
       accepted_materials = ?, notes = ?, is_verified = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(
    data.name ?? existing.name,
    data.address ?? existing.address,
    data.latitude ?? existing.latitude,
    data.longitude ?? existing.longitude,
    data.openingHours !== undefined ? data.openingHours : existing.opening_hours,
    data.acceptedMaterials !== undefined
      ? JSON.stringify(data.acceptedMaterials)
      : existing.accepted_materials,
    data.notes !== undefined ? data.notes : existing.notes,
    data.isVerified !== undefined ? (data.isVerified ? 1 : 0) : existing.is_verified,
    existing.id,
  );

  const row = db.prepare('SELECT * FROM recycling_centres WHERE id = ?').get(existing.id) as CentreRow;
  res.json({ centre: serializeCentre(row) });
});

adminRouter.delete('/centres/:id', (req, res) => {
  const result = db.prepare('DELETE FROM recycling_centres WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Recycling centre not found' });
  res.status(204).end();
});

/* ------------------------------------------------------------- categories */

adminRouter.get('/categories', (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM item_categories ORDER BY sort_order, name COLLATE NOCASE')
    .all() as CategoryRow[];
  res.json({ categories: rows.map(serializeCategory) });
});

adminRouter.post('/categories', (req, res) => {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);

  const data = parsed.data;
  if (db.prepare('SELECT id FROM item_categories WHERE name = ? COLLATE NOCASE').get(data.name)) {
    return res.status(409).json({ error: 'A category with this name already exists' });
  }

  const id = randomUUID();
  const nextOrder =
    data.sortOrder ??
    ((db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS n FROM item_categories').get() as { n: number }).n + 10);

  db.prepare(
    'INSERT INTO item_categories (id, name, disposal_method, description, sort_order) VALUES (?, ?, ?, ?, ?)',
  ).run(id, data.name, data.disposalMethod as DisposalMethod, data.description ?? null, nextOrder);

  const row = db.prepare('SELECT * FROM item_categories WHERE id = ?').get(id) as CategoryRow;
  res.status(201).json({ category: serializeCategory(row) });
});

adminRouter.patch('/categories/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM item_categories WHERE id = ?').get(req.params.id) as
    | CategoryRow
    | undefined;
  if (!existing) return res.status(404).json({ error: 'Category not found' });

  const parsed = categorySchema.partial().safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);

  const data = parsed.data;
  if (data.name) {
    const clash = db
      .prepare('SELECT id FROM item_categories WHERE name = ? COLLATE NOCASE AND id <> ?')
      .get(data.name, existing.id);
    if (clash) return res.status(409).json({ error: 'A category with this name already exists' });
  }

  db.prepare(
    `UPDATE item_categories SET name = ?, disposal_method = ?, description = ?, sort_order = ?,
       updated_at = datetime('now')
     WHERE id = ?`,
  ).run(
    data.name ?? existing.name,
    (data.disposalMethod ?? existing.disposal_method) as DisposalMethod,
    data.description !== undefined ? data.description : existing.description,
    data.sortOrder ?? existing.sort_order,
    existing.id,
  );

  const row = db.prepare('SELECT * FROM item_categories WHERE id = ?').get(existing.id) as CategoryRow;
  res.json({ category: serializeCategory(row) });
});

adminRouter.delete('/categories/:id', (req, res) => {
  const result = db.prepare('DELETE FROM item_categories WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Category not found' });
  res.status(204).end();
});

/* ------------------------------------------------------------------ stats */

adminRouter.get('/stats', (_req, res) => {
  const centres = db.prepare('SELECT COUNT(*) AS n FROM recycling_centres').get() as { n: number };
  const verified = db
    .prepare('SELECT COUNT(*) AS n FROM recycling_centres WHERE is_verified = 1')
    .get() as { n: number };
  const categories = db.prepare('SELECT COUNT(*) AS n FROM item_categories').get() as { n: number };
  const households = db
    .prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'household'")
    .get() as { n: number };

  res.json({
    centres: centres.n,
    verifiedCentres: verified.n,
    categories: categories.n,
    households: households.n,
  });
});
