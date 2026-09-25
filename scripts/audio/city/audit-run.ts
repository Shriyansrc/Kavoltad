import {auditCitySfx} from './sfx.ts';
const a = auditCitySfx();
const bad = a.filter((r) => r.edge > 1e-3 || (!r.impulsive && r.spikes > 0));
console.log('events', a.length, 'max edge', Math.max(...a.map((r) => r.edge)).toExponential(2));
console.log('smooth-kind spikes / edge issues:', JSON.stringify(bad, null, 0));
console.log('impulsive (designed) spike counts:', JSON.stringify(a.filter((r) => r.impulsive && r.spikes).map((r) => [r.id, r.spikes])));
