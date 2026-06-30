param(
  [Parameter(Mandatory = $true)]
  [string]$ConfigPath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Get-ConfigValue {
  param([string]$Name, [string]$Default = '')
  $prop = $script:Config.PSObject.Properties[$Name]
  if ($null -eq $prop -or $null -eq $prop.Value) { return $Default }
  return [string]$prop.Value
}

function Require-ConfigValue {
  param([string]$Name)
  $value = Get-ConfigValue -Name $Name
  if ([string]::IsNullOrWhiteSpace($value)) { throw "$Name is empty in deploy config" }
  return $value
}

function Invoke-StrictCommand {
  param([scriptblock]$Command, [string]$DisplayName)
  & $Command
  if ($LASTEXITCODE -ne 0) {
    Write-Error ("Command failed ({0}) with exit code {1}" -f $DisplayName, $LASTEXITCODE)
    exit $LASTEXITCODE
  }
}

function ConvertTo-EnvValue {
  param([AllowNull()][string]$Value)
  if ($null -eq $Value) { return '' }
  return ($Value -replace "`r`n", '\n' -replace "`r", '\n' -replace "`n", '\n')
}

function Invoke-Compose {
  param([string[]]$ComposeArgs)
  if ($script:UseComposePlugin) {
    & docker compose @ComposeArgs
  } else {
    & docker-compose @ComposeArgs
  }
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
  param([string]$NetworkName)

  $exists = docker network ls -q -f "name=^${NetworkName}$"
  if (-not $exists) {
    Write-Host ("[deploy] Creating Docker network {0}" -f $NetworkName)
    Invoke-StrictCommand -DisplayName ("docker network create {0}" -f $NetworkName) -Command {
      docker network create -d nat $NetworkName
    }
    return
  }

  $containerCount = [int](docker network inspect $NetworkName --format '{{len .Containers}}' 2>$null)
  $composeProjectLabel = (Get-DockerNetworkLabel -NetworkName $NetworkName -LabelKey 'com.docker.compose.project').Trim()
  $composeNetworkLabel = (Get-DockerNetworkLabel -NetworkName $NetworkName -LabelKey 'com.docker.compose.network').Trim()
  $hasBrokenComposeLabels = (-not [string]::IsNullOrWhiteSpace($composeProjectLabel)) -and [string]::IsNullOrEmpty($composeNetworkLabel)

  if ($hasBrokenComposeLabels -and $containerCount -eq 0) {
    Write-Host ("[deploy] Removing orphaned Docker network {0} (incorrect compose labels)" -f $NetworkName)
    Invoke-StrictCommand -DisplayName ("docker network rm {0}" -f $NetworkName) -Command {
      docker network rm $NetworkName
    }
    Write-Host ("[deploy] Creating Docker network {0}" -f $NetworkName)
    Invoke-StrictCommand -DisplayName ("docker network create {0}" -f $NetworkName) -Command {
      docker network create -d nat $NetworkName
    }
    return
  }

  if ($hasBrokenComposeLabels) {
    Write-Host ("[deploy] Network {0} has incorrect compose labels but {1} container(s) attached; keeping it" -f $NetworkName, $containerCount)
  } else {
    Write-Host ("[deploy] Docker network {0} OK ({1} container(s) attached)" -f $NetworkName, $containerCount)
  }
}

if (-not (Test-Path -LiteralPath $ConfigPath)) {
  throw "Deploy config file is missing: $ConfigPath"
}

$script:Config = Get-Content -LiteralPath $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json

$target = (Require-ConfigValue -Name 'TARGET_PATH').Trim()
$composeProject = (Require-ConfigValue -Name 'COMPOSE_PROJECT').Trim()
$runId = Require-ConfigValue -Name 'RUN_ID'

$resolved = [System.IO.Path]::GetFullPath($target)
$root = [System.IO.Path]::GetPathRoot($resolved)
if ([string]::IsNullOrWhiteSpace($root) -or $resolved.TrimEnd('\', '/') -eq $root.TrimEnd('\', '/')) {
  throw 'TARGET_PATH resolves to drive root; refusing to deploy'
}

Set-Location $resolved

$deployMarkerPath = '.mji-deploy-target'
if (-not (Test-Path -LiteralPath $deployMarkerPath)) {
  if (-not (Test-Path -LiteralPath 'docker-compose.windows.yml')) {
    throw 'Deploy marker missing and target path does not look like MJI Manager backend deploy directory'
  }
  Set-Content -Path $deployMarkerPath -Value 'MJI Manager backend deploy target: prod' -Encoding utf8
}

if (-not (Test-Path -LiteralPath 'deploy-src.zip')) {
  throw 'deploy-src.zip not found in TARGET_PATH'
}

Write-Host '[deploy] Extracting deploy-src.zip'
Expand-Archive -Path 'deploy-src.zip' -DestinationPath '.' -Force
Remove-Item -LiteralPath 'deploy-src.zip' -Force

if (-not (Test-Path -LiteralPath 'server.js')) {
  throw 'server.js not found after extraction вЂ” check SCP copy'
}

$installerHostPath = (Get-ConfigValue -Name 'INSTALLER_HOST_PATH' -Default 'E:/mji-data/installer').Trim().Replace('\', '/').TrimEnd('/')
$installerReleasesHostPath = (Get-ConfigValue -Name 'INSTALLER_RELEASES_HOST_PATH' -Default 'C:/Users/AdministratorOffice/sites/mji-installers').Trim().Replace('\', '/').TrimEnd('/')
New-Item -ItemType Directory -Force -Path ($installerHostPath.Replace('/', '\')) | Out-Null
New-Item -ItemType Directory -Force -Path ($installerReleasesHostPath.Replace('/', '\')) | Out-Null

$backendPort = Get-ConfigValue -Name 'BACKEND_PUBLISH_PORT' -Default '2010'

$envEntries = [ordered]@{
  NODE_ENV = 'production'
  BUILD_SHA = Get-ConfigValue -Name 'BUILD_SHA' -Default 'deploy'
  DB_HOST = Require-ConfigValue -Name 'DB_HOST'
  DB_PORT = Get-ConfigValue -Name 'DB_PORT' -Default '5432'
  DB_USER = Require-ConfigValue -Name 'DB_USER'
  DB_PASSWORD = Require-ConfigValue -Name 'DB_PASSWORD'
  DB_NAME = Require-ConfigValue -Name 'DB_NAME'
  JWT_SECRET = Require-ConfigValue -Name 'JWT_SECRET'
  JWT_EXPIRES_IN = Get-ConfigValue -Name 'JWT_EXPIRES_IN' -Default '7d'
  OAUTH_REDIRECT_URIS = Require-ConfigValue -Name 'OAUTH_REDIRECT_URIS'
  CORS_ORIGINS = Require-ConfigValue -Name 'CORS_ORIGINS'
  AUTH_COOKIE_SAMESITE = Get-ConfigValue -Name 'AUTH_COOKIE_SAMESITE' -Default 'lax'
  AUTH_CROSS_ORIGIN_COOKIES = Get-ConfigValue -Name 'AUTH_CROSS_ORIGIN_COOKIES' -Default 'false'
  EXPERT_HUB_SSO_URL = Require-ConfigValue -Name 'EXPERT_HUB_SSO_URL'
  EXPERT_HUB_SSO_CLIENT_ID = Require-ConfigValue -Name 'EXPERT_HUB_SSO_CLIENT_ID'
  EXPERT_HUB_SSO_CLIENT_SECRET = Require-ConfigValue -Name 'EXPERT_HUB_SSO_CLIENT_SECRET'
  EXPERT_HUB_FETCH_TIMEOUT_MS = Get-ConfigValue -Name 'EXPERT_HUB_FETCH_TIMEOUT_MS' -Default '30000'
  PUBLIC_URL = Require-ConfigValue -Name 'PUBLIC_URL'
  INSTALLER_HOST_PATH = $installerHostPath
  INSTALLER_RELEASES_HOST_PATH = $installerReleasesHostPath
  INSTALLER_FILE_PATH = 'C:/app/installer/MJI-manager.exe'
  INSTALLER_RELEASES_DIR = 'C:/app/installer/releases'
  BACKEND_PUBLISH_PORT = $backendPort
}

$script:UseComposePlugin = $false
$prevEa = $ErrorActionPreference
try {
  $ErrorActionPreference = 'Continue'
  docker compose version *> $null
  if ($LASTEXITCODE -eq 0) { $script:UseComposePlugin = $true }
  elseif (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    docker-compose --version *> $null
    if ($LASTEXITCODE -ne 0) { throw 'docker-compose found but --version failed' }
  } else {
    throw 'Neither docker compose plugin nor docker-compose standalone found'
  }
} finally {
  $ErrorActionPreference = $prevEa
}

$composeFile = 'docker-compose.windows.yml'
if (-not (Test-Path -LiteralPath $composeFile)) {
  throw ('Selected compose file is missing: ' + $composeFile)
}

Ensure-DockerNetwork -NetworkName 'net-mji'

$envLines = New-Object System.Collections.Generic.List[string]
foreach ($key in $envEntries.Keys) {
  [void]$envLines.Add(($key + '=' + (ConvertTo-EnvValue -Value ([string]$envEntries[$key]))))
}
Set-Content -Path '.env' -Value ($envLines -join "`r`n") -Encoding utf8

$composeBaseArgs = @('-f', $composeFile, '-p', $composeProject, '--profile', 'prod')

Invoke-StrictCommand -DisplayName 'docker builder prune -af' -Command { docker builder prune -af 2>$null }
Invoke-StrictCommand -DisplayName 'compose down' -Command { Invoke-Compose -ComposeArgs ($composeBaseArgs + @('down', '--remove-orphans')) }
Invoke-StrictCommand -DisplayName 'compose build' -Command { Invoke-Compose -ComposeArgs ($composeBaseArgs + @('build', '--no-cache')) }
Invoke-Compose -ComposeArgs ($composeBaseArgs + @('up', '-d', '--remove-orphans'))
if ($LASTEXITCODE -ne 0) {
  Write-Error ('compose up failed with exit code ' + $LASTEXITCODE)
  exit $LASTEXITCODE
}
Invoke-StrictCommand -DisplayName 'compose ps' -Command { Invoke-Compose -ComposeArgs ($composeBaseArgs + @('ps')) }

Start-Sleep -Seconds 10
$smokeUrl = 'http://127.0.0.1:{0}/api/health' -f $backendPort
$smokeOk = $false
$lastSmokeError = ''
for ($attempt = 1; $attempt -le 18; $attempt++) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $smokeUrl -TimeoutSec 10
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
      Write-Host ('[deploy] Smoke check passed: ' + $smokeUrl)
      $smokeOk = $true
      break
    }
    $lastSmokeError = 'HTTP ' + $response.StatusCode
  } catch {
    $lastSmokeError = $_.Exception.Message
  }
  Write-Host ('[deploy] Smoke attempt ' + $attempt + ' failed: ' + $lastSmokeError)
  Start-Sleep -Seconds 5
}

if (-not $smokeOk) {
  $projectLabel = 'label=com.docker.compose.project=' + $composeProject
  $all = docker ps -a --filter $projectLabel --format '{{.Names}}'
  foreach ($name in $all) {
    Write-Host ('---- logs: ' + $name + ' (tail 120) ----')
    docker logs --tail 120 $name 2>$null
  }
  Write-Error ('API smoke check failed for ' + $smokeUrl + ': ' + $lastSmokeError)
  exit 1
}

$markerPath = Join-Path $resolved '.mji-last-deploy.txt'
$stamp = (Get-Date).ToUniversalTime().ToString('o')
Set-Content -Path $markerPath -Value ('run_id=' + $runId + '; project=' + $composeProject + '; utc=' + $stamp) -Encoding utf8
Write-Host ('Deployment marker updated: ' + $markerPath)
