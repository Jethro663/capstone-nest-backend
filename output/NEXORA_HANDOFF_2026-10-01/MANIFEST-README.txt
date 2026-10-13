MANIFEST.sha256 contains every package file except itself, sorted by portable relative path.
Windows PowerShell: Get-FileHash .\04-MOBILE\nexora-mobile-0.1.56-build57.apk -Algorithm SHA256
Linux/macOS (GNU): sha256sum --check MANIFEST.sha256
A mismatch means the package is incomplete or changed. Recopy it from the trusted original.
