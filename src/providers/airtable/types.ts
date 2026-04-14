/**
 * Airtable Provider Adapter Types
 *
 * Strict, fail-closed types for Airtable mapping and configuration.
 * All mappings must be canon-confirmed; no speculative values.
 */

/**
 * Airtable table reference
 * Exact migrated Airtable table labels only; no invented table names.
 *
 * Important:
 * - inclusion here means the table is schema-confirmed in `airtable_schema.json`
 * - inclusion here does NOT mean the table is activation-ready for writes
 */
export type AirtableTableId =
  | 'Patients'
  | 'Visits'
  | 'Cases'
  | 'Post-delivery Follow-ups'
  | 'Pre-op Clinical Findings'
  | 'Radiographic Findings'
  | 'Operative Findings'
  | 'Diagnosis'
  | 'Treatment Plan'
  | 'Doctor Reasoning'
  | 'canon-confirm-required';

/**
 * Airtable field reference
 * Canon-confirmed fields only within each table
 */
export interface AirtableFieldRef {
  table: AirtableTableId;
  fieldId: string; // Field ID, not field name (e.g., "fld...")
  fieldName: string; // For reference; do not send to API
  readonly: boolean;
}

/**
 * Option mapping for single-select / multi-select fields
 * Maps provider intent to exact Airtable option label
 * Must be canon-confirmed; no invented options
 */
export interface OptionMapping {
  airtableLabel: string;
  providerIntentValues?: string[]; // Examples of intent values this maps to
}

/**
 * Base field mapping for an action
 * Used to specify which fields are writable and what options are available
 */
export interface ActionFieldMapping {
  field: AirtableFieldRef;
  isRequired: boolean;
  optionMappings?: OptionMapping[];
  expectedType: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'link';
  canonConfirmRequired?: boolean; // Flag if this field mapping is speculative
}

/**
 * Airtable provider configuration
 * Dependency-injected for testability
 */
export interface AirtableProviderConfig {
  baseId: string;
  apiToken: string; // Placeholder; actual token should come from secure config
  requestExecutor:
    | 'real' // Use real HTTP client
    | 'mock' // Use mock implementation
    | 'dryrun'; // Validate but don't send
  tableMapping: Record<string, AirtableTableId>; // e.g., { 'patient': 'Patients', ... }
  fieldMappings?: Record<AirtableTableId, ActionFieldMapping[]>;
}

/**
 * Adapter-specific errors
 */
export type AirtableAdapterError =
  | {
      type: 'canon_confirm_required';
      message: string;
      field?: string;
      table?: string;
    }
  | {
      type: 'unsupported_action';
      actionType: string;
      reason: string;
    }
  | {
      type: 'missing_table_mapping';
      entityType: string;
    }
  | {
      type: 'missing_field_mapping';
      table: string;
      field: string;
    }
  | {
      type: 'missing_option_mapping';
      field: string;
      value: string;
      table: string;
    }
  | {
      type: 'invalid_mapped_value';
      field: string;
      value: unknown;
      expectedType: string;
    }
  | {
      type: 'invalid_provider_response';
      message: string;
      response: unknown;
    }
  | {
      type: 'unsafe_write_blocked';
      reason: string;
    };

/**
 * Airtable request payload (simplified view)
 * Do not expose full Airtable API schema; keep abstracted
 */
export interface AirtableCreateRequest {
  table: AirtableTableId;
  fields: Record<string, unknown>;
}

export interface AirtableUpdateRequest {
  table: AirtableTableId;
  recordId: string;
  fields: Record<string, unknown>;
}

/**
 * Normalized Airtable response
 */
export interface AirtableResponse {
  success: boolean;
  recordId?: string;
  error?: AirtableAdapterError;
}
