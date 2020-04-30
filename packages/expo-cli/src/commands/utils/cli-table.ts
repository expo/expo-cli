import CliTable, { CellValue } from 'cli-table3';
import { JSONObject } from '@expo/json-file';

export function printTableJsonArray(
  headers: string[],
  jsonArray: { [key: string]: CellValue }[],
  colWidths: number[]
): string {
  const table = new CliTable({
    head: headers,
    colWidths,
  });

  jsonArray.forEach(json => {
    table.push(headers.map(header => (json[header] ? json[header] : '')));
  });

  return table.toString();
}

const VERTICAL_CELL_WIDTH = 80;
export function printTableJson(json: JSONObject, header1?: string, header2?: string): string {
  let table = new CliTable();
  if (header1 || header2) {
    header1 = header1 ? header1 : '';
    header2 = header2 ? header2 : '';
    table.push({ [header1]: header2 });
  }
  Object.entries(json).forEach(([key, value]) => {
    // check if value is a JSON
    if (typeof value === 'object') {
      value = JSON.stringify(value);
    } else {
      value = String(value);
    }
    // Add newline every 80 chars
    key = key.replace(new RegExp('(.{' + VERTICAL_CELL_WIDTH + '})', 'g'), '$1\n');
    value = value.replace(new RegExp('(.{' + VERTICAL_CELL_WIDTH + '})', 'g'), '$1\n');
    table.push({ [key]: value });
  });

  return table.toString();
}
