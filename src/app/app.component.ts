import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TransactionService, Transaction } from './transaction.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-root',
  imports: [FormsModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, AfterViewInit {
  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  savingsAmount: number | null = null;
  savingsDescription: string = '';
  savingsDate: string = '';
  spendAmount: number | null = null;
  spendDescription: string = '';
  spendDate: string = '';
  transactions: Transaction[] = [];
  chart: Chart | null = null;
  transactionLimit: number = 5;
  limitOptions: number[] = [5, 10, 20, 30];
  currentPage: number = 1;
  darkMode: boolean = false;

  constructor(private transactionService: TransactionService) {}

  ngOnInit(): void {
    this.loadTheme();
    this.loadTransactions();
    // Initialize dates to today
    const today = new Date().toISOString().split('T')[0];
    this.savingsDate = today;
    this.spendDate = today;
  }

  loadTheme(): void {
    const savedTheme = localStorage.getItem('savings-app-theme');
    if (savedTheme === 'dark') {
      this.darkMode = true;
    } else {
      this.darkMode = false;
    }
    this.applyTheme();
  }

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
    this.applyTheme();
    localStorage.setItem('savings-app-theme', this.darkMode ? 'dark' : 'light');
    // Update chart with new theme colors
    if (this.chart) {
      this.updateChart();
    }
  }

  applyTheme(): void {
    if (this.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.updateChart(), 0);
  }

  loadTransactions(): void {
    this.transactions = this.transactionService.getTransactions();
    // Ensure current page is valid after loading
    const totalPages = this.getTotalPages();
    if (this.currentPage > totalPages && totalPages > 0) {
      this.currentPage = totalPages;
    } else if (this.currentPage < 1) {
      this.currentPage = 1;
    }
    if (this.chartCanvas) {
      setTimeout(() => this.updateChart(), 0);
    }
  }

  addSavings(): void {
    if (this.savingsAmount) {
      const date = this.savingsDate ? new Date(this.savingsDate) : new Date();
      this.transactionService.addTransaction(this.savingsAmount, 'savings', this.savingsDescription, date);
      this.savingsAmount = 0;
      this.savingsDescription = '';
      // Keep the date for next entry (don't reset to today)
      this.currentPage = 1; // Reset to first page to show new transaction
      this.loadTransactions();
    }
  }

  addSpend(): void {
    if (this.spendAmount) {
      const date = this.spendDate ? new Date(this.spendDate) : new Date();
      this.transactionService.addTransaction(this.spendAmount, 'spend', this.spendDescription, date);
      this.spendAmount = 0;
      this.spendDescription = '';
      // Keep the date for next entry (don't reset to today)
      this.currentPage = 1; // Reset to first page to show new transaction
      this.loadTransactions();
    }
  }

  clearData(): void {
    if (confirm('Are you sure you want to clear all data?')) {
      this.transactionService.clearTransactions();
      this.loadTransactions();
    }
  }

  private updateChart(): void {
    if (!this.chartCanvas) return;

    const sortedTransactions = [...this.transactions].sort((a, b) => 
      a.date.getTime() - b.date.getTime()
    );

    const dates = sortedTransactions.map(t => 
      t.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    );

    let runningTotal = 0;
    const savingsData: number[] = [];
    const spendData: number[] = [];
    const netData: number[] = [];

    sortedTransactions.forEach(transaction => {
      if (transaction.type === 'savings') {
        runningTotal += transaction.amount;
        savingsData.push(transaction.amount);
        spendData.push(0);
      } else {
        runningTotal -= transaction.amount;
        savingsData.push(0);
        spendData.push(transaction.amount);
      }
      netData.push(runningTotal);
    });

    const isDarkMode = this.darkMode || document.body.classList.contains('dark-mode');
    const textColor = isDarkMode ? '#d1d5db' : '#374151';
    const gridColor = isDarkMode ? '#374151' : '#e5e7eb';
    const backgroundColor = isDarkMode ? '#1f2937' : '#ffffff';

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: dates,
        datasets: [
          {
            label: 'Net Savings',
            data: netData,
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Savings',
            data: savingsData,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: false
          },
          {
            label: 'Spend',
            data: spendData,
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
            tension: 0.4,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        backgroundColor: backgroundColor,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: textColor,
              usePointStyle: true,
              padding: 15
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: backgroundColor,
            titleColor: textColor,
            bodyColor: textColor,
            borderColor: gridColor,
            borderWidth: 1,
            padding: 12,
            displayColors: true
          }
        },
        scales: {
          x: {
            ticks: {
              color: textColor
            },
            grid: {
              color: gridColor
            },
            border: {
              color: gridColor
            }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: textColor,
              callback: function(value) {
                return '£' + value;
              }
            },
            grid: {
              color: gridColor
            },
            border: {
              color: gridColor
            }
          }
        }
      }
    };

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(this.chartCanvas.nativeElement, config);
  }

  getTotalSavings(): number {
    return this.transactions
      .filter(t => t.type === 'savings')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  getTotalSpend(): number {
    return this.transactions
      .filter(t => t.type === 'spend')
      .reduce((sum, t) => sum + t.amount, 0);
  }

  getNetSavings(): number {
    return this.getTotalSavings() - this.getTotalSpend();
  }

  exportToCSV(): void {
    const csvContent = this.transactionService.exportToCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `savings-data-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = this.transactionService.importFromCSV(text);
      
      if (result.success) {
        alert(result.message);
        this.loadTransactions();
      } else {
        alert(result.message);
      }
      
      // Reset file input
      input.value = '';
    };
    
    reader.readAsText(file);
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('csvFileInput') as HTMLInputElement;
    fileInput?.click();
  }

  getDisplayedTransactions(): Transaction[] {
    const reversed = this.transactions.slice().reverse();
    const limit = Number(this.transactionLimit); // Ensure it's a number
    const startIndex = (this.currentPage - 1) * limit;
    const endIndex = startIndex + limit;
    return reversed.slice(startIndex, endIndex);
  }

  getTotalPages(): number {
    const limit = Number(this.transactionLimit); // Ensure it's a number
    return Math.ceil(this.transactions.length / limit) || 1; // At least 1 page
  }

  hasMoreTransactions(): boolean {
    return this.transactions.length > this.transactionLimit;
  }

  goToPage(page: number): void {
    const totalPages = this.getTotalPages();
    if (page >= 1 && page <= totalPages) {
      this.currentPage = page;
    } else if (totalPages > 0) {
      // If page is invalid, go to last valid page
      this.currentPage = totalPages;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  onLimitChange(newLimit: any): void {
    // Convert to number and update limit
    this.transactionLimit = Number(newLimit);
    // Reset to page 1 when limit changes
    this.currentPage = 1;
  }

  getPageNumbers(): number[] {
    const totalPages = this.getTotalPages();
    const pages: number[] = [];
    const maxVisible = 5; // Show max 5 page numbers
    
    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show pages around current page
      let start = Math.max(1, this.currentPage - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);
      
      // Adjust start if we're near the end
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }
}
