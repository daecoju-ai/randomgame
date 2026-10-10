#!/usr/bin/env node
'use strict';
// Read-only quality audit for first-grade pilot questions.
// This is advisory: human review is still required before publication.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../data/questions/school');
const files = fs.readdirSync(root).filter(f => /^elementary-grade1-year26.*\.pilot\.json$/.test(f)).sort();
const questions = [];
const issues = [];
const normalize = s => String(s || '').normalize('NFKC').toLowerCase().replace(/[\s"'“”‘’.,!?·:;()[\]{}]/g, '');
const template = s => normalize(s).replace(/[0-9０-９]+/g, '#').replace(/(?:민지|지우|서준|하린|도윤|수빈|유나|민수|지민|하윤|지호)/g, '@');
const byStem = new Map(), byTemplate = new Map(), byId = new Map();
for (const file of files) {
  const parsed = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  if (!Array.isArray(parsed)) throw new Error(file + ': expected array');
  for (const [index, q] of parsed.entries()) {
    const ref = { file, index, id: q.id, subject: q.subject, game_type: q.game_type };
    questions.push({ q, ref });
    if (byId.has(q.id)) issues.push({ kind: 'duplicate_id', items: [byId.get(q.id), ref] });
    else byId.set(q.id, ref);
    const stem = normalize(q.question);
    if (stem.length >= 8) {
      if (!byStem.has(stem)) byStem.set(stem, []);
      byStem.get(stem).push(ref);
    }
    const shape = template(q.question);
    if (shape.length >= 15) {
      if (!byTemplate.has(shape)) byTemplate.set(shape, []);
      byTemplate.get(shape).push(ref);
    }
    if (typeof q.answer === 'string' && Array.isArray(q.choices) && !q.choices.map(String).includes(q.answer))
      issues.push({ kind: 'answer_not_in_choices', items: [ref] });
    if (typeof q.answer === 'string' && /(?:정답|답은|알맞은\s*것은)\s*[:：]\s*/.test(q.question || ''))
      issues.push({ kind: 'possible_answer_cue', items: [ref] });
  }
}
for (const refs of byStem.values()) if (refs.length > 1) issues.push({ kind: 'identical_question', items: refs });
for (const refs of byTemplate.values()) if (refs.length > 1) {
  const distinctStems = new Set(refs.map(ref => normalize(questions.find(x => x.ref === ref).q.question)));
  if (distinctStems.size > 1) issues.push({ kind: 'similar_template_review', items: refs });
}
const counts = Object.fromEntries([...new Set(questions.map(x => x.q.subject))].sort().map(s => [s, questions.filter(x => x.q.subject === s).length]));
const types = Object.fromEntries([...new Set(questions.map(x => x.q.game_type))].sort().map(t => [t, questions.filter(x => x.q.game_type === t).length]));
const issueCounts = Object.fromEntries([...new Set(issues.map(x => x.kind))].sort().map(k => [k, issues.filter(x => x.kind === k).length]));
const report = { scope: 'elementary-grade1-year26*.pilot.json', status: 'advisory_only', files: files.length, questions: questions.length, subjects: counts, game_types: types, issue_counts: issueCounts, issues, notes: ['Matching templates are candidates, not confirmed duplicates.', 'This script does not verify curriculum alignment or semantic correctness.', 'No questions are published or modified by this audit.'] };
const target = process.argv[2];
if (target) fs.writeFileSync(path.resolve(target), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ files: report.files, questions: report.questions, subjects: counts, game_types: types, issue_counts: issueCounts, output: target || 'stdout summary only' }, null, 2));
if (issues.some(x => x.kind === 'duplicate_id' || x.kind === 'answer_not_in_choices')) process.exitCode = 1;
