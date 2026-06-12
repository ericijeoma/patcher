import init, { analyze_binary_buffer } from './pkg/native_core.js';

async function testWasmInterface() {
    try {
        // Initialize WASM
        await init();
        console.log('WASM initialized successfully');

        // Create a simple test binary (ELF header)
        const testBinary = new Uint8Array([
            0x7f, 0x45, 0x4c, 0x46, // ELF magic
            0x02,                     // 64-bit
            0x01,                     // Little endian
            0x01,                     // ELF version 1
            0x00,                     // OS ABI
            0x00, 0x00, 0x00, 0x00,   // Padding
            0x00, 0x00, 0x00, 0x00,   // Padding
            0x00, 0x00, 0x00, 0x00,   // Padding
            0x00, 0x00, 0x00, 0x00,   // Padding
            0x00, 0x00, 0x00, 0x00,   // Padding
            0x00, 0x00, 0x00, 0x00    // Padding
        ]);

        // Test the analyze_binary_buffer function
        const result = analyze_binary_buffer(testBinary);
        console.log('Analysis result:', result);

        // Check if result is valid JSON
        try {
            const parsed = JSON.parse(result);
            console.log('Result is valid JSON');
            if (parsed.error) {
                console.log('Error in analysis:', parsed.error);
            } else {
                console.log('Analysis completed successfully');
            }
        } catch (e) {
            console.log('Result is not valid JSON:', e.message);
        }

    } catch (error) {
        console.error('Error testing WASM interface:', error);
    }
}

// Run the test
testWasmInterface();
