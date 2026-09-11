import {execFileSync} from 'node:child_process';
import {mkdirSync,rmSync,writeFileSync,readFileSync} from 'node:fs';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {resolve} from 'node:path';
const dir=resolve('.wrangler/shared-integration'),cli=resolve('node_modules/.bin/wrangler');
// Dedicated disposable local fixture storage; never the normal dev or remote DB.
rmSync(dir,{recursive:true,force:true});mkdirSync(dir,{recursive:true});
const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
config.main=resolve(config.main);config.assets.directory=resolve(config.assets.directory);config.routes=[];
config.vars.APP_ORIGIN='http://localhost:8789';config.dev={host:'localhost:8789'};
for(const db of config.d1_databases)db.migrations_dir=resolve(db.migrations_dir);
writeFileSync(resolve(dir,'wrangler.json'),JSON.stringify(config));
execFileSync(cli,['d1','migrations','apply','simgolfer-accounts','--local','--persist-to',dir],{stdio:'inherit'});
const players=['Owner','Editor'].map(name=>({name,id:randomUUID(),token:randomBytes(32).toString('hex'),csrf:randomBytes(32).toString('hex')}));
const sql=players.map(p=>`INSERT INTO players(id,name,email,created_at) VALUES ('${p.id}','${p.name}','${p.name.toLowerCase()}@example.test',${Date.now()}); INSERT INTO sessions(token_hash,player_id,csrf,expires_at) VALUES ('${createHash('sha256').update(p.token).digest('hex')}','${p.id}','${p.csrf}',${Date.now()+3600000});`).join('\n');
const file=resolve(dir,'seed.sql');writeFileSync(file,sql,{mode:0o600});
execFileSync(cli,['d1','execute','simgolfer-accounts','--local','--persist-to',dir,'--file',file],{stdio:'inherit'});
writeFileSync(resolve(dir,'players.json'),JSON.stringify(players),{mode:0o600});
