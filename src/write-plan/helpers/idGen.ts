/**
 * Helper for generating deterministic action IDs
 *
 * Action IDs should be:
 * - deterministic (same inputs => same ID)
 * - unique across plan
 * - traceable to action purpose
 */

export function generateActionId(
  planId: string,
  actionOrder: number,
  actionType: string,
  targetRef: string,
): string {
  // Combine inputs into deterministic seed
  const seed = `${planId}:${actionOrder}:${actionType}:${targetRef}`;
  
  // For now, use simple hash-based generation
  // In real implementation, might use crypto v5 UUID
  const hash = simpleHash(seed);
  return `action_${hash}_${actionOrder}`;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).padStart(8, '0');
}
