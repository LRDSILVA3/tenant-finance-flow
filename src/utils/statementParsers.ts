// Statement Parsers for OFX and CSV financial files

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  fitid?: string;
}

const getTagValue = (block: string, tag: string): string => {
  const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, 'i');
  const valMatch = block.match(regex);
  return valMatch ? valMatch[1].trim() : '';
};

export const parseOFX = (text: string): ParsedTransaction[] => {
  const transactions: ParsedTransaction[] = [];
  const stmttrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let match;

  while ((match = stmttrnRegex.exec(text)) !== null) {
    const block = match[1];
    const trntype = getTagValue(block, 'TRNTYPE');
    const dtposted = getTagValue(block, 'DTPOSTED');
    const trnamt = getTagValue(block, 'TRNAMT');
    const fitid = getTagValue(block, 'FITID');
    const name = getTagValue(block, 'NAME');
    const memo = getTagValue(block, 'MEMO');

    // Parse Date: YYYYMMDD
    let date = new Date();
    if (dtposted && dtposted.length >= 8) {
      const year = parseInt(dtposted.substring(0, 4), 10);
      const month = parseInt(dtposted.substring(4, 6), 10) - 1;
      const day = parseInt(dtposted.substring(6, 8), 10);
      date = new Date(year, month, day);
    }

    // Parse Amount
    const rawAmt = parseFloat(trnamt.replace(',', '.')) || 0;
    const amount = Math.abs(rawAmt);
    // If it's explicitly DEBIT it's an expense, otherwise check the amount sign
    const type = trntype.toUpperCase() === 'DEBIT' || rawAmt < 0 ? 'expense' : 'income';

    const description = (name || memo || 'Transação sem descrição').trim();

    transactions.push({
      date,
      description,
      amount,
      type,
      fitid: fitid || undefined
    });
  }

  return transactions;
};

export const parseCSV = (text: string): ParsedTransaction[] => {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  if (lines.length < 2) return [];

  // Detect delimiter
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';
  const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase());

  // Find column indices
  let dateIdx = headers.findIndex(h => h.includes('data') || h.includes('date'));
  let descIdx = headers.findIndex(h => h.includes('desc') || h.includes('hist') || h.includes('nome') || h.includes('lanç') || h.includes('memo') || h.includes('title'));
  let valIdx = headers.findIndex(h => h.includes('val') || h.includes('quant') || h.includes('amt') || h.includes('amount') || h.includes('pago'));

  // Fallbacks
  if (dateIdx === -1) dateIdx = 0;
  if (descIdx === -1) descIdx = 1 < headers.length ? 1 : 0;
  if (valIdx === -1) valIdx = 2 < headers.length ? 2 : 0;

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(delimiter).map(cell => cell.trim().replace(/^["']|["']$/g, ''));
    if (row.length <= Math.max(dateIdx, descIdx, valIdx)) continue;

    const rawDate = row[dateIdx];
    const rawDesc = row[descIdx];
    const rawVal = row[valIdx];

    if (!rawDate || !rawVal) continue;

    // Parse Date: try dd/mm/yyyy or yyyy-mm-dd
    let date = new Date();
    if (rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        date = new Date(year, month, day);
      }
    } else if (rawDate.includes('-')) {
      const parts = rawDate.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        date = new Date(year, month, day);
      }
    } else {
      const parsed = Date.parse(rawDate);
      if (!isNaN(parsed)) date = new Date(parsed);
    }

    // Parse amount
    const cleanedVal = rawVal
      .replace(/[R$\s]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    
    const rawAmt = parseFloat(cleanedVal) || 0;
    if (rawAmt === 0) continue;

    const amount = Math.abs(rawAmt);
    const type = rawAmt >= 0 ? 'income' : 'expense';

    transactions.push({
      date,
      description: rawDesc || 'Lançamento sem descrição',
      amount,
      type,
    });
  }

  return transactions;
};
