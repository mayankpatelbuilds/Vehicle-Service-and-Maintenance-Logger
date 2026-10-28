import { useState } from "react";
import { useAppData } from "../hooks/useAppData.js";

function Vehicles() {
  const { vehicles, addVehicle, deleteVehicle, updateRecord } = useAppData();
  const emptyForm = {
    brand: "",
    model: "",
    year: "",
    registration: "",
    fuel: "Petrol",
    mileage: "",
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

    const registration = form.registration.trim().toUpperCase();

    if (
      !form.brand.trim() ||
      !form.model.trim() ||
      !form.year ||
      !registration ||
      form.mileage === ""
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    const year = Number(form.year);
    const mileage = Number(form.mileage);
    if (
      !Number.isInteger(year) ||
      year < 1950 ||
      year > new Date().getFullYear() + 1 ||
      !Number.isFinite(mileage) ||
      mileage < 0
    ) {
      setError("Please enter a valid year and non-negative mileage.");
      return;
    }

    const newVehicle = {
      ...form,
      brand: form.brand.trim(),
      model: form.model.trim(),
      registration,
      year,
      mileage,
    };

    try {
      if (editingId) {
        await updateRecord("vehicles", editingId, newVehicle);
        setEditingId("");
      } else if (!(await addVehicle({ ...newVehicle, id: crypto.randomUUID() }))) {
        setError("This registration number is already added.");
        return;
      }
    } catch (requestError) {
      setError(requestError.message);
      return;
    }

    setForm(emptyForm);
  }

  function startEditing(vehicle) {
    setEditingId(vehicle.id);
    setForm({
      brand: vehicle.brand,
      model: vehicle.model,
      year: String(vehicle.year),
      registration: vehicle.registration,
      fuel: vehicle.fuel,
      mileage: String(vehicle.mileage),
    });
    setError("");
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <h1>My Vehicles</h1>
          <p>Manage your cars and bikes in one place.</p>
        </div>

        <span className="vehicle-count">
          {vehicles.length} {vehicles.length === 1 ? "Vehicle" : "Vehicles"}
        </span>
      </div>

      <div className="content-card vehicle-form-card">
        <h2>{editingId ? "Edit Vehicle" : "+ Add a New Vehicle"}</h2>
        <p className="form-description">
          Enter your vehicle details below.
        </p>

        <form onSubmit={handleSubmit} className="vehicle-form">
          <label>
            Brand *
            <input
              name="brand"
              value={form.brand}
              onChange={handleChange}
              placeholder="e.g. Hyundai"
              required
            />
          </label>

          <label>
            Model *
            <input
              name="model"
              value={form.model}
              onChange={handleChange}
              placeholder="e.g. Creta"
              required
            />
          </label>

          <label>
            Manufacturing Year *
            <input
              type="number"
              name="year"
              value={form.year}
              onChange={handleChange}
              min="1950"
              max={new Date().getFullYear() + 1}
              placeholder="e.g. 2024"
              required
            />
          </label>

          <label>
            Registration Number *
            <input
              name="registration"
              value={form.registration}
              onChange={handleChange}
              placeholder="e.g. UP25AB1234"
              required
            />
          </label>

          <label>
            Fuel Type *
            <select
              name="fuel"
              value={form.fuel}
              onChange={handleChange}
            >
              <option>Petrol</option>
              <option>Diesel</option>
              <option>CNG</option>
              <option>Electric</option>
              <option>Hybrid</option>
            </select>
          </label>

          <label>
            Current Mileage (km) *
            <input
              type="number"
              name="mileage"
              value={form.mileage}
              onChange={handleChange}
              min="0"
              step="1"
              placeholder="e.g. 12500"
              required
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="form-actions">
            <button type="submit" className="primary-button">
              {editingId ? "Save Changes" : "+ Add Vehicle"}
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

      <section className="vehicle-list-section">
        <h2>Registered Vehicles</h2>

        {vehicles.length === 0 ? (
          <div className="content-card empty-vehicles">
            <span>🚘</span>
            <h3>No vehicles added yet</h3>
            <p>Use the form above to register your first vehicle.</p>
          </div>
        ) : (
          <div className="vehicles-grid">
            {vehicles.map((vehicle) => (
              <article className="content-card vehicle-card" key={vehicle.id}>
                <div className="vehicle-card-top">
                  <span className="vehicle-emoji">🚘</span>
                  <span className="fuel-badge">{vehicle.fuel}</span>
                </div>

                <h3>{vehicle.brand} {vehicle.model}</h3>
                <p className="registration-number">
                  {vehicle.registration}
                </p>

                <div className="vehicle-details">
                  <p>
                    <span>Year</span>
                    <strong>{vehicle.year}</strong>
                  </p>
                  <p>
                    <span>Mileage</span>
                    <strong>{vehicle.mileage.toLocaleString("en-IN")} km</strong>
                  </p>
                </div>

                <div className="vehicle-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => startEditing(vehicle)}
                  >
                    Edit Vehicle
                  </button>
                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => deleteVehicle(vehicle.id)}
                  >
                    Delete Vehicle
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

export default Vehicles;
