# Minimal static file server for local preview (no Node/Python required).
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File .claude/serve.ps1 [-Port 5173]
param(
  [int]$Port = 5173,
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
)

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8'
  '.js'   = 'application/javascript; charset=utf-8'
  '.svg'  = 'image/svg+xml'
  '.json' = 'application/json; charset=utf-8'
  '.png'  = 'image/png'
  '.jpg'  = 'image/jpeg'
  '.jpeg' = 'image/jpeg'
  '.webp' = 'image/webp'
  '.ico'  = 'image/x-icon'
  '.woff2' = 'font/woff2'
  '.txt'  = 'text/plain; charset=utf-8'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $Root at http://localhost:$Port/"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
      $rel = [Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
      if ([string]::IsNullOrEmpty($rel)) { $rel = 'index.html' }
      $file = [System.IO.Path]::GetFullPath((Join-Path $Root ($rel -replace '/', '\')))

      if (-not $file.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase)) {
        $ctx.Response.StatusCode = 403
      }
      elseif (Test-Path -LiteralPath $file -PathType Leaf) {
        $ext = [System.IO.Path]::GetExtension($file).ToLower()
        $type = $mime[$ext]
        if (-not $type) { $type = 'application/octet-stream' }
        $bytes = [System.IO.File]::ReadAllBytes($file)
        $ctx.Response.ContentType = $type
        $ctx.Response.Headers.Add('Cache-Control', 'no-store')
        $ctx.Response.ContentLength64 = $bytes.Length
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
      }
      else {
        $ctx.Response.StatusCode = 404
      }
    }
    catch { Write-Host "error: $($_.Exception.Message)" }
    finally { $ctx.Response.Close() }
  }
}
finally { $listener.Stop() }
