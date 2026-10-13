param(
  [Parameter(Mandatory=$true)][string]$AdminUrl,
  [Parameter(Mandatory=$true)][string]$BackupDirectory,
  [Parameter(Mandatory=$true)][string]$TargetDatabase,
  [Parameter(Mandatory=$true)][ValidateSet('CREATE_EMPTY_TARGET')][string]$Confirm
)
$ErrorActionPreference = 'Stop'
if ($TargetDatabase -notmatch '^[A-Za-z0-9_]+_restore_test$') { throw 'TargetDatabase must end in _restore_test.' }
$dump = Join-Path $BackupDirectory 'database.dump'
$manifest = Join-Path $BackupDirectory 'MANIFEST.sha256'
if (-not (Test-Path $dump) -or -not (Test-Path $manifest)) { throw 'Backup dump or manifest missing.' }
$expected = (Get-Content $manifest | Where-Object { $_ -match 'database.dump$' }).Split()[0]
$actual = (Get-FileHash $dump -Algorithm SHA256).Hash.ToLower()
if ($expected -ne $actual) { throw 'Database dump checksum mismatch.' }
$exists = & psql $AdminUrl -Atqc "SELECT 1 FROM pg_database WHERE datname = '$TargetDatabase'"
if ($exists -eq '1') { throw 'Target database already exists; refusing to overwrite it.' }
& createdb --maintenance-db $AdminUrl $TargetDatabase
if ($LASTEXITCODE -ne 0) { throw 'createdb failed.' }
$targetUrl = $AdminUrl.Substring(0, $AdminUrl.LastIndexOf('/') + 1) + $TargetDatabase
& pg_restore --exit-on-error --no-owner --no-privileges --dbname $targetUrl $dump
if ($LASTEXITCODE -ne 0) { throw 'pg_restore failed; preserve the target for diagnosis.' }
& psql $targetUrl -v ON_ERROR_STOP=1 -c 'SELECT current_database(), now();'
Write-Host 'Restore completed. Application integrity and role smoke checks are still required.'
