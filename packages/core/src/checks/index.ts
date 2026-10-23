import { check as check0 } from './secret-in-code.js';
import { check as check1 } from './env-file-committed.js';
import { check as check2 } from './service-role-on-client.js';
import { check as check3 } from './public-secret-env.js';
import { check as check4 } from './rls-disabled.js';
import { check as check5 } from './api-no-auth.js';
import { check as check6 } from './dangerous-html.js';
import { check as check7 } from './cors-wildcard.js';
import { check as check8 } from './huge-file.js';
import { check as check9 } from './duplicate-code.js';
import { check as check10 } from './unused-file.js';
import { check as check11 } from './new-dependency.js';
import type { Check } from './shared.js';
export const checks: Check[] = [
  check0,
  check1,
  check2,
  check3,
  check4,
  check5,
  check6,
  check7,
  check8,
  check9,
  check10,
  check11,
];
