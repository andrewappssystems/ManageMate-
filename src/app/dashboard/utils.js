export const fmtUGX = (value) => `UGX ${Number(value || 0).toLocaleString()}`;

export function getRows(data, key) {
  const value = data[key];
  if (!value) return [];
  return Array.isArray(value) ? value : value.data || [];
}

export function getDataset(data, key) {
  if (key === "rentDue") return data["rent/due-status"] || {};
  if (key === "rentIncrease") return getRows(data, "rent-increase/history");
  return getRows(data, key);
}

export function isActive(row) {
  return String(row?.Status || row?.status || "Active").toLowerCase() === "active";
}

export function isVacant(row) {
  return String(row?.Status || row?.status || "Vacant").toLowerCase() === "vacant";
}

export function buildArrears({ tenants, units, properties, rentRows }) {
  const now = new Date();
  return tenants
    .map((tenant) => {
      const rent = Number(tenant["Rent Amount"] || 0);
      const leaseStart = tenant["Lease Start"] ? new Date(tenant["Lease Start"]) : null;
      if (!leaseStart || !rent || !isActive(tenant)) return null;
      const paid = new Set(
        rentRows
          .filter((row) => row["Tenant ID"] === tenant.ID)
          .map((row) => `${row.Year}-${String(row.Month).padStart(2, "0")}`)
      );
      let months = 0;
      const cursor = new Date(leaseStart);
      cursor.setMonth(cursor.getMonth() + 1);
      while (cursor <= now) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
        if (!paid.has(key)) months += 1;
        cursor.setMonth(cursor.getMonth() + 1);
      }
      if (!months) return null;
      const unit = units.find((item) => item.ID === tenant["Unit ID"]);
      const property = properties.find((item) => item.ID === unit?.["Property ID"]);
      return {
        Tenant: tenant.Name,
        Unit: tenant["Unit Number"] || unit?.["Unit Number"] || "-",
        Property: property?.Name || unit?.["Property Name"] || "-",
        "Monthly Rent": rent,
        "Months Due": months,
        Balance: months * rent,
        Level: months >= 3 ? "Critical" : months >= 2 ? "High" : "Overdue",
        tenantId: tenant.ID
      };
    })
    .filter(Boolean);
}

export function renderCellValue(column, value) {
  if (["Amount", "Rent", "Rent Amount", "Monthly Rent", "Balance", "old_rent", "new_rent"].includes(column)) {
    return fmtUGX(value);
  }
  return value || "-";
}
