<#
.SYNOPSIS
  Shared Docker network helpers for MJI Manager Windows deploy (net-mji).
#>

function Test-Ipv4Address {
    param([string]$Value)
    $v = [string]$Value
    if ([string]::IsNullOrWhiteSpace($v)) { return $false }
    return $v.Trim() -match '^(?:\d{1,3}\.){3}\d{1,3}$'
}

function Get-DockerNetworkLabel {
    param([string]$NetworkName, [string]$LabelKey)
    $json = docker network inspect $NetworkName --format '{{json .Labels}}' 2>$null
    if ([string]::IsNullOrWhiteSpace($json) -or $json -eq 'null') { return '' }
    try {
        $labels = $json | ConvertFrom-Json
        $prop = $labels.PSObject.Properties[$LabelKey]
        if ($null -eq $prop -or $null -eq $prop.Value) { return '' }
        return [string]$prop.Value
    } catch {
        return ''
    }
}

function Ensure-DockerNetwork {
    param([string]$NetworkName = 'net-mji')

    $exists = docker network ls -q -f "name=^${NetworkName}$"
    if (-not $exists) {
        Write-Host ("[deploy] Creating Docker network {0}" -f $NetworkName)
        docker network create -d nat $NetworkName
        if ($LASTEXITCODE -ne 0) { throw ("Failed to create Docker network {0}" -f $NetworkName) }
        return
    }

    $containerCount = [int](docker network inspect $NetworkName --format '{{len .Containers}}' 2>$null)
    $composeProjectLabel = (Get-DockerNetworkLabel -NetworkName $NetworkName -LabelKey 'com.docker.compose.project').Trim()
    $composeNetworkLabel = (Get-DockerNetworkLabel -NetworkName $NetworkName -LabelKey 'com.docker.compose.network').Trim()
    $hasBrokenComposeLabels = (-not [string]::IsNullOrWhiteSpace($composeProjectLabel)) -and [string]::IsNullOrEmpty($composeNetworkLabel)

    if ($hasBrokenComposeLabels -and $containerCount -eq 0) {
        Write-Host ("[deploy] Removing orphaned Docker network {0} (incorrect compose labels)" -f $NetworkName)
        docker network rm $NetworkName
        if ($LASTEXITCODE -ne 0) { throw ("Failed to remove Docker network {0}" -f $NetworkName) }
        Write-Host ("[deploy] Creating Docker network {0}" -f $NetworkName)
        docker network create -d nat $NetworkName
        if ($LASTEXITCODE -ne 0) { throw ("Failed to recreate Docker network {0}" -f $NetworkName) }
        return
    }

    if ($hasBrokenComposeLabels) {
        Write-Host ("[deploy] Network {0} has incorrect compose labels but {1} container(s) attached; keeping it" -f $NetworkName, $containerCount)
    } else {
        Write-Host ("[deploy] Docker network {0} OK ({1} container(s) attached)" -f $NetworkName, $containerCount)
    }
}

function Test-DockerNetworkActive {
    param([string]$NetworkName = 'net-mji')

    & docker @('network', 'inspect', $NetworkName) 2>$null | Out-Null
    return ($LASTEXITCODE -eq 0)
}

function Test-BackendContainerOnDockerNetwork {
    param(
        [string]$ContainerName = 'mji-manager-backend',
        [string]$NetworkName = 'net-mji'
    )

    if (-not (Test-DockerNetworkActive -NetworkName $NetworkName)) { return $false }

    $containerId = (& docker @('inspect', '--format', '{{.Id}}', $ContainerName) 2>$null).Trim()
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($containerId)) { return $false }

    $networkJson = & docker @('network', 'inspect', $NetworkName, '--format', '{{json .Containers}}') 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($networkJson)) { return $false }

    try {
        $attached = $networkJson | ConvertFrom-Json
    } catch {
        return $false
    }

    foreach ($entry in $attached.PSObject.Properties) {
        $name = [string]$entry.Value.Name
        if ($name -eq $ContainerName) { return $true }
    }

    return $false
}

