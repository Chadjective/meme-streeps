import type { VoteDirection } from './swipe';
import { supabase } from './supabase';

const DEVICE_ID_KEY = 'meme-streeps-device-id';
const VOTES_KEY = 'meme-streeps-votes';

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function getVotes(): Record<string, VoteDirection> {
  try {
    return JSON.parse(localStorage.getItem(VOTES_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveVotes(votes: Record<string, VoteDirection>): void {
  localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
}

export function hasVoted(quoteId: string): boolean {
  const votes = getVotes();
  return quoteId in votes;
}

export function recordVote(quoteId: string, direction: VoteDirection): boolean {
  if (hasVoted(quoteId)) return false;

  // Local cache (instant dedup)
  const votes = getVotes();
  votes[quoteId] = direction;
  saveVotes(votes);

  // Fire-and-forget to Supabase
  supabase
    .from('votes')
    .insert({
      quote_id: quoteId,
      vote: direction,
      device_id: getDeviceId(),
    })
    .then(({ error }) => {
      if (error) {
        // Unique constraint violation = already voted, that's fine
        if (error.code !== '23505') {
          console.warn('[MemeStreeps] Vote sync failed:', error.message);
        }
      }
    });

  return true;
}

// Session counters
let sessionStreetsAhead = 0;
let sessionForTheStreets = 0;

export function incrementSession(direction: VoteDirection): void {
  if (direction === 'streets_ahead') sessionStreetsAhead++;
  else sessionForTheStreets++;
}

export function getSessionCounts() {
  return {
    streets_ahead: sessionStreetsAhead,
    for_the_streets: sessionForTheStreets,
  };
}

// Ensure device ID exists on load
getDeviceId();
