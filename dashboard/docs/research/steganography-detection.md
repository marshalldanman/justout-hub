# Steganography & Covert Channel Detection — SentryLion Knowledge Base

**Document Type:** Technical Reference
**Target:** SentryLion user-space EDR agent (Windows, Rust, no kernel driver)
**Last Updated:** 2026-02-27
**Status:** Research Phase

---

## Table of Contents

1. [Image Steganography Detection](#1-image-steganography-detection)
2. [Audio & Video Steganography](#2-audio--video-steganography)
3. [Document & Archive Steganography](#3-document--archive-steganography)
4. [Network Covert Channels](#4-network-covert-channels)
5. [Filesystem Steganography](#5-filesystem-steganography)
6. [Text & Unicode Steganography](#6-text--unicode-steganography)
7. [Shannon Entropy Analysis](#7-shannon-entropy-analysis)
8. [File Signature & Polyglot Detection](#8-file-signature--polyglot-detection)
9. [YARA Rules for Stego Tools](#9-yara-rules-for-stego-tools)
10. [Rust Implementation Architecture](#10-rust-implementation-architecture)
11. [Performance Tiers](#11-performance-tiers)
12. [Rust Crate Reference](#12-rust-crate-reference)

---

## 1. Image Steganography Detection

### 1.1 LSB (Least Significant Bit) Embedding

The most common image steganography technique. Data is hidden in the least significant bits of pixel values, causing minimal visual change.

**Chi-Square (χ²) Analysis:**
- Compares observed vs expected frequency distribution of pixel values
- LSB embedding creates pairs of values (2k, 2k+1) with equal frequency
- Detection: if χ² statistic is significantly different from random, stego is present

```
Formula: χ² = Σ (observed_i - expected_i)² / expected_i

For pixel pairs (0,1), (2,3), (4,5)...(254,255):
  expected = (count[2k] + count[2k+1]) / 2
  observed = count[2k]

High χ² = no steganography (natural distribution)
Low χ² near 0 = LSB embedding detected (pairs artificially equalized)
Transition from high to low = embedding endpoint detected
```

**Rust implementation approach:**
```rust
fn chi_square_lsb(pixels: &[u8]) -> f64 {
    let mut histogram = [0u64; 256];
    for &p in pixels { histogram[p as usize] += 1; }

    let mut chi_sq = 0.0;
    for k in 0..128 {
        let observed = histogram[2 * k] as f64;
        let expected = (histogram[2 * k] + histogram[2 * k + 1]) as f64 / 2.0;
        if expected > 0.0 {
            chi_sq += (observed - expected).powi(2) / expected;
        }
    }
    chi_sq // Lower = more likely stego
}
```

**RS (Regular-Singular) Analysis:**
- Divides image into groups of pixels
- Applies flipping mask function and measures "regularity" vs "singularity"
- Untouched images: R_M ≈ R_{-M} and S_M ≈ S_{-M}
- LSB embedding: R_M > S_M diverges, R_{-M} < S_{-M} — allows estimation of embedding rate
- More accurate than chi-square but computationally heavier

**Sample Pair Analysis (SPA):**
- Analyzes pairs of adjacent pixels
- Categorizes pixel value transitions into classes
- Provides embedding rate estimate with higher accuracy than RS
- Less sensitive to image content (better on photos with lots of detail)

### 1.2 Appended Data Detection

**JPEG (after EOI marker):**
```
JPEG structure: FFD8 ... image data ... FFD9 [anything here is appended]
EOI marker = FF D9 (End of Image)
Any bytes after FFD9 = suspicious appended data
```

**PNG (after IEND chunk):**
```
PNG structure: 89504E47 ... chunks ... IEND AE426082 [anything here is appended]
IEND chunk = 49454E44 AE426082
Any bytes after IEND = suspicious appended data
```

**Detection algorithm:**
1. Find the format-specific end marker
2. Check if file continues past that marker
3. Calculate size of appended data
4. Analyze entropy of appended section (high entropy = encrypted/compressed payload)

### 1.3 DCT (Discrete Cosine Transform) Steganography

Used by tools like F5, JSteg, OutGuess for JPEG images.

**Detection:**
- JSteg: Embeds in LSBs of non-zero, non-one DCT coefficients — detectable via histogram analysis of DCT coefficients (excess of even values)
- F5: Uses matrix embedding on DCT coefficients — detectable via calibration attack (crop image, re-compress, compare statistics)
- OutGuess: Adjusts remaining DCT coefficients to preserve statistics — harder to detect, requires higher-order statistics

### 1.4 Metadata-Based Steganography

**EXIF weaponization:**
- EXIF fields (Comment, UserComment, MakerNote, ImageDescription) can carry arbitrary data
- XMP (XML-based) metadata can contain embedded payloads
- Some fields have no size limits
- Detection: Check for non-ASCII data in text fields, unusual field sizes, presence of script patterns

```rust
// Key EXIF fields to inspect:
const SUSPICIOUS_EXIF_FIELDS: &[&str] = &[
    "UserComment",
    "ImageDescription",
    "MakerNote",
    "XPComment",
    "Copyright",      // Sometimes abused
    "Artist",         // Sometimes abused
];
// Alert if: field contains base64, hex strings, script tags, or binary data
// Alert if: field size > 1KB (unusual for legitimate metadata)
```

---

## 2. Audio & Video Steganography

### 2.1 Audio LSB Embedding

- Tools: DeepSound, MP3Stego, OpenPuff, Steghide (also does audio)
- Embeds data in LSBs of audio samples (WAV/AIFF uncompressed)
- Detection: statistical analysis of sample distribution, comparison with re-encoded version

### 2.2 Spread Spectrum Techniques

- Data spread across frequency bands to be below noise floor
- Very difficult to detect without reference (original) audio
- Suspect if: audio file has unusually high bitrate for content quality

### 2.3 Video Steganography

- Frame-by-frame LSB embedding (essentially image stego per frame)
- Temporal domain: data in inter-frame differences
- Motion vector manipulation in compressed video
- Detection: compare file size to expected size for codec/resolution/duration

### 2.4 Audio Detection Heuristics

| Indicator | Threshold | Tool |
|-----------|-----------|------|
| WAV file with entropy > 7.5 in sample data | Stego likely | LSB analysis |
| MP3 with bit reservoir anomalies | Investigate | MP3Stego signature |
| Audio file in non-audio context (temp dirs, downloads) | Suspicious | Context analysis |
| DeepSound magic bytes (`0x4453`) | Confirmed | YARA rule |

---

## 3. Document & Archive Steganography

### 3.1 PDF Steganography

- **Object streams:** Hidden objects not referenced by page tree
- **Incremental updates:** Data appended in update sections
- **Whitespace injection:** Extra spaces/newlines in PDF operators
- **JavaScript payloads:** Embedded in PDF /JS or /AA entries
- Detection: Parse PDF structure, flag unreferenced objects, check for JavaScript

### 3.2 Office Document Steganography

- **OLE streams:** Hidden streams in DOC/XLS/PPT binary format
- **OOXML (docx/xlsx/pptx):** Hidden parts in ZIP archive structure
- **Macro payloads:** VBA code in vbaProject.bin
- **Custom XML parts:** Arbitrary data in customXml/ directories
- Detection: Enumerate all OLE streams or ZIP entries, flag unexpected items

### 3.3 Archive Abuse

- **ZIP comment field:** Can hold arbitrary data (up to 65KB)
- **Extra field in local/central headers:** Arbitrary data
- **Polyglot archives:** Valid ZIP + valid JPEG/PNG simultaneously
- **Nested archives:** Deep nesting to evade scanning (ZIP bomb variant)

---

## 4. Network Covert Channels

### 4.1 DNS Exfiltration

**How it works:** Data encoded in DNS subdomain labels.
```
Example: aGVsbG8gd29ybGQ.data.evil.com  (base64 "hello world")
Detection: long subdomain labels, high subdomain entropy, base32/64 character patterns
```

**Detection thresholds:**
| Metric | Legitimate | Suspicious | C2/Exfil |
|--------|-----------|------------|----------|
| Subdomain length | < 20 chars | 20-40 chars | > 40 chars |
| Label entropy | < 3.5 | 3.5-4.0 | > 4.0 |
| Unique subdomains/domain | < 10/hour | 10-100/hour | > 100/hour |
| Query type | A, AAAA, MX | TXT, CNAME | NULL, PRIVATE |

**DGA (Domain Generation Algorithm) Detection:**
```
Features per domain:
  Shannon entropy: Σ -p(x) * log2(p(x)) for character frequencies
  Consonant ratio: consonants / total_alpha
  Digit ratio: digits / total_chars
  Bigram frequency: geometric mean of English bigram probabilities
  Domain length: total chars

Scoring (weighted):
  entropy > 4.0     → +35 points
  consonant > 0.65  → +20 points
  digit_ratio > 0.3 → +15 points
  bigram_score < -6  → +20 points
  length > 20       → +10 points

  Total > 50 → likely DGA
  Total > 70 → very likely DGA
```

### 4.2 DNS Beaconing Detection

```
Algorithm:
1. Group DNS queries by (source_process, target_domain)
2. Track inter-query intervals
3. Calculate Coefficient of Variation: CoV = std_dev / mean

CoV interpretation:
  < 0.10 → Strong beacon (machine precision)
  0.10-0.30 → Likely beacon with jitter
  0.30-0.50 → Weak beacon or bursty legitimate
  > 0.50 → Not beaconing

Cobalt Strike default jitter ranges:
  0% jitter → CoV ≈ 0.01-0.05
  10% jitter → CoV ≈ 0.06-0.10
  50% jitter → CoV ≈ 0.25-0.35
```

### 4.3 ICMP Tunneling

- Tools: icmpsh, ptunnel, hans
- Embeds data in ICMP echo request/reply payload
- Detection: ICMP payload size > 64 bytes, high-frequency pings, non-standard payload content

### 4.4 HTTP Header Steganography

- Data hidden in custom headers, cookie values, or User-Agent strings
- Detection: unusual header entropy, non-standard header names, base64 patterns in header values
- Key headers to inspect: X-Forwarded-For (forged), Cookie (oversize), Authorization (unexpected)

---

## 5. Filesystem Steganography

### 5.1 NTFS Alternate Data Streams (ADS)

```
How it works:
  file.txt                → Normal data stream
  file.txt:hidden.exe     → Alternate data stream (invisible in Explorer)
  dir:malware.dll         → ADS on a directory

Detection:
  Use FindFirstStreamW / FindNextStreamW (windows-rs)
  Alert on: any non-$DATA streams, executable content in ADS,
            ADS on directories, ADS size > threshold
```

**Rust detection approach:**
```rust
use windows::Win32::Storage::FileSystem::{
    FindFirstStreamW, FindNextStreamW, WIN32_FIND_STREAM_DATA
};

fn check_ads(path: &Path) -> Vec<AdsEntry> {
    // Enumerate all streams
    // Default stream is "::$DATA"
    // Any additional streams are ADS — flag them
    // Check ADS content for: PE headers (MZ), scripts, high entropy
}
```

### 5.2 Slack Space

- Data hidden in unused portion of file clusters (file doesn't fill full cluster)
- Requires raw disk access (typically needs kernel driver or admin + direct volume access)
- User-space detection: compare logical file size vs allocated size, flag large discrepancies

### 5.3 Timestamp Manipulation

- Data encoded in file timestamps (created/modified/accessed precision fields)
- NTFS timestamps have 100ns resolution — low-order bits can carry data
- Detection: timestamps with suspicious nanosecond patterns across multiple files

---

## 6. Text & Unicode Steganography

### 6.1 Zero-Width Characters

```
U+200B — Zero Width Space
U+200C — Zero Width Non-Joiner
U+200D — Zero Width Joiner
U+FEFF — Zero Width No-Break Space (BOM)
U+2060 — Word Joiner

Detection: scan text for these codepoints
Any presence in text files, emails, code = suspicious
Binary encoding: ZWS=0, ZWNJ=1 → arbitrary data hidden in text
```

**Rust detection:**
```rust
const ZERO_WIDTH_CHARS: &[char] = &[
    '\u{200B}', '\u{200C}', '\u{200D}', '\u{200E}', '\u{200F}',
    '\u{FEFF}', '\u{2060}', '\u{2061}', '\u{2062}', '\u{2063}',
    '\u{2064}', '\u{2066}', '\u{2067}', '\u{2068}', '\u{2069}',
    '\u{202A}', '\u{202B}', '\u{202C}', '\u{202D}', '\u{202E}',
];

fn detect_zero_width(text: &str) -> Vec<ZeroWidthFinding> {
    text.char_indices()
        .filter(|(_, c)| ZERO_WIDTH_CHARS.contains(c))
        .map(|(pos, c)| ZeroWidthFinding { position: pos, character: c })
        .collect()
}
```

### 6.2 Whitespace Steganography (Snow)

- Tool: Snow — encodes data as trailing whitespace (tabs and spaces)
- Each line's trailing whitespace encodes bits
- Detection: check for trailing whitespace patterns, especially mixed tabs/spaces at line ends

### 6.3 Homoglyph Substitution

- Replace characters with visually identical Unicode equivalents
- Example: Latin 'a' (U+0061) vs Cyrillic 'а' (U+0430)
- Used for: phishing (lookalike domains), watermarking, data hiding
- Detection: check for mixed scripts in single words (Unicode script property analysis)

---

## 7. Shannon Entropy Analysis

### 7.1 Core Algorithm

```
Shannon Entropy H(X) = -Σ p(x) * log2(p(x))
where p(x) = frequency of byte value x / total bytes
Range: 0.0 (all same byte) to 8.0 (perfectly uniform random)
```

### 7.2 Entropy Thresholds Reference

| Entropy Range | Interpretation | Examples |
|---------------|---------------|----------|
| 0.0 - 1.0 | Extremely low, repetitive | Null-filled, simple patterns |
| 1.0 - 3.5 | Low, structured text | Plain English text, source code |
| 3.5 - 5.0 | Medium, mixed content | Rich text, HTML, XML |
| 5.0 - 6.5 | Moderately high | Executables, compiled code |
| 6.5 - 7.0 | High | Compressed (but not fully) |
| 7.0 - 7.5 | Very high | ZIP, GZIP, JPEG compressed |
| 7.5 - 7.9 | Near-maximum | Good encryption/compression |
| 7.9 - 8.0 | Maximum | AES-encrypted, true random |

### 7.3 Sliding Window Entropy

```
Analyze file in overlapping windows (e.g., 256-byte windows, 128-byte step)
Plot entropy per window → detect embedded payloads

Key patterns:
- Sudden entropy spike in otherwise low-entropy file = embedded encrypted/compressed payload
- Entropy delta > 2.5 between adjacent windows = payload boundary
- Uniform high entropy throughout = entire file encrypted/compressed
- Small high-entropy region at end of normal file = appended payload
```

### 7.4 File Type vs Expected Entropy

| File Type | Expected Entropy | Stego Indicator |
|-----------|-----------------|-----------------|
| BMP (uncompressed) | 4.0 - 6.5 | > 7.0 suspicious |
| WAV (PCM) | 5.0 - 7.0 | > 7.5 suspicious |
| PNG | 7.0 - 7.8 | Not useful (already compressed) |
| JPEG | 7.0 - 7.9 | Not useful (already compressed) |
| EXE (.text) | 5.5 - 6.5 | > 7.5 in sections = packed/encrypted |
| EXE (.data) | 3.0 - 6.0 | > 7.0 = encrypted payload |
| PDF | 4.0 - 7.5 | Varies by content |

**Key insight:** Entropy analysis is most useful for UNCOMPRESSED formats (BMP, WAV, EXE sections). Already-compressed formats (JPEG, PNG, ZIP) naturally have high entropy, so statistical methods (chi-square, RS analysis) are needed instead.

---

## 8. File Signature & Polyglot Detection

### 8.1 Magic Bytes Reference

| Format | Magic Bytes (hex) | Offset | Notes |
|--------|------------------|--------|-------|
| JPEG | FF D8 FF | 0 | Third byte E0/E1/EE/DB |
| PNG | 89 50 4E 47 0D 0A 1A 0A | 0 | 8-byte signature |
| GIF | 47 49 46 38 | 0 | "GIF8" |
| BMP | 42 4D | 0 | "BM" |
| PDF | 25 50 44 46 | 0 | "%PDF" |
| ZIP | 50 4B 03 04 | 0 | "PK" (also DOCX/XLSX/PPTX) |
| RAR | 52 61 72 21 | 0 | "Rar!" |
| 7z | 37 7A BC AF 27 1C | 0 | |
| EXE/DLL | 4D 5A | 0 | "MZ" (PE format) |
| ELF | 7F 45 4C 46 | 0 | Linux executable |
| OLE | D0 CF 11 E0 A1 B1 1A E1 | 0 | DOC/XLS/PPT |
| SQLite | 53 51 4C 69 74 65 | 0 | "SQLite" |
| GZIP | 1F 8B | 0 | |
| TAR | 75 73 74 61 72 | 257 | "ustar" at offset 257 |
| MP3 | FF FB / FF F3 / FF F2 | 0 | MPEG frame sync |
| MP3 (ID3) | 49 44 33 | 0 | "ID3" tag header |
| WAV | 52 49 46 46 | 0 | "RIFF" |
| AVI | 52 49 46 46 | 0 | "RIFF" (+ "AVI " at offset 8) |
| MP4 | 00 00 00 xx 66 74 79 70 | 0 | "ftyp" at offset 4 |
| FLAC | 66 4C 61 43 | 0 | "fLaC" |
| WebP | 52 49 46 46 xx xx xx xx 57 45 42 50 | 0 | "RIFF" + "WEBP" |
| ICO | 00 00 01 00 | 0 | |
| Class | CA FE BA BE | 0 | Java bytecode |
| DEX | 64 65 78 0A | 0 | Android Dalvik |
| Mach-O | FE ED FA CE / CF FA ED FE | 0 | macOS binary |

### 8.2 Polyglot File Detection

**What:** A file that is simultaneously valid in two or more formats.

**Common polyglots:**
- JPEG + ZIP: JPEG data followed by ZIP archive (JPEG ignores trailing data, ZIP finds central directory from end)
- JPEG + PHP: `<?php` hidden in JPEG comment segment
- PNG + HTML: HTML comment containing valid PNG
- PDF + JavaScript: PDF with embedded JS
- BMP + EXE: BMP header followed by executable code

**Detection algorithm:**
1. Check magic bytes for primary format
2. Scan entire file for ADDITIONAL format signatures
3. Check file from END for ZIP central directory signature (50 4B 05 06)
4. Flag if file is valid in multiple formats

```rust
fn detect_polyglot(data: &[u8]) -> Vec<FormatMatch> {
    let mut matches = Vec::new();

    // Check start of file
    if data.starts_with(&[0xFF, 0xD8, 0xFF]) { matches.push(FormatMatch::JPEG); }
    if data.starts_with(&[0x89, 0x50, 0x4E, 0x47]) { matches.push(FormatMatch::PNG); }
    if data.starts_with(&[0x4D, 0x5A]) { matches.push(FormatMatch::PE); }
    if data.starts_with(b"%PDF") { matches.push(FormatMatch::PDF); }
    // ... more format checks

    // Check for embedded ZIP (from end)
    if let Some(pos) = find_zip_eocd(data) {
        if !data.starts_with(&[0x50, 0x4B]) { // Not already identified as ZIP
            matches.push(FormatMatch::EmbeddedZIP(pos));
        }
    }

    // Check for embedded PE (anywhere in file)
    for i in 1..data.len().saturating_sub(2) {
        if data[i] == 0x4D && data[i+1] == 0x5A {
            matches.push(FormatMatch::EmbeddedPE(i));
        }
    }

    matches
}
```

### 8.3 Extension vs Content Mismatch

```
HIGH PRIORITY: file extension doesn't match magic bytes
  - photo.jpg with PNG magic bytes → suspicious renaming
  - document.pdf with MZ magic bytes → disguised executable
  - readme.txt with PK magic bytes → disguised archive

Rust: compare Path::extension() against detected magic bytes
Alert if mismatch (severity depends on the real format: EXE/DLL = critical)
```

---

## 9. YARA Rules for Stego Tools

### 9.1 Known Tool Signatures

```yara
rule Steghide_Embedded {
    meta:
        description = "Detects Steghide embedded data signature"
        tool = "Steghide"
        reference = "http://steghide.sourceforge.net/"
    strings:
        $magic = { 73 68 00 }  // "sh\0" — Steghide header in BMP/JPEG/WAV/AU
    condition:
        $magic at 0 or ($magic in (filesize-1024..filesize))
}

rule OpenStego_Signature {
    meta:
        description = "Detects OpenStego data signature"
        tool = "OpenStego"
    strings:
        $sig = "OpenStego" ascii
        $sig2 = { 4F 70 53 74 }  // "OpSt"
    condition:
        any of them
}

rule DeepSound_Audio {
    meta:
        description = "Detects DeepSound audio steganography tool artifacts"
        tool = "DeepSound"
    strings:
        $magic = { 44 53 }  // "DS" — DeepSound marker (0x4453)
        $sig = "DeepSound" ascii
    condition:
        $magic at 0 or $sig
}

rule MP3Stego_Artifact {
    meta:
        description = "Detects MP3Stego encoding artifacts"
        tool = "MP3Stego"
    strings:
        $encode = "MP3Stego" ascii nocase
        $decode = "MP3Stego Decoder" ascii nocase
    condition:
        any of them
}

rule Snow_Whitespace {
    meta:
        description = "Detects Snow whitespace steganography (tabs at line ends)"
    condition:
        // Check for suspicious trailing tab patterns
        // 3+ lines with trailing tabs where tabs encode binary data
        for any i in (0..filesize) : (
            uint8(i) == 0x09 and uint8(i+1) == 0x0A  // Tab before newline
        )
        and filesize < 1000000  // Only check reasonable text files
}

rule Appended_Data_JPEG {
    meta:
        description = "JPEG with data appended after EOI marker"
    condition:
        uint16be(0) == 0xFFD8 and  // Valid JPEG start
        for any i in (2..filesize-2) : (
            uint16be(i) == 0xFFD9 and  // EOI marker
            i + 2 < filesize            // More data after EOI
        )
}

rule Appended_Data_PNG {
    meta:
        description = "PNG with data appended after IEND chunk"
    strings:
        $png_magic = { 89 50 4E 47 0D 0A 1A 0A }
        $iend = { 49 45 4E 44 AE 42 60 82 }
    condition:
        $png_magic at 0 and
        for any i in (1..#iend) : (
            @iend[i] + 8 < filesize  // Data after IEND
        )
}

rule Polyglot_JPEG_ZIP {
    meta:
        description = "File that is both valid JPEG and valid ZIP"
    strings:
        $jpeg_start = { FF D8 FF }
        $zip_eocd = { 50 4B 05 06 }
    condition:
        $jpeg_start at 0 and $zip_eocd in (filesize-256..filesize)
}

rule Polyglot_Image_Executable {
    meta:
        description = "Image file containing PE executable"
        severity = "critical"
    strings:
        $jpeg = { FF D8 FF }
        $png = { 89 50 4E 47 }
        $bmp = { 42 4D }
        $mz = "MZ"
        $pe = "PE\x00\x00"
    condition:
        ($jpeg at 0 or $png at 0 or $bmp at 0) and
        ($mz in (100..filesize) and $pe in (100..filesize))
}

rule EXIF_Code_Injection {
    meta:
        description = "EXIF metadata containing code patterns"
    strings:
        $php = "<?php" ascii nocase
        $script = "<script" ascii nocase
        $eval = "eval(" ascii nocase
        $exec = "exec(" ascii nocase
        $base64 = "base64_decode" ascii nocase
        $powershell = "powershell" ascii nocase
        $cmd = "cmd.exe" ascii nocase
    condition:
        uint16be(0) == 0xFFD8 and  // JPEG
        any of them in (0..min(filesize, 65536))  // In EXIF region
}

rule NTFS_ADS_Executable {
    meta:
        description = "NTFS Alternate Data Stream with executable content"
    strings:
        $mz = { 4D 5A }
        $ps1 = "#requires" ascii nocase
        $bat = "@echo off" ascii nocase
        $vbs = "CreateObject" ascii nocase
    condition:
        // This rule is applied to ADS content extracted by the agent
        $mz at 0 or any of ($ps1, $bat, $vbs) in (0..100)
}

rule High_Entropy_Region {
    meta:
        description = "File section with suspiciously high entropy (encrypted payload)"
    condition:
        // Applied programmatically — YARA can't calculate entropy natively
        // Agent extracts sections and pre-filters by entropy > 7.5
        filesize > 0
}

rule Zero_Width_Unicode {
    meta:
        description = "Text containing zero-width Unicode characters (steganography)"
    strings:
        $zwsp = { E2 80 8B }     // U+200B Zero Width Space
        $zwnj = { E2 80 8C }     // U+200C Zero Width Non-Joiner
        $zwj = { E2 80 8D }      // U+200D Zero Width Joiner
        $bom = { EF BB BF }      // U+FEFF BOM (mid-file = suspicious)
    condition:
        // 3+ zero-width chars in a text-like file = likely stego
        (#zwsp + #zwnj + #zwj) >= 3 or
        ($bom and @bom[1] > 3)  // BOM not at start of file
}

rule DNS_Tunnel_Iodine {
    meta:
        description = "Iodine DNS tunnel client/server markers"
    strings:
        $iodine = "iodine" ascii
        $topdomain = "t1.test" ascii
        $version = "VACK" ascii
        $magic = { 00 00 00 01 }
    condition:
        2 of them
}
```

---

## 10. Rust Implementation Architecture

### 10.1 Analysis Pipeline

```
File → Quick Checks (< 1ms)
  ├── Magic byte verification
  ├── Extension mismatch detection
  ├── YARA rule scan (stego tool signatures)
  └── File size anomaly check
       │
       ▼ (if suspicious)
  Standard Analysis (1-100ms)
  ├── Shannon entropy (whole file + sliding window)
  ├── Appended data detection (JPEG EOI, PNG IEND)
  ├── EXIF metadata inspection
  ├── ADS enumeration (NTFS)
  └── Zero-width character scan (text files)
       │
       ▼ (if still suspicious)
  Deep Analysis (100ms - seconds)
  ├── Chi-square LSB analysis (images)
  ├── RS analysis (images)
  ├── Sample Pair Analysis (images)
  ├── DCT coefficient analysis (JPEG)
  ├── Polyglot structure detection
  └── Audio sample statistical analysis
```

### 10.2 Core Data Structures

```rust
#[derive(Debug, Clone)]
pub struct FileAnalysis {
    pub path: PathBuf,
    pub size: u64,
    pub magic_bytes: [u8; 16],
    pub detected_format: FileFormat,
    pub declared_format: FileFormat,  // from extension
    pub format_mismatch: bool,
    pub overall_entropy: f64,
    pub entropy_windows: Vec<EntropyWindow>,
    pub appended_data: Option<AppendedData>,
    pub ads_streams: Vec<AdsStream>,
    pub exif_findings: Vec<ExifFinding>,
    pub yara_matches: Vec<YaraMatch>,
    pub stego_indicators: Vec<StegoIndicator>,
    pub polyglot_formats: Vec<FormatMatch>,
    pub zero_width_chars: Vec<ZeroWidthFinding>,
    pub risk_score: f64,  // 0.0 - 1.0
}

#[derive(Debug, Clone)]
pub struct EntropyWindow {
    pub offset: usize,
    pub size: usize,
    pub entropy: f64,
    pub delta_from_previous: f64,  // > 2.5 = boundary
}

#[derive(Debug, Clone)]
pub struct AppendedData {
    pub offset: usize,         // Where appended data starts
    pub size: usize,           // Size of appended data
    pub entropy: f64,          // Entropy of appended section
    pub marker: EndMarker,     // Which format end-marker was found
}

#[derive(Debug, Clone)]
pub enum StegoIndicator {
    LsbChiSquare { score: f64, channel: ColorChannel },
    RsAnalysis { embedding_rate: f64 },
    AppendedPayload { offset: usize, size: usize, entropy: f64 },
    ExifPayload { field: String, size: usize },
    AdsPresent { stream_name: String, size: usize },
    ZeroWidth { count: usize },
    FormatMismatch { declared: FileFormat, actual: FileFormat },
    PolyglotFile { formats: Vec<FormatMatch> },
    HighEntropy { region_offset: usize, entropy: f64 },
    ToolSignature { tool_name: String, yara_rule: String },
}
```

---

## 11. Performance Tiers

| Tier | Time Budget | Checks | When |
|------|------------|--------|------|
| **Instant** | < 1ms | Magic bytes, extension check, YARA signatures | Every new/modified file |
| **Quick** | 1-10ms | Whole-file entropy, appended data, EXIF scan | Downloads, temp files, email attachments |
| **Standard** | 10-100ms | Sliding window entropy, ADS enum, zero-width scan | Scheduled scans, on-demand |
| **Deep** | 100ms-5s | Chi-square, RS analysis, DCT analysis, polyglot | Targeted investigation, quarantine review |

**Priority directories for automatic scanning:**
- `%USERPROFILE%\Downloads\`
- `%TEMP%` and `%TMP%`
- `%APPDATA%` (roaming + local)
- `C:\Windows\Temp\`
- `C:\ProgramData\` (non-standard subdirectories)
- Any network share mounts
- USB drive roots (on mount event)

---

## 12. Rust Crate Reference

| Purpose | Crate | Version | Notes |
|---------|-------|---------|-------|
| Image decoding | `image` | 0.25 | PNG/JPEG/BMP/GIF pixel access |
| EXIF parsing | `kamadak-exif` | 0.5 | Full EXIF tag reading |
| JPEG/PNG structure | `img-parts` | 0.3 | Access raw segments/chunks |
| ZIP parsing | `zip` | 2.0 | Archive structure inspection |
| PDF parsing | `pdf` | 0.9 | PDF object tree inspection |
| OLE/CFB parsing | `ole` | 0.3 | DOC/XLS/PPT stream access |
| Audio decoding | `hound` | 3.5 | WAV sample access |
| Audio formats | `symphonia` | 0.5 | MP3/FLAC/OGG decoding |
| Hashing | `sha2` | 0.10 | SHA-256 file integrity |
| Statistics | `statrs` | 0.17 | Chi-square distribution |
| YARA scanning | `yara-x` | 0.10 | Pattern matching engine |
| Network capture | `pnet` | 0.35 | Packet inspection |
| DNS parsing | `dns-parser` | 0.8 | DNS query/response parsing |
| Windows APIs | `windows` | 0.58 | ADS, file system APIs |
| Entropy calc | (builtin) | — | Simple byte frequency → Shannon |
| File walking | `walkdir` | 2.5 | Recursive directory scanning |
| Async runtime | `tokio` | 1.0 | Async file I/O |

---

## MITRE ATT&CK Mapping

| Technique | ID | SentryLion Detection |
|-----------|----|--------------------|
| Steganography | T1027.003 | Entropy analysis, chi-square, RS, YARA rules |
| Data Encoding: Standard | T1132.001 | Base64/hex pattern detection in metadata |
| Non-Application Layer Protocol | T1095 | ICMP tunnel detection, DNS exfil |
| Data Obfuscation | T1001 | Zero-width chars, whitespace encoding |
| Protocol Tunneling | T1572 | DNS tunneling detection |
| Exfiltration Over C2 Channel | T1041 | Upload ratio analysis |
| Exfiltration Over Alternative Protocol | T1048 | DNS/ICMP exfil detection |
| Hide Artifacts: NTFS ADS | T1564.004 | ADS enumeration + content analysis |
| Masquerading: Match Legitimate Name | T1036.005 | Extension vs magic bytes mismatch |
| Indicator Removal | T1070 | Timestamp manipulation detection |

---

## Key Takeaways for SentryLion Agent

1. **Entropy is the universal first filter** — fast to compute, catches encrypted/compressed payloads in wrong contexts
2. **Magic byte verification catches the laziest attacks** — extension masquerading is trivially detected
3. **Chi-square + RS analysis are the gold standard** for LSB image stego — computationally expensive but accurate
4. **Appended data detection is high-value/low-cost** — catches JPEG+ZIP polyglots, naive stego tools
5. **NTFS ADS is critically undermonitored** — most defenders forget to check alternate streams
6. **Zero-width Unicode stego is emerging** — simple to detect, increasingly used for watermarking and C2
7. **DNS tunneling is the #1 network covert channel** — subdomain entropy + query rate analysis catches most tools
8. **YARA rules for known tools provide instant detection** — Steghide, OpenStego, DeepSound all leave signatures
9. **Scan priority: Downloads > Temp > AppData > Email attachments** — these are the most common payload delivery paths
10. **Compressed formats (JPEG, PNG, ZIP) need statistical analysis, not entropy** — they're already high entropy by nature
