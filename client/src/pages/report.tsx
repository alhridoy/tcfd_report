import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import type { Report } from "@shared/schema";
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar } from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ReportPage({ params }: { params: { id: string } }) {
  const { toast } = useToast();

  const { data: report, isLoading } = useQuery<Report>({
    queryKey: [`/api/reports/${params.id}`],
    refetchInterval: (data) => {
      console.log("Current report status:", data?.status);
      console.log("Current report content:", data?.content);
      if (data?.status === "processing") return 1000;
      return false;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!report) {
    return <div>Report not found</div>;
  }

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(report.content, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tcfd-report-${report.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (report.status === "error") {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Error Generating Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{report.error}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Please try again later or contact support if the issue persists.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getProgressValue = () => {
    if (report.status === "completed") return 100;
    if (report.status === "error") return 0;

    // Calculate progress based on content
    if (report.content) {
      const sections = ["Governance", "Strategy", "Risk_Management", "Metrics_and_Targets"];
      const totalQuestions = 11; // Total number of questions across all sections
      const completedQuestions = Object.values(report.content).reduce((total, section) => 
        total + Object.keys(section).length, 0);
      
      return Math.round((completedQuestions / totalQuestions) * 100);
    }

    return 5; // Initial progress when starting
  };

  const renderSummaryChart = () => {
    if (!report.content) return null;
    
    const sections = Object.entries(report.content);
    const data = sections.map(([section, questions]) => ({
      name: section.replace(/_/g, ' '),
      count: Object.keys(questions).length
    }));

    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Report Coverage</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>TCFD Report Analysis</CardTitle>
          {report.status === "completed" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleDownload('json')}>
                  JSON Format
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                  PDF Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload('csv')}>
                  CSV Summary
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        <CardContent>
          {report.status === "processing" ? (
            <div className="text-center py-12 space-y-4">
              <Progress value={getProgressValue()} className="w-full" />
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p className="text-muted-foreground">
                  Generating TCFD report... {getProgressValue()}%
                </p>
              </div>
            </div>
          ) : (
            <>
              <Accordion type="single" collapsible className="w-full">
                {Object.entries(report.content || {}).map(([section, questions]) => (
                  <AccordionItem key={section} value={section}>
                    <AccordionTrigger className="text-lg font-semibold">
                      {section.replace(/_/g, " ")}
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      {Object.entries(questions).map(([id, response]) => (
                        <div key={id} className="space-y-2">
                          <h4 className="font-medium">{id}</h4>
                          <p className="text-muted-foreground whitespace-pre-wrap">
                            {response}
                          </p>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
              {renderSummaryChart()}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}