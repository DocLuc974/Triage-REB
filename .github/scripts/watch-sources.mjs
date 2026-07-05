#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

const STATE_PATH = 'watch-state.json';
const ZONES_PATH = 'zones-multi-pathogenes.json';

// Source Ebola = fiche COREB (URL STABLE, mise a jour en place)
const EBOLA_FICHE = 'https://www.coreb.infectiologie.com/UserFiles/File/procedures/2025118-fiche-coreb-fhv-ebola.pdf';

const CAPITALES = {'ituri':'Bunia','nord kivu':'Goma','sud kivu':'Bukavu','haut uele':'Isiro',
  'kinshasa':'Kinshasa','tshopo':'Kisangani','bas uele':'Buta','maniema':'Kindu',
  'tanganyika':'Kalemie','equateur':'Mbandaka','mongala':'Lisala','haut katanga':'Lubumbashi'};
const CAP_PAYS = {'ouganda':'Kampala','rwanda':'Kigali','burundi':'Gitega',
  'soudan du sud':'Djouba','tanzanie':'Dodoma','republique centrafricaine':'Bangui'};
const norm  = (s)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[\s\-']+/g,' ').trim();
const titre = (s)=>s.split(' ').map(w=>w?w[0].toUpperCase()+w.slice(1):w).join(' ').replace(/\bRdc\b/,'RDC');

async function loadJson(p, f){ try { return JSON.parse(await readFile(p,'utf8')); } catch { return f; } }

function parseZones(text){
  const start = text.search(/zone[s]?\s+d.end[e\u00e9]mie/i);
  const end   = text.search(/questions?\s+cl[e\u00e9]s/i);
  const block = text.slice(start>=0?start:0, end>=0?end:text.length);
  const zones = [];
  const mRdc = block.match(/RDC\s*:\s*([^\n]+)/i);
  if (mRdc) for (const raw of mRdc[1].split(/[,;]/)){
    const name = raw.trim().replace(/\.$/,''); if(!name) continue;
    zones.push({country:'RDC',type:'province',name:titre(name),capital:CAPITALES[norm(name)]||'',risk:'high'});
  }
  for (const line of block.split('\n')){
    const m = line.match(/^\s*[-\u2022o]\s*(.+?)\s*$/); if(!m) continue;
    const nl = norm(m[1]);
    if (nl === 'rdc' || nl.startsWith('rdc ')) continue;
    if (CAP_PAYS[nl]) zones.push({country:titre(nl),type:'country',name:titre(nl),capital:CAP_PAYS[nl],risk:'medium'});
  }
  return zones;
}

async function createIssue(title, body){
  const repo = process.env.GITHUB_REPOSITORY, token = process.env.GITHUB_TOKEN;
  if (!repo || !token) return;
  await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method:'POST',
    headers:{ Authorization:`Bearer ${token}`, Accept:'application/vnd.github+json', 'Content-Type':'application/json' },
    body: JSON.stringify({ title, body, labels:['surveillance-reb'] })
  }).catch(()=>{});
}

async function main(){
  const state = await loadJson(STATE_PATH, {});
  const now = new Date().toISOString();

  const res = await fetch(EBOLA_FICHE, { headers:{ 'User-Agent':'REB-Watch/2.0' } });
  if (!res.ok) throw new Error('HTTP '+res.status+' sur la fiche COREB');
  const buf = Buffer.from(await res.arrayBuffer());
  const hash = createHash('sha256').update(buf).digest('hex');

  const prev = state.ebola_fiche;
  const changed = prev && prev.hash !== hash;

  let jsonUpdated = false;
  if (changed || process.env.FORCE_PARSE){
    const { text } = await pdfParse(buf);
    const newZones = parseZones(text);
    if (newZones.length >= 2){                          // garde-fou
      const zjson = await loadJson(ZONES_PATH, null);
      if (zjson){
        zjson.zones = newZones;
        zjson.updated = now.slice(0,10);
        zjson.source = 'Fiche COREB - Ebola';
        zjson.source_url = EBOLA_FICHE;
        await writeFile(ZONES_PATH, JSON.stringify(zjson, null, 2) + '\n');
        jsonUpdated = true;
        console.log('JSON mis a jour :', newZones.map(z=>z.name).join(', '));
      }
    } else {
      console.log('Extraction trop faible - JSON non modifie (garde-fou).');
    }
  }

  state.ebola_fiche = { hash, checkedAt: now, lastChangedAt: changed ? now : (prev?.lastChangedAt ?? now) };
  await writeFile(STATE_PATH, JSON.stringify(state, null, 2) + '\n');

  if (changed){
    await createIssue(
      '\ud83d\udd14 Fiche COREB Ebola modifiee - verifier les zones',
      jsonUpdated
        ? 'Une **Pull Request** a ete preparee avec les zones a jour. A relire et fusionner.'
        : '\u26a0\ufe0f Changement detecte mais extraction impossible - verifier manuellement la fiche COREB.'
    );
  } else {
    console.log('Aucun changement.');
  }
}
main().catch(e=>{ console.error(e); process.exit(1); });
