param([switch]$OpenBrowser)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$appRoot = Join-Path $projectRoot 'unseen-main'
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
if ($nodeCommand) {
    $nodeExecutable = $nodeCommand.Source
} else {
    $nodePathFile = Join-Path $env:LOCALAPPDATA 'UnseenTools/node-path.txt'
    if (!(Test-Path -LiteralPath $nodePathFile)) {
        throw 'Installa Node.js LTS e riapri il terminale prima di avviare UNSEEN.'
    }
    $nodeExecutable = Join-Path (Get-Content -LiteralPath $nodePathFile -Raw).Trim() 'node.exe'
}
if (!(Test-Path -LiteralPath $nodeExecutable)) { throw 'Node.js non trovato.' }
$env:Path = (Split-Path -Parent $nodeExecutable) + ';' + $env:Path
$env:NO_COLOR = '1'

if (Get-NetTCPConnection -State Listen -LocalPort 8080 -ErrorAction SilentlyContinue) {
    $existingServer = Invoke-WebRequest 'http://127.0.0.1:8080/src/main.tsx' -UseBasicParsing
    if ($existingServer.Content -match '/src/App.tsx') {
        Write-Output 'UNSEEN_READY: http://127.0.0.1:8080'
        if ($OpenBrowser) { Start-Process 'http://127.0.0.1:8080' }
        exit 0
    }
    throw 'La porta 8080 e gia occupata da un altro server.'
}

Push-Location $appRoot
try {
    if (!(Test-Path -LiteralPath 'node_modules/vite/bin/vite.js')) {
        $npmCli = Join-Path (Split-Path -Parent $nodeExecutable) 'node_modules/npm/bin/npm-cli.js'
        & $nodeExecutable $npmCli ci --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw 'Installazione dipendenze non riuscita.' }
    }
    Write-Output 'UNSEEN_STARTING'
    if ($OpenBrowser) { Start-Process 'http://127.0.0.1:8080' }
    & $nodeExecutable 'node_modules/vite/bin/vite.js' --host 127.0.0.1 --port 8080 --strictPort
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
