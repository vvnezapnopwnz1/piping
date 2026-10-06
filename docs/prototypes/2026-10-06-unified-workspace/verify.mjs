import {readFile, stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root = new URL('.', import.meta.url).pathname;
let failed = false;
for (const name of process.argv.slice(2).length ? process.argv.slice(2) : ['a','b','c']) {
  try {
    for (const f of ['index.html','styles.css','app.js','report.md']) {
      if (!(await stat(resolve(root,name,f))).size) throw new Error(`empty ${f}`);
    }
    const html = await readFile(resolve(root,name,'index.html'),'utf8');
    const js = await readFile(resolve(root,name,'app.js'),'utf8');
    const all = html + js;
    for (const view of ['overview','projects','fabrication','material','nde','rft','testpack']) {
      if (!all.includes(view)) throw new Error(`missing ${view}`);
    }
    if (!all.includes('Not connected to Supabase')) throw new Error('missing prototype label');
    if (/\bfetch\s*\(|\beval\s*\(|XMLHttpRequest|https?:\/\//.test(all)) throw new Error('external execution/network reference');
    const result = spawnSync(process.execPath,['--check',resolve(root,name,'app.js')],{encoding:'utf8'});
    if (result.status !== 0) throw new Error(result.stderr);
    console.log(`${name}: structural gate passed (not browser acceptance)`);
  } catch(e) {failed=true; console.error(`${name}: ${e.message}`);}
}
process.exitCode = failed ? 1 : 0;

