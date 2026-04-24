#Requires -Version 5.1
<#
.SYNOPSIS
    Provision a disposable Windows 11 Hyper-V VM for testing Claude Visit.

.DESCRIPTION
    Creates a Generation-2 Hyper-V VM with vTPM + Secure Boot (required for
    Windows 11), boots it from a Win11 ISO you supply, and launches
    vmconnect.exe so you can complete OOBE once. Take a checkpoint
    afterwards - every test run of install.cmd reverts to that checkpoint
    for a clean slate.

.PARAMETER IsoPath
    Path to a Windows 11 x64 ISO. If omitted, the script looks for
    Win11_*.iso in the user's Downloads folder.

.PARAMETER VmName
    Name for the VM. Default: ClaudeVisitTest.

.PARAMETER VmRoot
    Directory where the VHDX lives. Default: <SystemDrive>\HyperV.

.PARAMETER Memory
    Startup memory in GB (dynamic, min 2, max 8). Default: 4.

.PARAMETER Cpus
    Virtual CPU count. Default: 4.

.PARAMETER DiskGB
    Dynamic VHDX maximum size in GB. Default: 80.

.PARAMETER Force
    If the VM already exists, stop + delete it and recreate from scratch.

.EXAMPLE
    .\create-test-vm.ps1 -IsoPath C:\ISOs\Win11_24H2_English_x64.iso

.EXAMPLE
    .\create-test-vm.ps1 -Force
#>

