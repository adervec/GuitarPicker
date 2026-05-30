<#
  GuitarPicker static server (no dependencies).
  Serves the app folder over HTTP so ES modules load correctly.

  Usage:
    powershell -ExecutionPolicy Bypass -File .\serve.ps1
    powershell -ExecutionPolicy Bypass -File .\serve.ps1 -Port 9000

  Then open the URL it prints (default http://localhost:8080).
  Stop with Ctrl+C.
#>
param([int]$Port = 8080)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

$mime = @{
  ".html" = "text/html; charset=utf-8";
  ".js"   = "text/javascript; charset=utf-8";
  ".mjs"  = "text/javascript; charset=utf-8";
  ".css"  = "text/css; charset=utf-8";
  ".json" = "application/json; charset=utf-8";
  ".svg"  = "image/svg+xml";
  ".png"  = "image/png"; ".jpg" = "image/jpeg"; ".jpeg" = "image/jpeg";
  ".gif"  = "image/gif"; ".ico" = "image/x-icon"; ".webp" = "image/webp";
  ".woff" = "font/woff"; ".woff2" = "font/woff2"; ".map" = "application/json";
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"
$listener.Prefixes.Add($prefix)

try { $listener.Start() }
catch {
  Write-Host "Could not start on $prefix" -ForegroundColor Red
  Write-Host "Port may be in use. Try: powershell -File .\serve.ps1 -Port 9000" -ForegroundColor Yellow
  exit 1
}

Write-Host ""
Write-Host "  GuitarPicker is running at:  $prefix" -ForegroundColor Green
Write-Host "  Serving folder:              $root"
Write-Host "  Press Ctrl+C to stop."
Write-Host ""

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $req = $context.Request
    $res = $context.Response
    try {
      $relPath = [System.Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart("/")
      if ([string]::IsNullOrWhiteSpace($relPath)) { $relPath = "index.html" }
      $full = Join-Path $root $relPath
      # prevent directory traversal
      $fullResolved = [System.IO.Path]::GetFullPath($full)
      if (-not $fullResolved.StartsWith([System.IO.Path]::GetFullPath($root))) {
        $res.StatusCode = 403; $res.Close(); continue
      }
      if (Test-Path $fullResolved -PathType Container) { $fullResolved = Join-Path $fullResolved "index.html" }

      if (Test-Path $fullResolved -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($fullResolved).ToLower()
        $ct = $mime[$ext]; if (-not $ct) { $ct = "application/octet-stream" }
        $bytes = [System.IO.File]::ReadAllBytes($fullResolved)
        $res.ContentType = $ct
        $res.Headers.Add("Cache-Control", "no-cache")
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        Write-Host ("  200  /{0}" -f $relPath) -ForegroundColor DarkGray
      } else {
        $res.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $relPath")
        $res.OutputStream.Write($msg, 0, $msg.Length)
        Write-Host ("  404  /{0}" -f $relPath) -ForegroundColor Yellow
      }
    } catch {
      Write-Host ("  ERR  {0}" -f $_.Exception.Message) -ForegroundColor Red
      try { $res.StatusCode = 500 } catch {}
    } finally {
      try { $res.OutputStream.Close() } catch {}
    }
  }
} finally {
  $listener.Stop(); $listener.Close()
}
