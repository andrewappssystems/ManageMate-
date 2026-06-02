import { fmtUGX } from "../utils";

export default function StatsGrid({ stats, loading }) {
  const cards = [
    ["Landlords", stats.landlords],
    ["Properties", stats.properties],
    ["Units", stats.units],
    ["Tenants", stats.tenants],
    ["Occupied", stats.occupied],
    ["Vacant", stats.vacant, "warning"],
    ["Rent Collected", fmtUGX(stats.totalRent), "green-value"],
    ["Expenses", fmtUGX(stats.totalExpenses), "danger"]
  ];

  return (
    <div className="stats-grid">
      {cards.map(([label, value, tone]) => (
        <div className={`stat-card ${tone || ""}`} key={label}>
          <div className="stat-label">{label}</div>
          <div className="stat-value">{loading ? "..." : value ?? 0}</div>
        </div>
      ))}
    </div>
  );
}
