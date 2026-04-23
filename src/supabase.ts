import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// When the env vars are missing (e.g. on GitHub Pages without secrets wired in),
// fall back to a no-op stub that mimics the tiny slice of the supabase-js API
// we actually use (`.from(...).insert(...).then(...)`). This keeps the module
// import from throwing `supabaseUrl is required` at load time, which would
// crash every other top-level statement in main.ts.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

type ChainStub = {
  from: (table: string) => {
    insert: (payload: unknown) => Promise<{ error: null }>;
  };
};

function makeStub(): ChainStub {
  // Every call returns a fresh resolved Promise so the normal Promise.prototype.then
  // works without interference. The earlier version overrode .then on a shared
  // Promise instance, which recursed into itself and blew the stack on the first
  // vote — that's what silently broke shake/generateMeme afterwards.
  return {
    from: () => ({
      insert: () => Promise.resolve({ error: null }),
    }),
  };
}

let client: SupabaseClient | ChainStub;
if (supabaseUrl && supabaseAnonKey) {
  client = createClient(supabaseUrl, supabaseAnonKey);
} else {
  if (import.meta.env.DEV) {
    console.info('[supabase] env vars missing — using no-op stub');
  }
  client = makeStub();
}

export const supabase = client as SupabaseClient;
