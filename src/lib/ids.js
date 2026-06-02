import { query } from "./db";

export async function getNextId(table, idColumn, prefix) {
  const { rows } = await query(`SELECT ${idColumn} FROM ${table} ORDER BY id DESC LIMIT 1`);
  if (!rows.length) return `${prefix}-001`;

  const match = String(rows[0][idColumn] || "").match(/(\d+)$/);
  const next = match ? parseInt(match[1], 10) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}

export async function getNextYearId(table, idColumn, prefix) {
  const year = new Date().getFullYear();
  const { rows } = await query(
    `SELECT ${idColumn} FROM ${table} WHERE ${idColumn} LIKE $1 ORDER BY id DESC LIMIT 1`,
    [`${prefix}-${year}-%`]
  );
  if (!rows.length) return `${prefix}-${year}-001`;

  const match = String(rows[0][idColumn] || "").match(/(\d+)$/);
  const next = match ? parseInt(match[1], 10) + 1 : 1;
  return `${prefix}-${year}-${String(next).padStart(3, "0")}`;
}

export function actor(user) {
  return user?.name || user?.username || "System";
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
