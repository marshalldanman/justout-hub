#Requires -Version 5.1
<#
.SYNOPSIS
    Claude Visit - on-site Windows 11 diagnostic & repair tool.

.DESCRIPTION
    Installs Node.js and Claude Code (if missing), creates a system restore
    point, runs Claude against a scoped Windows health-check prompt, writes a
    transcript + report to <SystemDrive>\ClaudeVisit\<timestamp>\, then removes
    anything the installer added. Requires Administrator (auto-elevates).

.PARAMETER Advanced
    Show a menu of extra diagnostic categories to run in addition to the
    default health check.

.PARAMETER ReportOnly
    Diagnose only. Claude will not apply any fixes; it will produce a written
    report instead.

.PARAMETER NoCleanup
    Skip the uninstall step at the end. Useful if the client wants Claude Code
    left on the machine for ongoing use.

.PARAMETER ApiKeyFile
    Path to a file containing ANTHROPIC_API_KEY. Defaults to apikey.txt
    alongside this script. Ignored if $env:ANTHROPIC_API_KEY is already set.

.PARAMETER Elevated
    Internal flag set by the self-elevation re-launch. Do not pass manually.

.EXAMPLE
    .\install.cmd

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\install.ps1 -Advanced -ReportOnly
#>

[CmdletBinding()]
param(
    [switch]$Advanced,
    [switch]$ReportOnly,
    [switch]$NoCleanup,
    [string]$ApiKeyFile,
    [switch]$Elevated
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# ----- self-elevation ------------------------------------------------------

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
    if ($Elevated) {
        throw 'Elevation attempted but the relaunched process is still not admin. Aborting.'
    }
    $self = $MyInvocation.MyCommand.Path
    $argList = @('-NoProfile','-ExecutionPolicy','Bypass','-File', ('"{0}"' -f $self), '-Elevated')
    if ($Advanced)   { $argList += '-Advanced' }
    if ($ReportOnly) { $argList += '-ReportOnly' }
    if ($NoCleanup)  { $argList += '-NoCleanup' }
    if ($ApiKeyFile) { $argList += @('-ApiKeyFile', ('"{0}"' -f $ApiKeyFile)) }
    Write-Host 'Not running as Administrator - relaunching with UAC elevation...'
    Start-Process -FilePath 'powershell.exe' -ArgumentList $argList -Verb RunAs
    exit 0
}

# ----- paths & state -------------------------------------------------------

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$timestamp  = Get-Date -Format 'yyyyMMdd-HHmmss'
$rootDrive  = if ($env:SystemDrive) { $env:SystemDrive } else { 'C:' }
$workDir    = Join-Path $rootDrive ("ClaudeVisit\{0}" -f $timestamp)
$logFile    = Join-Path $workDir 'visit.log'
$reportFile = Join-Path $workDir 'report.md'
$promptFile = Join-Path $workDir 'prompt.txt'

$script:installedNode   = $false
$script:installedClaude = $false
$script:restorePointId  = $null
$script:apiKeySet       = $false

# ----- helpers -------------------------------------------------------------

function Write-Log {
    param([string]$Message, [ValidateSet('INFO','WARN','ERROR')][string]$Level = 'INFO')
    $line = '[{0}] [{1}] {2}' -f (Get-Date -Format 'HH:mm:ss'), $Level, $Message
    $color = switch ($Level) { 'WARN' { 'Yellow' }; 'ERROR' { 'Red' }; default { 'Gray' } }
    Write-Host $line -ForegroundColor $color
    if (Test-Path $workDir) {
        try { Add-Content -Path $logFile -Value $line -Encoding UTF8 -ErrorAction Stop } catch { }
    }
}

function Clear-ApiKeyEnv {
    if ($script:apiKeySet) {
        Remove-Item Env:\ANTHROPIC_API_KEY -ErrorAction SilentlyContinue
        $script:apiKeySet = $false
    }
}

function Get-ApiKey {
    if ($env:ANTHROPIC_API_KEY) { return $env:ANTHROPIC_API_KEY }
    $candidate = if ($ApiKeyFile) { $ApiKeyFile } else { Join-Path $scriptRoot 'apikey.txt' }
    if (Test-Path $candidate) {
        $k = (Get-Content $candidate -Raw).Trim()
        if ($k) {
            if ($k -notmatch '^sk-ant-') {
                Write-Log "API key in $candidate does not start with 'sk-ant-'. Continuing anyway." 'WARN'
            }
            return $k
        }
    }
    throw "No API key found. Place it in '$candidate', or set `$env:ANTHROPIC_API_KEY before running."
}

