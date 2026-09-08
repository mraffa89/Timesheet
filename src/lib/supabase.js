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

export function checkSupabaseConfigured() {
  return getSupabaseCredentials().isConfigured;
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

// ═══════════════════════════════════════════════════════════════
// Freelancers / Prestadores de Serviço
// ═══════════════════════════════════════════════════════════════

export async function getFreelancersDb() {
  const db = getSupabaseInstance();
  if (!db) return null;
  const { data, error } = await db
    .from('freelancers')
    .select('*')
    .order('name');
  if (error) throw error;
  return data.map(mapFreelancerFromDb);
}

export async function addFreelancerDb(freelancer) {
  const db = getSupabaseInstance();
  if (!db) return null;
  const dbFreelancer = mapFreelancerToDb(freelancer);
  const { data, error } = await db
    .from('freelancers')
    .insert([dbFreelancer])
    .select();
  if (error) throw error;
  return mapFreelancerFromDb(data[0]);
}

export async function updateFreelancerDb(id, freelancer) {
  const db = getSupabaseInstance();
  if (!db) return null;
  const dbFreelancer = mapFreelancerToDb(freelancer);
  const { data, error } = await db
    .from('freelancers')
    .update(dbFreelancer)
    .eq('id', id)
    .select();
  if (error) throw error;
  return mapFreelancerFromDb(data[0]);
}

export async function deleteFreelancerDb(id) {
  const db = getSupabaseInstance();
  if (!db) return null;
  const { error } = await db
    .from('freelancers')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

function mapFreelancerToDb(freelancer) {
  return {
    name: freelancer.name,
    username: (freelancer.username || freelancer.email || '').trim().toLowerCase(),
    password: freelancer.password || '',
    hourly_rate: freelancer.hourlyRate !== undefined ? parseFloat(freelancer.hourlyRate) : 0,
    specialty: freelancer.specialty || '',
    pix_key: freelancer.pixKey || '',
    phone: freelancer.phone || '',
    allowed_tabs: freelancer.allowedTabs || ['freelancer-tasks'],
    is_active: freelancer.isActive !== undefined ? freelancer.isActive : true
  };
}

function mapFreelancerFromDb(db) {
  return {
    id: db.id,
    name: db.name,
    username: db.username || '',
    email: db.username || '',
    password: db.password || '',
    hourlyRate: parseFloat(db.hourly_rate !== undefined ? db.hourly_rate : 0),
    specialty: db.specialty || '',
    pixKey: db.pix_key || '',
    phone: db.phone || '',
    allowedTabs: db.allowed_tabs || ['freelancer-tasks'],
    isActive: db.is_active !== undefined ? db.is_active : true,
    createdAt: db.created_at
  };
}

// ═══════════════════════════════════════════════════════════════
// Demandas / Tarefas de Freelancers
// ═══════════════════════════════════════════════════════════════

export async function getFreelancerTasksDb() {
  const db = getSupabaseInstance();
  if (!db) return null;
  const { data, error } = await db
    .from('freelancer_tasks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(mapFreelancerTaskFromDb);
}

export async function addFreelancerTaskDb(task) {
  const db = getSupabaseInstance();
  if (!db) return null;
  const dbTask = mapFreelancerTaskToDb(task);
  const { data, error } = await db
    .from('freelancer_tasks')
    .insert([dbTask])
    .select();
  if (error) throw error;
  return mapFreelancerTaskFromDb(data[0]);
}

export async function updateFreelancerTaskDb(id, task) {
  const db = getSupabaseInstance();
  if (!db) return null;
  const dbTask = mapFreelancerTaskToDb(task);
  const { data, error } = await db
    .from('freelancer_tasks')
    .update(dbTask)
    .eq('id', id)
    .select();
  if (error) throw error;
  return mapFreelancerTaskFromDb(data[0]);
}

export async function deleteFreelancerTaskDb(id) {
  const db = getSupabaseInstance();
  if (!db) return null;
  const { error } = await db
    .from('freelancer_tasks')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

function mapFreelancerTaskToDb(task) {
  return {
    title: task.title,
    freelancer_id: task.freelancerId || null,
    client_id: task.clientId || null,
    category: task.category || 'Digital',
    request_date: task.requestDate || null,
    expected_due_date: task.expectedDueDate || null,
    actual_delivery_date: task.actualDeliveryDate || null,
    hours: task.hours !== undefined ? parseFloat(task.hours) : 0,
    briefing_url: task.briefingUrl || null,
    notes: task.notes || null,
    status: task.status || 'pending'
  };
}

function mapFreelancerTaskFromDb(db) {
  return {
    id: db.id,
    title: db.title,
    freelancerId: db.freelancer_id,
    clientId: db.client_id,
    category: db.category || 'Digital',
    requestDate: db.request_date || '',
    expectedDueDate: db.expected_due_date || '',
    actualDeliveryDate: db.actual_delivery_date || '',
    hours: parseFloat(db.hours !== undefined ? db.hours : 0),
    briefingUrl: db.briefing_url || '',
    notes: db.notes || '',
    status: db.status || 'pending',
    createdAt: db.created_at
  };
}

