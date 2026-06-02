export default function Topbar({ user }) {
  const date = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  const time = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  return (
    <header className="topbar">
      <div className="topbar-left">
        <span className="greeting">Welcome back,</span>
        <strong>{user.name || user.username}</strong>
        <span className="role-badge">{user.role}</span>
      </div>
      <div className="topbar-right">
        <div className="datetime">
          <strong>{time}</strong>
          <span>{date}</span>
        </div>
        <a className="signout-btn" href="/api/auth/logout">Sign Out</a>
      </div>
    </header>
  );
}
