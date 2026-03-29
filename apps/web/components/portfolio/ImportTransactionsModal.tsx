'use client';

import { useState, useRef } from 'react';
import { useBulkAddTransactions, formatCurrency, type TransactionType } from '@alpha-stocks/core';
import Modal from '@/components/ui/Modal';

interface ParsedRow {
  date: string;
  symbol: string;
  type: TransactionType;
  shares: number;
  price_per_share: number;
  fees: number;
  notes: string;
  error?: string;
}

const VALID_TYPES = new Set(['buy', 'sell', 'dividend']);

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header to find column indices
  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const idx = {
    date: header.indexOf('date'),
    symbol: header.indexOf('symbol'),
    type: header.indexOf('type'),
    shares: header.indexOf('shares'),
    price: header.indexOf('price_per_share') !== -1 ? header.indexOf('price_per_share') : header.indexOf('price'),
    fees: header.indexOf('fees'),
    notes: header.indexOf('notes'),
  };

  // Validate required columns exist
  if (idx.date === -1 || idx.symbol === -1 || idx.type === -1 || idx.shares === -1 || idx.price === -1) {
    return [{
      date: '', symbol: '', type: 'buy', shares: 0, price_per_share: 0, fees: 0, notes: '',
      error: `Missing required columns. Expected: date, symbol, type, shares, price_per_share. Found: ${header.join(', ')}`,
    }];
  }

  return lines.slice(1).filter((line) => line.trim()).map((line, lineNum) => {
    const cols = line.split(',').map((c) => c.trim());

    const date = cols[idx.date] || '';
    const symbol = (cols[idx.symbol] || '').toUpperCase();
    const type = (cols[idx.type] || '').toLowerCase();
    const sharesStr = cols[idx.shares] || '';
    const priceStr = cols[idx.price] || '';
    const feesStr = idx.fees !== -1 ? cols[idx.fees] || '0' : '0';
    const notes = idx.notes !== -1 ? cols[idx.notes] || '' : '';

    const shares = parseFloat(sharesStr);
    const price_per_share = parseFloat(priceStr);
    const fees = parseFloat(feesStr) || 0;

    // Validation
    const errors: string[] = [];
    if (!date) errors.push('missing date');
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(date) && isNaN(Date.parse(date))) errors.push('invalid date');
    if (!symbol) errors.push('missing symbol');
    if (!VALID_TYPES.has(type)) errors.push(`type must be buy/sell/dividend, got "${type}"`);
    if (isNaN(shares) || shares <= 0) errors.push('invalid shares');
    if (isNaN(price_per_share) || price_per_share < 0) errors.push('invalid price');

    // Normalize date to YYYY-MM-DD
    let normalizedDate = date;
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        normalizedDate = parsed.toISOString().split('T')[0];
      }
    }

    return {
      date: normalizedDate,
      symbol,
      type: (VALID_TYPES.has(type) ? type : 'buy') as TransactionType,
      shares: isNaN(shares) ? 0 : shares,
      price_per_share: isNaN(price_per_share) ? 0 : price_per_share,
      fees,
      notes,
      error: errors.length > 0 ? `Row ${lineNum + 1}: ${errors.join(', ')}` : undefined,
    };
  });
}

export default function ImportTransactionsModal({
  open,
  onClose,
  portfolioId,
}: {
  open: boolean;
  onClose: () => void;
  portfolioId: string;
}) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkAdd = useBulkAddTransactions();

  const validRows = rows.filter((r) => !r.error);
  const errorRows = rows.filter((r) => r.error);
  const hasErrors = errorRows.length > 0;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text));
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (validRows.length === 0) return;

    await bulkAdd.mutateAsync({
      portfolioId,
      transactions: validRows.map((r) => ({
        symbol: r.symbol,
        type: r.type,
        shares: r.shares,
        price_per_share: r.price_per_share,
        fees: r.fees || undefined,
        date: r.date,
        notes: r.notes || undefined,
      })),
    });

    setImportResult({ count: validRows.length });
    setRows([]);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose() {
    setRows([]);
    setFileName('');
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title="Import Transactions from CSV">
      <div className="space-y-4">
        {importResult ? (
          <div className="text-center py-4">
            <div className="text-green-600 text-lg font-medium mb-2">
              Successfully imported {importResult.count} transaction{importResult.count !== 1 ? 's' : ''}
            </div>
            <button onClick={handleClose} className="text-sm text-primary hover:underline">
              Close
            </button>
          </div>
        ) : (
          <>
            {/* File input */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 file:cursor-pointer"
              />
              <p className="text-xs text-gray-400 mt-2">
                Expected columns: date, symbol, type, shares, price_per_share, fees (optional), notes (optional)
              </p>
            </div>

            {/* Preview table */}
            {rows.length > 0 && (
              <div className="max-h-64 overflow-auto border border-gray-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Date</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Symbol</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-500">Type</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500">Shares</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500">Price</th>
                      <th className="text-right px-3 py-2 font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr
                        key={i}
                        className={`border-b border-gray-100 ${row.error ? 'bg-red-50' : ''}`}
                      >
                        {row.error ? (
                          <td colSpan={6} className="px-3 py-2 text-red-600">
                            {row.error}
                          </td>
                        ) : (
                          <>
                            <td className="px-3 py-2">{row.date}</td>
                            <td className="px-3 py-2 font-medium">{row.symbol}</td>
                            <td className="px-3 py-2">
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                                  row.type === 'buy'
                                    ? 'bg-green-100 text-green-800'
                                    : row.type === 'sell'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {row.type.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right">{row.shares}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(row.price_per_share)}</td>
                            <td className="px-3 py-2 text-right">
                              {formatCurrency(row.shares * row.price_per_share + row.fees)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary + actions */}
            {rows.length > 0 && (
              <div className="flex items-center justify-between pt-2">
                <div className="text-sm text-gray-500">
                  {validRows.length} valid{hasErrors && `, ${errorRows.length} with errors`}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={validRows.length === 0 || bulkAdd.isPending}
                    className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
                  >
                    {bulkAdd.isPending
                      ? 'Importing...'
                      : `Import ${validRows.length} transaction${validRows.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
