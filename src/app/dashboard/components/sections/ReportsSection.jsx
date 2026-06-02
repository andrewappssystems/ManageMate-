import DataPanel from "../DataPanel";
import { tableConfig } from "../../config";

export default function ReportsSection({ report, rentIncreaseRows, setModal }) {
  return (
    <>
      <div className="section-title">Reports & Analytics</div>
      <div className="report-cards">
        <button className="report-card" onClick={() => setModal("portfolioReport")}>
          <div className="icon">P</div>
          <h3>Portfolio Report</h3>
          <p>Full summary across properties, rent collected, expenses, occupancy, and arrears.</p>
        </button>
        <button className="report-card yellow" onClick={() => setModal("bulkInvoice")}>
          <div className="icon">F</div>
          <h3>Management Fees</h3>
          <p>Create landlord management fee invoices in bulk for a selected period.</p>
        </button>
        <button className="report-card" onClick={() => setModal("rentIncrease")}>
          <div className="icon">R</div>
          <h3>Rent Increase</h3>
          <p>Record rent increase history and apply changes immediately when effective.</p>
        </button>
      </div>
      {report ? (
        <section className="data-table report-summary">
          <div className="table-header"><h3>Portfolio Summary</h3></div>
          <div className="summary-grid">
            <div><span>Properties</span><strong>{report.properties}</strong></div>
            <div><span>Occupancy</span><strong>{report.occupancyRate}%</strong></div>
            <div><span>Rent Collected</span><strong>UGX {Number(report.rentCollected || 0).toLocaleString()}</strong></div>
            <div><span>Net Income</span><strong>UGX {Number(report.netIncome || 0).toLocaleString()}</strong></div>
          </div>
        </section>
      ) : null}
      <DataPanel title="Rent Increase History" rows={rentIncreaseRows} columns={tableConfig.rentIncrease} />
    </>
  );
}