function Assert-Winget {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "winget is not available. Update 'App Installer' from the Microsoft Store, then rerun."
    }
}

function Update-SessionPath {
    $machine = [Environment]::GetEnvironmentVariable('Path','Machine')
    $user    = [Environment]::GetEnvironmentVariable('Path','User')
    $parts   = @($machine, $user) | Where-Object { $_ }
    $env:PATH = ($parts -join ';')
}

function Invoke-Winget {
    param([string[]]$Arguments)
    $args = @('--disable-interactivity','--accept-source-agreements','--accept-package-agreements') + $Arguments
    $out = & winget @args 2>&1
    $code = $LASTEXITCODE
    Add-Content -Path $logFile -Value ("winget {0} -> exit {1}" -f ($args -join ' '), $code) -Encoding UTF8
    if ($out) { Add-Content -Path $logFile -Value $out -Encoding UTF8 }
    # winget uses 0 for success and -1978335189 for "already installed" / "no applicable upgrade".
    # We treat re-check via Get-Command as the authoritative success signal, so return silently.
    return $code
}

function Ensure-Node {
    if (Get-Command node -ErrorAction SilentlyContinue) {
        Write-Log "Node.js already installed ($(node --version))."
        return
    }
    Write-Log 'Installing Node.js LTS via winget...'
    [void](Invoke-Winget -Arguments @('install','-e','--id','OpenJS.NodeJS.LTS','--silent'))
    Update-SessionPath
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw 'Node.js installation did not land node.exe on PATH. Open a new admin PowerShell and retry.'
    }
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        throw 'Node installed but npm is not on PATH. Reinstall Node.js LTS manually.'
    }
    $script:installedNode = $true
    Write-Log "Installed Node.js $(node --version); npm $(npm --version)."
}

function Ensure-ClaudeCode {
    if (Get-Command claude -ErrorAction SilentlyContinue) {
        Write-Log 'Claude Code already installed.'
        return
    }
    Write-Log 'Installing @anthropic-ai/claude-code globally via npm...'
    $npmOut = & npm install -g '@anthropic-ai/claude-code' 2>&1
    Add-Content -Path $logFile -Value $npmOut -Encoding UTF8
    Update-SessionPath
    if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
        throw 'Claude Code installation failed. See visit.log for npm output.'
    }
    $script:installedClaude = $true
    Write-Log 'Installed Claude Code.'
}

function New-RestorePoint {
    try {
        Enable-ComputerRestore -Drive "$rootDrive\" -ErrorAction SilentlyContinue
        Checkpoint-Computer -Description "ClaudeVisit $timestamp" -RestorePointType 'MODIFY_SETTINGS'
        $rp = Get-ComputerRestorePoint |
            Sort-Object -Property SequenceNumber -Descending |
            Select-Object -First 1
        if ($rp) {
            $script:restorePointId = $rp.SequenceNumber
            Write-Log "Created system restore point #$($rp.SequenceNumber)."
        } else {
            Write-Log 'Restore point command returned no entries. Continuing.' 'WARN'
        }
    } catch {
        Write-Log "Could not create restore point: $($_.Exception.Message)" 'WARN'
        Write-Log 'Continuing without restore point. Destructive fixes still need approval.' 'WARN'
    }
}

# ----- prompts -------------------------------------------------------------

$defaultTaskPrompt = @'
You are running on a Windows 11 machine as Administrator during an on-site
visit. Your job is a general health check with safe, reversible fixes.

Rules of engagement (non-negotiable):
- Never reinstall Windows, never touch BitLocker, never disable Defender,
  never alter user accounts or credentials.
- Prefer diagnostic (read-only) commands first. Present findings before
  proposing a fix.
- For any change that modifies system state (removing a program, disabling a
  service, deleting files outside %TEMP%, editing the registry), STOP and ask
  the operator to confirm before proceeding.
- Log every command you run and its output to report.md in the working dir.
- If anything looks outside the scope of a routine health check (malware,
  hardware failure, disk errors), stop fixing and write findings to report.md.

