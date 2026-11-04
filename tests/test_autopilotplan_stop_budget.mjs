// tests/test_autopilotplan_stop_budget.mjs -- stopBudgetMs gives the autopilot's watchdog each phase's budget; a dwell adds its grace, an unknown phase gets the flight budget (public #837).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { stopBudgetMs } = await import(join(JS, 'ui/autopilotplan.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

check(stopBudgetMs('dwell', 5000) === 25000, 'a dwell is its length plus the 20 000 ms grace');
check(stopBudgetMs('dwell') === 20000, 'no dwell given is the grace alone');
check(stopBudgetMs('dwell', 'x') === 20000, 'a dwell that is not a number counts as 0');
check(stopBudgetMs('intro') === 30000, 'intro');
check(stopBudgetMs('resolving') === 45000, 'resolving');
check(stopBudgetMs('flight') === 60000, 'flight');
check(stopBudgetMs('nonsense') === 60000, 'an unknown phase gets the flight budget');

if (problems.length) { console.error('stopBudgetMs FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('stopBudgetMs ok: the table of budgets, the dwell plus its grace, and the flight budget for a phase it does not know');
