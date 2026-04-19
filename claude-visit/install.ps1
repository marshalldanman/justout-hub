#Requires -Version 5.1
<#
.SYNOPSIS
    Claude Visit - on-site Windows 11 diagnostic & repair tool.

.DESCRIPTION
    Installs Node.js and Claude Code (if missing), creates a system restore
    point, runs Claude against a scoped Windows health-check prompt, writes a
    transcript + report to C:\ClaudeVisit\<timestamp>\, then removes anything
    the installer added. Requires Administrator.

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

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\install.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\install.ps1 -Advanced -ReportOnly
#>

[CmdletBinding()]
param(
    [switch]$Advanced,
    [switch]$ReportOnly,
    [switch]$NoCleanup,
    [string]$ApiKeyFile
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$timestamp  = Get-Date -Format 'yyyyMMdd-HHmmss'
$workDir    = "C:\ClaudeVisit\$timestamp"
$logFile    = Join-Path $workDir 'visit.log'
$reportFile = Join-Path $workDir 'report.md'

$script:installedNode   = $false
$script:installedClaude = $false
$script:restorePointId  = $null

# ----- helpers -------------------------------------------------------------

function Write-Log {
    param([string]$Message, [ValidateSet('INFO','WARN','ERROR')][string]$Level = 'INFO')
    $line = '[{0}] [{1}] {2}' -f (Get-Date -Format 'HH:mm:ss'), $Level, $Message
    Write-Host $line
    if (Test-Path $workDir) { Add-Content -Path $logFile -Value $line -Encoding UTF8 }
}

function Assert-Admin {
    $current   = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($current)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'install.ps1 must be run as Administrator. Right-click -> Run as Administrator.'
    }
}

function Get-ApiKey {
    if ($env:ANTHROPIC_API_KEY) { return $env:ANTHROPIC_API_KEY }
    $candidate = if ($ApiKeyFile) { $ApiKeyFile } else { Join-Path $scriptRoot 'apikey.txt' }
    if (Test-Path $candidate) {
        $k = (Get-Content $candidate -Raw).Trim()
        if ($k) { return $k }
    }
    throw "No API key found. Place it in '$candidate', or set `$env:ANTHROPIC_API_KEY before running."
}

function Ensure-Winget {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "winget is not available. Update 'App Installer' from the Microsoft Store, then rerun."
    }
}

function Refresh-Path {
    $machine = [Environment]::GetEnvironmentVariable('Path','Machine')
    $user    = [Environment]::GetEnvironmentVariable('Path','User')
    $env:PATH = ($machine, $user -join ';')
}

function Ensure-Node {
    if (Get-Command node -ErrorAction SilentlyContinue) {
        Write-Log "Node.js already installed ($(node --version)) - leaving alone."
        return
    }
    Write-Log 'Installing Node.js LTS via winget...'
    winget install -e --id OpenJS.NodeJS.LTS --silent `
        --accept-source-agreements --accept-package-agreements | Out-Null
    Refresh-Path
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
        throw 'Node.js installation did not put node on PATH. Aborting.'
    }
    $script:installedNode = $true
    Write-Log "Installed Node.js $(node --version)."
}

function Ensure-ClaudeCode {
    if (Get-Command claude -ErrorAction SilentlyContinue) {
        Write-Log 'Claude Code already installed - leaving alone.'
        return
    }
    Write-Log 'Installing @anthropic-ai/claude-code globally via npm...'
    $npmOut = & npm install -g '@anthropic-ai/claude-code' 2>&1
    Add-Content -Path $logFile -Value $npmOut -Encoding UTF8
    Refresh-Path
    if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
        throw 'Claude Code installation failed. See log for npm output.'
    }
    $script:installedClaude = $true
    Write-Log 'Installed Claude Code.'
}

function New-RestorePoint {
    try {
        Enable-ComputerRestore -Drive 'C:\' -ErrorAction SilentlyContinue
        Checkpoint-Computer -Description "ClaudeVisit $timestamp" -RestorePointType 'MODIFY_SETTINGS'
        $rp = Get-ComputerRestorePoint | Sort-Object CreationTime -Descending | Select-Object -First 1
        $script:restorePointId = $rp.SequenceNumber
        Write-Log "Created system restore point #$($rp.SequenceNumber)."
    } catch {
        Write-Log "Could not create restore point: $($_.Exception.Message)" 'WARN'
        Write-Log 'Continuing without restore point. Destructive fixes will still require your approval.' 'WARN'
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
1. Disk space on C: (warn if <15% free).
2. Pending Windows Updates (list only, don't install without confirmation).
3. Top startup programs by impact (Get-CimInstance Win32_StartupCommand + Task
   Scheduler 'At logon' tasks). Flag anything obviously broken or unknown.
4. Event Viewer: System + Application errors in the last 7 days, grouped.
5. Running services set to Automatic that are currently Stopped.
6. %TEMP% and Windows\Temp size.

Safe fixes you MAY perform without re-asking:
- Clear %TEMP% and C:\Windows\Temp of files older than 7 days.
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
Get-Disk | Get-PhysicalDisk health status, and chkdsk C: (READ-ONLY, no /f
or /r). Report any reallocated sectors, bad blocks, or health warnings.
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
    Write-Host 'Advanced menu - choose extra tests (comma-separated, or Enter for none):'
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
    return $out
}

function Build-Prompt {
    param([array]$Extras)
    $parts = @($defaultTaskPrompt)
    if ($ReportOnly) { $parts += $reportOnlyAddendum }
    foreach ($e in $Extras) { $parts += "`nAdditional category: $($e.Name)`n$($e.Prompt)" }
    $parts += "`nWorking directory: $workDir"
    $parts += "Write your final report to: $reportFile"
    return ($parts -join "`n`n")
}

