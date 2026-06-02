"use client";

import { useEffect, useMemo, useState } from "react";

const sections = [
  ["dashboard", "Dashboard"],
  ["landlords", "Landlords"],
  ["properties", "Properties"],
  ["units", "Units"],
  ["tenants", "Tenants"],
  ["rent", "Rent"],
  ["expenses", "Expenses"],
  ["invoices", "Invoices"],
  ["receipts", "Receipts"],
  ["settings", "Settings"],
  ["users", "Users"],
  ["archive", "Archive"]
];

const fmt = (value) => `UGX ${Number(value || 0).toLocaleString()}`;

const tableConfig = {
  landlords: ["ID", "Name", "Phone", "Email", "Commission Rate", "Status"],
  properties: ["ID", "Name", "Landlord Name", "Address", "Type", "Total Units", "Status"],
  units: ["ID", "Property Name", "Unit Number", "Type", "Rent", "Status"],
  tenants: ["ID", "Name", "Phone", "Unit Number", "Rent Amount", "Lease End", "Status"],
  rent: ["ID", "Tenant Name", "Unit Number", "Amount", "Month", "Year", "PaymentType", "Date"],
  expenses: ["ID", "Property Name", "Category", "Description", "Amount", "Date"],
  invoices: ["ID", "Type", "EntityName", "Description", "Amount", "Status"],
  receipts: ["ID", "TenantName", "UnitNumber", "Amount", "Month", "Year", "PaymentType", "Date"],
  users: ["ID", "Name", "Username", "Email", "Role", "Status"],
  archive: ["deleted_at", "entity_type", "entity_id", "entity_label", "deleted_by"]
};

function getRows(data, key) {
  const value = data[key];
  if (!value) return [];
  return Array.isArray(value) ? value : value.data || [];
}

function Field({ label, name, type = "text", children, full, ...props }) {
  return (
    <label className={full ? "full" : ""}>
      {label}
      {children || <input name={name} type={type} {...props} />}
    </label>
  );
}

