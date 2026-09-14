param(
  [string]$ServerSource = "https://raw.githubusercontent.com/duducel204/manuss/main/termux/mcp_server.py",
  [switch]$RotateToken
)

$ErrorActionPreference = "Stop"

function Find-Python {
  $py = Get-Command py -ErrorAction SilentlyContinue
  if ($py) { return @{ Path = $py.Source; Args = @("-3") } }

  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($python -and $python.Source -notlike "*WindowsApps*python.exe") {
    return @{ Path = $python.Source; Args = @() }
  }

  $candidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\Python\Python313\python.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\Python\Python312\python.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\Python\Python311\python.exe"),
    "C:\Program Files\Python313\python.exe",
    "C:\Program Files\Python312\python.exe",
    "C:\Program Files\Python311\python.exe"
  )
  foreach ($candidate in $candidates) {
    if ($candidate -and (Test-Path $candidate)) {
      return @{ Path = $candidate; Args = @() }
    }
  }
  return $null
}

function Install-Python {
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if (-not $winget) {
    throw "Python não foi encontrado e o winget não está disponível. Instale Python 3.11+ em https://www.python.org/downloads/windows/ e marque 'Add python.exe to PATH'; depois execute este script novamente."
  }

  Write-Host "Python não encontrado. Instalando Python 3.12 via winget..."
  & $winget.Source install --id Python.Python.3.12 --scope user --silent --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) {
    throw "A instalação do Python via winget falhou (código $LASTEXITCODE). Instale manualmente pelo site https://www.python.org/downloads/windows/ e execute novamente."
  }
}

$pythonInfo = Find-Python
if (-not $pythonInfo) {
  Install-Python
  $pythonInfo = Find-Python
}
if (-not $pythonInfo) {
  throw "Python foi instalado, mas ainda não está disponível nesta sessão. Feche e abra o PowerShell e execute o bootstrap novamente."
}

$AppDir = Join-Path $env:LOCALAPPDATA "manuss-mcp"
$TokenDir = Join-Path $env:APPDATA "termux-mcp"
$TokenFile = Join-Path $TokenDir "token"
$PythonPathFile = Join-Path $AppDir "python-path.txt"
$ServerFile = Join-Path $AppDir "mcp_server.py"

New-Item -ItemType Directory -Force -Path $AppDir, $TokenDir | Out-Null
Set-Content -Path $PythonPathFile -Value $pythonInfo.Path -Encoding ascii

if ($ServerSource -match '^https?://') {
  Write-Host "Baixando o servidor MCP..."
  Invoke-WebRequest -UseBasicParsing -Uri $ServerSource -OutFile $ServerFile
} else {
  if (-not (Test-Path $ServerSource)) { throw "Arquivo do servidor não encontrado: $ServerSource" }
  Copy-Item -Force $ServerSource $ServerFile
}

if (-not (Test-Path $ServerFile) -or ((Get-Item $ServerFile).Length -lt 1000)) {
  throw "O download do servidor MCP parece incompleto."
}

if ($RotateToken -or -not (Test-Path $TokenFile)) {
  $bytes = New-Object byte[] 32
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  [Convert]::ToBase64String($bytes).Replace('+','-').Replace('/','_').TrimEnd('=') | Set-Content -NoNewline $TokenFile
}

Write-Host ""
Write-Host "MCP para Windows instalado."
Write-Host "Python:   $($pythonInfo.Path)"
Write-Host "Servidor: $ServerFile"
Write-Host "Token:    $TokenFile"
Write-Host "Proximo passo: .\windows\start_mcp.ps1"
