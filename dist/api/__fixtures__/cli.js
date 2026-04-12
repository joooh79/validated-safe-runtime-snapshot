import { runApiOrchestrationExamples } from './runExamples.js';
const results = await runApiOrchestrationExamples();
console.log(JSON.stringify(results, null, 2));
