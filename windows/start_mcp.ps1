$ErrorActionPreference = "Stop"

$AppDir = Join-Path $env:LOCALAPPDATA "manuss-mcp"
$ServerFile = Join-Path $AppDir "mcp_server.py"
$TokenFile = Join-Path $env:APPDATA "termux-mcp\token"
$PythonPathFile = Join-Path $AppDir "python-path.txt"
$CloudflaredFile = Join-Path $AppDir "cloudflared.exe"
$SetupFile = Join-Path $PSScriptRoot "setup_mcp.ps1"
$ServerOut = Join-Path $AppDir "mcp-server.out.log"
$ServerErr = Join-Path $AppDir "mcp-server.err.log"
$TunnelOut = Join-Path $AppDir "cloudflared.log"
$TunnelErr = Join-Path $AppDir "cloudflared.err.log"

if (-not (Test-Path $SetupFile)) { throw "setup_mcp.ps1 não foi encontrado. Execute o bootstrap documentado em windows/README.md." }
if (-not (Test-Path $ServerFile) -or -not (Test-Path $TokenFile) -or -not (Test-Path $CloudflaredFile)) {
  Write-Host "Ponte ainda não instalada ou está incompleta. Executando o setup..."
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $SetupFile
}

$pythonPath = if (Test-Path $PythonPathFile) { (Get-Content $PythonPathFile -Raw).Trim() } else { $null }
$pythonArgs = @()
if (-not $pythonPath -or -not (Test-Path $pythonPath)) {
  $python = Get-Command py -ErrorAction SilentlyContinue
  if ($python -and $python.Source -notlike "*WindowsApps*py.exe") { $pythonPath = $python.Source; $pythonArgs = @("-3") }
  else {
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python -and $python.Source -notlike "*WindowsApps*python.exe") { $pythonPath = $python.Source }
  }
}
if (-not $pythonPath -or -not (Test-Path $pythonPath)) { throw "Python não está disponível. Feche e abra o PowerShell e execute novamente o setup." }
if (-not (Test-Path $ServerFile)) { throw "Servidor MCP não encontrado após a instalação." }
if (-not (Test-Path $CloudflaredFile)) { throw "cloudflared não encontrado após a instalação." }
if (-not (Test-Path $TokenFile)) { throw "Token MCP não encontrado após a instalação." }

$env:TERMUX_MCP_TOKEN_FILE = $TokenFile
$env:TERMUX_MCP_SHELL = (Get-Command powershell.exe).Source
$env:TERMUX_MCP_SHELL_MODE = "powershell"
Remove-Item $ServerOut, $ServerErr, $TunnelOut, $TunnelErr -Force -ErrorAction SilentlyContinue

$serverArgs = @($pythonArgs + @($ServerFile))
$serverProcess = Start-Process -FilePath $pythonPath -ArgumentList $serverArgs -WorkingDirectory $AppDir -RedirectStandardOutput $ServerOut -RedirectStandardError $ServerErr -PassThru
Start-Sleep -Seconds 1
if ($serverProcess.HasExited) { Get-Content $ServerErr -ErrorAction SilentlyContinue; throw "O servidor MCP não iniciou." }

$tunnelProcess = $null
try {
  $tunnelProcess = Start-Process -FilePath $CloudflaredFile -ArgumentList @("tunnel", "--no-autoupdate", "--url", "http://127.0.0.1:8765") -WorkingDirectory $AppDir -RedirectStandardOutput $TunnelOut -RedirectStandardError $TunnelErr -PassThru
  $publicUrl = $null
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $TunnelOut) {
      $text = ((Get-Content $TunnelOut -Raw -ErrorAction SilentlyContinue) + (Get-Content $TunnelErr -Raw -ErrorAction SilentlyContinue))
      $match = [regex]::Match($text, 'https://[a-zA-Z0-9-]+\.trycloudflare\.com')
      if ($match.Success) { $publicUrl = $match.Value; break }
    }
    if ($tunnelProcess.HasExited) { break }
  }
  if (-not $publicUrl) {
    if (Test-Path $TunnelOut) { Get-Content $TunnelOut }
    if (Test-Path $TunnelErr) { Get-Content $TunnelErr }
    throw "Não foi possível obter a URL do Cloudflare Tunnel."
  }

  Write-Host "MCP local ativo em http://127.0.0.1:8765/mcp"
  Write-Host "URL MCP pública: $publicUrl/mcp"
  Write-Host "Health local: http://127.0.0.1:8765/health"
  Write-Host "Header: Authorization: Bearer $([IO.File]::ReadAllText($TokenFile).Trim())"
  Write-Host "Mantenha esta janela aberta. Ctrl+C encerra o MCP e o túnel."
  Wait-Process -Id $tunnelProcess.Id
}
finally {
  if ($tunnelProcess -and -not $tunnelProcess.HasExited) { Stop-Process -Id $tunnelProcess.Id -Force -ErrorAction SilentlyContinue }
  if ($serverProcess -and -not $serverProcess.HasExited) { Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue }
}
