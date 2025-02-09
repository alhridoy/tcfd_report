import { apiRequest } from "./queryClient";
import type { Report } from "@shared/schema";

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5001';

export async function uploadReport(file: File): Promise<Report> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`Upload failed: ${res.statusText}`);
  }

  return res.json();
}

export async function getReport(id: number): Promise<Report> {
  const res = await fetch(`${API_BASE}/api/reports/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch report: ${res.statusText}`);
  }
  return res.json();
}
