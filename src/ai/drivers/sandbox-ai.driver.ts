import { Injectable } from '@nestjs/common';
import { AiDriver } from './ai-driver.interface';

@Injectable()
export class SandboxAiDriver implements AiDriver {
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
    // Simulate AI processing with deterministic logic
    const lowerText = text.toLowerCase();

    // Category detection using keyword matching
    const categories = [];
    const categoryKeywords = {
      SPEED_ISSUE: ['slow', 'speed', 'lag', 'buffering'],
      CONNECTIVITY_ISSUE: ['no internet', 'disconnected', 'offline', 'connection'],
      BILLING_INQUIRY: ['bill', 'payment', 'invoice', 'charge', 'price'],
      HARDWARE_ISSUE: ['router', 'onu', 'modem', 'device', 'hardware'],
      INSTALLATION_REQUEST: ['install', 'setup', 'new connection'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((keyword) => lowerText.includes(keyword))) {
        categories.push(category);
      }
    }

    // Sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'thanks', 'working'];
    const negativeWords = ['bad', 'terrible', 'awful', 'angry', 'frustrated', 'not working', 'broken'];

    let sentimentScore = 0;
    positiveWords.forEach((word) => {
      if (lowerText.includes(word)) sentimentScore++;
    });
    negativeWords.forEach((word) => {
      if (lowerText.includes(word)) sentimentScore--;
    });

    const sentiment = 
      sentimentScore > 0 ? 'positive' : 
      sentimentScore < 0 ? 'negative' : 'neutral';

    // Generate summary
    const summary = text.length > 150 ? text.substring(0, 150) + '...' : text;

    // Generate suggestions based on categories
    const suggestions = [];
    if (categories.includes('SPEED_ISSUE')) {
      suggestions.push('Check for bandwidth-intensive applications');
      suggestions.push('Restart your ONU and test with wired connection');
      suggestions.push('Verify no physical damage to fiber cable');
    }
    if (categories.includes('CONNECTIVITY_ISSUE')) {
      suggestions.push('Check all physical connections');
      suggestions.push('Verify ONU power and link lights');
      suggestions.push('Test with different device');
    }
    if (categories.includes('BILLING_INQUIRY')) {
      suggestions.push('Check invoice details in customer portal');
      suggestions.push('Verify payment method and transaction status');
      suggestions.push('Contact billing department for detailed breakdown');
    }

    // Add generic suggestions if none found
    if (suggestions.length === 0) {
      suggestions.push('Provide more details about the issue');
      suggestions.push('Include any error messages or codes');
      suggestions.push('Specify when the issue started');
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
    // Generate a structured resolution script
    const lowerText = ticketText.toLowerCase();
    const scriptLines = [];

    // Header
    scriptLines.push('=== AUTO-GENERATED RESOLUTION SCRIPT ===');
    scriptLines.push(`Customer: ${customerContext.name || 'N/A'}`);
    scriptLines.push(`Account: ${customerContext.id || 'N/A'}`);
    scriptLines.push(`Issue: ${ticketText.substring(0, 50)}${ticketText.length > 50 ? '...' : ''}`);
    scriptLines.push('');

    // Issue analysis
    scriptLines.push('--- ISSUE ANALYSIS ---');
    if (lowerText.includes('slow') || lowerText.includes('speed')) {
      scriptLines.push('Issue Type: SPEED_PERFORMANCE');
      scriptLines.push('Likely Causes:');
      scriptLines.push('  - Bandwidth congestion');
      scriptLines.push('  - Signal degradation');
      scriptLines.push('  - Device limitations');
    } else if (lowerText.includes('no internet') || lowerText.includes('disconnected')) {
      scriptLines.push('Issue Type: CONNECTIVITY_LOSS');
      scriptLines.push('Likely Causes:');
      scriptLines.push('  - Physical connection issue');
      scriptLines.push('  - ONU/OLT port failure');
      scriptLines.push('  - Authentication problem');
    } else {
      scriptLines.push('Issue Type: GENERAL_ISSUE');
      scriptLines.push('Likely Causes:');
      scriptLines.push('  - Configuration error');
      scriptLines.push('  - Service interruption');
    }
    scriptLines.push('');

    // Network context
    if (networkContext.fiberDistance) {
      scriptLines.push('--- NETWORK CONTEXT ---');
      scriptLines.push(`Fiber Distance: ${networkContext.fiberDistance.toFixed(2)} meters`);
      if (networkContext.fiberDistance > 10000) {
        scriptLines.push('Note: Long fiber runs may cause signal attenuation');
      }
    }

    if (networkContext.signalStrength) {
      scriptLines.push(`Signal Strength: ${networkContext.signalStrength} dBm`);
      if (networkContext.signalStrength < -27) {
        scriptLines.push('Warning: Signal strength is below optimal threshold (-27 dBm)');
      }
    }
    scriptLines.push('');

    // Troubleshooting steps
    scriptLines.push('--- TROUBLESHOOTING STEPS ---');
    scriptLines.push('1. Verify physical connections and power cycle ONU');
    scriptLines.push('2. Check for service outages in the area');
    scriptLines.push('3. Test with different device to isolate issue');

    if (lowerText.includes('slow') || lowerText.includes('speed')) {
      scriptLines.push('4. Run speed test and check for packet loss');
      scriptLines.push('5. Verify no background downloads/updates');
    } else if (lowerText.includes('no internet') || lowerText.includes('disconnected')) {
      scriptLines.push('4. Check ONU link lights (PON light should be solid)');
      scriptLines.push('5. Test OLT port status and fiber continuity');
    }
    scriptLines.push('');

    // Escalation path
    scriptLines.push('--- ESCALATION PATH ---');
    if (networkContext.fiberDistance && networkContext.fiberDistance > 10000) {
      scriptLines.push('Priority: HIGH (Long fiber run + performance issue)');
      scriptLines.push('Action: Dispatch field team to check fiber quality and joints');
    } else if (networkContext.signalStrength && networkContext.signalStrength < -27) {
      scriptLines.push('Priority: HIGH (Poor signal quality detected)');
      scriptLines.push('Action: Schedule ONU replacement or fiber inspection');
    } else {
      scriptLines.push('Priority: MEDIUM');
      scriptLines.push('Action: Remote troubleshooting first, escalate if unresolved');
    }

    // Footer
    scriptLines.push('');
    scriptLines.push('--- NOTES ---');
    scriptLines.push('This script was auto-generated by AI Copilot');
    scriptLines.push('Always verify information before acting');
    scriptLines.push('Update this script with actual findings');

    const script = scriptLines.join('\n');

    // Calculate confidence based on available context
    let confidence = 0.6;
    if (customerContext && Object.keys(customerContext).length > 0) confidence += 0.1;
    if (networkContext && Object.keys(networkContext).length > 0) confidence += 0.2;
    if (categories.length > 0) confidence += 0.1;

    return {
      success: true,
      script,
      confidence: Math.min(confidence, 0.95),
    };
  }
}
