import { query } from "@/lib/db";
import { assertAdmin, hashPassword, requireApiUser } from "@/lib/auth";
import { actor, getNextId, getNextYearId, today } from "@/lib/ids";

export const dynamic = "force-dynamic";

const json = (data, status = 200) => Response.json(data, { status });
const required = (body, fields) => {
  for (const [key, label] of fields) {
    if (!body[key] || String(body[key]).trim() === "") return `${label} is required`;
  }
  return null;
};

async function body(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function pagination(url) {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
  return { page, limit, offset: (page - 1) * limit };
}

function pageResponse(rows, total, page, limit) {
  return { data: rows, total: Number(total), page, pages: Math.ceil(Number(total) / limit) };
}

async function tenantBalance(tenantId) {
  const { rows } = await query("SELECT carried_balance FROM rent_balances WHERE tenant_id=$1", [tenantId]);
  return rows.length ? Number(rows[0].carried_balance) : 0;
}

async function setTenantBalance(tenantId, balance) {
  await query(
    `INSERT INTO rent_balances (tenant_id, carried_balance, last_updated)
     VALUES ($1,$2,NOW())
     ON CONFLICT (tenant_id) DO UPDATE
     SET carried_balance=EXCLUDED.carried_balance, last_updated=NOW()`,
    [tenantId, balance]
  );
}

async function archiveRecord(entityType, entityId, entityLabel, data, deletedBy) {
  await query(
    `INSERT INTO archive (entity_type, entity_id, entity_label, data, deleted_by)
     VALUES ($1,$2,$3,$4,$5)`,
    [entityType, entityId, entityLabel, JSON.stringify(data), deletedBy]
  );
}

export async function GET(request, context) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const params = await context.params;
  const parts = params.resource || [];
  const key = parts.join("/");
  const url = new URL(request.url);

  try {
    if (key === "stats") {
      const [ll, pr, un, tn, rn, ex, occ, vac] = await Promise.all([
        query("SELECT COUNT(*) FROM landlords"),
        query("SELECT COUNT(*) FROM properties"),
        query("SELECT COUNT(*) FROM units"),
        query("SELECT COUNT(*) FROM tenants"),
        query("SELECT COALESCE(SUM(amount),0) AS t FROM rent_collection"),
        query("SELECT COALESCE(SUM(amount),0) AS t FROM expenses"),
        query("SELECT COUNT(*) FROM units WHERE LOWER(status)='occupied'"),
        query("SELECT COUNT(*) FROM units WHERE LOWER(status)='vacant'")
      ]);
      return json({
        landlords: Number(ll.rows[0].count),
        properties: Number(pr.rows[0].count),
        units: Number(un.rows[0].count),
        tenants: Number(tn.rows[0].count),
        occupied: Number(occ.rows[0].count),
        vacant: Number(vac.rows[0].count),
        totalRent: Number(rn.rows[0].t),
        totalExpenses: Number(ex.rows[0].t)
      });
    }

    if (key === "landlords") {
      const { rows } = await query(`
        SELECT landlord_id AS "ID", name AS "Name", phone AS "Phone", email AS "Email",
               address AS "Address", bank_name AS "Bank Name", bank_account AS "Bank Account",
               commission_rate AS "Commission Rate", status AS "Status",
               TO_CHAR(created_at,'YYYY-MM-DD') AS "Date Added", created_by AS "Added By"
        FROM landlords ORDER BY id DESC`);
      return json(rows);
    }

    if (key === "properties") {
      const { rows } = await query(`
        SELECT p.property_id AS "ID", p.name AS "Name", p.landlord_id AS "Landlord ID",
               l.name AS "Landlord Name", p.address AS "Address", p.type AS "Type",
               (SELECT COUNT(*) FROM units u WHERE u.property_id=p.property_id)::int AS "Total Units",
               (SELECT COUNT(*) FROM units u WHERE u.property_id=p.property_id AND LOWER(u.status)='occupied')::int AS "Occupied",
               p.status AS "Status", TO_CHAR(p.created_at,'YYYY-MM-DD') AS "Date Added",
               p.created_by AS "Added By"
        FROM properties p LEFT JOIN landlords l ON l.landlord_id=p.landlord_id
        ORDER BY p.id DESC`);
      return json(rows);
    }

    if (key === "units") {
      const { rows } = await query(`
        SELECT u.unit_id AS "ID", u.property_id AS "Property ID", p.name AS "Property Name",
               u.unit_number AS "Unit Number", u.type AS "Type", u.rent AS "Rent",
               u.description AS "Description", u.status AS "Status",
               TO_CHAR(u.created_at,'YYYY-MM-DD') AS "Date Added", u.created_by AS "Added By"
        FROM units u LEFT JOIN properties p ON p.property_id=u.property_id ORDER BY u.id DESC`);
      return json(rows);
    }

    if (key === "tenants") {
      const { rows } = await query(`
        SELECT t.tenant_id AS "ID", t.name AS "Name", t.phone AS "Phone", t.email AS "Email",
               t.id_number AS "ID Number", t.unit_id AS "Unit ID", u.unit_number AS "Unit Number",
               TO_CHAR(t.lease_start,'YYYY-MM-DD') AS "Lease Start",
               TO_CHAR(t.lease_end,'YYYY-MM-DD') AS "Lease End",
               t.rent_amount AS "Rent Amount", t.deposit AS "Deposit", t.status AS "Status",
               TO_CHAR(t.created_at,'YYYY-MM-DD') AS "Date Added", t.created_by AS "Added By"
        FROM tenants t LEFT JOIN units u ON u.unit_id=t.unit_id ORDER BY t.id DESC`);
      return json(rows);
    }

    if (["rent", "expenses", "invoices", "receipts"].includes(key)) {
      const { page, limit, offset } = pagination(url);
      const map = {
        rent: {
          count: "SELECT COUNT(*) FROM rent_collection",
          sql: `SELECT r.rent_id AS "ID", r.tenant_id AS "Tenant ID", t.name AS "Tenant Name",
                       r.unit_id AS "Unit ID", u.unit_number AS "Unit Number", r.amount AS "Amount",
                       r.month AS "Month", r.year AS "Year", r.payment_method AS "Payment Method",
                       r.payment_type AS "PaymentType", r.reference AS "Reference",
                       TO_CHAR(r.created_at,'YYYY-MM-DD HH24:MI') AS "Date", r.created_by AS "Added By"
                FROM rent_collection r
                LEFT JOIN tenants t ON t.tenant_id=r.tenant_id
                LEFT JOIN units u ON u.unit_id=r.unit_id
                ORDER BY r.id DESC LIMIT $1 OFFSET $2`
        },
        expenses: {
          count: "SELECT COUNT(*) FROM expenses",
          sql: `SELECT e.expense_id AS "ID", e.property_id AS "Property ID", p.name AS "Property Name",
                       e.category AS "Category", e.description AS "Description", e.amount AS "Amount",
                       TO_CHAR(e.expense_date,'YYYY-MM-DD') AS "Date",
                       TO_CHAR(e.created_at,'YYYY-MM-DD') AS "Date Added", e.created_by AS "Added By"
                FROM expenses e LEFT JOIN properties p ON p.property_id=e.property_id
                ORDER BY e.id DESC LIMIT $1 OFFSET $2`
        },
        invoices: {
          count: "SELECT COUNT(*) FROM invoices",
          sql: `SELECT invoice_id AS "ID", type AS "Type", entity_id AS "EntityId",
                       entity_name AS "EntityName", description AS "Description", amount AS "Amount",
                       month AS "Month", year AS "Year", status AS "Status",
                       TO_CHAR(created_at,'YYYY-MM-DD') AS "Date", created_by AS "Added By"
                FROM invoices ORDER BY id DESC LIMIT $1 OFFSET $2`
        },
        receipts: {
          count: "SELECT COUNT(*) FROM receipts",
          sql: `SELECT receipt_id AS "ID", rent_id AS "Rent ID", tenant_name AS "TenantName",
                       unit_number AS "UnitNumber", amount AS "Amount", month AS "Month",
                       year AS "Year", payment_method AS "PaymentMethod", payment_type AS "PaymentType",
                       TO_CHAR(created_at,'YYYY-MM-DD HH24:MI') AS "Date", created_by AS "Added By"
                FROM receipts ORDER BY id DESC LIMIT $1 OFFSET $2`
        }
      };
      const [data, count] = await Promise.all([
        query(map[key].sql, [limit, offset]),
        query(map[key].count)
      ]);
      return json(pageResponse(data.rows, count.rows[0].count, page, limit));
    }

    if (key === "settings") {
      const { rows } = await query("SELECT key, value FROM settings");
      return json(Object.fromEntries(rows.map((row) => [row.key, row.value])));
    }

    if (key === "users") {
      const adminError = assertAdmin(auth.user);
      if (adminError) return adminError;
      const { rows } = await query(`
        SELECT user_id AS "ID", username AS "Username", full_name AS "Name", email AS "Email",
               role AS "Role", status AS "Status", TO_CHAR(created_at,'YYYY-MM-DD') AS "Date Added",
               created_by AS "Added By"
        FROM users ORDER BY id`);
      return json(rows);
    }

    if (key === "archive") {
      const adminError = assertAdmin(auth.user);
      if (adminError) return adminError;
      const type = url.searchParams.get("type") || "";
      const search = url.searchParams.get("search") || "";
      const params = [];
      let sql = `SELECT id, entity_type, entity_id, entity_label,
                        TO_CHAR(deleted_at,'YYYY-MM-DD HH24:MI') AS deleted_at, deleted_by
                 FROM archive WHERE 1=1`;
      if (type) {
        params.push(type);
        sql += ` AND entity_type=$${params.length}`;
      }
      if (search) {
        params.push(`%${search.toLowerCase()}%`);
        sql += ` AND LOWER(entity_label) LIKE $${params.length}`;
      }
      sql += " ORDER BY id DESC LIMIT 200";
      const { rows } = await query(sql, params);
      return json(rows);
    }

    if (key === "rent/due-status") {
      const now = new Date();
      const dayOfMonth = now.getDate();
      const thisMonth = String(now.getMonth() + 1).padStart(2, "0");
      const thisYear = now.getFullYear();
      const { rows: activeTenants } = await query(`
        SELECT t.tenant_id, t.name, t.rent_amount, u.unit_number, p.name AS property_name, rb.carried_balance
        FROM tenants t
        LEFT JOIN units u ON u.unit_id=t.unit_id
        LEFT JOIN properties p ON p.property_id=u.property_id
        LEFT JOIN rent_balances rb ON rb.tenant_id=t.tenant_id
        WHERE LOWER(t.status)='active' AND t.rent_amount > 0`);
      const { rows: payments } = await query(
        "SELECT tenant_id FROM rent_collection WHERE month=$1 AND year=$2",
        [thisMonth, thisYear]
      );
      const paid = new Set(payments.map((payment) => payment.tenant_id));
      const unpaid = activeTenants.filter((tenant) => !paid.has(tenant.tenant_id));
      const overdue = dayOfMonth > 1 ? unpaid : [];
      return json({
        dayOfMonth,
        dueToday: dayOfMonth === 1,
        totalUnpaid: unpaid.length,
        overdueCount: overdue.length,
        unpaidTenants: unpaid.map((tenant) => ({
          id: tenant.tenant_id,
          name: tenant.name,
          unit: tenant.unit_number,
          property: tenant.property_name,
          rent: Number(tenant.rent_amount),
          carriedBalance: Number(tenant.carried_balance || 0)
        }))
      });
    }

    if (key === "rent-increase/history") {
      const { rows } = await query(`
        SELECT h.increase_id, h.unit_id, u.unit_number, p.name AS property_name,
               h.tenant_id, t.name AS tenant_name, h.old_rent, h.new_rent,
               TO_CHAR(h.effective_date,'YYYY-MM-DD') AS effective_date,
               h.notes, TO_CHAR(h.created_at,'YYYY-MM-DD') AS created_at, h.created_by
        FROM rent_increase_history h
        LEFT JOIN units u ON u.unit_id=h.unit_id
        LEFT JOIN properties p ON p.property_id=u.property_id
        LEFT JOIN tenants t ON t.tenant_id=h.tenant_id
        ORDER BY h.id DESC LIMIT 100`);
      return json(rows);
    }

    if (key === "reports/portfolio") {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (!from || !to) return json({ error: "from and to dates required" }, 400);
      const [props, unitStats, rentStats, expStats, arrStats] = await Promise.all([
        query("SELECT COUNT(*) FROM properties WHERE LOWER(status)='active'"),
        query(`SELECT COUNT(*) FILTER (WHERE LOWER(status)='occupied') AS occupied,
                      COUNT(*) FILTER (WHERE LOWER(status)='vacant') AS vacant,
                      COUNT(*) AS total FROM units`),
        query(`SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count
               FROM rent_collection
               WHERE created_at BETWEEN $1::timestamp AND ($2::date + interval '1 day')::timestamp`, [from, to]),
        query(`SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count
               FROM expenses
               WHERE created_at BETWEEN $1::timestamp AND ($2::date + interval '1 day')::timestamp`, [from, to]),
        query(`SELECT COUNT(DISTINCT t.tenant_id) AS tenants_in_arrears,
                      COALESCE(SUM(rb.carried_balance),0) AS total_arrears
               FROM rent_balances rb
               JOIN tenants t ON t.tenant_id=rb.tenant_id
               WHERE rb.carried_balance > 0 AND LOWER(t.status)='active'`)
      ]);
      const units = unitStats.rows[0];
      const rent = rentStats.rows[0];
      const expenses = expStats.rows[0];
      const arrears = arrStats.rows[0];
      return json({
        period: { from, to },
        properties: Number(props.rows[0].count),
        units: { total: Number(units.total), occupied: Number(units.occupied), vacant: Number(units.vacant) },
        occupancyRate: Number(units.total) > 0 ? Math.round((Number(units.occupied) / Number(units.total)) * 100) : 0,
        rentCollected: Number(rent.total),
        rentTransactions: Number(rent.count),
        expenses: Number(expenses.total),
        netIncome: Number(rent.total) - Number(expenses.total),
        tenantsInArrears: Number(arrears.tenants_in_arrears),
        totalArrears: Number(arrears.total_arrears)
      });
    }

    if (parts[0] === "landlords" && parts[2] === "portfolio") {
      const { rows: llRows } = await query("SELECT * FROM landlords WHERE landlord_id=$1", [parts[1]]);
      if (!llRows.length) return json({ error: "Landlord not found" }, 404);
      const { rows: propRows } = await query(`
        SELECT p.*, COUNT(u.unit_id)::int AS total_units,
               COUNT(u.unit_id) FILTER (WHERE LOWER(u.status)='occupied')::int AS occupied,
               COUNT(u.unit_id) FILTER (WHERE LOWER(u.status)='vacant')::int AS vacant,
               COALESCE(SUM(u.rent) FILTER (WHERE LOWER(u.status)='occupied'),0) AS monthly_rent_roll
        FROM properties p
        LEFT JOIN units u ON u.property_id=p.property_id
        WHERE p.landlord_id=$1
        GROUP BY p.id ORDER BY p.name`, [parts[1]]);
      const { rows: arrearsRows } = await query(`
        SELECT COALESCE(SUM(rb.carried_balance),0) AS total
        FROM rent_balances rb
        JOIN tenants t ON t.tenant_id=rb.tenant_id
        JOIN units u ON u.unit_id=t.unit_id
        JOIN properties p ON p.property_id=u.property_id
        WHERE p.landlord_id=$1 AND rb.carried_balance > 0`, [parts[1]]);
      return json({
        landlord: llRows[0],
        properties: propRows,
        summary: {
          totalProperties: propRows.length,
          totalUnits: propRows.reduce((sum, property) => sum + Number(property.total_units), 0),
          totalOccupied: propRows.reduce((sum, property) => sum + Number(property.occupied), 0),
          totalVacant: propRows.reduce((sum, property) => sum + Number(property.vacant), 0),
          monthlyRoll: propRows.reduce((sum, property) => sum + Number(property.monthly_rent_roll || 0), 0),
          totalArrears: Number(arrearsRows[0].total || 0)
        }
      });
    }

    if (parts[0] === "tenants" && parts[2] === "balance") {
      return json({ balance: await tenantBalance(parts[1]) });
    }

    return json({ error: `Not found: GET /api/${key}` }, 404);
  } catch (error) {
    console.error(`[GET /api/${key}]`, error);
    return json({ error: error.message }, 500);
  }
}

