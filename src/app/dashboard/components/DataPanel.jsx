import { renderCellValue } from "../utils";

export default function DataPanel({ title, rows, columns, renderActions }) {
  return (
    <section className="data-table">
      <div className="table-header">
        <h3>{title}</h3>
        <span className="badge info">{rows.length} records</span>
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
              <tr key={row.ID || row.id || row.tenantId || index}>
                {columns.map((column) => (
                  <td key={column}>{renderCell(column, row[column])}</td>
                ))}
                {renderActions ? <td>{renderActions(row)}</td> : null}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length + (renderActions ? 1 : 0)}>
                  <div className="empty-state">
                    <h3>No records yet.</h3>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function renderCell(column, value) {
  if (["Status", "PaymentType", "Payment Method", "Role", "Level"].includes(column)) {
    const lower = String(value || "").toLowerCase();
    const tone = lower.includes("inactive") || lower.includes("critical") ? "danger" : lower.includes("high") || lower.includes("partial") ? "warning" : "success";
    return <span className={`badge ${tone}`}>{value || "-"}</span>;
  }
  return renderCellValue(column, value);
}
