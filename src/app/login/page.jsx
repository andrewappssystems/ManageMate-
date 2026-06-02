import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

const messages = {
  missing: "Username and password are required.",
  invalid: "Invalid username or password.",
  inactive: "Account deactivated. Contact your administrator.",
  server: "Server error. Please try again."
};

export default async function LoginPage({ searchParams }) {
  const user = await getSessionUser();
  if (user) redirect("/");
  const params = await searchParams;
  const error = messages[params?.error] || "";

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <h1>Welcome to ManageMate</h1>
          <p>Streamline landlords, tenants, rent collection, receipts, invoices, expenses, and reports from one focused workspace.</p>
          <div className="feature-list">
            <span>Real-time portfolio metrics</span>
            <span>Rent and arrears tracking</span>
            <span>Receipts, invoices, and reports</span>
          </div>
        </div>
        <div className="login-card">
          <div className="brand-row">
            <span className="brand-mark">M</span>
            <strong>ManageMate</strong>
          </div>
          <h2>Sign In</h2>
          <p className="muted">Access your property management dashboard.</p>
          {error ? <div className="alert error">{error}</div> : null}
          <form action="/api/auth/login" method="POST" className="form-stack">
            <label>
              Username
              <input name="username" autoComplete="username" required placeholder="admin" />
            </label>
            <label>
              Password
              <input name="password" type="password" autoComplete="current-password" required placeholder="Enter password" />
            </label>
            <button className="primary-btn" type="submit">Sign In</button>
          </form>
          <p className="tiny">Fresh installs seed `admin` with a development-only empty password hash. Set a password after login.</p>
        </div>
      </section>
    </main>
  );
}
