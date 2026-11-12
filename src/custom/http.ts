import { ProgramError } from './engine';

// Requêtes HTTP sortantes des scripts : uniquement vers des hôtes explicitement autorisés (évite d'atteindre le réseau interne).
// Hôtes par défaut : l'API publique de Roblox et GitHub. Ajoutez-en avec SCRIPT_HTTP_HOSTS (séparés par des virgules).
const DEFAULT_HOSTS = [
  'users.roblox.com', 'groups.roblox.com', 'thumbnails.roblox.com', 'badges.roblox.com',
  'inventory.roblox.com', 'games.roblox.com', 'friends.roblox.com', 'apis.roblox.com', 'api.github.com'
];

export function allowedHosts(): string[] {
  const extra = (process.env.SCRIPT_HTTP_HOSTS ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  return [...new Set([...DEFAULT_HOSTS, ...extra])];
}

const HEADER_WHITELIST = new Set(['accept', 'content-type', 'authorization', 'x-api-key', 'user-agent']);
const MAX_RESPONSE_CHARS = 200_000;

export async function scriptHttp(method: string, urlText: string, body: unknown, headers: unknown): Promise<{ status: number; ok: boolean; json: unknown; text: string }> {
  const verb = String(method).toUpperCase();
  if (verb !== 'GET' && verb !== 'POST') throw new ProgramError('Seules les requêtes GET et POST sont autorisées');

  let url: URL;
  try {
    url = new URL(String(urlText));
  } catch {
    throw new ProgramError('URL invalide');
  }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) {
    throw new ProgramError('Seules les URL https sont autorisées');
  }
  if (!allowedHosts().includes(url.hostname.toLowerCase())) {
    throw new ProgramError(`Hôte non autorisé : ${url.hostname} (autorisés : ${allowedHosts().join(', ')})`);
  }

  const requestHeaders: Record<string, string> = { 'user-agent': 'ArmeeDeTerreRBLX-Bot' };
  if (headers && typeof headers === 'object') {
    for (const [key, value] of Object.entries(headers as Record<string, unknown>)) {
      if (HEADER_WHITELIST.has(key.toLowerCase()) && typeof value === 'string') requestHeaders[key.toLowerCase()] = value.slice(0, 500);
    }
  }

  let payload: string | undefined;
  if (verb === 'POST' && body !== undefined && body !== null) {
    payload = typeof body === 'string' ? body : JSON.stringify(body);
    if (payload.length > 20_000) throw new ProgramError('Corps de requête trop volumineux');
    if (!requestHeaders['content-type']) requestHeaders['content-type'] = 'application/json';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { method: verb, headers: requestHeaders, body: payload, redirect: 'error', signal: controller.signal });
    const text = (await response.text()).slice(0, MAX_RESPONSE_CHARS);
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: response.status, ok: response.ok, json, text };
  } catch (error) {
    throw new ProgramError(`Requête impossible : ${error instanceof Error ? error.message : 'erreur réseau'}`);
  } finally {
    clearTimeout(timer);
  }
}
