import { createClient } from '@supabase/supabase-js';

export function getSupabaseCredentials() {
  const url = (localStorage.getItem('raffa_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '').trim();
  const key = (localStorage.getItem('raffa_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  return { url, key, isConfigured: !!(url && key) };
}

export function getSupabaseInstance() {
  const { url, key, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) return null;
  return createClient(url, key);
}

export const isSupabaseConfigured = getSupabaseCredentials().isConfigured;
export const supabase = getSupabaseInstance();

// Database helper functions with automatic LocalStorage fallback checked in App.jsx

export async function getClientsDb() {
  const db = getSupabaseInstance();
  if (!db) return null;
  const { data, error } = await db
    .from('clients')
    .select('*')
    .order('name');
  if (error) throw error;
  return data.map(mapClientFromDb);
}

export async function addClientDb(client) {
  const db = getSupabaseInstance();
  if (!db) return null;
  const dbClient = mapClientToDb(client);
  const { data, error } = await db
    .from('clients')
    .insert([dbClient])
    .select();
  if (error) throw error;
  return mapClientFromDb(data[0]);
}

export async function updateClientDb(id, client) {
  const db = getSupabaseInstance();
  if (!db) return null;
  const dbClient = mapClientToDb(client);
  const { data, error } = await db
    .from('clients')
    .update(dbClient)
    .eq('id', id)
    .select();
  if (error) throw error;
  return mapClientFromDb(data[0]);
}

export async function deleteClientDb(id) {
  const db = getSupabaseInstance();
  if (!db) return null;
  const { error } = await db
    .from('clients')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

export async function getEntriesDb() {
  const db = getSupabaseInstance();
  if (!db) return null;
  const { data, error } = await db
    .from('entries')
    .select('*')
    .order('request_date', { ascending: false });
  if (error) throw error;
  
  return data.map(mapEntryFromDb);
}

export async function addEntryDb(entry) {
  const db = getSupabaseInstance();
  if (!db) return null;
  const dbEntry = mapEntryToDb(entry);
  const { data, error } = await db
    .from('entries')
    .insert([dbEntry])
    .select();
  if (error) throw error;
  return mapEntryFromDb(data[0]);
}

export async function updateEntryDb(id, entry) {
  const db = getSupabaseInstance();
  if (!db) return null;
  const dbEntry = mapEntryToDb(entry);
  const { data, error } = await db
    .from('entries')
    .update(dbEntry)
    .eq('id', id)
    .select();
  if (error) throw error;
  return mapEntryFromDb(data[0]);
}

export async function deleteEntryDb(id) {
  const db = getSupabaseInstance();
  if (!db) return null;
  const { error } = await db
    .from('entries')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

export async function clearAllEntriesDb() {
  const db = getSupabaseInstance();
  if (!db) return null;
  const { error } = await db
    .from('entries')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
  return true;
}

export async function clearAllClientsDb() {
  const db = getSupabaseInstance();
  if (!db) return null;
  const { error } = await db
    .from('clients')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
  return true;
}

export async function addEntriesBulkDb(entriesList) {
  const db = getSupabaseInstance();
  if (!db) return null;
  const dbEntries = entriesList.map(mapEntryToDb);
  const { data, error } = await db
    .from('entries')
    .insert(dbEntries)
    .select();
  if (error) throw error;
  return data.map(mapEntryFromDb);
}

// Helpers to map object keys between camelCase (JS) and snake_case (Postgres)
function mapEntryToDb(entry) {
  return {
    client_id: entry.clientId,
    request_date: entry.requestDate,
    delivery_date: entry.deliveryDate || null,
    description: entry.description,
    type: entry.type || 'Digital',
    requester: entry.requester || '',
    hours: entry.hours || 0,
    job_link: entry.jobLink || null,
    billable: entry.billable !== undefined ? entry.billable : true,
    status: entry.status || 'Finalizado'
  };
}

function mapEntryFromDb(dbEntry) {
  return {
    id: dbEntry.id,
    clientId: dbEntry.client_id,
    requestDate: dbEntry.request_date,
    deliveryDate: dbEntry.delivery_date,
    description: dbEntry.description,
    type: dbEntry.type,
    requester: dbEntry.requester,
    hours: parseFloat(dbEntry.hours),
    jobLink: dbEntry.job_link,
    billable: dbEntry.billable,
    status: dbEntry.status
  };
}

function mapClientToDb(client) {
  return {
    name: client.name,
    email: client.email || null,
    additional_email: client.additionalEmail || null,
    cnpj: client.cnpj || client.cpfCnpj || null,
    phone: client.phone || null,
    address: client.address || null,
    contract_type: client.contractType || 'hybrid',
    fixed_fee: client.fixedFee !== undefined ? parseFloat(client.fixedFee) : 0,
    hours_included: client.hoursIncluded !== undefined ? parseFloat(client.hoursIncluded) : 0,
    hourly_rate: client.hourlyRate !== undefined ? parseFloat(client.hourlyRate) : 0,
    is_active: client.isActive !== undefined ? client.isActive : true
  };
}

function mapClientFromDb(dbClient) {
  return {
    id: dbClient.id,
    name: dbClient.name,
    email: dbClient.email || '',
    additionalEmail: dbClient.additional_email || dbClient.additionalEmail || '',
    cnpj: dbClient.cnpj || '',
    phone: dbClient.phone || '',
    address: dbClient.address || '',
    contractType: dbClient.contract_type || dbClient.contractType || 'hybrid',
    fixedFee: parseFloat(dbClient.fixed_fee !== undefined ? dbClient.fixed_fee : dbClient.fixedFee || 0),
    hoursIncluded: parseFloat(dbClient.hours_included !== undefined ? dbClient.hours_included : dbClient.hoursIncluded || 0),
    hourlyRate: parseFloat(dbClient.hourly_rate !== undefined ? dbClient.hourly_rate : dbClient.hourlyRate || 0),
    isActive: dbClient.is_active !== undefined ? dbClient.is_active : true
  };
}
