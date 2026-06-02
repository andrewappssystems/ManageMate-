export default function Field({ label, name, type = "text", children, full, ...props }) {
  return (
    <label className={full ? "full" : ""}>
      {label}
      {children || <input name={name} type={type} {...props} />}
    </label>
  );
}