# ----- run -----------------------------------------------------------------

function Invoke-Claude {
    param(
        [Parameter(Mandatory)][string]$Prompt,
        [Parameter(Mandatory)][string]$ApiKey
    )

    $permMode = if ($ReportOnly) { 'plan' } else { 'acceptEdits' }

    Push-Location $workDir
    try {
        # Scope the API key to this process only - do not persist.
        $env:ANTHROPIC_API_KEY = $ApiKey
        Write-Log "Launching Claude Code (permission-mode=$permMode)..."
        & claude --permission-mode $permMode $Prompt
        $exit = $LASTEXITCODE
        Write-Log "Claude exited with code $exit."
    } finally {
        Remove-Item Env:\ANTHROPIC_API_KEY -ErrorAction SilentlyContinue
        Pop-Location
    }
}

function Invoke-Cleanup {
    if ($NoCleanup) {
        Write-Log 'NoCleanup set - leaving installed tools in place.'
        return
    }
    if ($script:installedClaude) {
        Write-Log 'Removing Claude Code...'
        & npm uninstall -g '@anthropic-ai/claude-code' 2>&1 |
            Add-Content -Path $logFile -Encoding UTF8
    }
    if ($script:installedNode) {
        Write-Log 'Removing Node.js (installed by this script)...'
        winget uninstall -e --id OpenJS.NodeJS.LTS --silent 2>&1 |
            Add-Content -Path $logFile -Encoding UTF8
    }
    Write-Log "Report folder preserved at $workDir"
}

# ----- main ----------------------------------------------------------------

try {
    Assert-Admin
    New-Item -ItemType Directory -Force -Path $workDir | Out-Null
    Write-Log "Claude Visit start. Report folder: $workDir"
    Write-Log "Flags: Advanced=$Advanced ReportOnly=$ReportOnly NoCleanup=$NoCleanup"

    $apiKey = Get-ApiKey
    Write-Log 'API key loaded (not persisted to disk or user env).'

    Ensure-Winget
    Ensure-Node
    Ensure-ClaudeCode
    New-RestorePoint

    $extras = if ($Advanced) { Select-AdvancedTests } else { @() }
    $prompt = Build-Prompt -Extras $extras
    Set-Content -Path (Join-Path $workDir 'prompt.txt') -Value $prompt -Encoding UTF8

    Invoke-Claude -Prompt $prompt -ApiKey $apiKey

    if (Test-Path $reportFile) {
        Write-Log "Report written: $reportFile"
    } else {
        Write-Log 'Claude did not produce report.md. Check prompt.txt and visit.log.' 'WARN'
    }
}
catch {
    Write-Log $_.Exception.Message 'ERROR'
    exit 1
}
finally {
    Invoke-Cleanup
    Write-Host ''
    Write-Host "Done. Folder: $workDir"
    if ($script:restorePointId) {
        Write-Host "Restore point: #$($script:restorePointId) (rstrui.exe to roll back)"
    }
}