Default checklist:
1. Disk space on the system drive (warn if <15% free).
2. Pending Windows Updates (list only, don't install without confirmation).
3. Top startup programs by impact (Get-CimInstance Win32_StartupCommand + Task
   Scheduler 'At logon' tasks). Flag anything obviously broken or unknown.
4. Event Viewer: System + Application errors in the last 7 days, grouped.
5. Running services set to Automatic that are currently Stopped.
6. %TEMP% and %WINDIR%\Temp size.

Safe fixes you MAY perform without re-asking:
- Clear %TEMP% and %WINDIR%\Temp of files older than 7 days.
- Empty the Recycle Bin ONLY if the operator has confirmed in chat.

Everything else: propose, wait for approval.

Write the final report to report.md with these sections: Summary, Findings,
Fixes Applied, Fixes Recommended (not applied), Commands Run.
'@

$reportOnlyAddendum = @'

REPORT-ONLY MODE: apply no fixes. Produce report.md with Findings and
Recommended Fixes only.
'@

$advancedMenu = [ordered]@{
    '1' = @{ Name = 'Network & DNS diagnostics';       Prompt = @'
Additionally run: ipconfig /all, Test-NetConnection to 8.8.8.8 and 1.1.1.1,
Resolve-DnsName for a couple of well-known hosts, Get-NetAdapter status.
Report connectivity, DNS, and adapter issues. Do not change network config
without explicit approval.
'@ }
    '2' = @{ Name = 'Disk health (SMART + chkdsk read-only)'; Prompt = @'
Additionally run: Get-PhysicalDisk | Get-StorageReliabilityCounter,
Get-Disk | Get-PhysicalDisk health status, and chkdsk on the system drive
(READ-ONLY, no /f or /r). Report any reallocated sectors, bad blocks, or
health warnings.
'@ }
    '3' = @{ Name = 'Driver check';                    Prompt = @'
Additionally run: Get-PnpDevice -Status Error, pnputil /enum-drivers.
List devices with problems. Do not update or uninstall drivers without
explicit approval.
'@ }
    '4' = @{ Name = 'Malware indicators (read-only)';  Prompt = @'
Additionally scan read-only for suspicious autoruns: Get-CimInstance
Win32_StartupCommand, scheduled tasks with unusual actions, services with
paths in user-writable locations (%AppData%, %Temp%, %Public%), and
unsigned binaries in common autorun paths. Report findings, DO NOT delete
or quarantine anything - defer to Windows Defender for removal.
'@ }
    '5' = @{ Name = 'Windows Update repair';           Prompt = @'
Additionally: check the Windows Update service health, last successful
update time, and pending reboot state. Report only. Do NOT run
wuauclt/usoclient/DISM repair commands without explicit approval.
'@ }
    '6' = @{ Name = 'Performance deep-dive';           Prompt = @'
Additionally: top 10 processes by CPU and by working set, uptime, page file
usage, thermal/throttling events in the last 24h from the System log.
Report bottlenecks and suspected causes.
'@ }
    '7' = @{ Name = 'Browser cleanup candidates';      Prompt = @'
Additionally: enumerate installed browsers and list their extensions
(Edge, Chrome, Firefox if present). Report extensions with unusual
permissions or low install counts. Do NOT remove extensions - just report.
'@ }
}

function Select-AdvancedTests {
    Write-Host ''
    Write-Host 'Advanced menu - choose extra tests (comma-separated, or Enter for none):' -ForegroundColor Cyan
    foreach ($k in $advancedMenu.Keys) {
        Write-Host ("  [{0}] {1}" -f $k, $advancedMenu[$k].Name)
    }
    $choice = Read-Host 'Selection'
    if ([string]::IsNullOrWhiteSpace($choice)) { return @() }
    $picks = $choice -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ }
    $out = @()
    foreach ($p in $picks) {
        if ($advancedMenu.Contains($p)) {
            $out += $advancedMenu[$p]
        } else {
            Write-Log "Ignoring unknown menu entry: $p" 'WARN'
        }
    }
    return ,$out
}

function Build-Prompt {
    param([array]$Extras)
    $parts = @($defaultTaskPrompt)
    if ($ReportOnly) { $parts += $reportOnlyAddendum }
    if ($Extras) {
        foreach ($e in $Extras) {
            $parts += ("`nAdditional category: {0}`n{1}" -f $e.Name, $e.Prompt)
        }
    }
    $parts += ("`nWorking directory: {0}" -f $workDir)
    $parts += ("Write your final report to: {0}" -f $reportFile)
    return ($parts -join "`n`n")
}

# ----- run -----------------------------------------------------------------

function Invoke-Claude {
    param(
        [Parameter(Mandatory)][string]$PromptPath,
        [Parameter(Mandatory)][string]$ApiKey
    )

    $permMode = if ($ReportOnly) { 'plan' } else { 'acceptEdits' }
    $kickoff  = "Read the file '$PromptPath' and follow the instructions in it exactly. Begin now."

    Push-Location $workDir
    try {
        $env:ANTHROPIC_API_KEY = $ApiKey
        $script:apiKeySet = $true
        Write-Log "Launching Claude Code (permission-mode=$permMode)..."
        & claude --permission-mode $permMode $kickoff
        $exit = $LASTEXITCODE
        Write-Log "Claude exited with code $exit."
    } finally {
        Clear-ApiKeyEnv
        Pop-Location
    }
}

function Invoke-Cleanup {
    Clear-ApiKeyEnv
    if ($NoCleanup) {
        Write-Log 'NoCleanup set - leaving installed tools in place.'
        return
    }
    if ($script:installedClaude -and (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Log 'Removing Claude Code...'
        try {
            $out = & npm uninstall -g '@anthropic-ai/claude-code' 2>&1
            if ($out) { Add-Content -Path $logFile -Value $out -Encoding UTF8 }
        } catch {
            Write-Log "npm uninstall failed: $($_.Exception.Message)" 'WARN'
        }
    }
    if ($script:installedNode -and (Get-Command winget -ErrorAction SilentlyContinue)) {
        Write-Log 'Removing Node.js (installed by this script)...'
        [void](Invoke-Winget -Arguments @('uninstall','-e','--id','OpenJS.NodeJS.LTS','--silent'))
    }
    if (Test-Path $workDir) {
        Write-Log "Report folder preserved at $workDir"
    }
}

# ----- main ----------------------------------------------------------------

try {
    New-Item -ItemType Directory -Force -Path $workDir | Out-Null

    Write-Host ''
    Write-Host ('=' * 60) -ForegroundColor Cyan
    Write-Host ' Claude Visit - Windows 11 diagnostic & repair' -ForegroundColor Cyan
    Write-Host ('=' * 60) -ForegroundColor Cyan
    Write-Host (" Work folder : {0}" -f $workDir)
    Write-Host (" Advanced    : {0}" -f $Advanced.IsPresent)
    Write-Host (" Report-only : {0}" -f $ReportOnly.IsPresent)
    Write-Host (" No cleanup  : {0}" -f $NoCleanup.IsPresent)
    Write-Host ''

    Write-Log "Claude Visit start. Report folder: $workDir"
    Write-Log "Flags: Advanced=$Advanced ReportOnly=$ReportOnly NoCleanup=$NoCleanup"

    $apiKey = Get-ApiKey
    Write-Log 'API key loaded (not persisted to disk or user env).'

    Assert-Winget
    Ensure-Node
    Ensure-ClaudeCode
    New-RestorePoint

    $extras = if ($Advanced) { Select-AdvancedTests } else { @() }
    $prompt = Build-Prompt -Extras $extras
    Set-Content -Path $promptFile -Value $prompt -Encoding UTF8 -Force

    Invoke-Claude -PromptPath $promptFile -ApiKey $apiKey

    if (Test-Path $reportFile) {
        Write-Log "Report written: $reportFile"
    } else {
        Write-Log 'Claude did not produce report.md. Check prompt.txt and visit.log.' 'WARN'
    }
}
catch {
    Write-Log $_.Exception.Message 'ERROR'
}
finally {
    try { Invoke-Cleanup } catch { Write-Log "Cleanup error: $($_.Exception.Message)" 'WARN' }
    Clear-ApiKeyEnv
    Write-Host ''
    Write-Host ('=' * 60) -ForegroundColor Cyan
    if (Test-Path $workDir) { Write-Host (" Folder: {0}" -f $workDir) }
    if ($script:restorePointId) {
        Write-Host (" Restore point: #{0}  (run rstrui.exe to roll back)" -f $script:restorePointId)
    }
    Write-Host ('=' * 60) -ForegroundColor Cyan
    Write-Host ''
    if ($Elevated) { Read-Host 'Press Enter to close this window' | Out-Null }
}
