import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { TcfdReportGenerator } from "./tcfd";
import { insertReportSchema } from "@shared/schema";
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF files are allowed'));
      return;
    }
    cb(null, true);
  }
});

export function registerRoutes(app: Express): Server {
  app.post("/api/reports", upload.single("file"), async (req, res) => {
    console.log("Received file upload request");
    try {
      if (!req.file) {
        console.log("No file uploaded");
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log("File received:", req.file.originalname);

      const validatedData = insertReportSchema.parse({
        filename: req.file.originalname
      });

      const report = await storage.createReport(validatedData);
      console.log("Report created with ID:", report.id);

      // Process report in background
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key not configured. Please configure your API key in the project settings.");
      }

      console.log("Initializing TcfdReportGenerator");
      const generator = new TcfdReportGenerator();

      // Extract text from PDF
      try {
        const pdfData = await pdfParse(req.file.buffer);
        console.log("PDF text extracted, length:", pdfData.text.length);

        // First verify the API key
        await generator.verifyApiKey().catch(async (error) => {
          console.error("API key verification failed:", error);
          await storage.updateReport(report.id, null, "API key verification failed. Please check your OpenAI API key configuration.");
          throw error;
        });

        generator.generate_report(pdfData.text)
          .then(async (content) => {
            console.log("Report generated, updating storage");
            await storage.updateReport(report.id, content);
            // Force status to completed
            const updatedReport = await storage.getReport(report.id);
            if (updatedReport) {
              updatedReport.status = "completed";
              await storage.updateReport(report.id, updatedReport.content);
            }
          })
          .catch(async (error: Error) => {
            console.error('Error generating report:', error);
            await storage.updateReport(report.id, null, error.message);
          });

        res.json(report);
      } catch (error) {
        console.error("PDF parsing error:", error);
        throw new Error("Failed to parse PDF file. Please ensure the file is not corrupted and try again.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      const message = error instanceof Error ? error.message : 'Upload failed';
      res.status(400).json({ message });
    }
  });

  app.get("/api/reports/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid report ID" });
      }

      const report = await storage.getReport(id);

      if (!report) {
        return res.status(404).json({ message: "Report not found" });
      }

      res.json(report);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      res.status(500).json({ message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}