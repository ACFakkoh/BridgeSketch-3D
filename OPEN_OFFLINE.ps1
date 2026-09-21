param([int]$Port = 5174, [switch]$NoBrowser)

$root = if (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'dist/index.html')) { [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'dist')) } else { $PSScriptRoot }
try {
  $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, $Port)
  $listener.Start()
} catch {
  Write-Host "Could not start BridgeSketch 3D on port $Port. Close any other viewer window or choose another port." -ForegroundColor Red
  pause
  exit 1
}

$mime = @{ '.css'='text/css; charset=utf-8'; '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.json'='application/json'; '.mjs'='text/javascript; charset=utf-8'; '.svg'='image/svg+xml'; '.webp'='image/webp' }
if (-not $NoBrowser) { try { Start-Process "http://127.0.0.1:$Port/" -ErrorAction Stop } catch { Write-Host "Open http://127.0.0.1:$Port/ in your browser." } }
Write-Host "BridgeSketch 3D: http://127.0.0.1:$Port/ . Keep this window open. Press Ctrl+C to stop."

try {
  while ($listener.Server.IsBound) {
    $client = $listener.AcceptTcpClient()
    $stream = $client.GetStream()
    $stream.ReadTimeout = 2000
    $stream.WriteTimeout = 5000
    $reader = [IO.StreamReader]::new($stream)
    try {
    $request = $reader.ReadLine()
    while ($reader.ReadLine()) {}
    $target = if ($request) { ($request -split ' ')[1] } else { '' }
    $path = [uri]::UnescapeDataString(($target -split '\?')[0].TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($path)) { $path = 'index.html' }
    $file = [IO.Path]::GetFullPath((Join-Path $root $path))
    if (($file -ne $root -and -not $file.StartsWith($root + [IO.Path]::DirectorySeparatorChar)) -or -not (Test-Path -LiteralPath $file -PathType Leaf)) {
      $response = "HTTP/1.1 404 Not Found`r`nConnection: close`r`n`r`n"
      $stream.Write([Text.Encoding]::ASCII.GetBytes($response), 0, $response.Length)
      $reader.Close(); $stream.Close(); $client.Close()
      continue
    }
    $bytes = [IO.File]::ReadAllBytes($file)
    $extension = [IO.Path]::GetExtension($file).ToLowerInvariant()
    $contentType = if ($mime.ContainsKey($extension)) { $mime[$extension] } else { 'application/octet-stream' }
    $response = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
    $header = [Text.Encoding]::ASCII.GetBytes($response)
    $stream.Write($header, 0, $header.Length)
    $stream.Write($bytes, 0, $bytes.Length)
    } catch {
      # A closed or idle browser connection must not stop the local server.
    } finally {
      $reader.Dispose(); $stream.Dispose(); $client.Close()
    }
  }
} finally {
  $listener.Stop()
}
