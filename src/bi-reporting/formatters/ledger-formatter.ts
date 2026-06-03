// @ts-nocheck
import { Injectable } from '@nestjs/common';

@Injectable()
export class LedgerFormatter {
  format(data: any[], fields: string[]): string {
    if (data.length === 0 || fields.length === 0) {
      return '';
    }

    // Build header row with tab separation
    const header = fields.join('\t');
    const rows = data.map(row => {
      return fields.map(field => {
        const value = row[field];
        // Escape tabs and newlines
        if (typeof value === 'string') {
          return value.replace(/\t/g, ' ').replace(/\n/g, ' ');
        }
        return value !== null && value !== undefined ? String(value) : '';
      }).join('\t');
    });

    return [header, ...rows].join('\n');
  }

  streamFormat(data: any[], fields: string[]): string {
    return this.format(data, fields);
  }
}
