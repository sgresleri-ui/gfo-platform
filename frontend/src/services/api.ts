const API_URL = "http://localhost:3000";

export async function getDashboard() {

    const response = await fetch(`${API_URL}/dashboard`);

    if (!response.ok)
        throw new Error("Unable to load dashboard");

    return response.json();

}

export async function analyzeWorkbook() {

    const response = await fetch(`${API_URL}/import`, {
        method: "POST"
    });

    if (!response.ok)
        throw new Error("Unable to analyze workbook");

    return response.json();

}