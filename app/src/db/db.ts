import Dexie, { type Table } from 'dexie';
import type {
  AppSettings,
  InvoiceFileRecord,
  InvoiceItem,
  Invoice,
  Member,
  Meal,
  SessionKeo,
} from '../types';

export class UsdSplitDB extends Dexie {
  meals!: Table<Meal, string>;
  sessions!: Table<SessionKeo, string>;
  invoices!: Table<Invoice, string>;
  items!: Table<InvoiceItem, string>;
  members!: Table<Member, string>;
  invoice_files!: Table<InvoiceFileRecord, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('usd-split');
    this.version(1).stores({
      meals: 'id,date,status,updatedAt',
      sessions: 'id,mealId,orderIndex',
      invoices: 'id,mealId,sessionId',
      items: 'id,mealId,sessionId,invoiceId',
      members: 'id,normalizedName,lastUsedAt',
      invoice_files: 'id,mealId,sessionId,invoiceId',
      settings: 'id',
    });
  }
}

export const db = new UsdSplitDB();
