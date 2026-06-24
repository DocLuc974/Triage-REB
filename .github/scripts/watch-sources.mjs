#!/usr/bin/env node
/**
 * Surveillance des sources REB (FHV/Ebola, Lassa, Marburg, FHCC, MERS-CoV, Mpox)
 * - Vérifie si chaque document/page suivi a changé depuis la dernière exécution
 * - Crée une issue GitHub si un changement est détecté (→ email automatique)
 * - Sauvegarde l'état dans watch-state.json
 */
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const CONFIG_PATH = 'watch-sources.json';
const STATE_PATH = 'watch-state.json';

async function loadJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

async function checkSource(source) {
  const res = await fetch(source.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; REB-Watch/1.0; +github-actions)' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const etag = res.headers.get('etag');
  const lastModified = res.headers.get('last-modified');
  let signature = etag || lastModified;
  if (!signature) {
    const buf = Buffer.from(await res.arrayBuffer());
    signature = createHash('sha256').update(buf).digest('hex');
  }
  return signature;
}

async function createIssue(title, body) {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    console.log('GITHUB_REPOSITORY / GITHUB_TOKEN manquant — issue non créée.');
    return;
  }
  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, body, labels: ['surveillance-reb'] })
  });
  if (!res.ok) {
    console.error('Échec création issue :', res.status, await res.text());
  } else {
    console.log('Issue créée avec succès.');
  }
}

async function main() {
  const config = await loadJson(CONFIG_PATH, { sources: [] });
  const state = await loadJson(STATE_PATH, {});
  const changes = [];
  const errors = [];
  const now = new Date().toISOString();

  for (const source of config.sources) {
    try {
      const signature = await checkSource(source);
      const prev = state[source.id];
      const isFirstRun = !prev;
      const hasChanged = Boolean(prev) && prev.signature !== signature;

      if (hasChanged) {
        changes.push({ ...source, previousCheck: prev.checkedAt });
      }

      state[source.id] = {
        signature,
        checkedAt: now,
        lastChangedAt: hasChanged ? now : (prev?.lastChangedAt ?? (isFirstRun ? now : null))
      };
    } catch (e) {
      errors.push({ ...source, error: e.message });
      console.error(`Erreur sur ${source.id} :`, e.message);
    }
  }

  await writeFile(STATE_PATH, JSON.stringify(state, null, 2) + '\n');

  if (changes.length > 0) {
    const title = `🔔 Mise à jour détectée — ${changes.map(c => c.pathogen).join(', ')}`;
    const body = [
      `Les sources suivantes semblent avoir été modifiées depuis la dernière vérification :`,
      '',
      ...changes.map(c =>
        `- **${c.pathogen}** — [${c.label}](${c.url})\n  Dernière vérification précédente : ${c.previousCheck}\n  Note : ${c.note || '—'}`
      ),
      '',
      errors.length
        ? `⚠️ Erreurs rencontrées sur d'autres sources :\n${errors.map(e => `- ${e.pathogen} (${e.label}) : ${e.error}`).join('\n')}`
        : '',
      '',
      `**Action à faire :** vérifier le document source ci-dessus, puis mettre à jour le fichier \`zones.json\` (Gist) si la liste des zones à risque a changé.`,
    ].join('\n');
    await createIssue(title, body);
  } else {
    console.log('Aucun changement détecté.');
    if (errors.length) console.log('Erreurs :', errors);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
