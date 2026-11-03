import { isOn } from '../flags.js';
import type { FamilyBackend } from './backend.js';
import { FakeFamilyBackend } from './fake.js';

let backend: FamilyBackend | null = null;

/**
 * The family backend when the `family` flag is on, otherwise null. Uses the
 * fake on-device backend until a real one is configured (T20, needs the owner).
 */
export function family(): FamilyBackend | null {
  if (!isOn('family')) return null;
  backend ??= new FakeFamilyBackend(localStorage);
  return backend;
}
