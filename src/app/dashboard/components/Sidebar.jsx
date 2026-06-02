import { sections } from "../config";

export default function Sidebar({ active, setActive, user }) {
  const visible = sections.filter((section) => !section.adminOnly || user.role === "Admin");
  const groups = [...new Set(visible.map((section) => section.group))];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">Manage<span>Mate</span></div>
      {groups.map((group) => (
        <div key={group}>
          <div className="nav-section">{group}</div>
          {visible
            .filter((section) => section.group === group)
            .map((section) => (
              <button
                className={`nav-btn ${active === section.id ? "active" : ""}`}
                key={section.id}
                onClick={() => setActive(section.id)}
              >
                <span className="nav-icon">{section.icon}</span>
                {section.label}
              </button>
            ))}
        </div>
      ))}
    </aside>
  );
}
