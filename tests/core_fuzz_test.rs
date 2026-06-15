use proptest::prelude::*;
use patcher::analyzer::analyze_executable; 

// Configure proptest to run a massive number of iterations to prove stability
proptest! {
    #![proptest_config(ProptestConfig::with_cases(10000))]

    // Test 1: Absolute Chaos
    // Feeds completely random, unstructured byte arrays of varying lengths into the engine.
    #[test]
    fn engine_never_panics_on_arbitrary_garbage(bytes in any::<Vec<u8>>()) {
        // The engine must either successfully parse the structure or return a clean Err(String).
        // If the `object` crate or `iced-x86` panics, this test will catch it and fail.
        let _ = analyze_executable(&bytes);
    }

    // Test 2: Targeted PE Header Corruption
    // Malicious actors often corrupt PE headers to break security scanners. 
    // This generates files that start with valid Windows magic bytes ("MZ") but contain structural garbage.
    #[test]
    fn engine_handles_malformed_pe_headers(
        padding in prop::collection::vec(any::<u8>(), 0..100),
        junk in prop::collection::vec(any::<u8>(), 0..1000)
    ) {
        let mut fake_pe = b"MZ".to_vec();
        fake_pe.extend(padding);
        
        // Ensure it's long enough to reach the PE offset pointer (0x3C)
        if fake_pe.len() < 0x3C {
            fake_pe.resize(0x3C, 0);
        }
        
        // Inject fake PE signature and append garbage
        fake_pe.extend(b"PE\0\0");
        fake_pe.extend(junk);

        let _ = analyze_executable(&fake_pe);
    }

    // Test 3: Targeted ELF Header Corruption
    // Generates files that start with valid Linux magic bytes but contain structural garbage.
    #[test]
    fn engine_handles_malformed_elf_headers(
        junk in prop::collection::vec(any::<u8>(), 0..1000)
    ) {
        let mut fake_elf = vec![0x7F, 0x45, 0x4C, 0x46]; // "\x7FELF"
        fake_elf.extend(junk);

        let _ = analyze_executable(&fake_elf);
    }
}
