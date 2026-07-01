# Opens Google Cloud Console to create a free Books API key.
# After creating the key, paste it into .env.local and restart the app.

$envFile = Join-Path (Split-Path $PSScriptRoot -Parent) ".env.local"
$credentialsUrl = "https://console.cloud.google.com/apis/credentials"
$booksApiUrl = "https://console.cloud.google.com/apis/library/books.googleapis.com"

Write-Host "MyBookList - Google Books API Key Setup" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Enable the Books API (browser will open)"
Start-Process $booksApiUrl
Start-Sleep -Seconds 2
Write-Host "2. Create an API key (browser will open)"
Start-Process $credentialsUrl
Write-Host ""
Write-Host "3. Paste your key below and press Enter:"
$key = Read-Host "API Key"

if ($key.Trim()) {
  @"
# Google Books API key
NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY=$($key.Trim())
"@ | Set-Content -Path $envFile -Encoding UTF8
  Write-Host ""
  Write-Host "Saved to .env.local — restart MyBookList for Google Books search." -ForegroundColor Green
} else {
  Write-Host "No key entered. Search still works via Open Library fallback." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
