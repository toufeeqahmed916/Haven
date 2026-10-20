param(
  [Parameter(Mandatory = $true)]
  [string]$SourceLogo
)

Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceDirectory = Join-Path $projectRoot "assets\brand-source"
$citizenPublic = Join-Path $projectRoot "apps\citizen\public"
$adminPublic = Join-Path $projectRoot "apps\admin\public"

New-Item -ItemType Directory -Force -Path $sourceDirectory | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $citizenPublic "brand") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $adminPublic "brand") | Out-Null

$source = [System.Drawing.Bitmap]::FromFile($SourceLogo)

try {
  $minX = $source.Width
  $minY = $source.Height
  $maxX = -1
  $maxY = -1

  for ($y = 0; $y -lt $source.Height; $y++) {
    for ($x = 0; $x -lt $source.Width; $x++) {
      if ($source.GetPixel($x, $y).A -gt 8) {
        if ($x -lt $minX) { $minX = $x }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($y -gt $maxY) { $maxY = $y }
      }
    }
  }

  if ($maxX -lt $minX -or $maxY -lt $minY) {
    throw "The supplied image does not contain visible pixels."
  }

  $crop = [System.Drawing.Rectangle]::new($minX, $minY, $maxX - $minX + 1, $maxY - $minY + 1)

  function New-RoundedPath([float]$x, [float]$y, [float]$width, [float]$height, [float]$radius) {
    $diameter = $radius * 2
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
    $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
    $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
  }

  function New-LogoAsset(
    [int]$Size,
    [string]$OutputPath,
    [string]$Background = "transparent",
    [double]$LogoWidthRatio = 0.84,
    [double]$CornerRatio = 0.18
  ) {
    $bitmap = [System.Drawing.Bitmap]::new($Size, $Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

    try {
      $graphics.Clear([System.Drawing.Color]::Transparent)
      $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceOver
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

      if ($Background -ne "transparent") {
        $backgroundColor = [System.Drawing.ColorTranslator]::FromHtml($Background)
        $path = New-RoundedPath 0 0 $Size $Size ($Size * $CornerRatio)
        $brush = [System.Drawing.SolidBrush]::new($backgroundColor)
        try { $graphics.FillPath($brush, $path) } finally { $brush.Dispose(); $path.Dispose() }
      }

      $targetWidth = [int]($Size * $LogoWidthRatio)
      $scale = $targetWidth / $crop.Width
      $targetHeight = [int]($crop.Height * $scale)
      $targetX = [int](($Size - $targetWidth) / 2)
      $targetY = [int](($Size - $targetHeight) / 2)
      $destination = [System.Drawing.Rectangle]::new($targetX, $targetY, $targetWidth, $targetHeight)
      $graphics.DrawImage($source, $destination, $crop, [System.Drawing.GraphicsUnit]::Pixel)
      $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
      $graphics.Dispose()
      $bitmap.Dispose()
    }
  }

  $masterPath = Join-Path $sourceDirectory "haven-logo-transparent-master.png"
  New-LogoAsset 1024 $masterPath "transparent" 0.88

  foreach ($publicRoot in @($citizenPublic, $adminPublic)) {
    $brandRoot = Join-Path $publicRoot "brand"
    New-LogoAsset 1024 (Join-Path $brandRoot "haven-logo-transparent.png") "transparent" 0.88
    New-LogoAsset 1024 (Join-Path $brandRoot "haven-logo-rounded.png") "#123b2e" 0.78
    New-LogoAsset 1024 (Join-Path $brandRoot "haven-logo-white.png") "#ffffff" 0.78
    New-LogoAsset 64 (Join-Path $publicRoot "favicon.png") "#123b2e" 0.78 0.2
    New-LogoAsset 180 (Join-Path $publicRoot "apple-touch-icon.png") "#123b2e" 0.78 0.2
    New-LogoAsset 192 (Join-Path $publicRoot "icon-192.png") "#123b2e" 0.78 0.2
    New-LogoAsset 512 (Join-Path $publicRoot "icon-512.png") "#123b2e" 0.78 0.2
  }
}
finally {
  $source.Dispose()
}

Write-Output "Haven brand assets generated for citizen and admin apps."
