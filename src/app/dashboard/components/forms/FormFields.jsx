import Field from "./Field";

const currentYear = new Date().getFullYear();

export function modalTitle(modal) {
  return {
    landlords: "Add Landlord",
    properties: "Add Property",
    units: "Add Unit",
    bulkUnits: "Bulk Add Units",
    tenants: "Add Tenant",
    rent: "Record Payment",
    expenses: "Add Expense",
    invoice: "Create Invoice",
    customInvoice: "Custom Invoice",
    bulkInvoice: "Bulk Management Fees",
    receipt: "Create Receipt",
    users: "Add User",
    rentIncrease: "Rent Increase",
    portfolioReport: "Portfolio Report"
  }[modal] || "New Record";
}

export function endpointForModal(modal) {
  return {
    rent: "rent/v2",
    invoice: "invoices/v2",
    customInvoice: "invoices/custom",
    bulkInvoice: "invoices/bulk",
    receipt: "receipts/v2",
    bulkUnits: "units/bulk",
    rentIncrease: "rent-increase",
    portfolioReport: "reports/portfolio"
  }[modal] || modal;
}

export function buildPayload(modal, form) {
  const payload = Object.fromEntries(form.entries());
  if (modal === "bulkUnits") {
    const count = parseInt(payload.count || "0", 10);
    const start = parseInt(payload.start || "1", 10);
    const prefix = payload.prefix || "Unit";
    payload.units = Array.from({ length: count }, (_, index) => ({
      unitNumber: `${prefix} ${start + index}`,
      type: payload.type || "Studio",
      rent: payload.rent || "0",
      description: ""
    }));
    delete payload.count;
    delete payload.start;
    delete payload.prefix;
  }
  if (modal === "customInvoice") {
    payload.lineItems = [{ description: payload.serviceTitle, amount: payload.amount }];
  }
  return payload;
}

export function FormFields({ modal, lists }) {
  const landlordOptions = lists.landlords.map((row) => <option key={row.ID} value={row.ID}>{row.Name}</option>);
  const propertyOptions = lists.properties.map((row) => <option key={row.ID} value={row.ID}>{row.Name}</option>);
  const unitOptions = lists.units.map((row) => <option key={row.ID} value={row.ID}>{row["Unit Number"]} - {row["Property Name"]}</option>);
  const tenantOptions = lists.tenants.map((row) => <option key={row.ID} value={row.ID}>{row.Name}</option>);

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

  if (modal === "bulkUnits") return (
    <>
      <Field label="Property" name="propertyId"><select name="propertyId" required><option value="">Select property</option>{propertyOptions}</select></Field>
      <Field label="Prefix" name="prefix" defaultValue="Unit" />
      <Field label="Start Number" name="start" type="number" defaultValue="1" />
      <Field label="Count" name="count" type="number" min="1" required />
      <Field label="Type" name="type" defaultValue="Studio" />
      <Field label="Rent" name="rent" type="number" defaultValue="0" />
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
      <Field label="Emergency Contact" name="emergencyName" />
      <Field label="Emergency Phone" name="emergencyPhone" />
    </>
  );

  if (modal === "rent") return (
    <>
      <Field label="Tenant" name="tenantId"><select name="tenantId" required><option value="">Select tenant</option>{tenantOptions}</select></Field>
      <Field label="Unit ID" name="unitId" />
      <Field label="Amount" name="amount" type="number" required />
      <Field label="Expected Amount" name="expectedAmount" type="number" />
      <Field label="Payment Type" name="paymentType"><select name="paymentType"><option>Full</option><option>Partial</option></select></Field>
      <Field label="Month" name="month" placeholder="05" />
      <Field label="Year" name="year" type="number" defaultValue={currentYear} />
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
      <Field label="Year" name="year" type="number" defaultValue={currentYear} />
    </>
  );

  if (modal === "customInvoice") return (
    <>
      <Field label="Client Name" name="clientName" required />
      <Field label="Client Email" name="clientEmail" />
      <Field label="Service Title" name="serviceTitle" required full />
      <Field label="Amount" name="amount" type="number" required />
      <Field label="Month" name="month" />
      <Field label="Year" name="year" type="number" defaultValue={currentYear} />
    </>
  );

  if (modal === "bulkInvoice") return (
    <>
      <Field label="Month" name="month" required />
      <Field label="Year" name="year" type="number" defaultValue={currentYear} required />
      <Field label="Description" name="description" full />
      <Field label="Override Amount" name="overrideAmount" type="number" />
    </>
  );

  if (modal === "receipt") return (
    <>
      <Field label="Rent ID" name="rentId" />
      <Field label="Tenant Name" name="tenantName" required />
      <Field label="Unit Number" name="unitNumber" />
      <Field label="Amount" name="amount" type="number" required />
      <Field label="Month" name="month" />
      <Field label="Year" name="year" type="number" defaultValue={currentYear} />
      <Field label="Payment Method" name="paymentMethod" defaultValue="Cash" />
    </>
  );

  if (modal === "rentIncrease") return (
    <>
      <Field label="Unit" name="unitId"><select name="unitId" required><option value="">Select unit</option>{unitOptions}</select></Field>
      <Field label="New Rent" name="newRent" type="number" required />
      <Field label="Effective Date" name="effectiveDate" type="date" required />
      <Field label="Notes" name="notes" full />
    </>
  );

  if (modal === "portfolioReport") return (
    <>
      <Field label="From" name="from" type="date" required />
      <Field label="To" name="to" type="date" required />
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