export async function POST(request, context) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const params = await context.params;
  const parts = params.resource || [];
  const key = parts.join("/");
  const data = await body(request);

  try {
    if (key === "landlords") {
      const error = required(data, [["name", "Name"]]);
      if (error) return json({ error }, 400);
      const id = await getNextId("landlords", "landlord_id", "LLD");
      await query(
        `INSERT INTO landlords (landlord_id,name,phone,email,address,bank_name,bank_account,commission_rate,status,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Active',$9)`,
        [id, data.name.trim(), data.phone || "", data.email || "", data.address || "", data.bankName || "", data.bankAccount || "", parseFloat(data.commissionRate) || 10, actor(auth.user)]
      );
      return json({ success: true, id });
    }

    if (key === "properties") {
      const error = required(data, [["name", "Property name"], ["landlordId", "Landlord"]]);
      if (error) return json({ error }, 400);
      const id = await getNextId("properties", "property_id", "PRP");
      await query(
        `INSERT INTO properties (property_id,name,landlord_id,address,type,status,created_by)
         VALUES ($1,$2,$3,$4,$5,'Active',$6)`,
        [id, data.name.trim(), data.landlordId, data.address || "", data.type || "Residential", actor(auth.user)]
      );
      return json({ success: true, id });
    }

    if (key === "units") {
      const error = required(data, [["propertyId", "Property"], ["unitNumber", "Unit number"]]);
      if (error) return json({ error }, 400);
      const id = await getNextId("units", "unit_id", "UNT");
      await query(
        `INSERT INTO units (unit_id,property_id,unit_number,type,rent,description,status,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,'Vacant',$7)`,
        [id, data.propertyId, data.unitNumber.trim(), data.type || "Studio", parseFloat(data.rent) || 0, data.description || "", actor(auth.user)]
      );
      return json({ success: true, id });
    }

    if (key === "units/bulk") {
      const error = required(data, [["propertyId", "Property"], ["units", "Units"]]);
      if (error) return json({ error }, 400);
      if (!Array.isArray(data.units) || !data.units.length) return json({ error: "No units provided" }, 400);
      const ids = [];
      for (const unit of data.units) {
        const id = await getNextId("units", "unit_id", "UNT");
        await query(
          `INSERT INTO units (unit_id,property_id,unit_number,type,rent,description,status,created_by)
           VALUES ($1,$2,$3,$4,$5,$6,'Vacant',$7)`,
          [id, data.propertyId, unit.unitNumber, unit.type || "Studio", parseFloat(unit.rent) || 0, unit.description || "", actor(auth.user)]
        );
        ids.push(id);
      }
      return json({ success: true, count: ids.length, ids });
    }

    if (key === "tenants") {
      const error = required(data, [["name", "Name"], ["phone", "Phone"], ["unitId", "Unit"]]);
      if (error) return json({ error }, 400);
      const id = await getNextId("tenants", "tenant_id", "TNT");
      await query(
        `INSERT INTO tenants (tenant_id,name,phone,email,id_number,unit_id,lease_start,lease_end,rent_amount,deposit,status,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Active',$11)`,
        [id, data.name.trim(), data.phone.trim(), data.email || "", data.idNumber || "", data.unitId, data.leaseStart || null, data.leaseEnd || null, parseFloat(data.rentAmount) || 0, parseFloat(data.deposit) || 0, actor(auth.user)]
      );
      await query("UPDATE units SET status='Occupied' WHERE unit_id=$1", [data.unitId]);
      return json({ success: true, id });
    }

    if (key === "rent" || key === "rent/v2") {
      const error = required(data, [["tenantId", "Tenant"], ["amount", "Amount"]]);
      if (error) return json({ error }, 400);
      const paid = parseFloat(data.amount);
      const expected = parseFloat(data.expectedAmount) || paid;
      const prevBal = await tenantBalance(data.tenantId);
      const totalOwed = expected + prevBal;
      const finalBal = Math.max(0, totalOwed - paid);
      const isPartial = data.paymentType === "Partial" || paid < totalOwed;
      const id = await getNextId("rent_collection", "rent_id", "RNT");
      await query(
        `INSERT INTO rent_collection
         (rent_id,tenant_id,unit_id,amount,month,year,payment_method,reference,payment_type,balance_before,balance_after,expected_amount,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [id, data.tenantId, data.unitId || null, paid, data.month || "", data.year ? parseInt(data.year, 10) : null, data.paymentMethod || "Cash", data.reference || "", isPartial ? "Partial" : "Full", prevBal, finalBal, expected, actor(auth.user)]
      );
      await setTenantBalance(data.tenantId, finalBal);
      return json({ success: true, id, balanceBefore: prevBal, balanceAfter: finalBal, isPartial });
    }

    if (key === "expenses") {
      const error = required(data, [["description", "Description"], ["amount", "Amount"]]);
      if (error) return json({ error }, 400);
      const id = await getNextId("expenses", "expense_id", "EXP");
      await query(
        `INSERT INTO expenses (expense_id,property_id,category,description,amount,expense_date,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [id, data.propertyId || null, data.category || "Other", data.description.trim(), parseFloat(data.amount), data.date || today(), actor(auth.user)]
      );
      return json({ success: true, id });
    }

    if (key === "invoices" || key === "invoices/v2") {
      const error = required(data, [["type", "Invoice type"], ["entityId", "Entity"], ["amount", "Amount"]]);
      if (error) return json({ error }, 400);
      const id = await getNextYearId("invoices", "invoice_id", "INV");
      await query(
        `INSERT INTO invoices (invoice_id,type,entity_id,entity_name,description,amount,month,year,status,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Unpaid',$9)`,
        [id, data.type, data.entityId, data.entityName || "", data.description || "", parseFloat(data.amount), data.month || "", data.year ? parseInt(data.year, 10) : null, actor(auth.user)]
      );
      return json({ success: true, id });
    }

    if (key === "receipts" || key === "receipts/v2") {
      const error = required(data, [["tenantName", "Tenant name"], ["amount", "Amount"]]);
      if (error) return json({ error }, 400);
      const id = await getNextYearId("receipts", "receipt_id", "RCP");
      await query(
        `INSERT INTO receipts (receipt_id,rent_id,tenant_name,unit_number,amount,month,year,payment_method,payment_type,balance_carried,expected_amount,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [id, data.rentId || null, data.tenantName.trim(), data.unitNumber || "", parseFloat(data.amount), data.month || "", data.year ? parseInt(data.year, 10) : null, data.paymentMethod || "Cash", data.paymentType || "Full", parseFloat(data.balanceCarried) || 0, parseFloat(data.expectedAmount) || 0, actor(auth.user)]
      );
      return json({ success: true, id });
    }

    if (key === "settings/logo") {
      const adminError = assertAdmin(auth.user);
      if (adminError) return adminError;
      if (!data.logoBase64) return json({ error: "No logo data provided" }, 400);
      await query(
        `INSERT INTO settings (key,value) VALUES ('company_logo',$1)
         ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`,
        [data.logoBase64]
      );
      return json({ success: true });
    }

    if (key === "rent/whatsapp-message") {
      const { rows: settingsRows } = await query("SELECT key,value FROM settings");
      const cfg = Object.fromEntries(settingsRows.map((row) => [row.key, row.value]));
      let message = "";
      if (data.receiptId) {
        const { rows } = await query(
          `SELECT r.*, rc.balance_after, rc.balance_before, rc.payment_type, rc.expected_amount
           FROM receipts r
           LEFT JOIN rent_collection rc ON rc.rent_id=r.rent_id
           WHERE r.receipt_id=$1`,
          [data.receiptId]
        );
        if (!rows.length) return json({ error: "Receipt not found" }, 404);
        const receipt = rows[0];
        const balanceAfter = Number(receipt.balance_after || 0);
        const currency = cfg.currency || "UGX";
        const company = cfg.company_name || "Property Management";
        message = `*${company}*\n\nRent Payment Received\n\nDear ${receipt.tenant_name},\n\n`;
        message += `Receipt No: *${receipt.receipt_id}*\nUnit: *${receipt.unit_number}*\nPeriod: *${receipt.month} ${receipt.year}*\n`;
        message += `Amount Paid: *${currency} ${Number(receipt.amount).toLocaleString()}*\nMethod: *${receipt.payment_method}*\n`;
        message += balanceAfter > 0
          ? `\nOutstanding Balance: *${currency} ${balanceAfter.toLocaleString()}*\nPlease settle this balance as soon as possible.`
          : "\nYour account is fully up to date.";
        message += `\n\nThank you.\n_${company}_`;
      }
      return json({ success: true, message });
    }

    if (key === "invoices/bulk") {
      const error = required(data, [["month", "Month"], ["year", "Year"]]);
      if (error) return json({ error }, 400);
      const { rows: landlordList } = await query(
        `SELECT l.landlord_id, l.name, l.commission_rate, COALESCE(SUM(rc.amount),0) AS total_collected
         FROM landlords l
         LEFT JOIN properties p ON p.landlord_id=l.landlord_id
         LEFT JOIN units u ON u.property_id=p.property_id
         LEFT JOIN rent_collection rc ON rc.unit_id=u.unit_id AND rc.month=$1 AND rc.year=$2
         WHERE LOWER(l.status)='active'
         GROUP BY l.landlord_id, l.name, l.commission_rate`,
        [data.month, parseInt(data.year, 10)]
      );
      const invoices = [];
      for (const landlord of landlordList) {
        const collected = Number(landlord.total_collected || 0);
        const fee = data.overrideAmount
          ? Number(data.overrideAmount)
          : Math.round(collected * (Number(landlord.commission_rate || 10) / 100));
        if (fee <= 0) continue;
        const id = await getNextYearId("invoices", "invoice_id", "INV");
        await query(
          `INSERT INTO invoices (invoice_id,type,entity_id,entity_name,description,amount,month,year,status,created_by)
           VALUES ($1,'landlord',$2,$3,$4,$5,$6,$7,'Unpaid',$8)`,
          [id, landlord.landlord_id, landlord.name, data.description || `Management fee - ${data.month} ${data.year}`, fee, data.month, parseInt(data.year, 10), actor(auth.user)]
        );
        invoices.push({ id, landlord: landlord.name, amount: fee });
      }
      return json({ success: true, count: invoices.length, invoices });
    }

    if (key === "invoices/custom") {
      const error = required(data, [["clientName", "Client name"], ["serviceTitle", "Service title"], ["amount", "Amount"]]);
      if (error) return json({ error }, 400);
      const id = await getNextYearId("invoices", "invoice_id", "INV");
      const description = Array.isArray(data.lineItems) && data.lineItems.length
        ? data.lineItems.map((item) => item.description).join("; ")
        : data.serviceTitle;
      await query(
        `INSERT INTO invoices (invoice_id,type,entity_id,entity_name,description,amount,month,year,status,created_by)
         VALUES ($1,'custom',$2,$3,$4,$5,$6,$7,'Unpaid',$8)`,
        [id, "CUSTOM", data.clientName.trim(), description, parseFloat(data.amount), data.month || "", data.year ? parseInt(data.year, 10) : null, actor(auth.user)]
      );
      return json({ success: true, id });
    }

    if (key === "rent-increase") {
      const error = required(data, [["unitId", "Unit"], ["newRent", "New rent"], ["effectiveDate", "Effective date"]]);
      if (error) return json({ error }, 400);
      const { rows: unitRows } = await query("SELECT unit_id, rent FROM units WHERE unit_id=$1", [data.unitId]);
      if (!unitRows.length) return json({ error: "Unit not found" }, 404);
      const { rows: tenantRows } = await query(
        "SELECT tenant_id FROM tenants WHERE unit_id=$1 AND LOWER(status)='active'",
        [data.unitId]
      );
      const tenantId = tenantRows[0]?.tenant_id || null;
      const id = await getNextId("rent_increase_history", "increase_id", "RNI");
      await query(
        `INSERT INTO rent_increase_history (increase_id,unit_id,tenant_id,old_rent,new_rent,effective_date,notes,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id, data.unitId, tenantId, Number(unitRows[0].rent), Number(data.newRent), data.effectiveDate, data.notes || "", actor(auth.user)]
      );
      const effectiveDate = new Date(data.effectiveDate);
      const currentDay = new Date();
      currentDay.setHours(0, 0, 0, 0);
      const applied = effectiveDate <= currentDay;
      if (applied) {
        await query("UPDATE units SET rent=$1 WHERE unit_id=$2", [Number(data.newRent), data.unitId]);
        if (tenantId) await query("UPDATE tenants SET rent_amount=$1 WHERE tenant_id=$2", [Number(data.newRent), tenantId]);
      }
      return json({ success: true, id, applied });
    }

    if (key === "users") {
      const adminError = assertAdmin(auth.user);
      if (adminError) return adminError;
      const error = required(data, [["username", "Username"], ["fullName", "Full name"], ["role", "Role"]]);
      if (error) return json({ error }, 400);
      const id = await getNextId("users", "user_id", "USR");
      await query(
        `INSERT INTO users (user_id,username,full_name,email,role,password_hash,status,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,'Active',$7)`,
        [id, data.username.trim(), data.fullName.trim(), data.email || "", data.role || "User", data.password ? hashPassword(data.password) : "", actor(auth.user)]
      );
      return json({ success: true, id });
    }

    return json({ error: `Not found: POST /api/${key}` }, 404);
  } catch (error) {
    console.error(`[POST /api/${key}]`, error);
    return json({ error: error.message }, 500);
  }
}

