# Modern EDR Architecture Research — SentryLion Knowledge Base

## Source: Deep research on CrowdStrike, SentinelOne, Carbon Black, Defender for Endpoint
## Date: 2026-02-27
## Purpose: Foundation knowledge for SentryLion agent development

---

## Critical ETW Providers (User-Space, No Kernel Driver)

| Provider | GUID | What It Monitors |
|----------|------|-----------------|
| Kernel-Process | `{22FB2CD6-0E7B-422B-A0C7-2FAD1FD0E716}` | Process create/terminate, thread, image load |
| Kernel-File | `{EDD08927-9CC4-4E65-B970-C2560FB5C289}` | File create/delete/rename/read/write |
| Kernel-Registry | `{70EB4F03-C1DE-4F73-A051-33D13D5413BD}` | Registry key/value operations |
| Kernel-Network | `{7DD42A49-5329-4832-8DFD-43D979153A88}` | TCP/UDP connections |
| DNS-Client | `{1C95126E-7EEA-49A9-A3FE-A378B03DDB4D}` | DNS queries/responses |
| Security-Auditing | `{54849625-5478-4994-A5BA-3E3B0328C30D}` | Logon, privilege, policy |
| PowerShell | `{A0C1853B-5C40-4B15-8766-3CF1C58F985A}` | Script blocks, modules |
| WMI-Activity | `{1418EF04-B0B4-4623-BF7E-D74AB47BBDAA}` | WMI events/persistence |
| TaskScheduler | `{DE7B24EA-73C8-4A09-985D-5BDADCFA9017}` | Scheduled task CRUD |
| AMSI | `{2A576B87-09A7-520E-C21A-4942F0271D67}` | Deobfuscated script content |
| DotNETRuntime | `{E13C0D23-CCBC-4E12-931B-D9CC2EEE27E4}` | .NET assembly loads (catches execute-assembly) |
| Sysmon | `{5770385F-C22A-43E0-BF4C-06F5698FFBD9}` | Sysmon event log output |

**NOT accessible without kernel driver (PPL/ELAM required):**
- Threat-Intelligence `{F4E1897C-BB5D-5668-F1D8-040F4D8DD344}` — VirtualAlloc RWX, WriteProcessMemory

---

## Detection Engine Architecture (4-Layer Pipeline)

1. **Static/Signature** — File hash matching, YARA rules (cheapest, fastest)
2. **Heuristic/Behavioral Rules** — IOAs: process relationships, API sequences, persistence detection
3. **ML Models** — Isolation Forest on behavioral features, file structure analysis
4. **Cloud Analysis** — Deep sandboxing, cross-customer correlation (future)

CrowdStrike IOA vs IOC: IOAs describe adversary BEHAVIOR, IOCs describe artifacts.

---

## IOC Matching at Scale

```
Event Stream -> Bloom Filter (fast reject, ~17MB for 10M IOCs at 0.1% FP)
                   |
                   v (possible match)
               HashSet Lookup (exact match, use [u8;32] not String for hashes)
                   |
                   v (confirmed)
               Alert with STIX context
```

Key crates: `bloom`/`probabilistic-collections`, `ahash`/`hashbrown`, `aho-corasick`, `radix_trie`

---

## Process Injection Detection (User-Space)

| Technique | ATT&CK | Detection Method |
|-----------|--------|-----------------|
| Process Hollowing | T1055.012 | ETW: CreateProcess(SUSPENDED) -> NtUnmapViewOfSection -> WriteProcessMemory -> ResumeThread |
| Classic DLL Injection | T1055.001 | ETW: Thread creation with start address = LoadLibrary |
| Reflective DLL Load | T1620.001 | VirtualQueryEx: PE headers in RWX memory regions |
| .NET In-Memory | - | DotNETRuntime ETW: assembly loads without file path |

---

## Self-Protection (Without PPL)

- Run as Windows Service (harder to kill)
- Restrictive DACLs via SetSecurityInfo
- Watchdog pattern: two processes monitor each other
- Periodic self-hash verification
- SERVICE_SID_TYPE_UNRESTRICTED registration

---

## CrowdStrike July 2024 Lesson

Faulty channel file update caused kernel driver crash -> 8.5M machines BSOD.
Key takeaway: User-space agents are inherently safer. Content updates interpreted
by kernel code must be validated before loading. Rollback-on-crash is essential.

---

## Key Rust Crates

| Purpose | Crate |
|---------|-------|
| ETW | `ferrisetw` |
| Windows API | `windows-rs` |
| Async | `tokio` |
| Event store | `rusqlite` |
| Hashing | `sha2`, `md-5` |
| HTTP | `reqwest` |
| Bloom filter | `bloom` |
| Multi-pattern match | `aho-corasick` |
| YARA scanning | `yara-x` |
| Regex | `regex` |
| Structured logging | `tracing` |

---

## User-Space Limitations (Honest Assessment)

Cannot do without kernel driver:
- Access Threat-Intelligence ETW provider
- Hook kernel-mode API calls
- Intercept/block operations BEFORE they happen (ETW = notification only)
- True anti-tamper (PPL)
- Monitor direct syscalls that bypass Win32

BUT: Vast majority of real threats (commodity malware, ransomware, script attacks,
common post-exploitation) ARE detectable with user-space monitoring.
