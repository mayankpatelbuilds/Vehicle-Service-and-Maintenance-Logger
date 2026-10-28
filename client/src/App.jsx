import { useState } from "react";
import Expenses from "./pages/Expenses.jsx";
import Reminders from "./pages/Reminders.jsx";
import Services from "./pages/Services.jsx";
import {
  Link,
  NavLink,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import "./App.css";
import Vehicles from "./pages/Vehicles.jsx";
import { useAppData } from "./hooks/useAppData.js";
import { useAuth } from "./hooks/useAuth.js";
import { AppDataProvider } from "./context/AppDataContext.jsx";
import { getReminderStatus } from "./utils/reminders.js";
import AuthPage from "./pages/AuthPage.jsx";
import {
  AboutPage,
  ContactPage,
  HomePage,
  MaintenancePage,
} from "./pages/PublicPages.jsx";

const menuItems = [
  { path: "/dashboard", icon: "▦", label: "Dashboard" },
  { path: "/vehicles", icon: "🚘", label: "My Vehicles" },
  { path: "/services", icon: "🔧", label: "Service History" },
  { path: "/reminders", icon: "🔔", label: "Reminders" },
  { path: "/expenses", icon: "₹", label: "Expenses & Reports" },
  { path: "/settings", icon: "⚙", label: "Settings" },
];

function Dashboard() {
  const { vehicles, services, reminders, expenses } = useAppData();
  const totalServiceCost = services.reduce(
    (total, service) => total + Number(service.cost || 0),
    0
  );
  const totalOtherExpenses = expenses.reduce(
    (total, expense) => total + Number(expense.amount || 0),
    0
  );
  const upcomingReminders = reminders.filter(
    (reminder) => getReminderStatus(reminder.dueDate) === "Upcoming"
  ).length;
  const dueTodayReminders = reminders.filter(
    (reminder) => getReminderStatus(reminder.dueDate) === "Due Today"
  ).length;
  const overdueReminders = reminders.filter(
    (reminder) => getReminderStatus(reminder.dueDate) === "Overdue"
  ).length;
  const recentServices = [...services]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 5);

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back! Here's your vehicle overview.</p>
        </div>
        <NavLink to="/vehicles" className="primary-button">
          + Add Vehicle
        </NavLink>
      </div>

      <div className="stats-grid">
        <Stat title="Total Vehicles" value={vehicles.length} icon="🚘" />
        <Stat title="Service Records" value={services.length} icon="🔧" />
        <Stat title="Upcoming Reminders" value={upcomingReminders} icon="🔔" />
        <Stat
          title="Total Vehicle Costs"
          value={`₹${(totalServiceCost + totalOtherExpenses).toLocaleString("en-IN")}`}
          icon="₹"
        />
      </div>

      <div className="content-card">
        <h2>Recent Service Activity</h2>
        <p>
          Reminders: {dueTodayReminders} due today · {overdueReminders} overdue
        </p>
        {recentServices.length === 0 ? (
          <div className="empty-state">
            <span>🚗</span>
            <h3>No service records yet</h3>
            <p>Add a vehicle and record its first service.</p>
            <NavLink to="/vehicles" className="primary-button">
              Get Started
            </NavLink>
          </div>
        ) : (
          <div className="service-records">
            {recentServices.map((service) => (
              <article className="content-card service-record" key={service.id}>
                <div className="service-record-header">
                  <div>
                    <h3>{service.serviceType}</h3>
                    <p>{service.registration}</p>
                  </div>
                  <strong>₹{Number(service.cost).toLocaleString("en-IN")}</strong>
                </div>
                <div className="service-record-details">
                  <p>
                    <span>Date</span>
                    <strong>{service.date}</strong>
                  </p>
                  <p>
                    <span>Odometer</span>
                    <strong>{Number(service.odometer).toLocaleString("en-IN")} km</strong>
                  </p>
                </div>
              </article>
            ))}
            <NavLink to="/services" className="primary-button">
              View Service History
            </NavLink>
          </div>
        )}
      </div>
    </>
  );
}

function Stat({ title, value, icon }) {
  return (
    <div className="stat-card">
      <div>
        <p>{title}</p>
        <h2>{value}</h2>
      </div>
      <span className="stat-icon">{icon}</span>
    </div>
  );
}

function Placeholder({ title }) {
  return (
    <div className="content-card placeholder">
      <h1>{title}</h1>
      <p>This page will be developed in the upcoming steps.</p>
    </div>
  );
}

function PrivateArea() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return <main className="auth-loading">Checking your sign-in…</main>;
  }
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
        }}
      />
    );
  }
  return (
    <AppDataProvider>
      <PrivateLayout />
    </AppDataProvider>
  );
}

function PrivateLayout() {
  const { user, logout } = useAuth();
  const [logoutError, setLogoutError] = useState("");
  const initials = user.name.trim().slice(0, 1).toUpperCase();

  async function handleLogout() {
    setLogoutError("");
    try {
      await logout();
    } catch (error) {
      setLogoutError(error.message);
    }
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">🚘</div>
          <div>
            <h2>AutoCare</h2>
            <p>Vehicle Manager</p>
          </div>
        </div>

        <p className="menu-label">MAIN MENU</p>
        <nav className="navigation">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span>🛠️</span>
          <div>
            <strong>AutoCare Logger</strong>
            <p>Keep your vehicle healthy.</p>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <span>Vehicle Service & Maintenance Logger</span>
          <div className="topbar-account">
            <span className="account-name">{user.name}</span>
            <div className="user-avatar" aria-label={`Signed in as ${user.name}`}>
              {initials}
            </div>
            <button type="button" className="logout-button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        </header>
        <div className="page-content">
          {logoutError && (
            <p className="form-error" role="alert">{logoutError}</p>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function PublicLayout() {
  const { user, logout } = useAuth();
  const [logoutError, setLogoutError] = useState("");

  async function handleLogout() {
    setLogoutError("");
    try {
      await logout();
    } catch (error) {
      setLogoutError(error.message);
    }
  }

  return (
    <div className="public-site">
      <header className="public-header">
        <Link className="public-brand" to="/">
          <span aria-hidden="true">🚘</span> AutoCare Logger
        </Link>
        <nav className="public-navigation" aria-label="Main navigation">
          <NavLink to="/" end>Home</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/maintenance">Maintenance Tips</NavLink>
          <NavLink to="/contact">Contact</NavLink>
          {user ? (
            <>
              <Link className="public-nav-cta" to="/dashboard">Dashboard</Link>
              <button
                type="button"
                className="public-nav-button"
                onClick={handleLogout}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login">Login</NavLink>
              <Link className="public-nav-cta" to="/register">
                Create account
              </Link>
            </>
          )}
        </nav>
      </header>
      {logoutError && (
        <p className="form-error public-message" role="alert">{logoutError}</p>
      )}
      <main className="public-content">
        <Outlet />
      </main>
      <footer className="public-footer">
        Vehicle Service & Maintenance Logger · Keep every journey ready.
      </footer>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/maintenance" element={<MaintenancePage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
      </Route>
      <Route element={<PrivateArea />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/services" element={<Services />} />
        <Route path="/reminders" element={<Reminders />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/settings" element={<Placeholder title="Profile & Settings" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
