import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { uploadReport } from "@/lib/api";
import { useState, useRef } from "react";

export default function Home() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 30MB",
        variant: "destructive",
      });
      return;
    }

    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const report = await uploadReport(file);
      toast({
        title: "Upload successful",
        description: "Your report is being processed",
      });
      setLocation(`/report/${report.id}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload failed';
      toast({
        title: "Upload Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="pt-6 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-4">
            TCFD Report Generator
          </h1>
          <p className="text-muted-foreground mb-8">
            Upload your sustainability report to generate a TCFD-compliant analysis
          </p>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Supported formats: PDF (Sustainability Report)
            </p>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <Button
                size="lg"
                className="w-64"
                disabled={isUploading}
                onClick={handleButtonClick}
              >
                <Upload className="mr-2 h-4 w-4" />
                {isUploading ? "Uploading..." : "Upload Report"}
              </Button>
            </div>
          </div>
          {isUploading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="space-y-4 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">Processing your report...</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}