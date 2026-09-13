# ============================================================
#  图片压缩脚本（思晨五金官网）
#  作用：把 public/images 下的真实照片压缩为适合网页的 JPEG
#        · 自动备份原图到 originals/（该目录不进 Git）
#        · 按最长边缩放（sRGB、质量可调）
#        · 自动校正手机照片的 EXIF 旋转方向
#        · 输出同名 .jpg 并删除原 .png（代码引用需同步改为 .jpg）
#
#  用法：
#     pwsh -File scripts/optimize-images.ps1              # 默认质量 82
#     pwsh -File scripts/optimize-images.ps1 -Quality 78  # 更小体积
#     pwsh -File scripts/optimize-images.ps1 -Force       # 目标已存在时也重新生成
# ============================================================
param(
    [int]$Quality = 82,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$imageRoot = Join-Path $root 'public\images'
$backupRoot = Join-Path $root 'originals'

# 相对路径 = 缩放后的最长边像素（大图 1600/1920，卡片图 1200~1400）
$targets = [ordered]@{
    'equipment/hero.png'              = 1920
    'company/slider-1.png'            = 1600
    'company/slider-2.png'            = 1600
    'company/facade.png'              = 1600
    'equipment/lab-1.png'             = 1400
    'equipment/machine-1.png'         = 1400
    'equipment/machine-2.png'         = 1400
    'equipment/qc-1.png'              = 1400
    'workshops/cnc-1.png'             = 1600
    'workshops/cnc-2.png'             = 1200
    'workshops/cnc-3.png'             = 1200
    'workshops/cold-heading-1.png'    = 1600
    'workshops/optical-sorting-1.png' = 1600
}

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
    Where-Object { $_.MimeType -eq 'image/jpeg' }
if (-not $jpegCodec) { throw '未找到 JPEG 编码器' }

$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
    [System.Drawing.Imaging.Encoder]::Quality, [int]$Quality)

$totalBefore = 0
$totalAfter = 0
$done = 0

foreach ($rel in $targets.Keys) {
    $maxEdge = $targets[$rel]
    $srcPath = Join-Path $imageRoot ($rel -replace '/', '\')
    $outRel = [System.IO.Path]::ChangeExtension($rel, '.jpg')
    $outPath = Join-Path $imageRoot ($outRel -replace '/', '\')

    if (-not (Test-Path $srcPath)) {
        Write-Output "↷ 跳过（原文件不存在）: $rel"
        continue
    }
    if ((Test-Path $outPath) -and -not $Force) {
        Write-Output "↷ 跳过（已存在 .jpg）: $outRel"
        continue
    }

    $srcSize = (Get-Item $srcPath).Length

    # 1) 备份原图
    $backupPath = Join-Path $backupRoot ($rel -replace '/', '\')
    New-Item -ItemType Directory -Path (Split-Path $backupPath -Parent) -Force | Out-Null
    Copy-Item $srcPath $backupPath -Force

    # 2) 读取 + 校正 EXIF 方向
    $img = [System.Drawing.Image]::FromFile($srcPath)
    try {
        $orientation = 1
        try {
            $pi = $img.GetPropertyItem(0x0112)
            $orientation = [int]$pi.Value[0]
        } catch { }
        switch ($orientation) {
            3 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
            6 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
            8 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
        }

        # 3) 等比缩放到最长边
        $scale = [Math]::Min(1.0, $maxEdge / [Math]::Max($img.Width, $img.Height))
        $newW = [int][Math]::Round($img.Width * $scale)
        $newH = [int][Math]::Round($img.Height * $scale)

        $bmp = New-Object System.Drawing.Bitmap($newW, $newH)
        $graphics = [System.Drawing.Graphics]::FromImage($bmp)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.DrawImage($img, 0, 0, $newW, $newH)
        $graphics.Dispose()

        $bmp.Save($outPath, $jpegCodec, $encoderParams)
        $bmp.Dispose()
    }
    finally {
        $img.Dispose()
    }

    $outSize = (Get-Item $outPath).Length
    $totalBefore += $srcSize
    $totalAfter += $outSize
    $done++

    # 4) 删除原 .png（已备份）
    Remove-Item $srcPath -Force

    $ratio = [Math]::Round(100 * $outSize / $srcSize)
    Write-Output ("✓ {0,-34} {1,7:N1} MB → {2,6:N0} KB  ({3}%)  {4}x{5}" -f `
        $outRel, ($srcSize / 1MB), ($outSize / 1KB), $ratio, $newW, $newH)
}

Write-Output ''
if ($done -eq 0) {
    Write-Output '没有需要处理的图片。'
} else {
    Write-Output ("完成 {0} 张：{1:N1} MB → {2:N2} MB（省 {3}%）" -f `
        $done, ($totalBefore / 1MB), ($totalAfter / 1MB), [Math]::Round(100 * (1 - $totalAfter / $totalBefore)))
    Write-Output "原图已备份到: originals\（该目录已被 .gitignore 忽略）"
}