[CmdletBinding()]
param(
    [string]$IsoPath,
    [string]$VmName = 'ClaudeVisitTest',
    [string]$VmRoot,
    [ValidateRange(2,32)][int]$Memory = 4,
    [ValidateRange(1,16)][int]$Cpus = 4,
    [ValidateRange(40,2048)][int]$DiskGB = 80,
    [switch]$Force,
    [switch]$Elevated
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$script:failed = $false

# ----- self-elevation ------------------------------------------------------

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole(
        [Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Admin)) {
    if ($Elevated) { throw 'Relaunched process is still not admin. Aborting.' }
    $self = $MyInvocation.MyCommand.Path
    $argList = @('-NoProfile','-ExecutionPolicy','Bypass','-File', ('"{0}"' -f $self), '-Elevated')
    if ($IsoPath) { $argList += @('-IsoPath',  ('"{0}"' -f $IsoPath)) }
    if ($VmName)  { $argList += @('-VmName',   ('"{0}"' -f $VmName)) }
    if ($VmRoot)  { $argList += @('-VmRoot',   ('"{0}"' -f $VmRoot)) }
    $argList += @('-Memory', $Memory, '-Cpus', $Cpus, '-DiskGB', $DiskGB)
    if ($Force)   { $argList += '-Force' }
    Write-Host 'Relaunching with UAC elevation...'
    Start-Process powershell.exe -ArgumentList $argList -Verb RunAs
    exit 0
}

# ----- preflight -----------------------------------------------------------

function Assert-HyperV {
    $feature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All -ErrorAction SilentlyContinue
    if (-not $feature -or $feature.State -ne 'Enabled') {
        Write-Host ''
        Write-Host 'Hyper-V is not enabled on this machine.' -ForegroundColor Yellow
        Write-Host 'Enable it with (then reboot):'
        Write-Host '  Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Hyper-V-All'
        Write-Host ''
        throw 'Hyper-V required.'
    }
    if (-not (Get-Module -ListAvailable -Name Hyper-V)) {
        throw 'Hyper-V PowerShell module not installed. Install via Optional Features: "Hyper-V Management Tools".'
    }
    Import-Module Hyper-V -ErrorAction Stop
}

function Resolve-IsoPath {
    if ($IsoPath) {
        if (-not (Test-Path $IsoPath)) { throw "ISO not found: $IsoPath" }
        return (Resolve-Path $IsoPath).Path
    }
    $downloads = Join-Path $env:USERPROFILE 'Downloads'
    $candidate = Get-ChildItem -Path $downloads -Filter 'Win11*.iso' -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($candidate) {
        Write-Host ("Using ISO: {0}" -f $candidate.FullName) -ForegroundColor Green
        return $candidate.FullName
    }
    Write-Host ''
    Write-Host 'No ISO supplied and none auto-detected in Downloads.' -ForegroundColor Yellow
    Write-Host 'Download Windows 11 from:'
    Write-Host '  https://www.microsoft.com/software-download/windows11'
    Write-Host 'Save it anywhere, then rerun with -IsoPath "C:\path\to\Win11.iso".'
    throw 'No ISO.'
}

function Resolve-Switch {
    $defaultSwitch = Get-VMSwitch -Name 'Default Switch' -ErrorAction SilentlyContinue
    if ($defaultSwitch) { return $defaultSwitch.Name }
    $any = Get-VMSwitch -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($any) {
        Write-Host ("Using virtual switch: {0}" -f $any.Name) -ForegroundColor Yellow
        return $any.Name
    }
    throw "No Hyper-V virtual switch found. Create one in Hyper-V Manager or enable 'Default Switch'."
}

# ----- build ---------------------------------------------------------------

function Remove-ExistingVm {
    $existing = Get-VM -Name $VmName -ErrorAction SilentlyContinue
    if (-not $existing) { return }
    if (-not $Force) {
        throw "VM '$VmName' already exists. Rerun with -Force to delete and recreate, or use a different -VmName."
    }
    Write-Host ("Removing existing VM '{0}'..." -f $VmName) -ForegroundColor Yellow
    if ($existing.State -ne 'Off') { Stop-VM -Name $VmName -TurnOff -Force }
    $vhdxPaths = Get-VMHardDiskDrive -VMName $VmName | Select-Object -ExpandProperty Path
    Remove-VM -Name $VmName -Force
    foreach ($p in $vhdxPaths) {
        if (Test-Path $p) { Remove-Item -Path $p -Force }
    }
}

function New-ClaudeVisitVm {
    param([string]$Iso, [string]$SwitchName)

    $root   = if ($VmRoot) { $VmRoot } else { Join-Path $env:SystemDrive 'HyperV' }
    $vmDir  = Join-Path $root $VmName
    $vhdx   = Join-Path $vmDir ("{0}.vhdx" -f $VmName)
    New-Item -ItemType Directory -Force -Path $vmDir | Out-Null

    Write-Host ("Creating VHDX at {0} ({1} GB, dynamic)..." -f $vhdx, $DiskGB)
    New-VHD -Path $vhdx -SizeBytes ($DiskGB * 1GB) -Dynamic | Out-Null

    Write-Host ("Creating VM '{0}' (Gen 2, {1} vCPU, {2}-{3} GB RAM dynamic)..." -f $VmName, $Cpus, 2, $Memory)
    New-VM -Name $VmName -Generation 2 -MemoryStartupBytes ($Memory * 1GB) `
        -VHDPath $vhdx -SwitchName $SwitchName -Path $root | Out-Null

    Set-VMMemory -VMName $VmName -DynamicMemoryEnabled $true `
        -MinimumBytes 2GB -MaximumBytes ($Memory * 1GB) -StartupBytes ($Memory * 1GB)
    Set-VMProcessor -VMName $VmName -Count $Cpus

    Add-VMDvdDrive -VMName $VmName -Path $Iso
    $dvd = Get-VMDvdDrive -VMName $VmName
    Set-VMFirmware -VMName $VmName -FirstBootDevice $dvd `
        -EnableSecureBoot On -SecureBootTemplate 'MicrosoftWindows'

    # Windows 11 needs a vTPM. Hyper-V Host Guardian Service is overkill here;
    # a local key protector is enough for a single-host test VM.
    Write-Host 'Configuring vTPM (local key protector)...'
    try {
        Set-VMKeyProtector -VMName $VmName -NewLocalKeyProtector
        Enable-VMTPM -VMName $VmName
    } catch {
        Write-Host ('vTPM setup failed: {0}' -f $_.Exception.Message) -ForegroundColor Yellow
        Write-Host 'Windows 11 setup will block on the TPM check. Enable virtualization-based' -ForegroundColor Yellow
        Write-Host 'security in BIOS (VT-x/AMD-V + TPM 2.0), or supply a custom Win11 ISO that' -ForegroundColor Yellow
        Write-Host 'skips the TPM check.' -ForegroundColor Yellow
    }

    # Disable the automatic checkpoints nag - we'll take one manually post-OOBE.
    Set-VM -Name $VmName -AutomaticCheckpointsEnabled $false `
        -CheckpointType Production -AutomaticStartAction Nothing -AutomaticStopAction TurnOff

    return [pscustomobject]@{ Name = $VmName; Path = $vmDir; Vhdx = $vhdx }
}

# ----- main ----------------------------------------------------------------

try {
    Write-Host ''
    Write-Host ('=' * 60) -ForegroundColor Cyan
    Write-Host ' Claude Visit - test VM provisioning' -ForegroundColor Cyan
    Write-Host ('=' * 60) -ForegroundColor Cyan

    Assert-HyperV
    $iso    = Resolve-IsoPath
    $switch = Resolve-Switch
    Remove-ExistingVm
    $vm     = New-ClaudeVisitVm -Iso $iso -SwitchName $switch

    Write-Host ''
    Write-Host ("VM '{0}' created." -f $vm.Name) -ForegroundColor Green
    Write-Host ("  Folder : {0}" -f $vm.Path)
    Write-Host ("  VHDX   : {0}" -f $vm.Vhdx)
    Write-Host ("  ISO    : {0}" -f $iso)
    Write-Host ''
    Write-Host 'Starting VM and opening console...'
    Start-VM -Name $vm.Name
    Start-Process vmconnect.exe -ArgumentList @('localhost', $vm.Name)

    Write-Host ''
    Write-Host 'Next steps:' -ForegroundColor Cyan
    Write-Host '  1. Complete Windows setup in the VMConnect window (use a local account).'
    Write-Host '  2. Install "Hyper-V Integration Services" is already on by default on Win11.'
    Write-Host ('  3. Take a checkpoint so every test run resets to a clean install:')
    Write-Host ('       Checkpoint-VM -Name {0} -SnapshotName ''clean-oobe''' -f $vm.Name)
    Write-Host '  4. Copy the installer into the VM (easiest: VMConnect enhanced session,'
    Write-Host '     drag install.cmd + install.ps1 + apikey.txt onto the desktop).'
    Write-Host '  5. Inside the VM, double-click install.cmd.'
    Write-Host '  6. After each test run, revert:'
    Write-Host ('       Restore-VMCheckpoint -VMName {0} -Name ''clean-oobe'' -Confirm:$false' -f $vm.Name)
    Write-Host ''
}
catch {
    Write-Host ''
    Write-Host ('ERROR: {0}' -f $_.Exception.Message) -ForegroundColor Red
    $script:failed = $true
}
finally {
    if ($Elevated) { Read-Host 'Press Enter to close this window' | Out-Null }
    if ($script:failed) { exit 1 }
}
