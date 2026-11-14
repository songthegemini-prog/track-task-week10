import assert from 'node:assert/strict';
import {test} from 'node:test';
import {existsSync} from 'node:fs';
const source=new URL('../lib/task-format.ts',import.meta.url);
test('AC-4.5 overdue uses Thai calendar day and excludes completed/undated tasks',async()=>{
 assert.ok(existsSync(source),'Task date rules missing');
 const {isOverdue,thaiDate}=await import(source.href);
 const now=new Date('2026-11-14T17:01:00Z');
 assert.equal(isOverdue('2026-11-14','todo',now),true);
 assert.equal(isOverdue('2026-11-15','todo',now),false);
 assert.equal(isOverdue('2026-11-14','done',now),false);
 assert.equal(isOverdue(null,'todo',now),false);
 assert.equal(thaiDate(null),'ไม่มีกำหนด');
 assert.match(thaiDate('2026-11-14'),/2569/);
});
