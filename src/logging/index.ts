import type { Logger } from '../types/logging.js';
import type { ReplayEngine } from '../types/replay.js';

/**
 * Logging and Inspection Engine
 *
 * Comprehensive logging layer for:
 * - resolution decision tracking
 * - write plan generation tracking
 * - execution tracking
 * - replay history
 * - operational insights and debugging
 */
export interface LoggingEngine extends Logger {}

/**
 * Replay Engine
 *
 * Manages safe replay and retry of failed/incomplete plans
 */
export type { ReplayEngine } from '../types/replay.js';

