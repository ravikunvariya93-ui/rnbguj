Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead('DTP Forwarding.docx')
$entry = $zip.Entries | Where-Object { $_.Name -eq 'document.xml' }
$stream = $entry.Open()
$reader = New-Object System.IO.StreamReader($stream)
$content = $reader.ReadToEnd()
$zip.Dispose()
$text = $content -replace '<[^>]+>', ''
$text = $text -replace '\s+', ' '
Write-Output $text
