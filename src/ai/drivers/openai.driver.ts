import { Injectable } from '@nestjs/common';
import { AiDriver } from './ai-driver.interface';

@Injectable()
export class OpenAiDriver implements AiDriver {
  async analyzeText(
    text: string,
    context?: Record<string, any>,
  ): Promise<{
    success: boolean;
    categories: string[];
    sentiment: string;
    summary: string;
    suggestions: string[];
    error?: string;
  }> {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 300));

    // In a real implementation, this would call the OpenAI API
    // For now, we'll simulate a response based on the text content
    const lowerText = text.toLowerCase();

    // Determine categories
    const categories = [];
    if (lowerText.includes('slow') || lowerText.includes('speed')) {
      categories.push('SPEED_ISSUE');
    }
    if (lowerText.includes('no internet') || lowerText.includes('disconnected')) {
      categories.push('CONNECTIVITY_ISSUE');
    }
    if (lowerText.includes('bill') || lowerText.includes('payment') || lowerText.includes('invoice')) {
      categories.push('BILLING_INQUIRY');
    }
    if (lowerText.includes('router') || lowerText.includes('onu') || lowerText.includes('hardware')) {
      categories.push('HARDWARE_ISSUE');
    }

    // Determine sentiment
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'thanks'];
    const negativeWords = ['bad', 'terrible', 'awful', 'angry', 'frustrated', 'not working'];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach((word) => {
      if (lowerText.includes(word)) positiveCount++;
    });

    negativeWords.forEach((word) => {
      if (lowerText.includes(word)) negativeCount++;
    });

    const sentiment = 
      positiveCount > negativeCount ? 'positive' : 
      negativeCount > positiveCount ? 'negative' : 'neutral';

    // Generate summary
    const summary = `Customer reported: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`;

    // Generate suggestions
    const suggestions = [];
    if (categories.includes('SPEED_ISSUE')) {
      suggestions.push('Check signal strength on ONU');
      suggestions.push('Verify no bandwidth hogging devices');
      suggestions.push('Test with direct connection to ONU');
    }
    if (categories.includes('CONNECTIVITY_ISSUE')) {
      suggestions.push('Check physical connections');
      suggestions.push('Verify OLT port status');
      suggestions.push('Test with different ONU');
    }

    return {
      success: true,
      categories,
      sentiment,
      summary,
      suggestions,
    };
  }

  async generateResolutionScript(
    ticketText: string,
    customerContext: Record<string, any>,
    networkContext: Record<string, any>,
  ): Promise<{
    success: boolean;
    script: string;
    confidence: number;
    error?: string;
  }> {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Generate a resolution script based on the context
    const lowerText = ticketText.toLowerCase();
    const scriptParts = [];

    // Greeting
    scriptParts.push(`Dear ${customerContext.name || 'Customer'},`);
    scriptParts.push('');
    scriptParts.push('Thank you for contacting our support team regarding your issue.');
    scriptParts.push('');

    // Issue acknowledgment
    if (lowerText.includes('slow') || lowerText.includes('speed')) {
      scriptParts.push('We understand you are experiencing slow internet speeds.');
    } else if (lowerText.includes('no internet') || lowerText.includes('disconnected')) {
      scriptParts.push('We understand you are experiencing connectivity issues.');
    } else {
      scriptParts.push('We understand you are experiencing issues with your service.');
    }
    scriptParts.push('');

    // Troubleshooting steps
    scriptParts.push('To resolve this issue, please follow these steps:');
    scriptParts.push('');

    if (lowerText.includes('slow') || lowerText.includes('speed')) {
      scriptParts.push('1. Restart your ONU/Router by unplugging the power for 30 seconds');
      scriptParts.push('2. Connect your computer directly to the ONU using an Ethernet cable');
      scriptParts.push('3. Run a speed test at https://speedtest.net and share the results');
      scriptParts.push('4. Check for any background downloads or streaming services');
    } else if (lowerText.includes('no internet') || lowerText.includes('disconnected')) {
      scriptParts.push('1. Check all physical connections to your ONU');
      scriptParts.push('2. Verify the power light on your ONU is solid green');
      scriptParts.push('3. Try connecting with a different device');
      scriptParts.push('4. If possible, test with a different Ethernet cable');
    }

    // Network-specific suggestions
    if (networkContext.fiberDistance && networkContext.fiberDistance > 5000) {
      scriptParts.push(`Note: Your connection travels ${Math.round(networkContext.fiberDistance)} meters, which may affect performance.`);
    }

    if (networkContext.signalStrength && networkContext.signalStrength < -25) {
      scriptParts.push(`Note: Your signal strength is ${networkContext.signalStrength} dBm, which is below optimal levels.`);
    }

    // Closing
    scriptParts.push('');
    scriptParts.push('If the issue persists after trying these steps, please reply to this message with:');
    scriptParts.push('- Results of any tests you performed');
    scriptParts.push('- Any error messages you see');
    scriptParts.push('- The best time to contact you for further assistance');
    scriptParts.push('');
    scriptParts.push('We will escalate this to our field team if needed.');
    scriptParts.push('');
    scriptParts.push('Best regards,');
    scriptParts.push('NetHelper Support Team');

    const script = scriptParts.join('\n');

    // Calculate confidence based on how specific the script is
    const confidence = 
      scriptParts.length > 10 ? 0.9 : 
      scriptParts.length > 5 ? 0.7 : 0.5;

    return {
      success: true,
      script,
      confidence,
    };
  }
}
