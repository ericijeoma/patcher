import { TelemetrySanitizer } from './sanitizer';

// 1. Define a valid payload that conforms to your schema
const validPayload = {
  file_hash_sha256: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
  architecture: 'x64',
  format: 'ELF',
  virtual_base_address: '0x00400000',
  total_instructions_decoded: 1420,
  basic_blocks_mapped: 32,
  vulnerabilities_found: 1,
  structural_mitigations: ['ASLR', 'DEP'],
  audited_symbols: ['main', 'printf'],
  assembly_slices: [
    {
      address: '0x00401A2F',
      instructions: ['mov rax, rdi', 'ret']
    }
  ]
};

console.log('--- TEST 1: Passing Clean Telemetry ---');
try {
  const cleanResult = TelemetrySanitizer.sanitize(validPayload);
  console.log('✅ SUCCESS: Clean payload successfully passed through the boundary!');
} catch (error: any) {
  console.error('❌ FAILURE: Clean data broke the sanitizer:', error.message);
}

console.log('\n--- TEST 2: Injecting a Poison Pill (SQL Injection String as Address) ---');
try {
  // Create a bad copy where an address fields contains an unauthorized string block
  const poisonedPayload = JSON.parse(JSON.stringify(validPayload));
  poisonedPayload.virtual_base_address = "SELECT * FROM user WHERE admin = 1"; 

  TelemetrySanitizer.sanitize(poisonedPayload);
  console.error('❌ FAILURE: The sanitizer allowed a raw text string to slip past the network boundary!');
} catch (error: any) {
  console.log('✅ SUCCESS: Sanitizer blocked the payload perfectly! Error thrown:', error.message);
}
