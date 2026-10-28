import { getSettings } from './settings';

// Swearing is on by default (it's SanMik). The settings toggle swaps it for grawlix.
const BAD = /(fuck|cunt|shit|wank|bastard|prick|bollock|twat|piss|nonce|pedo|dick|nob|arse|bitch|slag|sket|bellend|tosser)/gi;
const GRAWLIX = '#@$%&!*';

export function clean(text: string): string {
  if (getSettings().swearing) return text;
  return text.replace(BAD, (m) => Array.from({ length: m.length }, (_, i) => GRAWLIX[i % GRAWLIX.length]).join(''));
}
