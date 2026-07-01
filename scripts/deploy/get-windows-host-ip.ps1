<#
.SYNOPSIS
  Resolves the Windows host IP reachable from Docker Windows containers for web→server API routing.
#>

function Test-Ipv4Address {
    param([string]$Value)
    $v = [string]$Value
    if ([string]::IsNullOrWhiteSpace($v)) { return $false }
    return $v.Trim() -match '^(?:\d{1,3}\.){3}\d{1,3}$'
}

function Get-ConfiguredWindowsHostIp {
    foreach ($name in @('WINDOWS_HOST_IP', 'HOST_LAN_IP')) {
        $value = [Environment]::GetEnvironmentVariable($name)
        if (Test-Ipv4Address $value) {
            return @{
                Ip     = $value.Trim()
                Source = "env:$name"
            }
        }
    }
    return $null
}

function Get-LanIpFromNetAdapter {
    $addresses = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and
            $_.PrefixOrigin -ne 'WellKnown'
        })

    if ($addresses.Count -eq 0) { return $null }

    $sorted = $addresses | Sort-Object `
        @{ Expression = {
                if ($_.InterfaceAlias -match 'vEthernet|Docker|HNS|Loopback|Virtual|Hyper-V') { 2 }
                elseif ($_.InterfaceAlias -match 'Ethernet|Wi-Fi|LAN|Основной') { 0 }
                else { 1 }
            } }, `
        @{ Expression = { if ($_.SkipAsSource) { 1 } else { 0 } } }

    foreach ($entry in $sorted) {
        if (Test-Ipv4Address $entry.IPAddress) {
            return @{
                Ip     = $entry.IPAddress.Trim()
                Source = "netadapter:$($entry.InterfaceAlias)"
            }
        }
    }

    return $null
}

function Get-NatGatewayFromDocker {
    param([string]$NetworkName = 'nat')

    $candidates = @()
    if ($NetworkName) { $candidates += $NetworkName }
    $candidates += 'nat', 'NAT'

    $seen = @{}
    foreach ($net in $candidates) {
        if (-not $net -or $seen.ContainsKey($net)) { continue }
        $seen[$net] = $true

        $fmt = '{{range .IPAM.Config}}{{.Gateway}}{{end}}'
        $raw = (docker network inspect $net -f $fmt 2>$null)
        if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($raw)) { continue }

        foreach ($part in ($raw -split '\s+')) {
            if (Test-Ipv4Address $part) {
                return @{
                    Ip     = $part.Trim()
                    Source = "docker-network:$net"
                }
            }
        }
    }

    return $null
}

function Resolve-WindowsHostIp {
    param([string]$Override = '')

    if (Test-Ipv4Address $Override) {
        return @{ Ip = $Override.Trim(); Source = 'parameter' }
    }

    $configured = Get-ConfiguredWindowsHostIp
    if ($configured) { return $configured }

    $lan = Get-LanIpFromNetAdapter
    if ($lan) { return $lan }

    $gateway = Get-NatGatewayFromDocker
    if ($gateway) { return $gateway }

    throw 'Could not determine Windows host IP. Set WINDOWS_HOST_IP GitHub secret (IPv4 only).'
}

function Resolve-WindowsApiBaseUrl {
    param(
        [string]$HostIp = '',
        [int]$ServerPort = 2010,
        [string]$ConfiguredApiBaseUrl = ''
    )

    $configured = [string]$ConfiguredApiBaseUrl
    if (-not [string]::IsNullOrWhiteSpace($configured) -and
        $configured -ne 'http://backend:2010' -and
        $configured -ne 'http://mji-manager-backend:2010' -and
        $configured -notmatch 'host\.docker\.internal') {
        return $configured
    }

    $resolved = Resolve-WindowsHostIp -Override $HostIp
    return ('http://{0}:{1}' -f $resolved.Ip, $ServerPort)
}
