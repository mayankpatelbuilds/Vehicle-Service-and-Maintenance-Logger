export function loadData(key, initialData = []) {
  try {
    const savedData = localStorage.getItem(key);

    if (savedData === null) {
      return initialData;
    }

    return JSON.parse(savedData);
  } catch (error) {
    console.error("Error loading data:", error);
    return initialData;
  }
}

export function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving data:", error);
  }
}