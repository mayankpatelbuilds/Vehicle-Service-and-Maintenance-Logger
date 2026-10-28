import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useAppData } from "../hooks/useAppData.js";

function Expenses() {
  const {
    services,
    expenses,
    addExpense,
    deleteExpense,
    updateRecord,
  } = useAppData();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Maintenance");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");

  const reportEntries = [
    ...services.map((service) => ({
      id: `service-${service.id}`,
      title: `${service.serviceType} (${service.registration})`,
      category: "Maintenance",
      date: service.date,
      amount: Number(service.cost),
      source: "service",
    })),
    ...expenses.map((expense) => ({
      ...expense,
      id: `expense-${expense.id}`,
      source: "expense",
    })),
  ];

  const total = reportEntries.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const chartData = reportEntries.map((expense) => ({
    name: expense.title,
    amount: expense.amount,
  }));
  const categoryData = Object.values(
    reportEntries.reduce((summary, expense) => {
      if (!summary[expense.category]) {
        summary[expense.category] = {
          name: expense.category,
          amount: 0,
        };
      }

      summary[expense.category].amount += expense.amount;
      return summary;
    }, {})
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const numericAmount = Number(amount);
    if (!title.trim() || !date || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Please enter a title, date, and positive valid amount.");
      return;
    }

    try {
      const record = {
        title: title.trim(),
        category,
        date,
        amount: numericAmount,
      };
      if (editingId) {
        await updateRecord("expenses", editingId, record);
        setEditingId("");
      } else {
        await addExpense({ ...record, id: crypto.randomUUID() });
      }
    } catch (requestError) {
      setError(requestError.message);
      return;
    }
    setTitle("");
    setCategory("Maintenance");
    setDate("");
    setAmount("");
  }

  function startEditing(expense) {
    setEditingId(expense.id);
    setTitle(expense.title);
    setCategory(expense.category);
    setDate(expense.date);
    setAmount(String(expense.amount));
    setError("");
  }

  function cancelEditing() {
    setEditingId("");
    setTitle("");
    setCategory("Maintenance");
    setDate("");
    setAmount("");
    setError("");
  }

  return (
    <div className="page">
      <h1>Expenses & Reports</h1>
      <p>Track your vehicle-related spending.</p>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Expenses</h3>
          <h2>₹{total.toLocaleString("en-IN")}</h2>
        </div>

        <div className="stat-card">
          <h3>Expense Records</h3>
          <h2>{reportEntries.length}</h2>
        </div>
      </div>

      <section className="panel">
        <h2>{editingId ? "Edit Expense" : "Add Expense"}</h2>

        <form onSubmit={handleSubmit} className="form-grid">
          <input
            placeholder="Expense title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option>Maintenance</option>
            <option>Fuel</option>
            <option>Repair</option>
            <option>Insurance</option>
            <option>Other</option>
          </select>

          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />

          <input
            type="number"
            placeholder="Amount (₹)"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />

          {error && (
            <p className="form-error full-width" role="alert">
              {error}
            </p>
          )}

          <div className="form-actions">
            <button type="submit">
              {editingId ? "Save Changes" : "Add Expense"}
            </button>
            {editingId && (
              <button type="button" className="secondary-button" onClick={cancelEditing}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Expense Report</h2>

        {chartData.length === 0 ? (
          <p>No expense data available.</p>
        ) : (
          <div style={{ padding: "20px" }}>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value}`} />
                  <Bar dataKey="amount" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p>Total expenses: ₹{total.toLocaleString("en-IN")}</p>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Expenses by Category</h2>

        {categoryData.length === 0 ? (
          <p>No expense data available.</p>
        ) : (
          categoryData.map((item) => (
            <div
              key={item.name}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 0",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <span>{item.name}</span>
              <strong>₹{item.amount.toLocaleString("en-IN")}</strong>
            </div>
          ))
        )}
      </section>

      <section className="panel">
        <h2>Expense History</h2>

        {reportEntries.length === 0 ? (
          <p>No expenses or service costs recorded yet.</p>
        ) : (
          reportEntries.map((expense) => (
            <div className="expense-row" key={expense.id}>
              <div>
                <strong>{expense.title}</strong>
                <p>
                  {expense.category} · {expense.date}
                  {expense.source === "service" && " · Service record"}
                </p>
              </div>

              <strong>₹{expense.amount.toLocaleString("en-IN")}</strong>

              {expense.source === "expense" && (
                <div className="vehicle-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                      startEditing({
                        ...expense,
                        id: expense.id.slice("expense-".length),
                      })
                    }
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteExpense(expense.id.slice("expense-".length))}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}

export default Expenses;
