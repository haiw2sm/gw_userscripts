# Read the contents of file a and file b

$contentA = Get-Content -Path ./header -Raw
$contentB = Get-Content -Path ./dist/main.bundle.user.js -Raw

# Merge the contents of a and b, with a coming first.

$combinedContent = $contentA + $contentB

# Write the merged content back to file B (Note: this will overwrite the original file B)

$combinedContent | Set-Content -Path ./dist/main.bundle.user.js