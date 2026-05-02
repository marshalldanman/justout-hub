# Botnet & C2 Detection Research for SentryLion EDR

**Document Type:** Technical Reference
**Target:** SentryLion user-space EDR agent (Windows, Rust, no kernel driver)
**Last Updated:** 2026-02-27
**Status:** Research Phase

---

## Table of Contents

1. [Botnet Communication Patterns](#1-botnet-communication-patterns)
2. [Network-Based Detection](#2-network-based-detection)
3. [Host-Based Detection](#3-host-based-detection)
4. [Free Threat Intelligence Feeds](#4-free-threat-intelligence-feeds)
5. [IOC Matching at Scale in Rust](#5-ioc-matching-at-scale-in-rust)
6. [DGA Detection Algorithm](#6-dga-detection-algorithm)
7. [DNS Beaconing Detection](#7-dns-beaconing-detection)
8. [MITRE ATT&CK Mapping](#8-mitre-attck-mapping)
9. [Rust Crate Reference](#9-rust-crate-reference)
10. [Architecture Integration Notes](#10-architecture-integration-notes)

---

## 1. Botnet Communication Patterns

### 1.1 HTTP/HTTPS Beaconing Detection

**What it is:** Malware periodically contacts a C2 server over HTTP/HTTPS at regular or semi-regular intervals (beaconing). This is the most common C2 channel.

**Detection Signals:**

| Signal | Threshold | Notes |
|--------|-----------|-------|
| Interval regularity | CoV < 0.30 | Coefficient of variation on connection intervals |
| Session count | > 50 connections/hour to same destination | Sustained over 4+ hours |
| Byte ratio | Upload:Download near 1:1 or heavily upload-skewed | Legitimate browsing is download-heavy |
| User-Agent anomalies | Static or missing User-Agent across all requests | Malware often hardcodes or omits |
| URI path patterns | Repeated identical paths, base64-like path segments | `/api/check`, `/gate.php`, `/submit.php` |
| Response size consistency | Low variance in response sizes | C2 "no-op" responses are uniform |

**JA3 / JA3S Fingerprinting:**

JA3 fingerprints the TLS Client Hello (client-side) and JA3S fingerprints the Server Hello (server-side). The fingerprint is an MD5 hash computed from:

```
JA3 = MD5(TLSVersion, Ciphers, Extensions, EllipticCurves, EllipticCurvePointFormats)
JA3S = MD5(TLSVersion, CipherSuite, Extensions)
```

**Why it matters for C2 detection:**
- Cobalt Strike Beacon, Meterpreter, Trickbot, and Emotet all produce distinctive JA3 fingerprints because they use the Windows socket API with specific TLS parameters.
- The JA3+JA3S combination is even more powerful: a C2 server always responds identically to its malware client. This pairing identifies C2 communication regardless of IP, domain, or certificate changes.
- Known malicious JA3 hashes are published by abuse.ch at `https://sslbl.abuse.ch/ja3-fingerprints/`.

**Rust Implementation Approach:**
- Parse the TLS Client Hello from raw packet data (after TCP reassembly)
- Extract the 5 fields, concatenate with commas, MD5 hash the result
- Compare against a HashSet of known-bad JA3 hashes
- For novel detection: flag JA3 hashes seen by only 1 process on the endpoint (rare-client detection)

```rust
// Pseudocode structure for JA3 computation
struct Ja3Components {
    tls_version: u16,
    cipher_suites: Vec<u16>,
    extensions: Vec<u16>,
    elliptic_curves: Vec<u16>,
    ec_point_formats: Vec<u8>,
}

impl Ja3Components {
    fn to_ja3_string(&self) -> String {
        format!("{},{},{},{},{}",
            self.tls_version,
            self.cipher_suites.iter().map(|c| c.to_string()).collect::<Vec<_>>().join("-"),
            self.extensions.iter().map(|e| e.to_string()).collect::<Vec<_>>().join("-"),
            self.elliptic_curves.iter().map(|c| c.to_string()).collect::<Vec<_>>().join("-"),
            self.ec_point_formats.iter().map(|f| f.to_string()).collect::<Vec<_>>().join("-"),
        )
    }

    fn to_ja3_hash(&self) -> String {
        let input = self.to_ja3_string();
        format!("{:x}", md5::compute(input.as_bytes()))
    }
}
```

### 1.2 DNS-Based C2

#### DGA Detection (Domain Generation Algorithms)

DGAs generate large numbers of pseudo-random domain names, of which only a few resolve to the actual C2 server. Detailed algorithm in [Section 6](#6-dga-detection-algorithm).

**Key indicators:**
- Shannon entropy > 4.2 for the second-level domain
- Low bigram frequency score (uncommon letter pairs)
- High consonant-to-vowel ratio (> 0.7)
- Domain length > 15 characters (excluding TLD)
- Burst of NXDOMAIN responses

#### DNS Tunneling via TXT/CNAME Records

**What it is:** Data is encoded into DNS queries (in subdomains) and responses (in TXT, CNAME, NULL, or MX records) to create a covert communication channel.

**Detection Signals:**

| Signal | Threshold | Notes |
|--------|-----------|-------|
| Query length | Mean subdomain length > 30 chars | Normal is ~10-15 chars |
| Query entropy | Shannon entropy > 4.0 on subdomain | Base32/64 encoded data |
| TXT record volume | > 10 TXT queries/min to same domain | Normal domains rarely use TXT at scale |
| NULL record usage | Any NULL record queries | Almost never used legitimately |
| Unique subdomains | > 100 unique subdomains per domain per hour | Data exfil encoded as subdomains |
| Response size | TXT responses > 200 bytes average | Data download channel |
| Query rate | > 1 query/sec sustained to a single domain | Tools like iodine, dnscat2 |
| NXDOMAIN ratio | > 30% NXDOMAIN for a single domain | Failed tunnel negotiations |

**Known DNS tunneling tools and their record types:**
- **iodine:** NULL records (primary), TXT, CNAME, MX, A
- **dnscat2:** TXT, CNAME, MX, A records
- **dns2tcp:** TXT records
- **TUNS:** CNAME records only (MTU ~140 chars)

#### Fast-Flux Detection

**What it is:** Fast-flux networks rapidly rotate IP addresses for a domain (single-flux) or both IPs and nameservers (double-flux) to resist takedown.

**Detection Signals:**

| Signal | Threshold | Notes |
|--------|-----------|-------|
| TTL | < 300 seconds (< 5 min) | Legitimate CDNs also have low TTL -- needs correlation |
| IP diversity | > 5 distinct IPs for same domain within 1 hour | Resolved from same vantage point |
| ASN diversity | IPs span > 3 different ASNs | Fast-flux recruits diverse bots |
| Geolocation spread | IPs in > 3 countries | Botnet nodes are geographically diverse |
| NS record changes | Nameserver IPs change within 24 hours | Double-flux indicator |
| A record ratio | Ratio of A records to unique IPs > 3:1 per day | Round-robin with rapid rotation |

### 1.3 IRC Botnet Protocols

**Classic but still present.** IRC-based botnets use IRC channels for C2.

**Detection Signals:**
- TCP connections to port 6667, 6668, 6669, 6697 (IRC/IRC+TLS)
- IRC protocol signatures: `NICK`, `JOIN`, `PRIVMSG`, `PING`/`PONG` in plaintext streams
- Connections from non-browser processes to IRC ports
- Packet size sequence analysis: IRC C2 exhibits quasi-periodic packet sizes
- Multiple internal hosts connecting to the same external IRC server

**Rust detection approach:**
- Monitor for TCP connections on IRC ports (6660-6669, 6697, 7000-7001)
- If connection is unencrypted, pattern-match for IRC commands in first few packets
- Correlate with process -- if the process is not a known IRC client, flag it

### 1.4 P2P Botnet Protocols

**Modern botnets** use peer-to-peer protocols to eliminate single points of failure.

**Detection Signals:**
- Process making connections to many distinct IPs on uncommon ports
- Symmetric traffic patterns (each node is both client and server)
- Connections to residential IP ranges (other infected hosts)
- UDP-based communication on non-standard ports
- Graph analysis: internal host has many outbound connections to diverse IPs with low-volume, periodic traffic

**Detection approach:** Behavioral analysis is essential because P2P botnet traffic is encrypted and polymorphic. Focus on connection graph patterns rather than payload signatures.

### 1.5 Encrypted C2 Channel Detection

#### TLS Certificate Anomalies

| Anomaly | Description | Weight |
|---------|-------------|--------|
| Self-signed certificate | No CA chain, issuer == subject | High |
| Expired certificate | `notAfter` in the past | Medium |
| Recently issued | Certificate issued < 7 days ago | Medium |
| Short validity | Valid for < 30 days | Medium |
| Missing fields | Empty subject, no SAN, no organization | High |
| Mismatched CN/SAN | CN or SAN doesn't match destination hostname | High |
| Let's Encrypt + suspicious domain | Free DV cert on DGA-like domain | Medium |
| Unusual key size | RSA < 2048 or > 4096, or uncommon curves | Low |
| Rare CA | Issuer not in top-100 CAs by volume | Medium |

**Rust implementation:**
```rust
use x509_parser::prelude::*;

struct CertAnomalyScore {
    self_signed: bool,      // +40 points
    expired: bool,          // +20 points
    short_validity: bool,   // +15 points  (< 30 days)
    recently_issued: bool,  // +15 points  (< 7 days)
    missing_subject: bool,  // +30 points
    cn_san_mismatch: bool,  // +25 points
    rare_issuer: bool,      // +10 points
    unusual_key: bool,      // +5 points
}

impl CertAnomalyScore {
    fn total(&self) -> u32 {
        let mut score = 0u32;
        if self.self_signed     { score += 40; }
        if self.expired         { score += 20; }
        if self.short_validity  { score += 15; }
        if self.recently_issued { score += 15; }
        if self.missing_subject { score += 30; }
        if self.cn_san_mismatch { score += 25; }
        if self.rare_issuer     { score += 10; }
        if self.unusual_key     { score += 5; }
        score
    }

    fn is_suspicious(&self) -> bool {
        self.total() >= 40
    }
}
```

### 1.6 Domain Fronting Detection

**What it is:** Adversary uses a legitimate CDN domain in the TLS SNI field but routes to a different (malicious) backend via the HTTP Host header.

**Detection method:** Compare TLS SNI field with HTTP Host header.

| Check | Detection Logic |
|-------|----------------|
| SNI vs Host mismatch | `tls_sni != http_host_header` (primary indicator) |
| Empty SNI (domainless fronting) | SNI field is blank/absent but HTTP Host is present |
| ESNI/ECH usage | Encrypted SNI extension present (may hide fronting) |
| CDN to rare backend | Known CDN IP but Host header points to uncommon domain |

**Limitations:**
- Requires TLS decryption (MITM) or access to both TLS and HTTP layers
- Only works for HTTP/1.1 (HTTP/2 makes Host header inspection harder)
- On a user-space agent, you can detect this if you have access to the plaintext stream (e.g., hooking or ETW)

**User-space approach for SentryLion:**
- Use ETW `Microsoft-Windows-WinHttp` or `Microsoft-Windows-WinInet` providers to capture HTTP headers
- Compare against TLS SNI from `Microsoft-Windows-Schannel` events
- Flag mismatches

---

## 2. Network-Based Detection

### 2.1 Beaconing Detection Algorithms

#### Coefficient of Variation (CoV) Method

The primary statistical method for detecting periodic beaconing.

**Formula:**
```
CoV = standard_deviation(intervals) / mean(intervals)

Where:
  intervals = [t2-t1, t3-t2, t4-t3, ..., tN-t(N-1)]
  for timestamps t1, t2, ..., tN of connections to the same destination
```

**Interpretation:**

| CoV Range | Classification | Notes |
|-----------|---------------|-------|
| 0.00 - 0.05 | Strong beacon | Nearly perfect periodicity (no jitter) |
| 0.05 - 0.15 | Likely beacon | Slight jitter (e.g., +/- 10% sleep variation) |
| 0.15 - 0.30 | Possible beacon | Moderate jitter (Cobalt Strike default is ~10-20%) |
| 0.30 - 0.50 | Weak signal | Could be beacon with high jitter or periodic app |
| > 0.50 | Not beaconing | Random/human-driven traffic |

**Minimum data requirements:**
- At least 20 connection events to compute meaningful CoV
- Observation window of at least 2 hours
- Filter out connections < 10 seconds apart (burst traffic, not beaconing)

**Rust implementation:**
```rust
fn coefficient_of_variation(timestamps: &[u64]) -> Option<f64> {
    if timestamps.len() < 20 {
        return None; // Need minimum samples
    }

    let mut intervals: Vec<f64> = Vec::with_capacity(timestamps.len() - 1);
    for window in timestamps.windows(2) {
        let interval = (window[1] - window[0]) as f64;
        if interval >= 10_000.0 { // Filter sub-10-second bursts (ms)
            intervals.push(interval);
        }
    }

    if intervals.len() < 15 {
        return None;
    }

    let mean = intervals.iter().sum::<f64>() / intervals.len() as f64;
    if mean == 0.0 {
        return None;
    }

    let variance = intervals.iter()
        .map(|x| (x - mean).powi(2))
        .sum::<f64>() / intervals.len() as f64;
    let std_dev = variance.sqrt();

    Some(std_dev / mean)
}

fn classify_beacon(cov: f64) -> BeaconConfidence {
    match cov {
        c if c <= 0.05 => BeaconConfidence::Strong,
        c if c <= 0.15 => BeaconConfidence::Likely,
        c if c <= 0.30 => BeaconConfidence::Possible,
        c if c <= 0.50 => BeaconConfidence::Weak,
        _ => BeaconConfidence::None,
    }
}
```

#### Fourier Analysis (DFT/FFT) Method

More robust against jittered beacons. Detects periodicity even when jitter is applied.

**Approach:**
1. Create a time series of connection events (1 = connection occurred in time bucket, 0 = no connection)
2. Apply a window function (Hanning or Hamming) to reduce spectral leakage -- improves detection magnitude by ~15-20%
3. Compute the FFT
4. Look for dominant frequency peaks above a threshold
5. The frequency of the peak corresponds to the beaconing interval

**Key parameters:**
- Time bucket size: 1 second for sub-minute beacons, 60 seconds for longer intervals
- Minimum observation window: 10x the suspected beacon interval
- Peak detection threshold: 3x the mean magnitude (z-score > 3)

**Rust crate:** `rustfft` (v6.x) for FFT computation.

```rust
use rustfft::{FftPlanner, num_complex::Complex};

fn detect_beacon_frequency(
    timestamps: &[u64],
    bucket_size_ms: u64,
    observation_window_ms: u64,
) -> Option<(f64, f64)> { // Returns (frequency_hz, magnitude)
    let num_buckets = (observation_window_ms / bucket_size_ms) as usize;
    let mut signal: Vec<Complex<f64>> = vec![Complex::new(0.0, 0.0); num_buckets];

    let start_time = timestamps[0];
    for &ts in timestamps {
        let bucket = ((ts - start_time) / bucket_size_ms) as usize;
        if bucket < num_buckets {
            signal[bucket] = Complex::new(1.0, 0.0);
        }
    }

    // Apply Hanning window
    for (i, sample) in signal.iter_mut().enumerate() {
        let window = 0.5 * (1.0 - (2.0 * std::f64::consts::PI * i as f64
                                     / (num_buckets as f64 - 1.0)).cos());
        sample.re *= window;
    }

    // Compute FFT
    let mut planner = FftPlanner::new();
    let fft = planner.plan_fft_forward(num_buckets);
    fft.process(&mut signal);

    // Find dominant frequency (skip DC component at index 0)
    let magnitudes: Vec<f64> = signal[1..num_buckets/2]
        .iter()
        .map(|c| (c.re.powi(2) + c.im.powi(2)).sqrt())
        .collect();

    let mean_mag = magnitudes.iter().sum::<f64>() / magnitudes.len() as f64;
    let threshold = mean_mag * 3.0; // 3x mean = significant peak

    magnitudes.iter()
        .enumerate()
        .filter(|(_, &mag)| mag > threshold)
        .max_by(|a, b| a.1.partial_cmp(b.1).unwrap())
        .map(|(idx, &mag)| {
            let freq_hz = (idx + 1) as f64 / (observation_window_ms as f64 / 1000.0);
            (freq_hz, mag)
        })
}
```

### 2.2 Data Exfiltration Detection

#### Upload Ratio Analysis

**Normal traffic profile:** Most endpoints have a download-heavy profile (ratio of bytes_sent/bytes_received < 0.3).

**Exfiltration indicators:**

| Metric | Threshold | Notes |
|--------|-----------|-------|
| Upload ratio | bytes_sent/bytes_received > 1.0 sustained over 30 min | Data exfil |
| Upload volume | > 50 MB to a single destination in 1 hour | Outside of known cloud services |
| Upload to rare dest | Any upload > 5 MB to an IP/domain never seen before | First-contact large upload |
| Chunked uploads | Multiple small uploads (< 1 MB each) at regular intervals | Staged exfil |

#### DNS Query Length Analysis

**Normal DNS query lengths:**
- Mean subdomain length: ~10-15 characters
- Standard deviation: ~5-8 characters

**Exfiltration thresholds:**
- Flag individual queries with subdomain length > 2 * standard_deviation above mean
- Flag domains where mean query length > 30 characters
- Shannon entropy of subdomain > 4.0 strongly indicates encoded data

```rust
fn dns_query_exfil_score(subdomain: &str) -> f64 {
    let length_score = if subdomain.len() > 50 { 1.0 }
                       else if subdomain.len() > 30 { 0.7 }
                       else if subdomain.len() > 20 { 0.3 }
                       else { 0.0 };

    let entropy = shannon_entropy(subdomain);
    let entropy_score = if entropy > 4.5 { 1.0 }
                        else if entropy > 4.0 { 0.7 }
                        else if entropy > 3.5 { 0.3 }
                        else { 0.0 };

    let has_hex_chars = subdomain.chars().all(|c| c.is_ascii_hexdigit() || c == '.');
    let encoding_score = if has_hex_chars { 0.8 } else { 0.0 };

    (length_score * 0.4 + entropy_score * 0.4 + encoding_score * 0.2).min(1.0)
}
```

### 2.3 Protocol Mismatch / Unusual Port Usage

**Detection rules:**

| Rule | Logic | Severity |
|------|-------|----------|
| HTTP on non-standard port | HTTP protocol signatures on port != 80/8080/8443/443 | Medium |
| TLS on non-standard port | TLS Client Hello on port != 443/8443/993/995/587 | Medium |
| IRC on non-standard port | IRC protocol signatures on port != 6667-6669/6697 | High |
| DNS on non-standard port | DNS protocol on port != 53/5353 | High |
| Raw TCP with no app protocol | Long-lived connection with binary data, no HTTP/TLS/DNS | Medium |
| SSH to external on non-22 | SSH handshake to external IP on unusual port | Medium |

**Implementation:** Parse the first few bytes of each new connection to identify the application-layer protocol, then compare against the destination port.

### 2.4 Long-Lived Connections to Rare Destinations

**Definition:** A connection that persists for > 30 minutes to a destination that:
- Is not in the top-1000 Alexa/Tranco list
- Has never been contacted by this endpoint before
- Is not a known CDN or cloud provider IP range

**Scoring:**
```
long_lived_score = duration_factor * rarity_factor * volume_factor

duration_factor:
  < 30 min  = 0.0
  30-60 min = 0.3
  1-4 hours = 0.6
  4-8 hours = 0.8
  > 8 hours = 1.0

rarity_factor:
  Seen by 0 other endpoints in org  = 1.0
  Seen by 1-5 other endpoints       = 0.5
  Seen by 5+ other endpoints        = 0.1
  In Tranco top-10K                  = 0.0

volume_factor:
  < 1 KB total     = 0.8  (keep-alive with minimal data = C2 idle)
  1 KB - 1 MB      = 0.5
  > 1 MB            = 0.3  (could be streaming/download)
```

### 2.5 Connection Frequency Analysis

Track per-destination connection frequency and flag anomalies:

```rust
struct DestinationProfile {
    destination: SocketAddr,
    first_seen: SystemTime,
    last_seen: SystemTime,
    connection_count: u64,
    total_bytes_sent: u64,
    total_bytes_received: u64,
    intervals: Vec<u64>,  // Ring buffer of last 100 inter-connection intervals
    process_ids: HashSet<u32>,
    domain: Option<String>,
}

impl DestinationProfile {
    fn connections_per_hour(&self) -> f64 {
        let duration = self.last_seen.duration_since(self.first_seen)
            .unwrap_or_default();
        let hours = duration.as_secs_f64() / 3600.0;
        if hours < 0.1 { return 0.0; }
        self.connection_count as f64 / hours
    }

    fn beacon_cov(&self) -> Option<f64> {
        coefficient_of_variation(&self.intervals)
    }
}
```

---

## 3. Host-Based Detection

### 3.1 Process-Network Correlation

**Critical capability:** Mapping which process initiated which network connection. This is the foundation that elevates raw network anomalies into actionable alerts.

#### Method 1: GetExtendedTcpTable / GetExtendedUdpTable (Polling)

Available via `windows-rs` crate:

```rust
use windows::Win32::NetworkManagement::IpHelper::*;

struct ProcessConnection {
    pid: u32,
    process_name: String,
    process_path: PathBuf,
    local_addr: SocketAddr,
    remote_addr: SocketAddr,
    state: TcpState,
    timestamp: SystemTime,
}

// Poll every 1-2 seconds
fn get_tcp_connections() -> Vec<ProcessConnection> {
    // Call GetExtendedTcpTable with TCP_TABLE_OWNER_PID_ALL
    // Parse MIB_TCPTABLE_OWNER_PID result
    // Map PIDs to process names via OpenProcess + QueryFullProcessImageName
    // Return vector of ProcessConnection
    todo!()
}
```

**Pros:** Simple, no elevated privileges needed for basic info, cross-referenced with process tree.
**Cons:** Polling-based so can miss short-lived connections. 1-second poll interval is typical.

#### Method 2: ETW Providers (Event-Driven)

**Real-time, event-driven** -- captures every connection including short-lived ones.

Key ETW Providers for network monitoring:

| Provider | GUID | Events |
|----------|------|--------|
| `Microsoft-Windows-TCPIP` | `{2F07E2EE-15DB-40F1-90EF-9D7BA282188A}` | TCP connect/disconnect with PID |
| `Microsoft-Windows-DNS-Client` | `{1C95126E-7EEA-49A9-A3FE-A378B03DDB4D}` | DNS queries with PID (Event ID 3020) |
| `Microsoft-Windows-WinINet` | `{43D1A55C-76D6-4F7E-995C-64C711E5CAFE}` | HTTP requests with headers |
| `Microsoft-Windows-Schannel` | `{1F678132-5938-4686-9FDC-C8FF68F15C85}` | TLS handshake details |
| `Microsoft-Windows-Networking-Correlation` | `{83ED54F0-4D48-4E45-B16E-726FFD1FA4AF}` | Correlates TCPIP and NDIS events |

**Rust implementation with ferrisetw:**
```rust
use ferrisetw::provider::*;
use ferrisetw::trace::*;
use ferrisetw::schema::*;

fn start_network_etw_trace() -> Result<(), Box<dyn std::error::Error>> {
    let dns_provider = Provider::by_guid("1C95126E-7EEA-49A9-A3FE-A378B03DDB4D")
        .add_callback(|record: &EventRecord, schema: &SchemaLocator| {
            if record.event_id() == 3020 {
                // Extract: ProcessId, QueryName, QueryType
                // Feed into DGA detector and DNS beaconing tracker
            }
        })
        .build()?;

    let tcp_provider = Provider::by_guid("2F07E2EE-15DB-40F1-90EF-9D7BA282188A")
        .add_callback(|record: &EventRecord, schema: &SchemaLocator| {
            // Extract: PID, source/dest IP:port, connection state
            // Feed into beaconing detector and connection tracker
        })
        .build()?;

    let trace = UserTrace::new()
        .enable(dns_provider)
        .enable(tcp_provider)
        .start()?;

    Ok(())
}
```

### 3.2 Suspicious Process Behaviors (Inject-then-Connect Pattern)

**Pattern:** Process A injects code into Process B, then Process B initiates a network connection.

**Detection sequence:**
1. Detect process injection (OpenProcess + WriteProcessMemory + CreateRemoteThread, or NtMapViewOfSection, etc.)
2. Track the target process
3. If the target process (previously not making network connections) suddenly connects to an external IP, flag it

**Key injection-to-C2 patterns:**

| Injection Method | Typical Target | C2 Follow-up |
|-----------------|----------------|---------------|
| CreateRemoteThread | svchost.exe, explorer.exe | HTTP/HTTPS beacon |
| QueueUserAPC | rundll32.exe | DNS tunneling |
| Process Hollowing | legitimate signed binary | TLS to rare IP |
| DLL Side-loading | signed application | Named pipe relay |

**SentryLion approach:** Maintain a "network baseline" per process. If a process that has never made external connections suddenly starts connecting to external IPs (especially after being the target of cross-process memory operations), escalate to high-severity alert.

### 3.3 WMI / Scheduled Task Persistence with C2 Callbacks

#### WMI Event Subscription Persistence

**MITRE:** T1546.003

**Detection points:**
- Monitor WMI event filter creation: `__EventFilter` instances
- Monitor WMI event consumer creation: `CommandLineEventConsumer`, `ActiveScriptEventConsumer`
- Monitor WMI event binding: `__FilterToConsumerBinding`

**ETW Provider:** `Microsoft-Windows-WMI-Activity` (`{1418EF04-B0B4-4623-BF7E-D74AB47BBDAA}`)

**Registry locations to monitor:**
```
HKLM\SOFTWARE\Microsoft\WBEM\ESS\
```

**What to flag:**
- WMI event subscription that triggers a script or executable
- Consumer action that downloads or contacts an external URL
- Bindings that persist across reboot (permanent subscriptions)

#### Scheduled Task Persistence

**MITRE:** T1053.005

**Registry locations:**
```
HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\TaskCache\Tasks\
HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Schedule\TaskCache\Tree\
```

**Filesystem location:**
```
C:\Windows\System32\Tasks\
```

**What to flag:**
- Tasks that execute scripts (powershell.exe, wscript.exe, cscript.exe, mshta.exe)
- Tasks that run executables from `%TEMP%`, `%APPDATA%`, `%PROGRAMDATA%`, or user-writable paths
- Tasks with very short repeat intervals (< 5 minutes)
- Tasks created by non-administrative processes
- Hidden tasks (tasks with `SD` security descriptor denying read access)

### 3.4 Named Pipe-Based C2 (Cobalt Strike SMB Beacon)

**What it is:** Cobalt Strike's SMB Beacon communicates over Windows named pipes, encapsulated in the SMB protocol. This allows lateral movement without direct external connections.

**Default pipe names (configurable, but defaults are common):**

| Pipe Name Pattern | Tool |
|-------------------|------|
| `\\.\pipe\msagent_*` | Cobalt Strike SMB Beacon (default) |
| `\\.\pipe\interprocess_*` | Cobalt Strike |
| `\\.\pipe\postex_*` | Cobalt Strike post-exploitation |
| `\\.\pipe\status_*` | Cobalt Strike |
| `\\.\pipe\msse-*` | Cobalt Strike (mimicking Microsoft) |
| `\\.\pipe\MSSE-*-server` | Cobalt Strike |
| `\\.\pipe\win_svc` | Metasploit named pipe |
| `\\.\pipe\ntsvcs` | PsExec lateral movement |

**Detection approach:**

1. **ETW Provider:** Use Sysmon-equivalent ETW events (Event ID 17 = PipeCreated, Event ID 18 = PipeConnected)
2. **Direct monitoring:** `NtCreateNamedPipeFile` and `NtOpenFile` for pipe paths
3. **Named pipe regex patterns:**
   ```
   \\.\pipe\msagent_[0-9a-f]+
   \\.\pipe\postex_[0-9a-f]+
   \\.\pipe\status_[0-9a-f]+
   \\.\pipe\msse-[0-9]+-server
   \\.\pipe\interprocess_[0-9a-f]+
   ```

4. **Behavioral detection:** Flag named pipes that:
   - Are created by processes loaded from unusual paths
   - Have high throughput (data being relayed through them)
   - Are connected to by processes running as SYSTEM from non-standard locations

```rust
fn is_suspicious_pipe_name(pipe_name: &str) -> bool {
    let suspicious_patterns = [
        r"\\\.\\pipe\\msagent_[0-9a-f]+",
        r"\\\.\\pipe\\postex_[0-9a-f]+",
        r"\\\.\\pipe\\status_[0-9a-f]+",
        r"\\\.\\pipe\\msse-[0-9]+-server",
        r"\\\.\\pipe\\interprocess_[0-9a-f]+",
        r"\\\.\\pipe\\win_svc",
        r"\\\.\\pipe\\[0-9a-f]{6,8}",  // Short hex pipe names (GetSystem)
    ];

    suspicious_patterns.iter().any(|pattern| {
        regex::Regex::new(pattern).unwrap().is_match(pipe_name)
    })
}
```

### 3.5 Registry-Based C2 Configuration Storage

**What it is:** Malware stores C2 server addresses, encryption keys, bot IDs, and other configuration data in the Windows registry to survive reboots.

**Common registry locations for C2 configs:**

| Location | What's Stored | Examples |
|----------|--------------|----------|
| `HKCU\Software\<random>` | C2 URL, bot ID, sleep interval | TrickBot, Emotet |
| `HKLM\SOFTWARE\<random>\<random>` | Encoded config blob | Dridex |
| `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` | Persistence + encoded C2 | General malware |
| `HKLM\SYSTEM\CurrentControlSet\Services\<svc>\Parameters` | C2 as service parameter | Service-based backdoors |
| `HKCU\Environment` | C2 URL in env variable | Living-off-the-land |

**Detection approach:**
- Monitor registry writes to `Run`/`RunOnce` keys
- Flag registry values containing base64-encoded data (entropy > 4.5)
- Flag registry values containing IP addresses or URLs
- Monitor for large registry values (> 1 KB) in uncommon locations
- Detect registry values written by processes from temporary directories

---

## 4. Free Threat Intelligence Feeds

### 4.1 abuse.ch Ecosystem

| Feed | URL | Format | Update Freq | Content |
|------|-----|--------|-------------|---------|
| **Feodo Tracker C2 IPs** | `https://feodotracker.abuse.ch/downloads/ipblocklist.txt` | Plain text (one IP per line) | Every 5 minutes | Active C2 IPs for Dridex, Emotet, TrickBot, QakBot, BazarLoader |
| **Feodo Tracker (Recommended)** | `https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.txt` | Plain text | Every 5 minutes | Curated subset, fewer FPs |
| **URLhaus** | `https://urlhaus.abuse.ch/downloads/csv_recent/` | CSV | Every 5 minutes | Malware distribution URLs |
| **URLhaus (text)** | `https://urlhaus.abuse.ch/downloads/text_recent/` | Plain text | Every 5 minutes | URLs only |
| **ThreatFox IOCs** | `https://threatfox.abuse.ch/export/` | CSV, JSON, MISP, Suricata rules | Daily | IOCs (IPs, domains, URLs, hashes) |
| **ThreatFox API** | `https://threatfox-api.abuse.ch/api/v1/` | JSON (POST) | Real-time | Query-based IOC lookup |
| **MalwareBazaar** | `https://bazaar.abuse.ch/export/` | CSV, JSON | Continuous | Malware sample hashes (SHA256, MD5) |
| **SSLBL (JA3)** | `https://sslbl.abuse.ch/ja3-fingerprints/` | CSV | Daily | Known-bad JA3 fingerprints |
| **SSLBL (C2 IPs)** | `https://sslbl.abuse.ch/blacklist/sslipblacklist.csv` | CSV | Daily | C2 IPs identified via SSL certificates |

**Note (2025 change):** ThreatFox now expires IOCs older than 6 months. Plan for regular feed updates.

**Rust integration pattern:**
```rust
// Feodo Tracker plain-text ingestion
async fn fetch_feodo_blocklist(client: &reqwest::Client) -> Result<HashSet<IpAddr>> {
    let resp = client.get("https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.txt")
        .send().await?.text().await?;

    let ips: HashSet<IpAddr> = resp.lines()
        .filter(|line| !line.starts_with('#') && !line.is_empty())
        .filter_map(|line| line.trim().parse().ok())
        .collect();

    Ok(ips)
}
```

### 4.2 Spamhaus

| Feed | URL | Format | Content |
|------|-----|--------|---------|
| **DROP** | `https://www.spamhaus.org/drop/drop.txt` | Plain text (CIDR blocks) | Hijacked netblocks used for spam/malware/botnets |
| **DROPv6** | `https://www.spamhaus.org/drop/dropv6.txt` | Plain text (CIDR blocks) | IPv6 version |

**Note (2024 change):** eDROP has been consolidated into DROP as of April 2024. The eDROP file is now empty.

**Format:** One CIDR block per line, with SBL reference number after semicolon.
```
1.10.16.0/20 ; SBL256263
```

### 4.3 Other Free Feeds

| Feed | URL | Format | Update | Content |
|------|-----|--------|--------|---------|
| **AlienVault OTX** | `https://otx.alienvault.com/api/v1/` | JSON (REST API) | Continuous | Community-sourced IOCs (IPs, domains, hashes, URLs) |
| **OpenPhish** | `https://openphish.com/feed.txt` | Plain text | Every 12 hours | Active phishing URLs |
| **EmergingThreats (compromised IPs)** | `https://rules.emergingthreats.net/blockrules/compromised-ips.txt` | Plain text | Daily | Compromised IP addresses |
| **EmergingThreats (C2 rules)** | `https://rules.emergingthreats.net/open/suricata/rules/botcc.rules` | Suricata rules | Daily | Botnet C2 detection signatures |
| **DShield/SANS Top IPs** | `https://isc.sans.edu/api/threatlist/shodan/?json` | JSON | Hourly | Top attacking IPs |
| **DShield Domains** | `https://isc.sans.edu/feeds/domaindata.json.gz` | JSON (gzip) | Hourly | Newly observed domains |
| **Blocklist.de** | `https://lists.blocklist.de/lists/all.txt` | Plain text | Real-time | IPs reported for attacks (SSH brute force, mail spam, etc.) |
| **CINS Score** | `https://cinsscore.com/list/ci-badguys.txt` | Plain text | Daily | Malicious IPs from CINS Army |
| **Botvrij** | `https://www.botvrij.eu/data/ioclist.csv` | CSV | Weekly | European botnet C2 indicators |

**API key requirements:**
- AlienVault OTX: Free API key required (register at otx.alienvault.com)
- All others: No API key required

### 4.4 Feed Ingestion Architecture

```
                     +-------------------+
                     |  Feed Scheduler   |
                     |  (tokio::interval) |
                     +--------+----------+
                              |
              +---------------+---------------+
              |               |               |
     +--------v---+   +------v-----+  +------v-------+
     | HTTP Feeds |   | DNS Feeds  |  | API Feeds    |
     | (txt, CSV) |   | (RPZ)      |  | (JSON, REST) |
     +--------+---+   +------+-----+  +------+-------+
              |               |               |
              +---------------+---------------+
                              |
                     +--------v----------+
                     |  Parser/Normalizer|
                     |  (per-feed format)|
                     +--------+----------+
                              |
                     +--------v----------+
                     |  IOC Store        |
                     |  (Bloom + HashMap)|
                     +-------------------+
```

**Recommended update schedule:**

| Feed Category | Interval | Rationale |
|---------------|----------|-----------|
| Feodo Tracker | 5 minutes | Rapidly changing C2 infrastructure |
| URLhaus | 15 minutes | New malware URLs discovered frequently |
| Spamhaus DROP | 1 hour | Netblocks change slowly |
| ThreatFox | 1 hour | Moderate change rate |
| DShield | 1 hour | Aggregated daily data |
| EmergingThreats | 6 hours | Rule sets change slowly |
| OpenPhish | 12 hours | Updated twice daily |
| AlienVault OTX | 1 hour | Community-driven, variable |

---

## 5. IOC Matching at Scale in Rust

### 5.1 Two-Tier Architecture: Bloom Filter + HashMap

**Problem:** Checking every DNS query, IP connection, and URL against millions of IOCs must be fast (sub-microsecond per check).

**Solution:** Two-tier lookup:
1. **Bloom filter** for fast rejection (99.9% of lookups are negative)
2. **HashMap** for confirmed positive matches (only queried when Bloom says "maybe")

#### Bloom Filter Sizing Math

**Formula:**
```
m = -(n * ln(p)) / (ln(2))^2
k = (m / n) * ln(2)

Where:
  n = number of elements
  p = desired false positive rate
  m = number of bits needed
  k = optimal number of hash functions
```

**Calculations for SentryLion:**

| Scenario | n (elements) | p (FP rate) | m (bits) | m (MB) | k (hashes) |
|----------|-------------|-------------|----------|--------|------------|
| 100K IOCs | 100,000 | 0.001 (0.1%) | 1,437,759 | 0.17 | 10 |
| 1M IOCs | 1,000,000 | 0.001 (0.1%) | 14,377,588 | 1.7 | 10 |
| 10M IOCs | 10,000,000 | 0.001 (0.1%) | 143,775,875 | 17.1 | 10 |
| 10M IOCs | 10,000,000 | 0.01 (1%) | 95,850,584 | 11.4 | 7 |
| 10M IOCs | 10,000,000 | 0.0001 (0.01%) | 191,701,167 | 22.8 | 13 |

**Recommendation:** For 10M IOCs at 0.1% FP rate, allocate ~17 MB for the Bloom filter. This is negligible for an endpoint agent.

```rust
use bloom::BloomFilter;
use hashbrown::HashMap;

struct IocStore {
    // Tier 1: Fast rejection (sub-microsecond)
    bloom: BloomFilter,

    // Tier 2: Confirmed matches with metadata
    ip_iocs: HashMap<IpAddr, IocMetadata>,
    domain_iocs: HashMap<String, IocMetadata>,
    hash_iocs: HashMap<String, IocMetadata>,  // SHA256 -> metadata
    url_patterns: AhoCorasick,                 // Multi-pattern URL matching
    cidr_blocks: RadixTrie<IpAddr, IocMetadata>, // CIDR prefix matching
}

struct IocMetadata {
    source: String,        // "feodo_tracker", "urlhaus", etc.
    severity: Severity,
    threat_type: String,   // "c2", "malware_distribution", "phishing"
    first_seen: DateTime<Utc>,
    tags: Vec<String>,
    reference_url: Option<String>,
}

impl IocStore {
    fn check_ip(&self, ip: &IpAddr) -> Option<&IocMetadata> {
        // Tier 1: Bloom filter fast reject
        let key = ip.to_string();
        if !self.bloom.contains(&key) {
            return None; // Definitely not in IOC set
        }

        // Tier 2: Exact match lookup
        if let Some(meta) = self.ip_iocs.get(ip) {
            return Some(meta);
        }

        // Tier 2b: CIDR prefix match
        self.cidr_blocks.get(ip)
    }

    fn check_domain(&self, domain: &str) -> Option<&IocMetadata> {
        let lower = domain.to_lowercase();
        if !self.bloom.contains(&lower) {
            return None;
        }
        self.domain_iocs.get(&lower)
    }
}
```

### 5.2 Aho-Corasick for Multi-Pattern String Matching

**Use case:** Matching URLs, file paths, or command-line strings against thousands of patterns simultaneously.

```rust
use aho_corasick::AhoCorasick;

struct UrlMatcher {
    automaton: AhoCorasick,
    pattern_metadata: Vec<IocMetadata>,
}

impl UrlMatcher {
    fn new(patterns: Vec<(String, IocMetadata)>) -> Self {
        let (pattern_strings, metadata): (Vec<_>, Vec<_>) =
            patterns.into_iter().unzip();

        let automaton = AhoCorasick::builder()
            .ascii_case_insensitive(true)
            .build(&pattern_strings)
            .expect("Failed to build Aho-Corasick automaton");

        UrlMatcher { automaton, pattern_metadata: metadata }
    }

    fn check_url(&self, url: &str) -> Vec<&IocMetadata> {
        self.automaton.find_overlapping_iter(url)
            .map(|mat| &self.pattern_metadata[mat.pattern().as_usize()])
            .collect()
    }
}
```

**Performance:** Aho-Corasick scans at ~1 GB/s per core, regardless of the number of patterns. 10,000 URL patterns in 1 microsecond per 1 KB URL.

### 5.3 Radix Trie for CIDR Block Matching

**Use case:** Matching IPs against CIDR blocks from Spamhaus DROP, etc.

```rust
use radix_trie::Trie;
use std::net::Ipv4Addr;

struct CidrMatcher {
    trie: Trie<Vec<u8>, CidrMetadata>,
}

struct CidrMetadata {
    cidr: String,
    source: String,
    sbl_reference: Option<String>,
}

impl CidrMatcher {
    fn insert_cidr(&mut self, cidr: &str, metadata: CidrMetadata) {
        // Parse "1.10.16.0/20" into prefix bits
        let parts: Vec<&str> = cidr.split('/').collect();
        let ip: Ipv4Addr = parts[0].parse().unwrap();
        let prefix_len: usize = parts[1].parse().unwrap();

        let ip_bytes = ip.octets();
        let prefix_bits = Self::extract_prefix_bits(&ip_bytes, prefix_len);

        self.trie.insert(prefix_bits, metadata);
    }

    fn check_ip(&self, ip: Ipv4Addr) -> Option<&CidrMetadata> {
        let ip_bytes = ip.octets();
        // Find longest prefix match
        let full_bits = Self::extract_prefix_bits(&ip_bytes, 32);
        self.trie.get_ancestor_value(&full_bits)
    }

    fn extract_prefix_bits(octets: &[u8; 4], prefix_len: usize) -> Vec<u8> {
        let mut bits = Vec::with_capacity(prefix_len);
        for i in 0..prefix_len {
            let byte_idx = i / 8;
            let bit_idx = 7 - (i % 8);
            bits.push((octets[byte_idx] >> bit_idx) & 1);
        }
        bits
    }
}
```

---

## 6. DGA Detection Algorithm

### 6.1 Feature Extraction

For each domain name (second-level domain only, TLD removed):

#### Shannon Entropy

```rust
fn shannon_entropy(s: &str) -> f64 {
    let len = s.len() as f64;
    if len == 0.0 { return 0.0; }

    let mut freq = [0u32; 256];
    for &b in s.as_bytes() {
        freq[b as usize] += 1;
    }

    freq.iter()
        .filter(|&&count| count > 0)
        .map(|&count| {
            let p = count as f64 / len;
            -p * p.log2()
        })
        .sum()
}
```

**Thresholds:**

| Entropy | Classification |
|---------|---------------|
| < 2.5 | Very likely legitimate (short, repetitive: "aaa.com") |
| 2.5 - 3.5 | Likely legitimate (normal words: "google.com") |
| 3.5 - 4.0 | Borderline (could be abbreviation or DGA) |
| 4.0 - 4.5 | Suspicious (high randomness) |
| > 4.5 | Very likely DGA |

#### Consonant Ratio

```rust
fn consonant_ratio(s: &str) -> f64 {
    let vowels = b"aeiouAEIOU";
    let alpha_chars: Vec<u8> = s.bytes().filter(|b| b.is_ascii_alphabetic()).collect();
    if alpha_chars.is_empty() { return 0.0; }

    let consonants = alpha_chars.iter()
        .filter(|b| !vowels.contains(b))
        .count();

    consonants as f64 / alpha_chars.len() as f64
}
```

**Thresholds:**
- Normal English: 0.55 - 0.65
- DGA domains: > 0.70 (many consonant clusters)
- Some DGA families: < 0.45 (vowel-heavy randomness)

#### Bigram Frequency Analysis

Compare bigram frequencies against a reference corpus of legitimate domains.

```rust
use std::collections::HashMap;

struct BigramModel {
    // Bigram -> frequency in legitimate domains (normalized 0.0-1.0)
    frequencies: HashMap<[u8; 2], f64>,
    mean_freq: f64,
}

impl BigramModel {
    /// Load from pre-computed legitimate domain corpus
    fn from_tranco_top1m(domains: &[String]) -> Self {
        let mut bigram_counts: HashMap<[u8; 2], u64> = HashMap::new();
        let mut total_bigrams: u64 = 0;

        for domain in domains {
            let lower = domain.to_lowercase();
            let bytes = lower.as_bytes();
            for window in bytes.windows(2) {
                let bigram = [window[0], window[1]];
                *bigram_counts.entry(bigram).or_insert(0) += 1;
                total_bigrams += 1;
            }
        }

        let frequencies: HashMap<[u8; 2], f64> = bigram_counts.iter()
            .map(|(&k, &v)| (k, v as f64 / total_bigrams as f64))
            .collect();

        let mean_freq = frequencies.values().sum::<f64>() / frequencies.len() as f64;

        BigramModel { frequencies, mean_freq }
    }

    /// Score a domain: lower = more suspicious (less common bigrams)
    fn score_domain(&self, domain: &str) -> f64 {
        let lower = domain.to_lowercase();
        let bytes = lower.as_bytes();
        if bytes.len() < 2 { return 0.0; }

        let bigram_scores: Vec<f64> = bytes.windows(2)
            .map(|w| {
                let bigram = [w[0], w[1]];
                *self.frequencies.get(&bigram).unwrap_or(&0.0)
            })
            .collect();

        // Geometric mean of bigram frequencies (sensitive to outliers)
        let log_sum: f64 = bigram_scores.iter()
            .map(|&s| if s > 0.0 { s.ln() } else { -20.0 }) // -20 for unseen bigrams
            .sum();

        (log_sum / bigram_scores.len() as f64).exp()
    }
}
```

#### N-gram Analysis Against English Language Model

Extend bigram analysis to trigrams and 4-grams for higher accuracy. Research shows trigram and 4-gram entropy are the strongest predictors.

```rust
fn ngram_score(domain: &str, n: usize, model: &HashMap<Vec<u8>, f64>) -> f64 {
    let bytes = domain.to_lowercase().into_bytes();
    if bytes.len() < n { return 0.0; }

    let scores: Vec<f64> = bytes.windows(n)
        .map(|w| *model.get(w).unwrap_or(&1e-10))
        .collect();

    // Average log-probability
    scores.iter().map(|s| s.ln()).sum::<f64>() / scores.len() as f64
}
```

#### Domain Length Analysis

| Length | Classification |
|--------|---------------|
| 1-6 chars | Normal (short brand names) |
| 7-12 chars | Normal (most legitimate domains) |
| 13-18 chars | Slightly long but common |
| 19-25 chars | Suspicious (uncommon for legitimate) |
| > 25 chars | Highly suspicious (DGA or subdomain abuse) |

### 6.2 Combined DGA Scoring

```rust
struct DgaDetector {
    bigram_model: BigramModel,
    trigram_model: HashMap<Vec<u8>, f64>,
}

struct DgaScore {
    entropy: f64,
    consonant_ratio: f64,
    bigram_score: f64,
    trigram_score: f64,
    length_score: f64,
    digit_ratio: f64,
    composite_score: f64,  // 0.0 (legitimate) to 1.0 (DGA)
    is_dga: bool,
}

impl DgaDetector {
    fn analyze(&self, domain: &str) -> DgaScore {
        // Strip TLD
        let sld = domain.split('.').next().unwrap_or(domain);

        let entropy = shannon_entropy(sld);
        let consonant_r = consonant_ratio(sld);
        let bigram = self.bigram_model.score_domain(sld);
        let trigram = ngram_score(sld, 3, &self.trigram_model);

        let length = sld.len();
        let length_score = match length {
            0..=12 => 0.0,
            13..=18 => 0.3,
            19..=25 => 0.6,
            _ => 1.0,
        };

        let digit_ratio = sld.chars().filter(|c| c.is_ascii_digit()).count() as f64
                         / sld.len().max(1) as f64;

        // Weighted composite score
        let entropy_score = ((entropy - 3.0) / 2.0).clamp(0.0, 1.0);
        let consonant_score = ((consonant_r - 0.65) / 0.2).clamp(0.0, 1.0);
        let bigram_normalized = (1.0 - (bigram / self.bigram_model.mean_freq).min(1.0));
        let digit_score = (digit_ratio / 0.3).min(1.0);

        let composite = entropy_score * 0.25
                       + consonant_score * 0.10
                       + bigram_normalized * 0.25
                       + length_score * 0.15
                       + digit_score * 0.10
                       + (-trigram / 10.0).clamp(0.0, 1.0) * 0.15;

        DgaScore {
            entropy,
            consonant_ratio: consonant_r,
            bigram_score: bigram,
            trigram_score: trigram,
            length_score,
            digit_ratio,
            composite_score: composite,
            is_dga: composite > 0.65,  // Tunable threshold
        }
    }
}
```

**Threshold tuning guidance:**
- 0.50: High sensitivity (more FPs, catches most DGA)
- 0.65: Balanced (recommended starting point)
- 0.80: High specificity (fewer FPs, may miss some DGA families)

**Known DGA families and their characteristics:**

| Family | Entropy | Length | Digits | Notes |
|--------|---------|--------|--------|-------|
| Conficker | 3.8-4.5 | 5-12 | Low | Dictionary-based variants exist |
| Necurs | 4.0-4.8 | 15-25 | Low | Long random strings |
| CryptoLocker | 4.2-4.7 | 12-18 | Low | Pure random alpha |
| Suppobox | 3.0-3.8 | 10-20 | Low | Concatenated dictionary words |
| Banjori | 3.5-4.2 | 8-15 | Medium | Incremental mutation |
| Emotet/Epoch | 4.0-4.5 | 8-14 | Low | Short random strings |

---

## 7. DNS Beaconing Detection

### 7.1 Interval Coefficient of Variation

Same algorithm as network beaconing (Section 2.1), but applied specifically to DNS queries per domain.

```rust
struct DnsBeaconTracker {
    // domain -> list of query timestamps
    domain_queries: HashMap<String, VecDeque<u64>>,
    max_history: usize,  // Keep last 500 timestamps per domain
}

impl DnsBeaconTracker {
    fn record_query(&mut self, domain: &str, timestamp_ms: u64) {
        let entry = self.domain_queries
            .entry(domain.to_lowercase())
            .or_insert_with(|| VecDeque::with_capacity(self.max_history));

        if entry.len() >= self.max_history {
            entry.pop_front();
        }
        entry.push_back(timestamp_ms);
    }

    fn check_beaconing(&self, domain: &str) -> Option<BeaconResult> {
        let queries = self.domain_queries.get(domain)?;
        if queries.len() < 20 { return None; }

        let timestamps: Vec<u64> = queries.iter().copied().collect();
        let cov = coefficient_of_variation(&timestamps)?;

        // Calculate mean interval
        let intervals: Vec<f64> = timestamps.windows(2)
            .map(|w| (w[1] - w[0]) as f64)
            .collect();
        let mean_interval_ms = intervals.iter().sum::<f64>() / intervals.len() as f64;

        Some(BeaconResult {
            domain: domain.to_string(),
            cov,
            confidence: classify_beacon(cov),
            mean_interval_seconds: mean_interval_ms / 1000.0,
            sample_count: timestamps.len(),
            observation_window_hours: (timestamps.last().unwrap() - timestamps.first().unwrap())
                                     as f64 / 3_600_000.0,
        })
    }
}

struct BeaconResult {
    domain: String,
    cov: f64,
    confidence: BeaconConfidence,
    mean_interval_seconds: f64,
    sample_count: usize,
    observation_window_hours: f64,
}

enum BeaconConfidence {
    Strong,   // CoV < 0.05
    Likely,   // CoV 0.05 - 0.15
    Possible, // CoV 0.15 - 0.30
    Weak,     // CoV 0.30 - 0.50
    None,     // CoV > 0.50
}
```

### 7.2 Jitter Analysis

C2 frameworks like Cobalt Strike add configurable jitter to avoid perfect periodicity.

**Cobalt Strike defaults:**
- Sleep: 60 seconds
- Jitter: 0% to 50% (configurable)

**Detection approach:**
- Even with 50% jitter, the CoV stays below 0.30
- With 20% jitter (common): CoV ~ 0.10-0.15
- With 10% jitter: CoV ~ 0.05-0.10

**Additional jitter detection: Histogram analysis**
```rust
fn jitter_histogram_analysis(intervals: &[f64]) -> bool {
    // Bin intervals into buckets
    let min_interval = intervals.iter().cloned().fold(f64::INFINITY, f64::min);
    let max_interval = intervals.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let range = max_interval - min_interval;

    if range == 0.0 { return true; } // Perfect beacon

    let bucket_count = 20;
    let bucket_size = range / bucket_count as f64;
    let mut histogram = vec![0u32; bucket_count];

    for &interval in intervals {
        let bucket = ((interval - min_interval) / bucket_size).min(bucket_count as f64 - 1.0) as usize;
        histogram[bucket] += 1;
    }

    // Beaconing with jitter produces a unimodal distribution
    // (single peak centered on the base interval)
    let max_bucket = *histogram.iter().max().unwrap();
    let peak_ratio = max_bucket as f64 / intervals.len() as f64;

    // If >30% of intervals fall in the same bucket, likely beacon with jitter
    peak_ratio > 0.30
}
```

### 7.3 Query Volume Analysis Per Domain

| Metric | Legitimate Domain | C2 Domain |
|--------|-------------------|-----------|
| Queries/hour | Varies widely, bursty | Steady, periodic |
| Unique query names | 1-10 per domain | 1-3 (or hundreds for tunneling) |
| Time coverage | Business hours weighted | 24/7 including night |
| Weekend queries | Much reduced | Same as weekday |

### 7.4 Subdomain Entropy Analysis

For DNS tunneling, each query encodes data in the subdomain:

```
[base64_encoded_data].evil.com
aGVsbG8gd29ybGQ.evil.com
dGhpcyBpcyBkYXRh.evil.com
```

```rust
fn subdomain_entropy_analysis(queries: &[String], base_domain: &str) -> DnsTunnelingScore {
    let subdomains: Vec<&str> = queries.iter()
        .filter_map(|q| q.strip_suffix(base_domain))
        .filter_map(|s| s.strip_suffix('.'))
        .collect();

    if subdomains.is_empty() {
        return DnsTunnelingScore::default();
    }

    let mean_length = subdomains.iter().map(|s| s.len()).sum::<usize>() as f64
                     / subdomains.len() as f64;

    let mean_entropy = subdomains.iter()
        .map(|s| shannon_entropy(s))
        .sum::<f64>() / subdomains.len() as f64;

    let unique_ratio = {
        let unique: HashSet<&&str> = subdomains.iter().collect();
        unique.len() as f64 / subdomains.len() as f64
    };

    DnsTunnelingScore {
        mean_subdomain_length: mean_length,
        mean_subdomain_entropy: mean_entropy,
        unique_subdomain_ratio: unique_ratio,
        query_count: subdomains.len(),
        is_tunneling: mean_length > 25.0 && mean_entropy > 3.8 && unique_ratio > 0.90,
    }
}

struct DnsTunnelingScore {
    mean_subdomain_length: f64,
    mean_subdomain_entropy: f64,
    unique_subdomain_ratio: f64,
    query_count: usize,
    is_tunneling: bool,
}
```

---

## 8. MITRE ATT&CK Mapping

### 8.1 Command and Control (TA0011) Techniques

| Technique ID | Name | SentryLion Detection Approach |
|-------------|------|-------------------------------|
| **T1071** | **Application Layer Protocol** | |
| T1071.001 | Web Protocols (HTTP/HTTPS) | Beaconing detection, JA3 fingerprinting, URL IOC matching |
| T1071.002 | File Transfer Protocols | Monitor FTP/SFTP connections from non-standard processes |
| T1071.003 | Mail Protocols | SMTP connections from non-mail processes |
| T1071.004 | DNS | DNS tunneling detection, DGA detection, query analysis |
| **T1568** | **Dynamic Resolution** | |
| T1568.001 | Fast Flux DNS | TTL analysis, IP rotation detection, ASN diversity |
| T1568.002 | Domain Generation Algorithms | Shannon entropy, bigram analysis, consonant ratio |
| T1568.003 | DNS Calculation | Monitor for DNS queries that encode/decode IP addresses |
| **T1573** | **Encrypted Channel** | |
| T1573.001 | Symmetric Cryptography | JA3 fingerprinting, cert anomaly detection |
| T1573.002 | Asymmetric Cryptography | TLS certificate analysis, self-signed cert detection |
| **T1008** | **Fallback Channels** | Multiple C2 destinations from same process, domain failover patterns |
| **T1105** | **Ingress Tool Transfer** | Large downloads from rare destinations, process-network correlation |
| **T1572** | **Protocol Tunneling** | DNS tunneling (TXT/CNAME), ICMP tunneling, protocol mismatch on ports |
| **T1001** | **Data Obfuscation** | |
| T1001.001 | Junk Data | Unusual payload sizes, high entropy in non-TLS streams |
| T1001.002 | Steganography | Image downloads by non-browser processes (harder to detect) |
| T1001.003 | Protocol Impersonation | Protocol mismatch detection (HTTP on non-HTTP ports) |
| **T1090** | **Proxy** | |
| T1090.001 | Internal Proxy | Named pipe relay detection (SMB Beacon) |
| T1090.002 | External Proxy | Connections through known proxy/VPN services |
| T1090.003 | Multi-hop Proxy | Tor exit node IP matching |
| T1090.004 | Domain Fronting | SNI vs Host header mismatch |
| **T1095** | **Non-Application Layer Protocol** | Raw TCP/UDP/ICMP to external IPs from non-standard processes |
| **T1102** | **Web Service** | Connections to known C2-abused services (Pastebin, GitHub Gists, Discord webhooks, Telegram API) |
| **T1104** | **Multi-Stage Channels** | Sequential connections to different C2s within short timeframe |
| **T1132** | **Data Encoding** | |
| T1132.001 | Standard Encoding | Base64 patterns in URLs, DNS queries, HTTP headers |
| T1132.002 | Non-Standard Encoding | High entropy in cleartext protocol fields |
| **T1219** | **Remote Access Software** | Connections to known RAT C2 infrastructure (TeamViewer, AnyDesk from CLI) |
| **T1571** | **Non-Standard Port** | Known protocols on unexpected ports |

### 8.2 Related Techniques (Persistence/Execution leading to C2)

| Technique | Name | Relevance to C2 Detection |
|-----------|------|--------------------------|
| T1053.005 | Scheduled Task | Task executes script that calls back to C2 |
| T1546.003 | WMI Event Subscription | WMI consumer triggers C2 callback |
| T1543.003 | Windows Service | Service starts and initiates C2 |
| T1055 | Process Injection | Inject code that initiates C2 from trusted process |
| T1059 | Command and Scripting Interpreter | PowerShell/cmd.exe used for C2 download |

---

## 9. Rust Crate Reference

### 9.1 Network Monitoring

| Crate | Version | Purpose | Notes |
|-------|---------|---------|-------|
| `pnet` | 0.35+ | Low-level packet capture and parsing | Requires Npcap on Windows. Parses Ethernet/IP/TCP/UDP. |
| `pcap` | 2.2+ | Libpcap/Npcap wrapper | Requires Npcap on Windows. Packet capture, BPF filters. |
| `ferrisetw` | 1.1+ | Windows ETW consumer | **Recommended for SentryLion.** Event-driven, no packet capture needed. Rust-idiomatic API. KrabsETW equivalent. |
| `windows` | 0.58+ | Windows API bindings | GetExtendedTcpTable, process APIs. Official Microsoft crate. |
| `netstat2` | 0.9+ | Cross-platform netstat | Higher-level API for connection enumeration with PIDs. |
| `rustfft` | 6.2+ | FFT computation | For Fourier-based beaconing detection. |

### 9.2 DNS Parsing

| Crate | Version | Purpose | Notes |
|-------|---------|---------|-------|
| `hickory-proto` | 0.24+ | DNS protocol library | **Replaces trust-dns-proto** (rebranded 2024). Full DNS message parsing. |
| `hickory-resolver` | 0.24+ | DNS resolver | Async DNS resolution with full response parsing. |
| `dns-parser` | 0.8+ | Lightweight DNS parsing | Simpler alternative for just parsing DNS packets. |

### 9.3 TLS / Certificate Analysis

| Crate | Version | Purpose | Notes |
|-------|---------|---------|-------|
| `x509-parser` | 0.16+ | X.509 certificate parsing | Parse DER/PEM certs. Extract subject, issuer, validity, SAN, key info. |
| `rustls` | 0.23+ | TLS implementation | Can intercept TLS handshakes, extract Client Hello for JA3. |
| `der-parser` | 9.0+ | ASN.1 DER parsing | Low-level cert field access. |
| `md-5` | 0.10+ | MD5 hash | For JA3 hash computation. |

### 9.4 IP Geolocation

| Crate | Version | Purpose | Notes |
|-------|---------|---------|-------|
| `maxminddb` | 0.24+ | MaxMind GeoIP2/GeoLite2 reader | Free GeoLite2 database (requires free account). ASN, country, city lookup. |

### 9.5 Pattern Matching & Data Structures

| Crate | Version | Purpose | Notes |
|-------|---------|---------|-------|
| `aho-corasick` | 1.1+ | Multi-pattern string matching | By BurntSushi. Linear-time search, SIMD optimized. |
| `regex` | 1.10+ | Regular expressions | Named pipe patterns, protocol signatures. |
| `bloom` | 0.3+ | Bloom filter | BloomFilter::with_rate(fp_rate, num_items). |
| `bloomfilter` | 1.0+ | Alternative Bloom filter | Bloom::new_for_fp_rate(num_items, fp_rate). |
| `hashbrown` | 0.15+ | Fast HashMap/HashSet | Drop-in replacement for std HashMap with better performance. |
| `radix_trie` | 0.2+ | Radix trie | For CIDR prefix matching. |

### 9.6 Async / HTTP / Serialization

| Crate | Version | Purpose | Notes |
|-------|---------|---------|-------|
| `tokio` | 1.40+ | Async runtime | For ETW event processing, feed fetching, timers. |
| `reqwest` | 0.12+ | HTTP client | For fetching threat intelligence feeds. |
| `serde` | 1.0+ | Serialization | JSON/CSV feed parsing. |
| `serde_json` | 1.0+ | JSON | ThreatFox API, AlienVault OTX responses. |
| `csv` | 1.3+ | CSV parsing | URLhaus, MalwareBazaar feed parsing. |
| `chrono` | 0.4+ | Date/time | Timestamp handling for beaconing analysis. |
| `flate2` | 1.0+ | Gzip decompression | DShield feed is gzipped. |

### 9.7 Recommended Cargo.toml Section

```toml
[dependencies]
# Core
tokio = { version = "1.40", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Windows
windows = { version = "0.58", features = [
    "Win32_NetworkManagement_IpHelper",
    "Win32_System_Threading",
    "Win32_Foundation",
    "Win32_Security",
]}
ferrisetw = "1.1"

# Network / DNS
hickory-proto = "0.24"
dns-parser = "0.8"

# TLS / Crypto
x509-parser = "0.16"
md-5 = "0.10"

# IOC Matching
aho-corasick = "1.1"
regex = "1.10"
bloom = "0.3"
hashbrown = "0.15"
radix_trie = "0.2"

# Geolocation
maxminddb = "0.24"

# Signal Processing
rustfft = "6.2"

# HTTP / Feeds
reqwest = { version = "0.12", features = ["json", "gzip"] }
csv = "1.3"
chrono = { version = "0.4", features = ["serde"] }
flate2 = "1.0"

# Logging
tracing = "0.1"
tracing-subscriber = "0.3"
```

---

## 10. Architecture Integration Notes

### 10.1 SentryLion C2 Detection Pipeline

```
                              +---------------------+
                              |  ETW Event Stream   |
                              |  (DNS, TCP, TLS)    |
                              +---------+-----------+
                                        |
                              +---------v-----------+
                              |  Event Router       |
                              |  (by event type)    |
                              +-+-------+-------+---+
                                |       |       |
                   +------------+  +----+----+  +-------------+
                   |               |         |                |
          +--------v-----+  +-----v---+  +--v---------+  +---v----------+
          | DNS Analyzer  |  | TCP/IP  |  | TLS        |  | Process      |
          | - DGA detect  |  | Tracker |  | Analyzer   |  | Correlator   |
          | - Tunneling   |  | - Beacon|  | - JA3      |  | - PID->Proc  |
          | - Beaconing   |  | - Exfil |  | - Cert     |  | - Injection  |
          | - IOC match   |  | - Ports |  | - Fronting |  | - Baseline   |
          +--------+------+  +----+----+  +-----+------+  +------+-------+
                   |              |              |                |
                   +------+-------+------+-------+--------+------+
                          |              |                |
                   +------v------+  +----v------+  +-----v------+
                   | IOC Store   |  | Scoring   |  | Alert      |
                   | (Bloom+Map) |  | Engine    |  | Generator  |
                   +-------------+  +-----------+  +------------+
```

### 10.2 Data Flow for a Single DNS Query

1. **ETW** fires `Microsoft-Windows-DNS-Client` Event ID 3020
2. **Event Router** sends to DNS Analyzer
3. **DNS Analyzer** extracts `QueryName`, `QueryType`, `ProcessId`
4. **IOC Check:** Bloom filter -> HashMap lookup against known C2 domains
5. **DGA Check:** Run DGA scoring algorithm on domain
6. **Beaconing Check:** Add timestamp to per-domain tracker, compute CoV if enough samples
7. **Tunneling Check:** If TXT/CNAME query type, run subdomain entropy analysis
8. **Process Correlation:** Map PID to process name/path
9. **Scoring Engine:** Combine all signals into composite risk score
10. **Alert:** If score exceeds threshold, generate alert with full context

### 10.3 Performance Targets

| Operation | Target | Notes |
|-----------|--------|-------|
| IOC lookup (Bloom filter) | < 100 ns | Single hash probe |
| IOC lookup (HashMap confirm) | < 500 ns | Only when Bloom says "maybe" |
| DGA scoring | < 10 us | All features combined |
| Beaconing CoV computation | < 50 us | For 100 intervals |
| DNS event processing (total) | < 100 us | End-to-end per event |
| Memory for IOC store (1M IOCs) | < 50 MB | Bloom (2 MB) + HashMap (48 MB) |
| Feed refresh | < 30 sec | All feeds, async parallel |

### 10.4 Whitelisting Strategy

To reduce false positives, maintain whitelists:

| Whitelist | Source | Purpose |
|-----------|--------|---------|
| Tranco Top 10K | `https://tranco-list.eu/top-1m.csv.zip` | Skip beaconing analysis for popular domains |
| CDN IP ranges | CloudFlare, Akamai, AWS CloudFront published ranges | Skip cert anomaly analysis |
| Internal domains | User-configured | Skip DGA analysis for corporate domains |
| Known software beacons | Antivirus, update services, telemetry | Exclude from beaconing detection |
| Process whitelist | Signed by trusted publishers | Lower scoring weight |

---

## References and Sources

- [Netskope - Effective C2 Beaconing Detection](https://www.netskope.com/resources/white-papers/effective-c2-beaconing-detection-white-paper)
- [Detecting C2-Jittered Beacons with Frequency Analysis](https://www.diegowritesa.blog/2025/04/detecting-c2-jittered-beacons-with.html)
- [Salesforce - TLS Fingerprinting with JA3 and JA3S](https://engineering.salesforce.com/tls-fingerprinting-with-ja3-and-ja3s-247362855967/)
- [abuse.ch SSLBL - Malicious JA3 Fingerprints](https://sslbl.abuse.ch/ja3-fingerprints/)
- [Shannon Entropy for DGA Detection (arXiv:2304.07943)](https://arxiv.org/abs/2304.07943)
- [DGA Detection using Bigram Frequency Analysis (GitHub)](https://github.com/philarkwright/DGA-Detection)
- [Feodo Tracker Blocklist](https://feodotracker.abuse.ch/blocklist/)
- [URLhaus API](https://urlhaus.abuse.ch/api/)
- [ThreatFox Export](https://threatfox.abuse.ch/export/)
- [Spamhaus DROP Lists](https://www.spamhaus.org/blocklists/do-not-route-or-peer/)
- [AlienVault OTX](https://otx.alienvault.com/)
- [DShield/SANS Feeds](https://www.dshield.org/feeds_doc.html)
- [MITRE ATT&CK TA0011 - Command and Control](https://attack.mitre.org/tactics/TA0011/)
- [MITRE ATT&CK T1071 - Application Layer Protocol](https://attack.mitre.org/techniques/T1071/)
- [MITRE ATT&CK T1090.004 - Domain Fronting](https://attack.mitre.org/techniques/T1090/004/)
- [Red Canary - Cobalt Strike Detection](https://redcanary.com/threat-detection-report/threats/cobalt-strike/)
- [WithSecure - Detecting Cobalt Strike via Named Pipe Analysis](https://labs.withsecure.com/publications/detecting-cobalt-strike-default-modules-via-named-pipe-analysis)
- [Cobalt Strike Defenders Guide (DFIR Report)](https://thedfirreport.com/2022/01/24/cobalt-strike-a-defenders-guide-part-2/)
- [ferrisetw Crate (KrabsETW in Rust)](https://github.com/n4r1b/ferrisetw)
- [windows-rs - GetExtendedTcpTable](https://microsoft.github.io/windows-docs-rs/doc/windows/Win32/NetworkManagement/IpHelper/fn.GetExtendedTcpTable.html)
- [netstat2 Crate](https://crates.io/crates/netstat2)
- [aho-corasick Crate](https://github.com/BurntSushi/aho-corasick)
- [hickory-dns (formerly trust-dns)](https://github.com/hickory-dns/hickory-dns)
- [Bloom Filter Sizing (Wikipedia)](https://en.wikipedia.org/wiki/Bloom_filter)
- [Palo Alto Networks - Domain Fronting Detection](https://docs.paloaltonetworks.com/pan-os/10-2/pan-os-new-features/content-inspection-features/domain-fronting-detection)
- [Splunk - DNS Query Length with High Standard Deviation](https://research.splunk.com/network/1a67f15a-f4ff-4170-84e9-08cf6f75d6f5/)
- [WMI Persistence Detection (MITRE T1546.003)](https://attack.mitre.org/techniques/T1546/003/)
