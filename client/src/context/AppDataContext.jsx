import { useEffect, useState } from "react";
import { AppDataContext } from "./AppDataContext.js";
import { api } from "../utils/api.js";

const collectionNames = ["vehicles", "services", "reminders", "expenses"];

function normalizeRegistration(registration) {
  return registration.trim().toUpperCase();
}

export function AppDataProvider({ children }) {
  const [vehicles, setVehicles] = useState([]);
  const [services, setServices] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    let active = true;
    let retryTimer;
    let retryDelay = 5000;

    async function loadAccountData() {
      try {
        const records = Object.fromEntries(
          await Promise.all(
            collectionNames.map(async (name) => [
              name,
              await api.getCollection(name),
            ])
          )
        );
        if (!active) return;
        setVehicles(records.vehicles);
        setServices(records.services);
        setReminders(records.reminders);
        setExpenses(records.expenses);
        setStatusError("");
      } catch (error) {
        if (!active) return;
        setStatusError(`Could not load your saved records. ${error.message}`);
        if (
          error.status === 502 ||
          error.status === 503 ||
          error instanceof TypeError
        ) {
          retryTimer = window.setTimeout(() => {
            void loadAccountData();
          }, retryDelay);
          retryDelay = Math.min(retryDelay * 2, 30000);
        }
      }
    }

    void loadAccountData();
    return () => {
      active = false;
      window.clearTimeout(retryTimer);
    };
  }, []);

  async function createRecord(collection, record) {
    setStatusError("");
    try {
      return await api.create(collection, record);
    } catch (error) {
      setStatusError(`Could not save ${collection}: ${error.message}`);
      throw error;
    }
  }

  async function updateRecord(collection, id, record) {
    setStatusError("");
    try {
      const saved = await api.update(collection, id, record);
      const setters = {
        vehicles: setVehicles,
        services: setServices,
        reminders: setReminders,
        expenses: setExpenses,
      };
      setters[collection]?.((previous) =>
        previous.map((item) => (item.id === saved.id ? saved : item))
      );
      return saved;
    } catch (error) {
      setStatusError(`Could not update ${collection}: ${error.message}`);
      throw error;
    }
  }

  async function deleteRecord(collection, id) {
    setStatusError("");
    try {
      await api.remove(collection, id);
      return true;
    } catch (error) {
      setStatusError(`Could not delete ${collection}: ${error.message}`);
      return false;
    }
  }

  async function addVehicle(vehicle) {
    const registration = normalizeRegistration(vehicle.registration);
    if (
      vehicles.some(
        (item) =>
          normalizeRegistration(item.registration ?? "") === registration
      )
    ) {
      return false;
    }

    const saved = await createRecord("vehicles", { ...vehicle, registration });
    setVehicles((previous) => [...previous, saved]);
    return true;
  }

  async function deleteVehicle(id) {
    const vehicle = vehicles.find((item) => item.id === id);
    if (!vehicle || !(await deleteRecord("vehicles", id))) return;

    const registration = normalizeRegistration(vehicle.registration ?? "");
    setVehicles((previous) => previous.filter((item) => item.id !== id));
    setServices((previous) =>
      previous.filter(
        (item) =>
          normalizeRegistration(item.registration ?? "") !== registration
      )
    );
    setReminders((previous) =>
      previous.filter(
        (item) => normalizeRegistration(item.vehicle ?? "") !== registration
      )
    );
  }

  async function addService(service) {
    if (
      !vehicles.some(
        (vehicle) =>
          normalizeRegistration(vehicle.registration ?? "") ===
          normalizeRegistration(service.registration)
      )
    ) {
      return false;
    }

    const saved = await createRecord("services", service);
    setServices((previous) => [saved, ...previous]);
    return true;
  }

  async function deleteService(id) {
    if (await deleteRecord("services", id)) {
      setServices((previous) => previous.filter((service) => service.id !== id));
    }
  }

  async function addReminder(reminder) {
    if (
      !vehicles.some(
        (vehicle) =>
          normalizeRegistration(vehicle.registration ?? "") ===
          normalizeRegistration(reminder.vehicle)
      )
    ) {
      return false;
    }

    const saved = await createRecord("reminders", reminder);
    setReminders((previous) => [...previous, saved]);
    return true;
  }

  async function deleteReminder(id) {
    if (await deleteRecord("reminders", id)) {
      setReminders((previous) =>
        previous.filter((reminder) => reminder.id !== id)
      );
    }
  }

  async function addExpense(expense) {
    const saved = await createRecord("expenses", expense);
    setExpenses((previous) => [...previous, saved]);
  }

  async function deleteExpense(id) {
    if (await deleteRecord("expenses", id)) {
      setExpenses((previous) =>
        previous.filter((expense) => expense.id !== id)
      );
    }
  }

  const value = {
    vehicles,
    services,
    reminders,
    expenses,
    addVehicle,
    deleteVehicle,
    addService,
    deleteService,
    addReminder,
    deleteReminder,
    addExpense,
    deleteExpense,
    updateRecord,
    statusError,
  };

  return (
    <AppDataContext.Provider value={value}>
      {statusError && (
        <p className="form-error" role="alert">
          {statusError}
        </p>
      )}
      {children}
    </AppDataContext.Provider>
  );
}
