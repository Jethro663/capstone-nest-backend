param(
  [Parameter(Mandatory=$true)][string]$DatabaseUrl,
  [Parameter(Mandatory=$true)][string]$UploadsPath,
  [Parameter(Mandatory=$true)][string]$OutputDirectory
)
$ErrorActionPreference = 'Stop'
if (-not [IO.Path]::IsPathRooted($OutputDirectory)) { throw 'OutputDirectory must be an explicit absolute path.' }
if ($OutputDirectory -eq [IO.Path]::GetPathRoot($OutputDirectory)) { throw 'Refusing a filesystem root.' }
if (Test-Path $OutputDirectory) { throw 'OutputDirectory already exists; choose a new directory.' }
if (-not (Test-Path -PathType Container $UploadsPath)) { throw 'UploadsPath does not exist.' }
New-Item -ItemType Directory -Path $OutputDirectory | Out-Null
& pg_dump --format=custom --no-owner --no-privileges --file (Join-Path $OutputDirectory 'database.dump') $DatabaseUrl
if ($LASTEXITCODE -ne 0) { throw 'pg_dump failed.' }
Compress-Archive -Path (Join-Path $UploadsPath '*') -DestinationPath (Join-Path $OutputDirectory 'uploads.zip')
Get-FileHash (Join-Path $OutputDirectory 'database.dump'), (Join-Path $OutputDirectory 'uploads.zip') -Algorithm SHA256 |
  ForEach-Object { "$($_.Hash.ToLower())  $([IO.Path]::GetFileName($_.Path))" } |
  Set-Content (Join-Path $OutputDirectory 'MANIFEST.sha256')
Write-Host "Backup created at $OutputDirectory. Do not store credentials in this folder."