export default function DashboardClient({ user }) {
  const [active, setActive] = useState("dashboard");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");

  const loadAll = async () => {
    setLoading(true);
    const endpoints = ["stats", "landlords", "properties", "units", "tenants", "rent", "expenses", "invoices", "receipts", "settings"];
    if (user.role === "Admin") endpoints.push("users", "archive");

    const next = {};
    await Promise.all(
      endpoints.map(async (endpoint) => {
        try {
          const res = await fetch(`/api/${endpoint}`, { credentials: "include" });
          next[endpoint] = await res.json();
        } catch {
          next[endpoint] = endpoint === "settings" ? {} : [];
        }
      })
    );
    setData(next);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const stats = data.stats || {};
  const landlords = getRows(data, "landlords");
  const properties = getRows(data, "properties");
  const units = getRows(data, "units");
  const tenants = getRows(data, "tenants");

  const activeRows = getRows(data, active);
  const statCards = [
    ["Landlords", stats.landlords],
    ["Properties", stats.properties],
    ["Units", stats.units],
    ["Tenants", stats.tenants],
    ["Occupied", stats.occupied],
    ["Vacant", stats.vacant],
    ["Rent Collected", fmt(stats.totalRent)],
    ["Expenses", fmt(stats.totalExpenses)]
  ];

  const arrears = useMemo(() => {
    const rentRows = getRows(data, "rent");
    const now = new Date();
    return tenants
      .map((tenant) => {
        const start = tenant["Lease Start"] ? new Date(tenant["Lease Start"]) : null;
        const rent = Number(tenant["Rent Amount"] || 0);
        if (!start || !rent) return null;
        const paid = new Set(rentRows.filter((row) => row["Tenant ID"] === tenant.ID).map((row) => `${row.Year}-${String(row.Month).padStart(2, "0")}`));
        let months = 0;
        const cursor = new Date(start);
        cursor.setMonth(cursor.getMonth() + 1);
        while (cursor <= now) {
          const ym = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
          if (!paid.has(ym)) months += 1;
          cursor.setMonth(cursor.getMonth() + 1);
        }
        return months ? { tenant, months, total: months * rent } : null;
      })
      .filter(Boolean);
  }, [data, tenants]);

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    let endpoint = modal;

    if (modal === "rent") endpoint = "rent/v2";
    if (modal === "invoice") endpoint = "invoices/v2";
    if (modal === "receipt") endpoint = "receipts/v2";

    const res = await fetch(`/api/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (!res.ok || result.error) {
      showToast(result.error || "Save failed");
      return;
    }

    setModal(null);
    showToast("Saved successfully");
    await loadAll();
  };

  const saveSettings = async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    showToast(result.error || "Settings saved");
    await loadAll();
  };

  const deactivateUser = async (id) => {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE", credentials: "include" });
    const result = await res.json();
    showToast(result.error || "User deactivated");
    await loadAll();
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">Manage<span>Mate</span></div>
        <div className="nav-section">Workspace</div>
        {sections
          .filter(([, label]) => user.role === "Admin" || !["Users", "Archive", "Settings"].includes(label))
          .map(([id, label]) => (
            <button key={id} className={`nav-btn ${active === id ? "active" : ""}`} onClick={() => setActive(id)}>
              <span>{navIcon(id)}</span>
              {label}
            </button>
          ))}
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <strong>{user.name || user.username}</strong>
            <div className="muted">{user.role} account</div>
          </div>
          <a className="ghost-btn" href="/api/auth/logout">Sign Out</a>
        </header>

        <div className="content">
          {active === "dashboard" ? (
            <>
              <div className="actions-bar">
                <h1 className="section-title">Dashboard</h1>
                <div className="actions-bar">
                  <button className="primary-btn" onClick={() => setModal("rent")}>Record Payment</button>
                  <button className="secondary-btn" onClick={() => setModal("tenant")}>Add Tenant</button>
                </div>
              </div>
              <div className="stats-grid">
                {statCards.map(([label, value]) => (
                  <div className="stat-card" key={label}>
                    <div className="stat-label">{label}</div>
                    <div className="stat-value">{loading ? "..." : value ?? 0}</div>
                  </div>
                ))}
              </div>
              <div className="grid-two">
                <Panel title="Recent Rent" rows={getRows(data, "rent").slice(0, 8)} columns={tableConfig.rent.slice(0, 5)} />
                <Panel title="Arrears Watch" rows={arrears.slice(0, 8).map((item) => ({ Tenant: item.tenant.Name, Months: item.months, Balance: fmt(item.total) }))} columns={["Tenant", "Months", "Balance"]} />
              </div>
            </>
          ) : active === "settings" ? (
            <SettingsPanel settings={data.settings || {}} onSubmit={saveSettings} />
          ) : active === "archive" ? (
            <Panel title="Archive" rows={activeRows} columns={tableConfig.archive} />
          ) : (
            <>
              <div className="actions-bar">
                <h1 className="section-title">{sections.find(([id]) => id === active)?.[1]}</h1>
                <SectionAction active={active} setModal={setModal} />
              </div>
              <Panel
                title={`All ${sections.find(([id]) => id === active)?.[1]}`}
                rows={activeRows}
                columns={tableConfig[active] || []}
                renderActions={active === "users" ? (row) => <button className="danger-btn" onClick={() => deactivateUser(row.ID)}>Deactivate</button> : null}
              />
            </>
          )}
        </div>
      </main>

      {modal ? (
        <Modal title={modalTitle(modal)} onClose={() => setModal(null)}>
          <form onSubmit={submitForm}>
            <div className="form-grid">{modalFields(modal, { landlords, properties, units, tenants })}</div>
            <div className="modal-foot">
              <button className="ghost-btn" type="button" onClick={() => setModal(null)}>Cancel</button>
              <button className="primary-btn" type="submit">Save</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

function navIcon(id) {
  return {
    dashboard: "D",
    landlords: "L",
    properties: "P",
    units: "U",
    tenants: "T",
    rent: "R",
    expenses: "E",
    invoices: "I",
    receipts: "C",
    settings: "S",
    users: "A",
    archive: "X"
  }[id];
}

function Panel({ title, rows, columns, renderActions }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <span className="badge">{rows.length} records</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => <th key={column}>{column}</th>)}
              {renderActions ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row, index) => (
              <tr key={row.ID || row.id || index}>
                {columns.map((column) => (
                  <td key={column}>{renderCell(column, row[column])}</td>
                ))}
                {renderActions ? <td>{renderActions(row)}</td> : null}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length + (renderActions ? 1 : 0)}>No records yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function renderCell(column, value) {
  if (["Amount", "Rent", "Rent Amount", "Balance"].includes(column)) return fmt(value);
  if (["Status", "PaymentType", "Role"].includes(column)) return <span className={`badge ${String(value).toLowerCase() === "inactive" ? "danger" : ""}`}>{value || "-"}</span>;
  return value || "-";
}

function SectionAction({ active, setModal }) {
  const map = {
    landlords: ["landlords", "Add Landlord"],
    properties: ["properties", "Add Property"],
    units: ["units", "Add Unit"],
    tenants: ["tenants", "Add Tenant"],
    rent: ["rent", "Record Payment"],
    expenses: ["expenses", "Add Expense"],
    invoices: ["invoice", "Create Invoice"],
    receipts: ["receipt", "Create Receipt"],
    users: ["users", "Add User"]
  };
  const action = map[active];
  if (!action) return null;
  return <button className="primary-btn" onClick={() => setModal(action[0])}>{action[1]}</button>;
}

function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal">
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="ghost-btn" onClick={onClose}>Close</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function SettingsPanel({ settings, onSubmit }) {
  return (
    <>
      <h1 className="section-title">Settings</h1>
      <section className="panel">
        <div className="panel-head"><h2>Company Settings</h2></div>
        <form className="modal-body form-grid" onSubmit={onSubmit}>
          <Field label="Company Name" name="company_name" defaultValue={settings.company_name || "ManageMate"} />
          <Field label="Currency" name="currency" defaultValue={settings.currency || "UGX"} />
          <Field label="Company Phone" name="company_phone" defaultValue={settings.company_phone || ""} />
          <Field label="Company Email" name="company_email" defaultValue={settings.company_email || ""} />
          <Field label="Address" name="company_address" defaultValue={settings.company_address || ""} full />
          <div className="full"><button className="primary-btn">Save Settings</button></div>
        </form>
      </section>
    </>
  );
}

function modalTitle(modal) {
  return {
    landlords: "Add Landlord",
    properties: "Add Property",
    units: "Add Unit",
    tenants: "Add Tenant",
    rent: "Record Payment",
    expenses: "Add Expense",
    invoice: "Create Invoice",
    receipt: "Create Receipt",
    users: "Add User"
  }[modal] || "New Record";
}

function modalFields(modal, lists) {
  const landlordOptions = lists.landlords.map((row) => <option key={row.ID} value={row.ID}>{row.Name}</option>);
  const propertyOptions = lists.properties.map((row) => <option key={row.ID} value={row.ID}>{row.Name}</option>);
  const unitOptions = lists.units.map((row) => <option key={row.ID} value={row.ID}>{row["Unit Number"]} - {row["Property Name"]}</option>);
  const tenantOptions = lists.tenants.map((row) => <option key={row.ID} value={row.ID}>{row.Name}</option>);
  const tenantUnitOptions = lists.tenants.map((row) => <option key={row.ID} value={row.ID} data-unit={row["Unit ID"]}>{row.Name}</option>);

  if (modal === "landlords") return (
    <>
      <Field label="Name" name="name" required />
      <Field label="Phone" name="phone" />
      <Field label="Email" name="email" />
      <Field label="Commission Rate" name="commissionRate" type="number" defaultValue="10" />
      <Field label="Address" name="address" full />
      <Field label="Bank Name" name="bankName" />
      <Field label="Bank Account" name="bankAccount" />
    </>
  );

  if (modal === "properties") return (
    <>
      <Field label="Name" name="name" required />
      <Field label="Landlord" name="landlordId"><select name="landlordId" required><option value="">Select landlord</option>{landlordOptions}</select></Field>
      <Field label="Address" name="address" full />
      <Field label="Type" name="type" defaultValue="Residential" />
    </>
  );

  if (modal === "units") return (
    <>
      <Field label="Property" name="propertyId"><select name="propertyId" required><option value="">Select property</option>{propertyOptions}</select></Field>
      <Field label="Unit Number" name="unitNumber" required />
      <Field label="Type" name="type" defaultValue="Studio" />
      <Field label="Rent" name="rent" type="number" defaultValue="0" />
      <Field label="Description" name="description" full />
    </>
  );

  if (modal === "tenants") return (
    <>
      <Field label="Name" name="name" required />
      <Field label="Phone" name="phone" required />
      <Field label="Email" name="email" />
      <Field label="ID Number" name="idNumber" />
      <Field label="Unit" name="unitId"><select name="unitId" required><option value="">Select unit</option>{unitOptions}</select></Field>
      <Field label="Monthly Rent" name="rentAmount" type="number" defaultValue="0" />
      <Field label="Deposit" name="deposit" type="number" defaultValue="0" />
      <Field label="Lease Start" name="leaseStart" type="date" />
      <Field label="Lease End" name="leaseEnd" type="date" />
    </>
  );

  if (modal === "rent") return (
    <>
      <Field label="Tenant" name="tenantId"><select name="tenantId" required><option value="">Select tenant</option>{tenantUnitOptions}</select></Field>
      <Field label="Unit ID" name="unitId" />
      <Field label="Amount" name="amount" type="number" required />
      <Field label="Expected Amount" name="expectedAmount" type="number" />
      <Field label="Month" name="month" placeholder="05" />
      <Field label="Year" name="year" type="number" defaultValue={new Date().getFullYear()} />
      <Field label="Payment Method" name="paymentMethod" defaultValue="Cash" />
      <Field label="Reference" name="reference" />
    </>
  );

  if (modal === "expenses") return (
    <>
      <Field label="Property" name="propertyId"><select name="propertyId"><option value="">None</option>{propertyOptions}</select></Field>
      <Field label="Category" name="category" defaultValue="Other" />
      <Field label="Description" name="description" required full />
      <Field label="Amount" name="amount" type="number" required />
      <Field label="Date" name="date" type="date" />
    </>
  );

  if (modal === "invoice") return (
    <>
      <Field label="Type" name="type"><select name="type" required><option value="tenant">Tenant</option><option value="landlord">Landlord</option><option value="custom">Custom</option></select></Field>
      <Field label="Entity ID" name="entityId" required />
      <Field label="Entity Name" name="entityName" />
      <Field label="Amount" name="amount" type="number" required />
      <Field label="Description" name="description" full />
      <Field label="Month" name="month" />
      <Field label="Year" name="year" type="number" defaultValue={new Date().getFullYear()} />
    </>
  );

  if (modal === "receipt") return (
    <>
      <Field label="Rent ID" name="rentId" />
      <Field label="Tenant Name" name="tenantName" required />
      <Field label="Unit Number" name="unitNumber" />
      <Field label="Amount" name="amount" type="number" required />
      <Field label="Month" name="month" />
      <Field label="Year" name="year" type="number" defaultValue={new Date().getFullYear()} />
      <Field label="Payment Method" name="paymentMethod" defaultValue="Cash" />
    </>
  );

  if (modal === "users") return (
    <>
      <Field label="Username" name="username" required />
      <Field label="Full Name" name="fullName" required />
      <Field label="Email" name="email" />
      <Field label="Role" name="role"><select name="role" defaultValue="User"><option>User</option><option>Admin</option></select></Field>
      <Field label="Password" name="password" type="password" />
    </>
  );

  return null;
}