export async function PUT(request, context) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const params = await context.params;
  const parts = params.resource || [];
  const key = parts.join("/");
  const data = await body(request);
  const id = parts[1];

  try {
    if (parts[0] === "landlords" && id) {
      await query(
        `UPDATE landlords SET name=$1,phone=$2,email=$3,address=$4,bank_name=$5,bank_account=$6,commission_rate=$7,status=$8
         WHERE landlord_id=$9`,
        [data.name || "", data.phone || "", data.email || "", data.address || "", data.bankName || "", data.bankAccount || "", parseFloat(data.commissionRate) || 10, data.status || "Active", id]
      );
      return json({ success: true });
    }

    if (parts[0] === "properties" && id) {
      await query(
        "UPDATE properties SET name=$1,landlord_id=$2,address=$3,type=$4,status=$5 WHERE property_id=$6",
        [data.name || "", data.landlordId || null, data.address || "", data.type || "Residential", data.status || "Active", id]
      );
      return json({ success: true });
    }

    if (parts[0] === "units" && id) {
      await query(
        "UPDATE units SET property_id=$1,unit_number=$2,type=$3,rent=$4,description=$5,status=$6 WHERE unit_id=$7",
        [data.propertyId || null, data.unitNumber || "", data.type || "Studio", parseFloat(data.rent) || 0, data.description || "", data.status || "Vacant", id]
      );
      return json({ success: true });
    }

    if (parts[0] === "tenants" && id) {
      const { rows } = await query("SELECT unit_id FROM tenants WHERE tenant_id=$1", [id]);
      const oldUnit = rows[0]?.unit_id;
      const nextUnit = data.unitId || oldUnit;
      await query(
        `UPDATE tenants SET name=$1,phone=$2,email=$3,id_number=$4,unit_id=$5,lease_start=$6,lease_end=$7,rent_amount=$8,deposit=$9,status=$10
         WHERE tenant_id=$11`,
        [data.name || "", data.phone || "", data.email || "", data.idNumber || "", nextUnit || null, data.leaseStart || null, data.leaseEnd || null, parseFloat(data.rentAmount) || 0, parseFloat(data.deposit) || 0, data.status || "Active", id]
      );
      if (oldUnit && nextUnit !== oldUnit) await query("UPDATE units SET status='Vacant' WHERE unit_id=$1", [oldUnit]);
      if (nextUnit && String(data.status || "Active").toLowerCase() === "active") await query("UPDATE units SET status='Occupied' WHERE unit_id=$1", [nextUnit]);
      return json({ success: true });
    }

    if (parts[0] === "expenses" && id) {
      await query(
        "UPDATE expenses SET property_id=$1,category=$2,description=$3,amount=$4,expense_date=$5 WHERE expense_id=$6",
        [data.propertyId || null, data.category || "Other", data.description || "", parseFloat(data.amount) || 0, data.date || today(), id]
      );
      return json({ success: true });
    }

    if (parts[0] === "invoices" && parts[2] === "pay") {
      await query("UPDATE invoices SET status='Paid' WHERE invoice_id=$1", [id]);
      return json({ success: true });
    }

    if (key === "settings") {
      const adminError = assertAdmin(auth.user);
      if (adminError) return adminError;
      for (const [settingKey, value] of Object.entries(data)) {
        await query(
          "INSERT INTO settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value",
          [settingKey, String(value)]
        );
      }
      return json({ success: true });
    }

    if (parts[0] === "users" && parts[2] === "password") {
      const adminError = assertAdmin(auth.user);
      if (adminError) return adminError;
      if (!data.password || data.password.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);
      await query("UPDATE users SET password_hash=$1 WHERE user_id=$2", [hashPassword(data.password), id]);
      return json({ success: true });
    }

    if (parts[0] === "users" && id) {
      const adminError = assertAdmin(auth.user);
      if (adminError) return adminError;
      await query("UPDATE users SET full_name=$1,email=$2,role=$3,status=$4 WHERE user_id=$5", [data.fullName || "", data.email || "", data.role || "User", data.status || "Active", id]);
      return json({ success: true });
    }

    return json({ error: `Not found: PUT /api/${key}` }, 404);
  } catch (error) {
    console.error(`[PUT /api/${key}]`, error);
    return json({ error: error.message }, 500);
  }
}