function Get-BackendContainerIpOnDockerNetwork {
    param(
        [string]$ContainerName = 'mji-manager-backend',
        [string]$NetworkName = 'net-mji'
    )

    $json = & docker @('inspect', '--format', '{{json .NetworkSettings.Networks}}', $ContainerName) 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($json)) { return $null }

    try {
        $networks = $json | ConvertFrom-Json
    } catch {
        return $null
    }

    $netProp = $networks.PSObject.Properties |
        Where-Object { $_.Name -eq $NetworkName } |
        Select-Object -First 1
    if ($null -eq $netProp) { return $null }

    $ip = [string]$netProp.Value.IPAddress
    if (Test-Ipv4Address $ip) { return $ip.Trim() }

    return $null
}

function Resolve-BackendApiUrlOnDockerNetwork {
    param(
        [string]$ContainerName = 'mji-manager-backend',
        [string]$NetworkName = 'net-mji',
        [int]$ServerPort = 2010
    )

    if (-not (Test-DockerNetworkActive -NetworkName $NetworkName)) {
        Write-Host ("[deploy] Docker network {0} is not active; skipping container IP resolution" -f $NetworkName)
        return $null
    }

    if (-not (Test-BackendContainerOnDockerNetwork -ContainerName $ContainerName -NetworkName $NetworkName)) {
        Write-Host ("[deploy] Backend container {0} is not attached to {1}; skipping container IP resolution" -f $ContainerName, $NetworkName)
        return $null
    }

    $ip = Get-BackendContainerIpOnDockerNetwork -ContainerName $ContainerName -NetworkName $NetworkName
    if (-not $ip) {
        Write-Host ("[deploy] Could not read {0} IPv4 on {1}" -f $ContainerName, $NetworkName)
        return $null
    }

    return @{
        Url    = ('http://{0}:{1}' -f $ip, $ServerPort)
        Source = ('net-mji:' + $ContainerName)
    }
}

function Wait-ForBackendOnDockerNetwork {
    param(
        [string]$ContainerName = 'mji-manager-backend',
        [string]$NetworkName = 'net-mji',
        [int]$MaxAttempts = 24,
        [int]$DelaySeconds = 5
    )

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
        if (Test-BackendContainerOnDockerNetwork -ContainerName $ContainerName -NetworkName $NetworkName) {
            Write-Host ("[deploy] Backend {0} attached to {1} (attempt {2})" -f $ContainerName, $NetworkName, $attempt)
            return $true
        }
        Write-Host ("[deploy] Waiting for {0} on {1} ({2}/{3})..." -f $ContainerName, $NetworkName, $attempt, $MaxAttempts)
        Start-Sleep -Seconds $DelaySeconds
    }

    return $false
}

function Write-BackendNetIpMarker {
    param(
        [string]$MarkerPath,
        [string]$ContainerName = 'mji-manager-backend',
        [string]$NetworkName = 'net-mji',
        [int]$ServerPort = 2010
    )

    $api = Resolve-BackendApiUrlOnDockerNetwork `
        -ContainerName $ContainerName `
        -NetworkName $NetworkName `
        -ServerPort $ServerPort
    if (-not $api) { return $null }

    $stamp = (Get-Date).ToUniversalTime().ToString('o')
    $lines = @(
        ('url=' + $api.Url)
        ('source=' + $api.Source)
        ('utc=' + $stamp)
    )
    Set-Content -Path $MarkerPath -Value ($lines -join "`r`n") -Encoding utf8
    Write-Host ("[deploy] Backend net-mji marker written: {0} ({1})" -f $MarkerPath, $api.Url)
    return $api
}

function Read-BackendNetIpMarker {
    param([string]$MarkerPath)

    if (-not (Test-Path -LiteralPath $MarkerPath)) { return $null }

    $url = ''
    foreach ($line in (Get-Content -LiteralPath $MarkerPath -Encoding UTF8)) {
        if ($line -match '^url=(.+)$') { $url = $Matches[1].Trim() }
    }

    if ([string]::IsNullOrWhiteSpace($url)) { return $null }
    return @{ Url = $url; Source = 'marker-file' }
}
