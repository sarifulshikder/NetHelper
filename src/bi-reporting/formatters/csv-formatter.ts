// @ts-nocheck
import { Injectable } from '@nestjs/common';

@Injectable()
export class CsvFormatter {
  format(data: any[], fields: string[]): string {
    if (data.length === 0 || fields.length === 0) {
      return '';
    }

    // Build header row
    const header = fields.join(',');
    const rows = data.map(row => {
      return fields.map(field => {
        const value = row[field];
        // Escape quotes and wrap in quotes if contains commas or quotes
        if (typeof value === 'string') {
          const escaped = value.replace(/\"/g, '""');
          return value.includes(',') || value.includes('"') ? `"${escaped}"` : escaped;
        }
        return value !== null && value !== undefined ? String(value) : '';
      }).join(',');
    });

    return [header, ...rows].join('\n');
  }

  streamFormat(data: any[], fields: string[]): string {
    return this.format(data, fields);
  }
}
