import Field from "./forms/Field";

export default function SettingsPanel({ settings, onSubmit, onLogo }) {
  return (
    <>
      <div className="section-title">Settings</div>
      <section className="data-table settings-panel">
        <div className="table-header"><h3>System Settings</h3></div>
        <form className="settings-form" onSubmit={onSubmit}>
          <Field label="Company Name" name="company_name" defaultValue={settings.company_name || "ManageMate"} />
          <Field label="Address" name="company_address" defaultValue={settings.company_address || ""} />
          <Field label="Phone" name="company_phone" defaultValue={settings.company_phone || ""} />
          <Field label="Email" name="company_email" defaultValue={settings.company_email || ""} />
          <Field label="Currency" name="currency" defaultValue={settings.currency || "UGX"} />
          <Field label="VAT Rate (%)" name="vat_rate" defaultValue={settings.vat_rate || "0"} />
          <div className="logo-row">
            <label>Company Logo</label>
            <input type="file" accept="image/*" onChange={onLogo} />
          </div>
          <button className="primary-btn">Save Settings</button>
        </form>
      </section>
    </>
  );
}
