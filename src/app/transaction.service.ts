import { Injectable } from '@angular/core';

export interface Transaction {
  id: string;
  date: Date;
  amount: number;
  type: 'savings' | 'spend';
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private storageKey = 'savings-app-transactions';

  getTransactions(): Transaction[] {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return [];
    
    const transactions = JSON.parse(stored);
    return transactions.map((t: any) => ({
      ...t,
      date: new Date(t.date)
    }));
  }

  addTransaction(amount: number, type: 'savings' | 'spend', description?: string): void {
    const transactions = this.getTransactions();
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      date: new Date(),
      amount,
      type,
      description: description?.trim() || undefined
    };
    transactions.push(newTransaction);
    localStorage.setItem(this.storageKey, JSON.stringify(transactions));
  }

  clearTransactions(): void {
    localStorage.removeItem(this.storageKey);
  }

  exportToCSV(): string {
    const transactions = this.getTransactions();
    const headers = ['Date', 'Amount', 'Type', 'Description'];
    const rows = transactions.map(t => [
      t.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      t.amount.toString(),
      t.type,
      t.description || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape commas and quotes in CSV
        if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(','))
    ].join('\n');
    
    return csvContent;
  }

  importFromCSV(csvContent: string): { success: boolean; message: string; count: number } {
    try {
      const lines = csvContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        return { success: false, message: 'CSV file must have at least a header and one data row', count: 0 };
      }

      // Skip header row
      const dataLines = lines.slice(1);
      const transactions: Transaction[] = [];
      const existingTransactions = this.getTransactions();
      const existingIds = new Set(existingTransactions.map(t => t.id));

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i].trim();
        if (!line) continue;

        const columns = this.parseCSVLine(line);
        if (columns.length < 3) {
          continue; // Skip invalid rows
        }

        const [dateStr, amountStr, typeStr, descriptionStr] = columns;
        const date = new Date(dateStr);
        const amount = parseFloat(amountStr);
        const type = typeStr.toLowerCase().trim() as 'savings' | 'spend';
        const description = descriptionStr?.trim() || undefined;

        if (isNaN(date.getTime()) || isNaN(amount) || (type !== 'savings' && type !== 'spend')) {
          continue; // Skip invalid rows
        }

        const transaction: Transaction = {
          id: `${date.getTime()}-${i}`,
          date,
          amount,
          type,
          description
        };

        // Avoid duplicates
        if (!existingIds.has(transaction.id)) {
          transactions.push(transaction);
          existingIds.add(transaction.id);
        }
      }

      if (transactions.length === 0) {
        return { success: false, message: 'No valid transactions found in CSV file', count: 0 };
      }

      // Merge with existing transactions
      const allTransactions = [...existingTransactions, ...transactions];
      // Sort by date
      allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      localStorage.setItem(this.storageKey, JSON.stringify(allTransactions));

      return { 
        success: true, 
        message: `Successfully imported ${transactions.length} transaction(s)`, 
        count: transactions.length 
      };
    } catch (error) {
      return { 
        success: false, 
        message: `Error importing CSV: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        count: 0 
      };
    }
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }
}

