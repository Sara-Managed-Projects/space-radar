// scene/sourcedtables.js -- the sourced bus and CubeSat tables, filled into scene/realmodels.js by the modules that read them.
//
// Contract: importing this module (for its side effect, no names) puts every catalogue number of data/geobuses.js and
// data/cubesats.js into realmodels.js's routes before the importer runs. Imported by ui/cards.js and scene/models.js,
// never by the boot graph (tests/test_boot_diet.mjs).
//
// WHY A MODULE OF ITS OWN (release 2.0.0 CI, b200-s5-ci). The tables were a dynamic import at realmodels.js's top level,
// which put them in every first visit (8.8 kB in two requests on the tree a deploy uploads) although only a card and a
// hero's shape read them. A static import from here makes them part of those two modules' own graphs, so a card or a
// hero is never drawn without them, and the first visit does not fetch them.
import * as GEO from '../data/geobuses.js';
import * as CUBE from '../data/cubesats.js';
import { fillSourcedTables } from './realmodels.js';

fillSourcedTables(GEO, CUBE);
