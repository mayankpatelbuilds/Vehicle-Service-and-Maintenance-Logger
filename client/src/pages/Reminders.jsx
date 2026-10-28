import { useState } from "react";
import { useAppData } from "../hooks/useAppData.js";
import { getReminderStatus, isValidDateString } from "../utils/reminders.js";

function Reminders() {
  const {
    vehicles,
    reminders,
    addReminder,
    deleteReminder,
    updateRecord,
  } = useAppData();
  const emptyForm = {
    vehicle: "",
    title: "General Service",
    dueDate: "",
    dueMileage: "",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.vehicle || !form.dueDate) {
      setError("Please select a vehicle and due date.");
      return;
    }

    if (!isValidDateString(form.dueDate)) {
      setError("Please enter a valid due date.");
      return;
    }

    const dueMileage =
      form.dueMileage === "" ? null : Number(form.dueMileage);
    if (
      dueMileage !== null &&
      (!Number.isInteger(dueMileage) || dueMileage < 0)
    ) {
      setError("Due mileage must be a non-negative whole number.");
      return;
    }

    const reminder = {
      ...form,
      vehicle: form.vehicle.trim().toUpperCase(),
      dueMileage,
    };

    try {
      if (editingId) {
        await updateRecord("reminders", editingId, reminder);
        setEditingId("");
      } else {
        if (!(await addReminder({ ...reminder, id: crypto.randomUUID() }))) {
          setError("This reminder must be linked to a registered vehicle.");
          return;
        }
      }
    } catch (requestError) {
      setError(requestError.message);
      return;
    }

    setForm(emptyForm);
  }

  function startEditing(reminder) {
    setEditingId(reminder.id);
    setForm({
      vehicle: reminder.vehicle,
      title: reminder.title,
      dueDate: reminder.dueDate,
      dueMileage:
        reminder.dueMileage == null ? "" : String(reminder.dueMileage),
      notes: reminder.notes || "",
    });
    setError("");
  }

  const overdueCount = reminders.filter(
    (item) => getReminderStatus(item.dueDate) === "Overdue"
  ).length;

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Maintenance Reminders</h1>
          <p>Plan your next vehicle service before it's due.</p>
        </div>
        <span className="vehicle-count">
          {reminders.length} Reminders
        </span>
      </div>

      <div className="reminder-summary">
        <div className="content-card">
          <p>Total Reminders</p>
          <h2>{reminders.length}</h2>
        </div>
        <div className="content-card">
          <p>Overdue Reminders</p>
          <h2>{overdueCount}</h2>
        </div>
      </div>

      <div className="content-card reminder-form-card">
        <h2>{editingId ? "Edit Maintenance Reminder" : "+ Add Maintenance Reminder"}</h2>
        <p className="form-description">
          Set the next maintenance date for your vehicle.
        </p>

        <form className="reminder-form" onSubmit={handleSubmit}>
          <label>
            Vehicle Registration Number *
            <select
              name="vehicle"
              value={form.vehicle}
              onChange={handleChange}
              required
              disabled={vehicles.length === 0}
            >
              <option value="">Select a vehicle</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.registration}>
                  {vehicle.registration} — {vehicle.brand} {vehicle.model}
                </option>
              ))}
            </select>
          </label>

          <label>
            Maintenance Type *
            <select
              name="title"
              value={form.title}
              onChange={handleChange}
            >
              <option>General Service</option>
              <option>Oil Change</option>
              <option>Brake Inspection</option>
              <option>Tyre Replacement</option>
              <option>Battery Check</option>
              <option>Pollution Certificate</option>
              <option>Insurance Renewal</option>
              <option>Other</option>
            </select>
          </label>

          <label>
            Due Date *
            <input
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Due Mileage (km)
            <input
              type="number"
              name="dueMileage"
              value={form.dueMileage}
              onChange={handleChange}
              min="0"
              placeholder="e.g. 20000"
            />
          </label>

          <label className="full-width">
            Notes
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Additional details..."
              rows="3"
            />
          </label>

          {error && (
            <p className="form-error full-width" role="alert">
              {error}
            </p>
          )}

          <div className="form-actions">
            <button className="primary-button" type="submit">
              {editingId ? "Save Changes" : "Save Reminder"}
            </button>
            {editingId && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setEditingId("");
                  setForm(emptyForm);
                  setError("");
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <section className="reminder-list-section">
        <h2>Your Reminders</h2>

        {reminders.length === 0 ? (
          <div className="content-card empty-vehicles">
            <span>🔔</span>
            <h3>No reminders added yet</h3>
            <p>Your upcoming maintenance tasks will appear here.</p>
          </div>
        ) : (
          <div className="reminder-list">
            {reminders.map((reminder) => {
              const status = getReminderStatus(reminder.dueDate);

              return (
                <article className="content-card reminder-card" key={reminder.id}>
                  <div className="reminder-card-header">
                    <div>
                      <h3>{reminder.title}</h3>
                      <p>{reminder.vehicle}</p>
                    </div>
                    <span className={`reminder-status ${status.toLowerCase().replace(" ", "-")}`}>
                      {status}
                    </span>
                  </div>

                  <div className="reminder-details">
                    <p>
                      <span>Due date</span>
                      <strong>{reminder.dueDate}</strong>
                    </p>
                    {reminder.dueMileage != null && (
                      <p>
                        <span>Due mileage</span>
                        <strong>
                          {reminder.dueMileage.toLocaleString("en-IN")} km
                        </strong>
                      </p>
                    )}
                  </div>

                  {reminder.notes && (
                    <p className="service-notes">{reminder.notes}</p>
                  )}

                  <div className="vehicle-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => startEditing(reminder)}
                    >
                      Edit Reminder
                    </button>
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => deleteReminder(reminder.id)}
                    >
                      Delete Reminder
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

export default Reminders;
