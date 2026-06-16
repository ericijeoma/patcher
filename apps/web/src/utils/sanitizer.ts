import { BinaryTelemetryPayload, HEX_ADDRESS_REGEX, SHA256_REGEX } from '../../../../shared/telemetry'; // Adjust relative path as needed

export class TelemetrySanitizer {
  public static sanitize(payload: unknown): BinaryTelemetryPayload {
    // Step 1: Deep clone to prevent prototype pollution
    const clonedPayload = this.deepClone(payload);

    // Step 2: Validate basic structure
    if (!clonedPayload || typeof clonedPayload !== 'object') {
      throw new Error('Telemetry payload must be a non-null object');
    }

    // FIX: Cast to Record so TypeScript allows dynamic property access
    const record = clonedPayload as Record<string, unknown>;

    // Step 3: Validate required fields
    const requiredFields = [
      'file_hash_sha256',
      'architecture',
      'format',
      'virtual_base_address',
      'total_instructions_decoded',
      'basic_blocks_mapped',
      'vulnerabilities_found',
      'structural_mitigations',
      'audited_symbols',
      'assembly_slices'
    ];

    for (const field of requiredFields) {
      if (!(field in record)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Step 4: Validate field types and formats (Using 'record' instead of 'clonedPayload')
    this.validateStringField(record, 'file_hash_sha256', SHA256_REGEX, 'SHA-256 hash');
    this.validateStringField(record, 'architecture', /^[a-zA-Z0-9_-]+$/, 'architecture');
    this.validateStringField(record, 'format', /^[A-Z0-9_-]+$/, 'format');
    this.validateStringField(record, 'virtual_base_address', HEX_ADDRESS_REGEX, 'virtual base address');

    this.validateNumberField(record, 'total_instructions_decoded', 'total instructions decoded');
    this.validateNumberField(record, 'basic_blocks_mapped', 'basic blocks mapped');
    this.validateNumberField(record, 'vulnerabilities_found', 'vulnerabilities found');

    this.validateStringArrayField(record, 'structural_mitigations', 'structural mitigations');
    this.validateStringArrayField(record, 'audited_symbols', 'audited symbols');

    // Step 5: Validate assembly slices
    this.validateAssemblySlices(record.assembly_slices);

    // Step 6: Validate metadata if present
    if (record.metadata && typeof record.metadata === 'object') {
      this.validateMetadata(record.metadata as Record<string, unknown>);
    }

    return record as unknown as BinaryTelemetryPayload;
  }
  
  // ... Keep all the private static helper methods (deepClone, validateStringField, etc.) exactly as they are below this point.

  /**
   * Deep clones an object to prevent prototype pollution attacks
   */
  private static deepClone<T>(obj: T): T {
    try {
      return JSON.parse(JSON.stringify(obj));
    } catch (error) {
      throw new Error(`Failed to deep clone payload: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates a string field against a regex pattern
   */
  private static validateStringField(
    payload: Record<string, unknown>,
    fieldName: string,
    regex: RegExp,
    fieldDescription: string
  ): void {
    const value = payload[fieldName];
    if (typeof value !== 'string') {
      throw new Error(`${fieldDescription} must be a string, got ${typeof value}`);
    }
    if (!regex.test(value)) {
      throw new Error(`${fieldDescription} has invalid format: "${value}"`);
    }
  }

  /**
   * Validates a number field
   */
  private static validateNumberField(
    payload: Record<string, unknown>,
    fieldName: string,
    fieldDescription: string
  ): void {
    const value = payload[fieldName];
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      throw new Error(`${fieldDescription} must be a non-negative integer, got ${typeof value}: ${value}`);
    }
  }

  /**
   * Validates a string array field
   */
  private static validateStringArrayField(
    payload: Record<string, unknown>,
    fieldName: string,
    fieldDescription: string
  ): void {
    const value = payload[fieldName];
    if (!Array.isArray(value)) {
      throw new Error(`${fieldDescription} must be an array, got ${typeof value}`);
    }

    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (typeof item !== 'string') {
        throw new Error(`${fieldDescription} array must contain only strings, got ${typeof item} at index ${i}`);
      }
      if (item.trim() === '') {
        throw new Error(`${fieldDescription} array cannot contain empty strings at index ${i}`);
      }
    }
  }

  /**
   * Validates assembly slices array
   */
  private static validateAssemblySlices(slices: unknown): void {
    if (!Array.isArray(slices)) {
      throw new Error('assembly_slices must be an array');
    }

    for (let i = 0; i < slices.length; i++) {
      const slice = slices[i];
      if (!slice || typeof slice !== 'object') {
        throw new Error(`assembly_slices[${i}] must be an object`);
      }

      // Validate address
      if (!('address' in slice) || typeof slice.address !== 'string' || !HEX_ADDRESS_REGEX.test(slice.address)) {
        throw new Error(`assembly_slices[${i}].address must be a valid hex address`);
      }

      // Validate instructions - no raw ASCII dumps allowed
      if (!('instructions' in slice) || !Array.isArray(slice.instructions)) {
        throw new Error(`assembly_slices[${i}].instructions must be an array`);
      }

      for (let j = 0; j < slice.instructions.length; j++) {
        const instruction = slice.instructions[j];
        if (typeof instruction !== 'string') {
          throw new Error(`assembly_slices[${i}].instructions[${j}] must be a string`);
        }

        // Prevent raw ASCII dumps - instructions should be reasonable length
        if (instruction.length > 500) {
          throw new Error(`assembly_slices[${i}].instructions[${j}] is too long (${instruction.length} chars) - potential raw dump`);
        }

        // Basic validation that it looks like an instruction (contains mnemonic)
        if (!/^[a-zA-Z]{2,}/.test(instruction.trim())) {
          throw new Error(`assembly_slices[${i}].instructions[${j}] doesn't appear to be a valid instruction`);
        }
      }

      // Validate optional fields if present
      if ('anomaly_type' in slice && typeof slice.anomaly_type !== 'string') {
        throw new Error(`assembly_slices[${i}].anomaly_type must be a string if present`);
      }

      if ('confidence' in slice) {
        const confidence = slice.confidence;
        if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
          throw new Error(`assembly_slices[${i}].confidence must be a number between 0 and 1`);
        }
      }
    }
  }

  /**
   * Validates metadata object
   */
  private static validateMetadata(metadata: Record<string, unknown>): void {
    // Allow known metadata fields
    const allowedFields = ['analysis_timestamp', 'engine_version'];

    for (const key in metadata) {
      if (allowedFields.includes(key)) {
        // Known fields can be any type
        continue;
      }

      // Unknown fields must be primitive types to prevent injection
      const value = metadata[key];
      const valueType = typeof value;
      if (valueType === 'object' || valueType === 'function' || valueType === 'symbol') {
        throw new Error(`metadata.${key} contains disallowed type: ${valueType}`);
      }
    }
  }
}
