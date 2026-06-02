export interface AiDriver {
  analyzeText(
    text: string,
    context?: Record<string, any>,
  ): Promise<{
    success: boolean;
    categories: string[];
    sentiment: string;
    summary: string;
    suggestions: string[];
    error?: string;
  }>;

  generateResolutionScript(
    ticketText: string,
    customerContext: Record<string, any>,
    networkContext: Record<string, any>,
  ): Promise<{
    success: boolean;
    script: string;
    confidence: number;
    error?: string;
  }>;
}
