import { useState } from "react";
import { useAppData } from "../hooks/useAppData.js";
import { getTodayDateString, isValidDateString } from "../utils/reminders.js";

function Services() {
  const {
    vehicles,
    services: records,
    addService,
    deleteService,
    updateRecord,
  } = useAppData();
  const emptyForm = {
    registration: "",
    serviceType: "General Service",
    date: "",
    cost: "",
    odometer: "",
    workshop: "",
    notes: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!form.registration || !form.date || form.cost === "" || form.odometer === "") {
      setError("Please complete all required fields.");
      return;
    }

    const cost = Number(form.cost);
    const odometer = Number(form.odometer);
    if (
      !Number.isFinite(cost) ||
      cost < 0 ||
      !Number.isInteger(odometer) ||
      odometer < 0
    ) {
      setError("Enter a valid non-negative cost and whole-number odometer reading.");
      return;
    }

    if (!isValidDateString(form.date) || form.date > getTodayDateString()) {
      setError("Enter a valid service date that is not in the future.");
      return;
    }

    const registration = form.registration.trim().toUpperCase();
    if (
      !vehicles.some(
        (vehicle) => vehicle.registration.toUpperCase() === registration
      )
    ) {
      setError("Select a registered vehicle.");
      return;
    }

    const newRecord = {
      ...form,
      registration,
      cost,
      odometer,
    };

    try {
      if (editingId) {
        await updateRecord("services", editingId, newRecord);
        setEditingId("");
      } else {
        if (!(await addService({ ...newRecord, id: crypto.randomUUID() }))) {
          setError("This service must be linked to a registered vehicle.");
          return;
        }
      }
    } catch (requestError) {
      setError(requestError.message);
      return;
    }

    setForm(emptyForm);
  }

  function startEditing(record) {
    setEditingId(record.id);
    setForm({
      registration: record.registration,
      serviceType: record.serviceType,
      date: record.date,
      cost: String(record.cost),
      odometer: String(record.odometer),
      workshop: record.workshop || "",
      notes: record.notes || "",
    });
    setError("");
  }

  const totalCost = records.reduce(
    (total, record) => total + record.cost,
    0
  );

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>Service History</h1>
          <p>Track maintenance and repair work for your vehicles.</p>
        </div>
        <span className="vehicle-count">
          {records.length} Records
        </span>
      </div>

      <div className="service-summary">
        <div className="content-card">
          <p>Total Service Records</p>
          <h2>{records.length}</h2>
        </div>

        <div className="content-card">
          <p>Total Maintenance Cost</p>
          <h2>₹{totalCost.toLocaleString("en-IN")}</h2>
        </div>
      </div>

      <div className="content-card service-form-card">
        <h2>{editingId ? "Edit Service Record" : "+ Add Service Record"}</h2>
        <p className="form-description">
          Enter the details of a completed service.
        </p>

        <form className="service-form" onSubmit={handleSubmit}>
          <label>
            Vehicle Registration Number *
            <select
              name="registration"
              value={form.registration}
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
            Service Type *
            <select
              name="serviceType"
              value={form.serviceType}
              onChange={handleChange}
              required
            >
              <option>General Service</option>
              <option>Oil Change</option>
              <option>Engine Repair</option>
              <option>Brake Service</option>
              <option>Tyre Replacement</option>
              <option>Battery Replacement</option>
              <option>Other Repair</option>
            </select>
          </label>

          <label>
            Service Date *
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              max={getTodayDateString()}
              required
            />
          </label>

          <label>
            Service Cost (₹) *
            <input
              type="number"
              name="cost"
              value={form.cost}
              onChange={handleChange}
              min="0"
              step="0.01"
              placeholder="e.g. 2500"
              required
            />
          </label>

          <label>
            Odometer Reading (km) *
            <input
              type="number"
              name="odometer"
              value={form.odometer}
              onChange={handleChange}
              min="0"
              step="1"
              placeholder="e.g. 15000"
              required
            />
          </label>

          <label>
            Workshop / Service Center
            <input
              name="workshop"
              value={form.workshop}
              onChange={handleChange}
              placeholder="e.g. ABC Motors"
            />
          </label>

          <label className="full-width">
            Additional Notes
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Describe the maintenance or repairs..."
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
              {editingId ? "Save Changes" : "Save Service Record"}
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

      <section className="service-list-section">
        <h2>Service Records</h2>

        {records.length === 0 ? (
          <div className="content-card empty-vehicles">
            <span>🔧</span>
            <h3>No service records yet</h3>
            <p>Your saved maintenance records will appear here.</p>
          </div>
        ) : (
          <div className="service-records">
            {records.map((record) => (
              <article className="content-card service-record" key={record.id}>
                <div className="service-record-header">
                  <div>
                    <h3>{record.serviceType}</h3>
                    <p>{record.registration}</p>
                  </div>
                  <strong>
                    ₹{record.cost.toLocaleString("en-IN")}
                  </strong>
                </div>

                <div className="service-record-details">
                  <p>
                    <span>Date</span>
                    <strong>{record.date}</strong>
                  </p>
                  <p>
                    <span>Odometer</span>
                    <strong>
                      {record.odometer.toLocaleString("en-IN")} km
                    </strong>
                  </p>
                  {record.workshop && (
                    <p>
                      <span>Workshop</span>
                      <strong>{record.workshop}</strong>
                    </p>
                  )}
                </div>

                {record.notes && <p className="service-notes">{record.notes}</p>}

                <div className="vehicle-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => startEditing(record)}
                  >
                    Edit Record
                  </button>
                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => deleteService(record.id)}
                  >
                    Delete Record
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default Services;
