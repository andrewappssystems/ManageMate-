import { tableConfig } from "../../config";
import { fmtUGX } from "../../utils";
import DataPanel from "../DataPanel";
import StatsGrid from "../StatsGrid";

export default function DashboardSection({ stats, loading, rentRows, arrears, rentDue, setModal }) {
  const critical = arrears.filter((item) => item["Months Due"] >= 2);

  return (
    <>
      <div className="alert-bar" style={{ display: rentDue?.totalUnpaid ? "flex" : "none" }}>
        <strong>{rentDue?.overdueCount || 0} overdue tenants</strong>
        <span>{rentDue?.totalUnpaid || 0} tenants have not paid this month.</span>
      </div>
      <div className="actions-bar">
        <h1 className="section-title">Dashboard</h1>
        <div className="actions-bar">
          <button className="primary-btn" onClick={() => setModal("rent")}>+ Record Payment</button>
          <button className="secondary-btn" onClick={() => setModal("tenant")}>+ Add Tenant</button>
        </div>
      </div>
      <StatsGrid stats={stats} loading={loading} />
      <div className="quick-actions">
        <button onClick={() => setModal("landlords")}>+ Add Landlord</button>
        <button onClick={() => setModal("properties")}>+ Add Property</button>
        <button onClick={() => setModal("units")}>+ Add Unit</button>
        <button className="secondary" onClick={() => setModal("bulkInvoice")}>+ Bulk Management Fees</button>
      </div>
      {critical.length ? (
        <section className="arrears-widget">
          <h3>Critical Arrears</h3>
          <div className="arrears-list">
            {critical.slice(0, 4).map((item) => (
              <div className="arrears-item" key={item.tenantId}>
                <div>
                  <div className="ai-info">{item.Tenant}</div>
                  <div className="ai-sub">{item.Unit} - {item.Property} - {item["Months Due"]} months due</div>
                </div>
                <div className="ai-amt">{fmtUGX(item.Balance)}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <div className="grid-two">
        <DataPanel title="Recent Rent" rows={rentRows.slice(0, 8)} columns={tableConfig.rent.slice(0, 6)} />
        <DataPanel title="Arrears Watch" rows={arrears.slice(0, 8)} columns={tableConfig.arrears.slice(0, 6)} />
      </div>
    </>
  );
}
