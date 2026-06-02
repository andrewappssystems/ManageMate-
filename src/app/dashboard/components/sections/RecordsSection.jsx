import { sections, sectionActions, tableConfig } from "../../config";
import DataPanel from "../DataPanel";

export default function RecordsSection({ active, rows, setModal, renderActions }) {
  const meta = sections.find((section) => section.id === active);
  const actions = sectionActions[active] || [];

  return (
    <>
      <div className="actions-bar">
        <div className="section-title">{meta?.label}</div>
        <div className="quick-actions compact">
          {actions.map((action) => (
            <button
              key={action.modal}
              className={action.variant === "secondary" ? "secondary" : ""}
              onClick={() => setModal(action.modal)}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
      <DataPanel
        title={`All ${meta?.label}`}
        rows={rows}
        columns={tableConfig[active] || []}
        renderActions={renderActions}
      />
    </>
  );
}
