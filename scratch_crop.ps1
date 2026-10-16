Add-Type -AssemblyName System.Drawing

$srcPath = "d:\mongodb-cms-project\mongodb-cms-project\public\logo.png"
$img = [System.Drawing.Image]::FromFile($srcPath)
$bmp = New-Object System.Drawing.Bitmap($img)

# Let's inspect where actual content is in the emblem region (y < 460)
$minX = $bmp.Width
$maxX = 0
$minY = $bmp.Height
$maxY = 0

for ($y = 10; $y -lt 470; $y++) {
    for ($x = 10; $x -lt ($bmp.Width - 10); $x++) {
        $c = $bmp.GetPixel($x, $y)
        # Any clearly non-white pixel
        if ($c.R -lt 230 -or $c.G -lt 230 -or $c.B -lt 230) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

Write-Output "Detected emblem bounds: minX=$minX, maxX=$maxX, minY=$minY, maxY=$maxY"

# Let's add nice balanced padding
$pad = 12
$cropX = [Math]::Max(0, $minX - $pad)
$cropY = [Math]::Max(0, $minY - $pad)
$cropW = [Math]::Min($bmp.Width - $cropX, ($maxX - $minX) + ($pad * 2))
$cropH = [Math]::Min($bmp.Height - $cropY, ($maxY - $minY) + ($pad * 2))

Write-Output "Crop rect: X=$cropX, Y=$cropY, W=$cropW, H=$cropH"

$rect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropW, $cropH)
$croppedBmp = New-Object System.Drawing.Bitmap($cropW, $cropH)
$g = [System.Drawing.Graphics]::FromImage($croppedBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($bmp, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)

$iconPath = "d:\mongodb-cms-project\mongodb-cms-project\public\logo-icon.png"
$croppedBmp.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Saved tightened emblem to: $iconPath"

# Also create high-res favicon (128x128 for retina tabs)
$favBmp = New-Object System.Drawing.Bitmap(128, 128)
$gFav = [System.Drawing.Graphics]::FromImage($favBmp)
$gFav.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gFav.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gFav.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gFav.Clear([System.Drawing.Color]::Transparent)

$favSize = [Math]::Max($cropW, $cropH)
$scale = 120.0 / $favSize
$drawW = [int]($cropW * $scale)
$drawH = [int]($cropH * $scale)
$drawX = [int]((128 - $drawW) / 2)
$drawY = [int]((128 - $drawH) / 2)

$destRect = New-Object System.Drawing.Rectangle($drawX, $drawY, $drawW, $drawH)
$gFav.DrawImage($croppedBmp, $destRect, 0, 0, $cropW, $cropH, [System.Drawing.GraphicsUnit]::Pixel)

$favPath = "d:\mongodb-cms-project\mongodb-cms-project\public\favicon.png"
$favBmp.Save($favPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Saved 128x128 favicon to: $favPath"

$img.Dispose()
$bmp.Dispose()
$croppedBmp.Dispose()
$favBmp.Dispose()
$g.Dispose()
$gFav.Dispose()
