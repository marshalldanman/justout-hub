# Offensive Defense & Active Response — SentryLion Knowledge Base

**Document Type:** Technical Reference
**Target:** SentryLion user-space EDR agent (Windows, Rust, no kernel driver)
**Last Updated:** 2026-02-27
**Status:** Research Phase

---

## Table of Contents

1. [Honeypots & Deception Technology](#1-honeypots--deception-technology)
2. [Network Tarpitting & Disruption](#2-network-tarpitting--disruption)
3. [Active Response & Containment](#3-active-response--containment)
4. [Counter-Intelligence & Attacker Profiling](#4-counter-intelligence--attacker-profiling)
5. [Anti-Ransomware Systems](#5-anti-ransomware-systems)
6. [Legal Considerations (CFAA)](#6-legal-considerations-cfaa)
7. [Forensic Evidence Preservation](#7-forensic-evidence-preservation)
8. [Architecture & Implementation](#8-architecture--implementation)
9. [MITRE ATT&CK Mapping](#9-mitre-attck-mapping)
10. [Rust Crate Reference](#10-rust-crate-reference)

---

## 1. Honeypots & Deception Technology

### 1.1 Canarytokens Integration

**What:** Tripwire files/services that alert when accessed by unauthorized users. Free from canarytokens.org.

**Token Types:**

| Token Type | How It Works | Alert Mechanism |
|-----------|-------------|-----------------|
| DNS Token | Unique subdomain resolves → alert fires | DNS query logged |
| Web Bug | Invisible pixel in document/email | HTTP request |
| AWS Key | Fake AWS credentials | AWS CloudTrail event |
| Word Document | .docx with embedded web bug | Opens → fetches URL |
| Excel Document | .xlsx with external cell reference | Opens → DNS lookup |
| PDF | PDF with phone-home on open | HTTP callback |
| Cloned Website | Fake login page | Credential capture |
| QR Code | Unique URL in QR | Scan → HTTP request |
| WireGuard VPN | Fake VPN config | Connection attempt logged |
| Sensitive Command | Fake reg key/command | Execution → DNS beacon |

**Self-Hosted (Docker):**
```
docker run -d \
  --name canarytokens \
  -p 8082:8082 \
  -e CANARY_DOMAIN=tokens.yourdomain.com \
  -e CANARY_PUBLIC_IP=YOUR_SERVER_IP \
  thinkst/canarytokens-docker
```

**Programmatic API:**
```
POST https://canarytokens.org/generate
Content-Type: application/x-www-form-urlencoded

type=dns&email=alerts@yourdomain.com&memo=SentryLion-Agent-PC1
```

**Agent integration:** Create tokens during deployment, monitor callback endpoints, push alerts to Firebase console on trigger.

### 1.2 HoneyFiles (Fake Bait Files)

**Purpose:** Plant attractive-looking files that no legitimate user would access. Any access = attacker reconnaissance.

**Tier 1 — Maximum Attraction (deploy on all agents):**
```
passwords.txt
credentials.csv
vpn-config.ovpn
ssh_keys.zip
bitcoin-wallet.dat
bank-statements-2025.pdf
salary-database.xlsx
admin-passwords.kdbx
aws-credentials.conf
private-keys.pem
```

**Tier 2 — Business Context (deploy selectively):**
```
merger-details-confidential.docx
layoff-list-2026.xlsx
investor-presentation-draft.pptx
customer-database-export.csv
compliance-audit-findings.pdf
```

**File attributes:**
- Set as `HIDDEN | SYSTEM` (visible to command-line enumeration but not casual browsing)
- Realistic file sizes (not zero-length)
- Recent timestamps (old files are less attractive)
- Placed in: `C:\Users\<user>\Documents\`, `C:\Confidential\`, Desktop, network share roots

**Content:** Mix of realistic-looking fake data and embedded Canarytokens. Example `passwords.txt`:
```
# Company VPN Access (CONFIDENTIAL)
# Last updated: 2026-02-15

vpn.company.com
admin / P@ssw0rd2026!
root / S3cur3R00t#99

# AWS Console
# [Canarytoken AWS key embedded here]
AKIAIOSFODNN7EXAMPLE
wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

# Database
db.internal:5432
dbadmin / Pr0duct10n_DB!
```

### 1.3 HoneyDirs (Decoy Directories)

```
C:\Confidential\
C:\Payroll\
C:\Executive-Files\
C:\Backup-Keys\
C:\IT-Admin\
C:\Financial-Records\
```

Place HoneyFiles inside. Monitor entire directory tree for any access.

### 1.4 HoneyPorts (Fake Network Services)

**Purpose:** Listen on ports that attackers probe during network reconnaissance.

| Port | Service | Attacker Sees |
|------|---------|--------------|
| 22 | SSH | Fake OpenSSH banner |
| 445 | SMB | Fake Windows share |
| 3389 | RDP | Fake RDP handshake |
| 1433 | MSSQL | Fake SQL Server banner |
| 3306 | MySQL | Fake MySQL greeting |
| 5432 | PostgreSQL | Fake PG ready message |
| 8080 | HTTP Admin | Fake admin panel |
| 8443 | HTTPS Admin | Fake management console |

**Implementation pattern (Rust):**
```rust
async fn honeypot_listener(port: u16, banner: &[u8]) {
    let listener = TcpListener::bind(format!("0.0.0.0:{}", port)).await?;
    loop {
        let (mut socket, addr) = listener.accept().await?;
        // LOG: attacker IP, port, timestamp, initial bytes sent
        alert_console(HoneyportAlert {
            port,
            source_ip: addr.ip(),
            timestamp: Utc::now(),
        });
        // Send fake banner to keep attacker engaged
        socket.write_all(banner).await.ok();
        // Read attacker's input (credential capture, exploit attempt)
        let mut buf = [0u8; 4096];
        if let Ok(n) = socket.read(&mut buf).await {
            log_attacker_payload(&buf[..n], addr);
        }
        // Optionally: tarpit (slow response) instead of closing
    }
}
```

### 1.5 Canary File Monitoring (4 Approaches)

**Approach 1: ReadDirectoryChangesW (Recommended for user-space)**
```rust
use windows::Win32::Storage::FileSystem::ReadDirectoryChangesW;

fn watch_canary_directory(path: &Path) {
    let handle = CreateFileW(
        path, FILE_LIST_DIRECTORY,
        FILE_SHARE_READ | FILE_SHARE_WRITE,
        None, OPEN_EXISTING,
        FILE_FLAG_BACKUP_SEMANTICS, None
    )?;

    loop {
        let mut buffer = [0u8; 4096];
        ReadDirectoryChangesW(
            handle, &mut buffer, true,
            FILE_NOTIFY_CHANGE_LAST_ACCESS |  // Read access
            FILE_NOTIFY_CHANGE_LAST_WRITE |   // Modification
            FILE_NOTIFY_CHANGE_FILE_NAME |    // Rename/delete
            FILE_NOTIFY_CHANGE_SIZE,          // Content change
            // ...
        )?;
        // Parse FILE_NOTIFY_INFORMATION structs
        // ALERT on any access to canary files
    }
}
```

**Approach 2: USN Journal (Volume-level, all files)**
- Uses NTFS Update Sequence Number journal
- Tracks ALL file operations at volume level
- Higher coverage but more processing needed
- Requires `DeviceIoControl` with `FSCTL_READ_USN_JOURNAL`

**Approach 3: SACL Auditing (Windows Event Log)**
- Set System Access Control List on canary files/dirs
- Windows generates Event ID 4663 on access
- Monitor via ETW `Security-Auditing` provider
- Requires SeSecurityPrivilege

**Approach 4: Minifilter Driver (Kernel — future)**
- Best coverage, lowest latency
- Intercept file operations before they complete
- Requires driver signing (expensive)
- Future phase for SentryLion

---

## 2. Network Tarpitting & Disruption

### 2.1 TCP Tarpit

**Concept:** Accept TCP connections but respond extremely slowly, consuming attacker's resources (threads, sockets, time).

```rust
async fn tcp_tarpit(port: u16) {
    let listener = TcpListener::bind(format!("0.0.0.0:{}", port)).await?;
    loop {
        let (mut socket, addr) = listener.accept().await?;
        tokio::spawn(async move {
            log_tarpit_connection(addr);
            // Send 1 byte per second — keeps connection alive
            loop {
                if socket.write_all(b"\n").await.is_err() { break; }
                tokio::time::sleep(Duration::from_secs(1)).await;
            }
        });
    }
}
```

### 2.2 HTTP Chunked Tarpit

**Concept:** HTTP server that responds with chunked Transfer-Encoding, dripping data infinitely.

```rust
async fn http_tarpit(stream: &mut TcpStream) {
    let header = b"HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n";
    stream.write_all(header).await.ok();

    loop {
        // Send tiny chunk every 5-30 seconds
        let delay = rand::thread_rng().gen_range(5..30);
        tokio::time::sleep(Duration::from_secs(delay)).await;

        let chunk = format!("1\r\n \r\n");  // 1-byte chunk: a space
        if stream.write_all(chunk.as_bytes()).await.is_err() { break; }
    }
    // Attacker's HTTP client waits forever for the response to complete
}
```

### 2.3 SSH Tarpit (Endlessh Pattern)

**Concept:** SSH server that sends an infinite pre-authentication banner, one line per 10-30 seconds. SSH RFC allows unlimited banner before auth. Traps SSH scanners/brute-forcers indefinitely.

```rust
async fn ssh_tarpit(port: u16) {
    let listener = TcpListener::bind(format!("0.0.0.0:{}", port)).await?;
    loop {
        let (mut socket, addr) = listener.accept().await?;
        tokio::spawn(async move {
            log_tarpit_connection(addr);
            loop {
                // Generate random line (max 253 chars per SSH RFC)
                let line: String = (0..rand::thread_rng().gen_range(32..253))
                    .map(|_| rand::thread_rng().gen_range(0x20..0x7E) as u8 as char)
                    .collect();
                let data = format!("{}\r\n", line);
                if socket.write_all(data.as_bytes()).await.is_err() { break; }

                let delay = rand::thread_rng().gen_range(10..30);
                tokio::time::sleep(Duration::from_secs(delay)).await;
            }
        });
    }
}
```

### 2.4 DNS Sinkholing

**Purpose:** Redirect known-malicious domain lookups to 127.0.0.1 (or a logging server).

**Method 1: Hosts File (simplest)**
```
# Written by SentryLion agent
# Source: abuse.ch Feodo Tracker + URLhaus + custom
127.0.0.1 evil-c2-server.com
127.0.0.1 malware-download.net
127.0.0.1 phishing-site.org
# ... thousands of entries from threat feeds
```

**Method 2: WFP DNS Redirect (more robust)**
- Use Windows Filtering Platform to intercept DNS packets
- Redirect queries for blocklisted domains to local resolver
- Local resolver returns 127.0.0.1 and logs the attempt
- Harder for malware to bypass than hosts file modification

**Feed sources for sinkhole list:**
- abuse.ch Feodo Tracker (botnet C2)
- abuse.ch URLhaus (malware download URLs)
- Spamhaus DROP (hijacked IP ranges)
- OpenPhish (phishing URLs)
- DShield suspicious domains
- Custom rules from console

---

## 3. Active Response & Containment

### 3.1 Automated Network Isolation

**Emergency containment:** Disable ALL network connectivity except loopback + Firebase heartbeat.

```rust
// Method 1: Windows Firewall via netsh
fn isolate_network() -> Result<()> {
    // Block all inbound
    Command::new("netsh")
        .args(&["advfirewall", "set", "allprofiles", "firewallpolicy",
                "blockinbound,blockoutbound"])
        .output()?;

    // Allow ONLY Firebase (for continued reporting)
    Command::new("netsh")
        .args(&["advfirewall", "firewall", "add", "rule",
                "name=SentryLion-Firebase",
                "dir=out", "action=allow",
                "remoteip=<firebase-ip-ranges>",
                "protocol=tcp", "remoteport=443"])
        .output()?;

    // Allow DNS for Firebase resolution
    Command::new("netsh")
        .args(&["advfirewall", "firewall", "add", "rule",
                "name=SentryLion-DNS",
                "dir=out", "action=allow",
                "protocol=udp", "remoteport=53"])
        .output()?;

    Ok(())
}
```

**Method 2: WFP API (more robust, harder to bypass)**
```rust
use windows::Win32::NetworkManagement::WindowsFilteringPlatform::*;

fn wfp_isolate() -> Result<()> {
    let mut engine_handle = HANDLE::default();
    unsafe {
        FwpmEngineOpen0(None, RPC_C_AUTHN_DEFAULT, None, None, &mut engine_handle)?;

        // Add sublayer for SentryLion rules
        let sublayer = FWPM_SUBLAYER0 { /* ... */ };
        FwpmSubLayerAdd0(engine_handle, &sublayer, None)?;

        // Block all outbound
        let block_filter = FWPM_FILTER0 {
            action: FWPM_ACTION0 { type_: FWP_ACTION_BLOCK },
            layerKey: FWPM_LAYER_ALE_AUTH_CONNECT_V4,
            weight: FWP_VALUE0 { type_: FWP_UINT8, value: 15 },
            // ...
        };
        FwpmFilterAdd0(engine_handle, &block_filter, None, None)?;

        // Allow Firebase only
        let allow_filter = FWPM_FILTER0 {
            action: FWPM_ACTION0 { type_: FWP_ACTION_PERMIT },
            // Condition: remote IP matches Firebase ranges
            // ...
        };
        FwpmFilterAdd0(engine_handle, &allow_filter, None, None)?;
    }
    Ok(())
}
```

### 3.2 Process Termination (Kill Chain)

**Critical:** Kill processes in the correct order — children first, then parents, then watchdogs.

```rust
use windows::Win32::System::Diagnostics::ToolHelp::*;

fn kill_process_tree(root_pid: u32) -> Result<()> {
    // 1. Build process tree
    let snapshot = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)? };
    let mut children = HashMap::new();
    // ... enumerate processes, build parent→children map

    // 2. Suspend watchdog/parent processes FIRST (prevent respawn)
    suspend_process(root_pid)?;

    // 3. Kill children bottom-up (deepest first)
    let tree = build_tree(root_pid, &children);
    for pid in tree.iter().rev() {  // Reverse = leaves first
        terminate_process(*pid)?;
    }

    // 4. Kill root process
    terminate_process(root_pid)?;

    // 5. Wait 3s, check for respawns
    std::thread::sleep(Duration::from_secs(3));
    check_for_respawns(root_pid)?;

    Ok(())
}

fn suspend_process(pid: u32) -> Result<()> {
    // NtSuspendProcess — freeze without killing
    // Prevents watchdog from detecting termination and respawning
    let handle = OpenProcess(PROCESS_SUSPEND_RESUME, false, pid)?;
    NtSuspendProcess(handle)?;
    Ok(())
}
```

### 3.3 Connection Killing

```rust
fn kill_connection(remote_ip: IpAddr, remote_port: u16) -> Result<()> {
    // 1. Find the connection in TCP table
    let tcp_table = get_extended_tcp_table()?;
    for entry in tcp_table {
        if entry.remote_addr == remote_ip && entry.remote_port == remote_port {
            // 2. Set connection state to DELETE_TCB (terminates it)
            set_tcp_entry_state(&entry, MIB_TCP_STATE_DELETE_TCB)?;

            // 3. Add firewall rule to block reconnection
            add_block_rule(remote_ip)?;

            // 4. Log everything
            log_killed_connection(&entry);
        }
    }
    Ok(())
}
```

### 3.4 Probation System (Graduated Restoration)

After a machine is cleaned (malware removed), network access is restored gradually over 3 minutes:

| Stage | Time | Network Access | Status Color |
|-------|------|---------------|-------------|
| 1 | 0-30s | Monitor only (no network) | Dark orange |
| 2 | 30-60s | DNS only | Orange |
| 3 | 60-90s | HTTP/HTTPS outbound only | Light orange |
| 4 | 90-120s | All outbound | Yellow-orange |
| 5 | 120-150s | All outbound + inbound | Yellow |
| 6 | 150-180s | Full permissions | Yellow-green |

**On ANY threat detection during probation → immediate re-jail (back to Stage 0)**

Implementation: Agent manages Windows Firewall rules for each stage, advancing every 30 seconds. Console shows real-time probation timer with color transitions.

---

## 4. Counter-Intelligence & Attacker Profiling

### 4.1 Attacker Classification

```rust
#[derive(Debug)]
enum AttackerType {
    AutomatedScanner,    // Fast, systematic, no human behavior
    ManualExploration,   // Slow, deliberate, targeted file access
    Ransomware,          // File encryption patterns
    DataExfiltration,    // Large outbound data transfers
    LateralMovement,     // Spread to other machines
    PersistenceSetup,    // Registry, scheduled tasks, services
    CredentialHarvest,   // LSASS access, SAM dumping
}

fn classify_attacker(events: &[SecurityEvent]) -> AttackerType {
    let speed = calculate_action_rate(events);
    let file_access_pattern = analyze_file_access(events);
    let network_pattern = analyze_network(events);

    if speed > 100_actions_per_second { AutomatedScanner }
    else if file_access_pattern.is_encryption() { Ransomware }
    else if network_pattern.upload_heavy() { DataExfiltration }
    // ... etc
}
```

### 4.2 Fake Data Poisoning

**Purpose:** If an attacker is exfiltrating data, feed them convincing but fake data to waste their time and identify them later.

- Replace real credential files with canarytoken-embedded fakes
- Create realistic-looking database exports with traceable fake records
- Embed unique identifiers in fake documents that can be traced if published
- DNS canarytoken URLs in fake "internal wiki" pages

### 4.3 Breadcrumb Trails

**Purpose:** Lead attackers through a controlled path of increasingly monitored resources.

```
Attacker finds → passwords.txt (HoneyFile, alerts on access)
  Contains → fake SSH key pointing to HoneyPort (SSH tarpit)
  Contains → fake admin URL pointing to HoneyWeb (credential capture)
  Contains → fake AWS keys (Canarytoken, immediate alert)

Each step generates more intelligence about the attacker:
  - Tools they use
  - TTPs (MITRE ATT&CK techniques)
  - Speed and sophistication
  - Target priorities (financial? credentials? IP?)
```

### 4.4 Sandbox/VM Evasion Detection

**Why:** Some advanced attackers detect they're in a sandbox and alter behavior. SentryLion can detect these evasion attempts themselves as indicators of malicious intent.

```rust
fn detect_evasion_techniques(process: &ProcessInfo) -> Vec<EvasionIndicator> {
    let mut indicators = Vec::new();

    // Check if process is querying VM indicators
    if process.registry_reads.contains("SYSTEM\\CurrentControlSet\\Services\\VBoxGuest") {
        indicators.push(EvasionIndicator::VmDetection("VirtualBox"));
    }
    if process.registry_reads.contains("SOFTWARE\\VMware, Inc.") {
        indicators.push(EvasionIndicator::VmDetection("VMware"));
    }

    // Check for timing-based evasion (sleep calls > 5 min)
    if process.total_sleep_time > Duration::from_secs(300) {
        indicators.push(EvasionIndicator::TimingEvasion);
    }

    // Check for user interaction requirements (mouse movement, clicks)
    if process.checks_mouse_position || process.checks_screen_resolution {
        indicators.push(EvasionIndicator::InteractionCheck);
    }

    indicators
}
```

---

## 5. Anti-Ransomware Systems

### 5.1 Canary File Entropy Monitoring

**Most effective anti-ransomware technique.** Deploy decoy files, monitor their entropy.

```rust
struct RansomwareCanary {
    path: PathBuf,
    original_hash: [u8; 32],    // SHA-256 of original content
    original_entropy: f64,       // Should be ~4.0 (normal text)
    last_checked: Instant,
}

fn check_canary(canary: &RansomwareCanary) -> RansomwareStatus {
    let content = std::fs::read(&canary.path)?;
    let current_hash = sha256(&content);
    let current_entropy = shannon_entropy(&content);

    if current_hash != canary.original_hash {
        if current_entropy > 7.5 {
            // File was modified AND entropy jumped to near-random
            // This is RANSOMWARE ENCRYPTION in progress
            return RansomwareStatus::ActiveEncryption {
                entropy_delta: current_entropy - canary.original_entropy,
            };
        } else {
            return RansomwareStatus::Modified;  // Changed but not encrypted
        }
    }
    RansomwareStatus::Clean
}
```

**Canary file placement strategy:**
- Place 3-5 canary files per protected directory
- Name files to be alphabetically FIRST and LAST (ransomware enumerates A→Z)
  - `!IMPORTANT_BACKUP.docx` (sorts first)
  - `zzz_financial_records.xlsx` (sorts last)
- Set HIDDEN + SYSTEM attributes (visible to ransomware but not users)
- Check canaries every 10 seconds (high-priority loop)

### 5.2 Write Entropy Monitoring

**Monitor ALL write operations to protected directories:**
```rust
fn monitor_writes(event: &FileWriteEvent) -> Option<RansomwareAlert> {
    let entropy = shannon_entropy(&event.data);

    // Chi-squared randomness test (more precise than entropy alone)
    let chi_sq = chi_squared_randomness(&event.data);

    // Track per-process entropy history
    let process_stats = get_process_entropy_stats(event.process_id);
    process_stats.record(entropy);

    // Alert conditions:
    // 1. Single file with very high entropy written by non-trusted process
    if entropy > 7.9 && !is_trusted_process(event.process_id) {
        return Some(RansomwareAlert::HighEntropyWrite);
    }

    // 2. Multiple files encrypted by same process (pattern detection)
    if process_stats.high_entropy_writes_last_60s > 5 {
        return Some(RansomwareAlert::MassEncryption {
            process_id: event.process_id,
            files_affected: process_stats.high_entropy_writes_last_60s,
        });
    }

    None
}
```

### 5.3 VSS (Volume Shadow Copy) Protection

**Ransomware's first move:** Delete shadow copies to prevent recovery.

```
Commands to detect + block:
  vssadmin delete shadows /all /quiet
  vssadmin resize shadowstorage /for=C: /on=C: /maxsize=401MB
  wmic shadowcopy delete
  bcdedit /set {default} recoveryenabled No
  bcdedit /set {default} bootstatuspolicy ignoreallfailures
  wbadmin delete catalog -quiet

Detection: Monitor process creation for these commands
Response: Block execution + alert console
```

**Implementation:**
```rust
fn check_vss_attack(command_line: &str) -> bool {
    let dangerous_patterns = [
        "vssadmin delete shadows",
        "vssadmin resize shadowstorage",
        "wmic shadowcopy delete",
        "bcdedit.*recoveryenabled.*no",
        "bcdedit.*bootstatuspolicy",
        "wbadmin delete catalog",
        "del.*\\\\windows\\\\system32\\\\config\\\\",  // SAM/SYSTEM deletion
    ];

    let lower = command_line.to_lowercase();
    dangerous_patterns.iter().any(|p| {
        regex::Regex::new(p).unwrap().is_match(&lower)
    })
}
```

### 5.4 MBR/GPT Integrity Monitoring

**Some ransomware (Petya, NotPetya) overwrites MBR/GPT to encrypt at boot level.**

```rust
fn check_mbr_integrity() -> Result<MbrStatus> {
    // Read first 512 bytes of physical drive
    let handle = CreateFileW(
        "\\\\.\\PhysicalDrive0",
        GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE,
        None, OPEN_EXISTING, 0, None
    )?;

    let mut mbr = [0u8; 512];
    ReadFile(handle, &mut mbr, None, None)?;

    let current_hash = sha256(&mbr);
    let known_good_hash = load_baseline_mbr_hash()?;

    if current_hash != known_good_hash {
        // MBR has been modified — possible bootkit/ransomware
        return Ok(MbrStatus::Tampered {
            new_hash: current_hash,
            expected_hash: known_good_hash
        });
    }

    Ok(MbrStatus::Intact)
}
```

### 5.5 Controlled Folder Access (Allowlisting)

```
Protected folders:
  %USERPROFILE%\Documents\
  %USERPROFILE%\Desktop\
  %USERPROFILE%\Pictures\
  %USERPROFILE%\Videos\
  Custom: any folder the user designates

Allowlisted programs (can write to protected folders):
  Office applications
  Adobe applications
  Browser downloads (to Downloads only)
  User-specified applications

ANY non-allowlisted process writing to protected folder → BLOCKED + ALERTED
```

---

## 6. Legal Considerations (CFAA)

### 6.1 The Active Defense Spectrum

```
LEGAL (on your own network):
  ├── Detection (passive monitoring)
  ├── Deception (honeypots, fake files, canarytokens)
  ├── Containment (network isolation, process killing)
  ├── Disruption (tarpitting on YOUR services)
  └── Intelligence (attacker profiling)

GRAY AREA:
  ├── Attribution (tracing back to attacker infrastructure)
  ├── Active recon of attacker C2 (without access)
  └── Deplatforming requests to hosting providers

ILLEGAL (Computer Fraud and Abuse Act):
  ├── Hack-back (accessing attacker's systems)
  ├── DDoS against attacker infrastructure
  ├── Deploying malware to attacker systems
  └── Accessing any system without authorization
```

### 6.2 SentryLion's Legal Position

**All SentryLion offensive defense features are legal because:**
1. All actions occur on machines YOU OWN/ADMINISTER
2. Honeypots/canarytokens are on YOUR network
3. Tarpitting slows connections to YOUR services (they initiated the connection)
4. Network isolation affects YOUR machines only
5. DNS sinkholing modifies YOUR local DNS resolution
6. Process killing terminates processes on YOUR machine

**What SentryLion explicitly does NOT do:**
- No "hack-back" (never accesses external systems)
- No outbound attacks (never sends traffic to attacker systems)
- No exploit deployment (never runs code on external machines)
- No credential abuse (never uses captured credentials offensively)

### 6.3 CFAA Key Points

- **18 U.S.C. § 1030** — Computer Fraud and Abuse Act
- Prohibits "knowingly accessing a computer without authorization"
- Active defense on YOUR systems is NOT covered (you own them)
- Tarpitting inbound connections is legal — they connected to you
- Deception (fake files/services) is legal — there's no duty of honesty to attackers
- Evidence collection from YOUR systems is legal

---

## 7. Forensic Evidence Preservation

### 7.1 Critical Rule: Collect BEFORE Contain

**ALWAYS collect volatile forensic evidence BEFORE killing processes or isolating the network.** Evidence disappears when you kill the process or cut the connection.

```rust
struct ForensicSnapshot {
    timestamp: DateTime<Utc>,
    agent_id: String,
    trigger: String,  // What caused the snapshot

    // Volatile evidence (collect FIRST — disappears on kill/reboot)
    network_connections: Vec<ConnectionInfo>,   // netstat equivalent
    process_list: Vec<ProcessInfo>,             // tasklist equivalent
    dns_cache: Vec<DnsCacheEntry>,             // ipconfig /displaydns
    arp_cache: Vec<ArpEntry>,                  // arp -a
    open_files: Vec<OpenFileInfo>,             // openfiles
    logged_on_users: Vec<UserSession>,         // query user
    clipboard_content: Option<Vec<u8>>,        // Clipboard data

    // Semi-volatile (survives process kill, not reboot)
    scheduled_tasks: Vec<TaskInfo>,            // schtasks
    running_services: Vec<ServiceInfo>,        // sc query
    registry_run_keys: Vec<RegistryEntry>,     // Run/RunOnce keys
    recent_event_logs: Vec<EventLogEntry>,     // Last 100 security events

    // Persistent (survives reboot)
    prefetch_files: Vec<PrefetchInfo>,         // C:\Windows\Prefetch\*.pf
    recent_files: Vec<PathBuf>,               // Recent items
    browser_history: Vec<HistoryEntry>,        // Last 1 hour
    usn_journal_recent: Vec<UsnEntry>,         // Last 1000 journal entries
}

async fn collect_forensic_snapshot(trigger: &str) -> ForensicSnapshot {
    // CRITICAL: Collect volatile data FIRST
    let connections = get_tcp_connections().await;    // FIRST — dies on isolation
    let processes = get_process_list().await;         // SECOND — dies on kill
    let dns_cache = get_dns_cache().await;           // THIRD — dies on flush

    // Then semi-volatile
    let tasks = get_scheduled_tasks().await;
    let services = get_running_services().await;
    let registry = get_run_keys().await;
    let events = get_recent_security_events(100).await;

    // Then persistent
    let prefetch = get_prefetch_files().await;

    // Upload snapshot to Firebase BEFORE taking any containment action
    upload_to_firebase(&snapshot).await;

    snapshot
}
```

### 7.2 Evidence Chain

```
1. Threat detected (YARA, Sigma, ML, or canary trigger)
2. IMMEDIATELY collect ForensicSnapshot
3. Upload snapshot to Firebase (preserved even if machine is wiped)
4. THEN take containment action (kill process, isolate network)
5. Collect post-containment snapshot (compare state)
6. Log all containment actions with timestamps
```

### 7.3 Prefetch File Preservation

```
C:\Windows\Prefetch\*.pf files show:
  - What executable ran
  - When it ran (last 8 execution times)
  - What DLLs it loaded
  - What files it accessed

CRITICAL: Copy Prefetch files to forensic archive BEFORE any cleanup.
Many IR teams lose this evidence by cleaning too early.
```

---

## 8. Architecture & Implementation

### 8.1 Six-Layer Defense Architecture

```
Layer 1: DECEPTION
  Canarytokens, HoneyFiles, HoneyDirs, HoneyPorts
  Purpose: Early warning, attacker detection

Layer 2: MONITORING
  File integrity, canary checks, entropy monitoring
  Purpose: Continuous threat detection

Layer 3: INTELLIGENCE
  Attacker profiling, behavior classification, TTP mapping
  Purpose: Understand the threat

Layer 4: CONTAINMENT
  Network isolation, process killing, connection termination
  Purpose: Stop the attack

Layer 5: DISRUPTION
  Tarpitting, DNS sinkholing, fake data poisoning
  Purpose: Waste attacker resources

Layer 6: PROTECTION
  Anti-ransomware, VSS protection, controlled folder access
  Purpose: Prevent damage even if other layers fail
```

### 8.2 Event Flow

```
Canary file accessed
    → ForensicSnapshot collected
    → Attacker classified
    → Console alerted (Firebase RTDB)
    → If ransomware: kill process + isolate network
    → If scanner: tarpit + continue monitoring
    → If manual: full intelligence collection + alert
```

### 8.3 Configuration (Console-Controlled)

```json
{
    "deception": {
        "honeyfiles_enabled": true,
        "honeyports_enabled": true,
        "canarytokens_webhook": "https://...",
        "breadcrumbs_enabled": true
    },
    "tarpitting": {
        "enabled": true,
        "ssh_port": 2222,
        "http_tarpit_ports": [8080, 8443],
        "max_concurrent_tarpits": 100
    },
    "containment": {
        "auto_isolate_on_ransomware": true,
        "auto_isolate_threshold": "critical",
        "probation_duration_seconds": 180,
        "forensic_snapshot_before_action": true
    },
    "anti_ransomware": {
        "canary_check_interval_seconds": 10,
        "entropy_monitoring_enabled": true,
        "vss_protection_enabled": true,
        "mbr_monitoring_enabled": true,
        "controlled_folders": ["Documents", "Desktop", "Pictures"]
    }
}
```

---

## 9. MITRE ATT&CK Mapping

| Technique | ID | SentryLion Response |
|-----------|----|--------------------|
| Inhibit System Recovery | T1490 | VSS protection, block shadow deletion |
| Data Encrypted for Impact | T1486 | Canary entropy monitoring, process kill |
| Disk Wipe | T1561 | MBR integrity monitoring, alert |
| Boot or Logon Autostart | T1547 | Registry Run key monitoring |
| Scheduled Task/Job | T1053 | Task creation monitoring |
| Remote Services | T1021 | HoneyPorts on RDP/SSH/SMB |
| Exfiltration Over C2 | T1041 | Upload ratio monitoring |
| Network Service Discovery | T1046 | HoneyPort alerts |
| File and Directory Discovery | T1083 | HoneyFile/HoneyDir monitoring |
| Account Discovery | T1087 | HoneyFile credential access |
| Process Injection | T1055 | Process-network correlation |
| Create or Modify System Process | T1543 | Service creation monitoring |

---

## 10. Rust Crate Reference

| Purpose | Crate | Version | Notes |
|---------|-------|---------|-------|
| Windows APIs | `windows` | 0.58 | Firewall, process, file APIs |
| TCP/UDP | `tokio::net` | 1.0 | Async network listeners |
| File watching | `notify` | 6.0 | Cross-platform file events |
| Crypto | `ed25519-dalek` | 2.0 | Command signing |
| Hashing | `sha2` | 0.10 | File integrity |
| Entropy | (builtin) | — | Shannon entropy calculation |
| Process enum | `sysinfo` | 0.31 | Process listing |
| Regex | `regex` | 1.0 | Pattern matching |
| HTTP client | `reqwest` | 0.12 | Canarytoken API calls |
| JSON | `serde_json` | 1.0 | Config, Firebase API |
| Time | `chrono` | 0.4 | Timestamps |
| Random | `rand` | 0.8 | Tarpit delays, fake data |
| GeoIP | `maxminddb` | 0.24 | IP geolocation (geo-blocking) |
| WFP bindings | `windows` | 0.58 | Windows Filtering Platform |

---

## Key Takeaways for SentryLion Agent

1. **Forensic evidence BEFORE containment** — always collect volatile data first, THEN kill/isolate
2. **Canary files are the highest-value/lowest-cost defense** — 10-second check interval catches ransomware in real-time
3. **Tarpitting is legal and devastating** — SSH endlessh pattern locks up attacker threads indefinitely
4. **Suspend before kill** — use NtSuspendProcess on watchdog processes before terminating children
5. **Probation prevents premature restoration** — graduated 3-minute staged network access catches re-infection
6. **Attacker classification drives response** — automated scanner gets tarpitted, ransomware gets isolated, manual attacker gets full intelligence collection
7. **DNS sinkholing blocks C2 at the cheapest level** — hosts file or WFP redirect, updated hourly from threat feeds
8. **HoneyPorts catch lateral movement** — fake SSH/SMB/RDP on non-production ports alert on any probe
9. **Breadcrumb trails generate intelligence** — lead attackers through monitored path that reveals their TTPs
10. **Everything on YOUR network is legal** — CFAA only prohibits accessing others' systems without authorization
