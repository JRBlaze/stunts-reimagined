import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import config from '../vite.config.mjs';
import * as G from '../src/core.mjs';
test('packaging uses relative assets and excludes outputs from live watchers',()=>{
  assert.equal(config.base,'./');assert.ok(config.build.chunkSizeWarningLimit>600);assert.ok(config.server.watch.ignored.includes('**/artifacts/**'));
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));assert.equal(pkg.build.win.target,'portable');assert.equal(pkg.build.productName,'Stunts Reimagined');
});
test('all 41 bundled original tracks parse, compile, have a start and export losslessly',()=>{
  const catalog=JSON.parse(fs.readFileSync('public/tracks/index.json','utf8').replace(/^\uFEFF/,''));assert.equal(catalog.length,41);
  for(const entry of catalog){const original=fs.readFileSync('public/tracks/'+entry.file),track=G.readTrack(original,entry.name),world=G.compileTrack(track);assert.ok(world.start,entry.name);assert.ok(world.paths.length>0);assert.deepEqual(world.warnings,[],entry.name);assert.deepEqual(G.readTrack(G.writeTrack(track),entry.name),track);}
});
