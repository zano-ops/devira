// Single source of truth for devis quotas per plan.
// Mirrored (must stay in sync) in EDGE_FUNCTION_generate-quote.ts, which runs
// in a separate Deno deploy and can't share this import.
export const TRIAL_LIMIT = 10
export const ESSENTIEL_LIMIT = 20
export const CROISSANCE_LIMIT = 50
