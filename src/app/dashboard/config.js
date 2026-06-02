export const sections = [
  { id: "dashboard", label: "Dashboard", group: "Workspace", icon: "D" },
  { id: "landlords", label: "Landlords", group: "Portfolio", icon: "L" },
  { id: "properties", label: "Properties", group: "Portfolio", icon: "P" },
  { id: "units", label: "Units", group: "Portfolio", icon: "U" },
  { id: "tenants", label: "Tenants", group: "Leasing", icon: "T" },
  { id: "rent", label: "Rent Collection", group: "Leasing", icon: "R" },
  { id: "arrears", label: "Arrears", group: "Leasing", icon: "!" },
  { id: "expenses", label: "Expenses", group: "Finance", icon: "E" },
  { id: "invoices", label: "Invoices", group: "Finance", icon: "I" },
  { id: "receipts", label: "Receipts", group: "Finance", icon: "C" },
  { id: "reports", label: "Reports", group: "Analytics", icon: "A" },
  { id: "users", label: "Users", group: "Admin", icon: "U", adminOnly: true },
  { id: "archive", label: "Archive", group: "Admin", icon: "X", adminOnly: true },
  { id: "settings", label: "Settings", group: "Admin", icon: "S", adminOnly: true }
];

export const endpoints = [
  "stats",
  "landlords",
  "properties",
  "units",
  "tenants",
  "rent",
  "expenses",
  "invoices",
  "receipts",
  "settings",
  "rent/due-status",
  "rent-increase/history"
];

export const adminEndpoints = ["users", "archive"];

export const tableConfig = {
  landlords: ["ID", "Name", "Phone", "Email", "Bank Name", "Commission Rate", "Status"],
  properties: ["ID", "Name", "Landlord Name", "Address", "Type", "Total Units", "Occupied", "Status"],
  units: ["ID", "Property Name", "Unit Number", "Type", "Rent", "Status"],
  tenants: ["ID", "Name", "Phone", "Email", "Unit Number", "Rent Amount", "Lease End", "Status"],
  rent: ["ID", "Tenant Name", "Unit Number", "Amount", "Month", "Year", "PaymentType", "Payment Method", "Date"],
  arrears: ["Tenant", "Unit", "Property", "Monthly Rent", "Months Due", "Balance", "Level"],
  expenses: ["ID", "Property Name", "Category", "Description", "Amount", "Date"],
  invoices: ["ID", "Type", "EntityName", "Description", "Amount", "Month", "Year", "Status"],
  receipts: ["ID", "TenantName", "UnitNumber", "Amount", "Month", "Year", "PaymentType", "PaymentMethod", "Date"],
  users: ["ID", "Name", "Username", "Email", "Role", "Status"],
  archive: ["deleted_at", "entity_type", "entity_id", "entity_label", "deleted_by"],
  rentIncrease: ["increase_id", "unit_number", "tenant_name", "old_rent", "new_rent", "effective_date", "created_by"]
};

export const sectionActions = {
  landlords: [{ modal: "landlords", label: "+ Add Landlord" }],
  properties: [{ modal: "properties", label: "+ Add Property" }],
  units: [
    { modal: "units", label: "+ Add Unit" },
    { modal: "bulkUnits", label: "+ Bulk Add Units", variant: "secondary" }
  ],
  tenants: [{ modal: "tenants", label: "+ Add Tenant" }],
  rent: [{ modal: "rent", label: "+ Record Payment" }],
  expenses: [{ modal: "expenses", label: "+ Add Expense" }],
  invoices: [
    { modal: "invoice", label: "+ Create Invoice" },
    { modal: "customInvoice", label: "+ Custom Invoice", variant: "secondary" },
    { modal: "bulkInvoice", label: "+ Bulk Management Fees", variant: "secondary" }
  ],
  receipts: [{ modal: "receipt", label: "+ Create Receipt" }],
  reports: [{ modal: "portfolioReport", label: "+ Portfolio Report" }],
  users: [{ modal: "users", label: "+ Add User" }]
};
