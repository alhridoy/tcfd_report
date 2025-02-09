import { reports, type Report, type InsertReport } from "@shared/schema";

export interface IStorage {
  createReport(report: InsertReport): Promise<Report>;
  getReport(id: number): Promise<Report | undefined>;
  updateReport(id: number, content: Report['content'] | null, error?: string): Promise<Report>;
}

export class MemStorage implements IStorage {
  private reports: Map<number, Report>;
  private currentId: number;

  constructor() {
    this.reports = new Map();
    this.currentId = 1;
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const id = this.currentId++;
    const report: Report = {
      ...insertReport,
      id,
      status: "processing",
      content: null,
      error: null,
    };
    this.reports.set(id, report);
    return report;
  }

  async getReport(id: number): Promise<Report | undefined> {
    return this.reports.get(id);
  }

  async updateReport(id: number, content: Report['content'] | null, error?: string): Promise<Report> {
    const report = await this.getReport(id);
    if (!report) throw new Error("Report not found");

    const updatedReport: Report = {
      ...report,
      status: content ? "completed" : error ? "error" : "processing",
      content: content || null,
      error: error || null,
    };
    this.reports.set(id, updatedReport);
    return updatedReport;
  }
}

export const storage = new MemStorage();