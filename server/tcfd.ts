import OpenAI from "openai";

export class TcfdReportGenerator {
  private client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }
    this.client = new OpenAI({ apiKey });
  }

  private async get_completion(context: string, question: string, max_tokens: number = 1000): Promise<string> {
    const prompt = `You are a sustainability reporting expert specializing in TCFD reports. 
    Based on the provided context, answer the following question professionally and accurately.

    Context: ${context}

    Question: ${question}

    Please provide a detailed, well-structured response.`;

    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: "You are a sustainability reporting expert specializing in TCFD reports." },
          { role: "user", content: prompt }
        ],
        max_tokens,
        temperature: 0.1,
      });

      return response.choices[0].message.content || "";
    } catch (error: any) {
      if (error.status === 429) {
        console.error("OpenAI API rate limit exceeded:", error);
        throw new Error("Rate limit exceeded. Please try again in a few minutes or contact support to increase your API quota.");
      }
      if (error.status === 401) {
        console.error("OpenAI API authentication error:", error);
        throw new Error("Invalid API key. Please check your OpenAI API key configuration.");
      }
      console.error("Error getting completion:", error);
      throw new Error("Failed to generate report section. Please try again later.");
    }
  }

  // Verify API key before starting report generation
  async verifyApiKey(): Promise<boolean> {
    try {
      await this.client.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [{ role: "user", content: "Test message" }],
        max_tokens: 5
      });
      return true;
    } catch (error: any) {
      console.error("API key verification failed:", error);
      if (error.status === 401) {
        throw new Error("Invalid API key. Please check your OpenAI API key configuration.");
      }
      return false;
    }
  }

  async generate_report(document_content: string): Promise<{
    Governance: Record<string, string>;
    Strategy: Record<string, string>;
    Risk_Management: Record<string, string>;
    Metrics_and_Targets: Record<string, string>;
  }> {
    // Verify API key before starting
    await this.verifyApiKey();

    const tcfd_sections = {
      Governance: {
        Q1: "How does the company's board oversee climate-related risks and opportunities?",
        Q2: "What is the role of management in assessing and managing climate-related risks and opportunities?"
      },
      Strategy: {
        Q1: "What are the most relevant climate-related risks and opportunities identified over the short, medium, and long term?",
        Q2: "How do climate-related risks and opportunities impact the organisation's businesses strategy and financial planning?",
        Q3: "How resilient is the organisation's strategy considering different climate-related scenarios?"
      },
      Risk_Management: {
        Q1: "What processes are used to identify and assess climate-related risks?",
        Q2: "How does the organisation manage climate-related risks?",
        Q3: "How are climate-related risks integrated into overall risk management?"
      },
      Metrics_and_Targets: {
        Q1: "What metrics are used to assess climate-related risks and opportunities?",
        Q2: "What are the Scope 1, 2, and 3 greenhouse gas emissions?",
        Q3: "What targets are used to manage climate-related risks and opportunities?"
      }
    };

    console.log("Starting report generation...");
    const report: Record<string, Record<string, string>> = {};

    for (const [section, questions] of Object.entries(tcfd_sections)) {
      console.log(`Generating ${section} section...`);
      const section_responses: Record<string, string> = {};

      try {
        for (const [q_id, question] of Object.entries(questions)) {
          console.log(`Processing ${section} - ${q_id}...`);
          const response = await this.get_completion(document_content, question);
          section_responses[q_id] = response;
          console.log(`Completed ${section} - ${q_id}`);
        }

        report[section] = section_responses;
        console.log(`Completed ${section} section`);
      } catch (error) {
        console.error(`Error generating ${section} section:`, error);
        throw error; // Re-throw to be handled by the routes
      }
    }

    console.log("Report generation completed");
    return report as {
      Governance: Record<string, string>;
      Strategy: Record<string, string>;
      Risk_Management: Record<string, string>;
      Metrics_and_Targets: Record<string, string>;
    };
  }
}