export async function DELETE(request, context) {
  const auth = await requireApiUser();
  if (auth.error) return auth.error;

  const params = await context.params;
  const parts = params.resource || [];
  const key = parts.join("/");
  const id = parts[1];

  try {
    if (parts[0] === "tenants" && id) {
      const { rows } = await query("SELECT * FROM tenants WHERE tenant_id=$1", [id]);
      if (!rows.length) return json({ error: "Tenant not found" }, 404);
      const tenant = rows[0];
      await archiveRecord("tenant", tenant.tenant_id, `${tenant.name} (${tenant.tenant_id})`, tenant, actor(auth.user));
      if (tenant.unit_id) await query("UPDATE units SET status='Vacant' WHERE unit_id=$1", [tenant.unit_id]);
      await query("DELETE FROM tenants WHERE tenant_id=$1", [id]);
      return json({ success: true });
    }

    if (parts[0] === "landlords" && id) {
      const { rows } = await query("SELECT * FROM landlords WHERE landlord_id=$1", [id]);
      if (!rows.length) return json({ error: "Landlord not found" }, 404);
      await archiveRecord("landlord", rows[0].landlord_id, rows[0].name, rows[0], actor(auth.user));
      await query("DELETE FROM landlords WHERE landlord_id=$1", [id]);
      return json({ success: true });
    }

    if (parts[0] === "users" && id) {
      const adminError = assertAdmin(auth.user);
      if (adminError) return adminError;
      if (auth.user.id === id) return json({ error: "You cannot delete your own account" }, 400);
      await query("UPDATE users SET status='Inactive' WHERE user_id=$1", [id]);
      return json({ success: true });
    }

    return json({ error: `Not found: DELETE /api/${key}` }, 404);
  } catch (error) {
    console.error(`[DELETE /api/${key}]`, error);
    return json({ error: error.message }, 500);
  }
}
