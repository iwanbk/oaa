import { Injectable } from '@nestjs/common';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

@Injectable()
export class ReportsService {
  private states = {
    accounts: 'idle',
    yearly: 'idle',
    fs: 'idle',
    generate: 'idle',
  };

  state(scope: string): string {
    return this.states[scope] as string;
  }

  /**
   * Generate all reports (accounts, yearly, fs) in a non-blocking way
   * Breaks up the processing into smaller chunks to prevent blocking the event loop
   * @returns Promise that resolves when all reports are generated
   */
  generateAllReports(): Promise<void> {
    // Reset all states at the beginning of each call
    this.states.accounts = 'not started';
    this.states.yearly = 'not started';
    this.states.fs = 'not started';
    this.states.generate = 'starting';

    const overallStart = performance.now();

    // Return a promise that resolves when all processing is complete
    return new Promise<void>((resolve) => {
      // Step 1: Initialize data structures (run in the next tick)
      setTimeout(() => {
        const start = performance.now();
        const tmpDir = 'tmp';

        // Set all states to starting
        this.states.accounts = 'starting';
        this.states.yearly = 'starting';
        this.states.fs = 'starting';

        // Initialize data structures for all reports
        const accountBalances: Record<string, number> = {};
        const cashByYear: Record<string, number> = {};

        // Initialize financial statement categories and balances
        const categories = {
          'Income Statement': {
            Revenues: ['Sales Revenue'],
            Expenses: [
              'Cost of Goods Sold',
              'Salaries Expense',
              'Rent Expense',
              'Utilities Expense',
              'Interest Expense',
              'Tax Expense',
            ],
          },
          'Balance Sheet': {
            Assets: [
              'Cash',
              'Accounts Receivable',
              'Inventory',
              'Fixed Assets',
              'Prepaid Expenses',
            ],
            Liabilities: [
              'Accounts Payable',
              'Loan Payable',
              'Sales Tax Payable',
              'Accrued Liabilities',
              'Unearned Revenue',
              'Dividends Payable',
            ],
            Equity: ['Common Stock', 'Retained Earnings'],
          },
        };

        const fsBalances: Record<string, number> = {};
        for (const section of Object.values(categories)) {
          for (const group of Object.values(section)) {
            for (const account of group) {
              fsBalances[account] = 0;
            }
          }
        }

        // Step 2: Read CSV files (in the next tick to avoid blocking)
        setTimeout(() => {
          try {
            // Get list of CSV files to process
            const files = fs.readdirSync(tmpDir).filter(
              (file) => file.endsWith('.csv') && 
                       file !== 'fs.csv' && 
                       file !== 'yearly.csv'
            );
            
            // Process files one by one with setImmediate to yield to the event loop
            let fileIndex = 0;
            
            const processNextFile = () => {
              if (fileIndex >= files.length) {
                // All files processed, move to generating reports
                this.states.generate = 'processing reports';
                generateReports();
                return;
              }
              
              const file = files[fileIndex++];
              this.states.generate = `processing file ${fileIndex}/${files.length}`;
              
              // Process this file
              const lines = fs
                .readFileSync(path.join(tmpDir, file), 'utf-8')
                .trim()
                .split('\n');

              for (const line of lines) {
                const [date, account, , debit, credit] = line.split(',');
                const debitValue = parseFloat(String(debit || 0));
                const creditValue = parseFloat(String(credit || 0));
                const netAmount = debitValue - creditValue;

                // Process for accounts report
                if (!accountBalances[account]) {
                  accountBalances[account] = 0;
                }
                accountBalances[account] += netAmount;

                // Process for yearly report (Cash accounts only)
                if (account === 'Cash') {
                  const year = new Date(date).getFullYear();
                  if (!cashByYear[year]) {
                    cashByYear[year] = 0;
                  }
                  cashByYear[year] += netAmount;
                }

                // Process for financial statement report
                if (Object.prototype.hasOwnProperty.call(fsBalances, account)) {
                  fsBalances[account] += netAmount;
                }
              }
              
              // Process next file in the next event loop tick
              setImmediate(processNextFile);
            };
            
            // Start processing files
            processNextFile();
            
            // Function to generate reports after all files are processed
            const generateReports = () => {
              // Generate accounts report in the next tick
              setTimeout(() => {
                this.states.accounts = 'generating output';
                const accountsOutput = ['Account,Balance'];
                for (const [account, balance] of Object.entries(accountBalances)) {
                  accountsOutput.push(`${account},${balance.toFixed(2)}`);
                }
                fs.writeFileSync('out/accounts.csv', accountsOutput.join('\n'));
                this.states.accounts = `finished in ${(
                  (performance.now() - start) / 1000
                ).toFixed(2)}`;
                
                // Generate yearly report in the next tick
                setTimeout(() => {
                  this.states.yearly = 'generating output';
                  const yearlyOutput = ['Financial Year,Cash Balance'];
                  Object.keys(cashByYear)
                    .sort()
                    .forEach((year) => {
                      yearlyOutput.push(`${year},${cashByYear[year].toFixed(2)}`);
                    });
                  fs.writeFileSync('out/yearly.csv', yearlyOutput.join('\n'));
                  this.states.yearly = `finished in ${(
                    (performance.now() - start) / 1000
                  ).toFixed(2)}`;
                  
                  // Generate financial statement report in the next tick
                  setTimeout(() => {
                    this.states.fs = 'generating output';
                    const fsOutput: string[] = [];
                    fsOutput.push('Basic Financial Statement');
                    fsOutput.push('');
                    fsOutput.push('Income Statement');
                    let totalRevenue = 0;
                    let totalExpenses = 0;
                    for (const account of categories['Income Statement']['Revenues']) {
                      const value = fsBalances[account] || 0;
                      fsOutput.push(`${account},${value.toFixed(2)}`);
                      totalRevenue += value;
                    }
                    for (const account of categories['Income Statement']['Expenses']) {
                      const value = fsBalances[account] || 0;
                      fsOutput.push(`${account},${value.toFixed(2)}`);
                      totalExpenses += value;
                    }
                    fsOutput.push(
                      `Net Income,${(totalRevenue - totalExpenses).toFixed(2)}`,
                    );
                    fsOutput.push('');
                    fsOutput.push('Balance Sheet');
                    let totalAssets = 0;
                    let totalLiabilities = 0;
                    let totalEquity = 0;
                    fsOutput.push('Assets');
                    for (const account of categories['Balance Sheet']['Assets']) {
                      const value = fsBalances[account] || 0;
                      fsOutput.push(`${account},${value.toFixed(2)}`);
                      totalAssets += value;
                    }
                    fsOutput.push(`Total Assets,${totalAssets.toFixed(2)}`);
                    fsOutput.push('');
                    fsOutput.push('Liabilities');
                    for (const account of categories['Balance Sheet']['Liabilities']) {
                      const value = fsBalances[account] || 0;
                      fsOutput.push(`${account},${value.toFixed(2)}`);
                      totalLiabilities += value;
                    }
                    fsOutput.push(`Total Liabilities,${totalLiabilities.toFixed(2)}`);
                    fsOutput.push('');
                    fsOutput.push('Equity');
                    for (const account of categories['Balance Sheet']['Equity']) {
                      const value = fsBalances[account] || 0;
                      fsOutput.push(`${account},${value.toFixed(2)}`);
                      totalEquity += value;
                    }
                    fsOutput.push(
                      `Retained Earnings (Net Income),${(totalRevenue - totalExpenses).toFixed(2)}`,
                    );
                    totalEquity += totalRevenue - totalExpenses;
                    fsOutput.push(`Total Equity,${totalEquity.toFixed(2)}`);
                    fsOutput.push('');
                    fsOutput.push(
                      `Assets = Liabilities + Equity, ${totalAssets.toFixed(2)} = ${(totalLiabilities + totalEquity).toFixed(2)}`,
                    );
                    fs.writeFileSync('out/fs.csv', fsOutput.join('\n'));
                    this.states.fs = `finished in ${(
                      (performance.now() - start) / 1000
                    ).toFixed(2)}`;

                    // Update overall generation state
                    this.states.generate = `finished in ${(
                      (performance.now() - overallStart) / 1000
                    ).toFixed(2)}`;
                    
                    // Resolve the promise when all processing is complete
                    resolve();
                  }, 0);
                }, 0);
              }, 0);
            };
          } catch (error) {
            // Handle any errors
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            this.states.accounts = `error: ${errorMessage}`;
            this.states.yearly = `error: ${errorMessage}`;
            this.states.fs = `error: ${errorMessage}`;
            this.states.generate = `error: ${errorMessage}`;
            resolve();
          }
        }, 0);
      }, 0);
    });
  }

}
