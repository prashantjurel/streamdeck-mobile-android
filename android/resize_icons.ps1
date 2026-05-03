Add-Type -AssemblyName System.Drawing

function Resize-Image($path, $width, $height, $target) {
    try {
        $img = [System.Drawing.Image]::FromFile($path)
        $bmp = new-object System.Drawing.Bitmap($width, $height)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.DrawImage($img, 0, 0, $width, $height)
        $bmp.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
        $g.Dispose()
        $bmp.Dispose()
        $img.Dispose()
        Write-Host "Generated: $target"
    } catch {
        Write-Warning "Failed to generate $target : $($_.Exception.Message)"
    }
}

$source = "c:\SDM\android\app_icon_source.png"
$res = "c:\SDM\android\app\src\main\res"

Write-Host "Generating Android Icons..."

# Standard Icons
Resize-Image $source 48 48 "$res\mipmap-mdpi\ic_launcher.png"
Resize-Image $source 72 72 "$res\mipmap-hdpi\ic_launcher.png"
Resize-Image $source 96 96 "$res\mipmap-xhdpi\ic_launcher.png"
Resize-Image $source 144 144 "$res\mipmap-xxhdpi\ic_launcher.png"
Resize-Image $source 192 192 "$res\mipmap-xxxhdpi\ic_launcher.png"

# Round Icons
Resize-Image $source 48 48 "$res\mipmap-mdpi\ic_launcher_round.png"
Resize-Image $source 72 72 "$res\mipmap-hdpi\ic_launcher_round.png"
Resize-Image $source 96 96 "$res\mipmap-xhdpi\ic_launcher_round.png"
Resize-Image $source 144 144 "$res\mipmap-xxhdpi\ic_launcher_round.png"
Resize-Image $source 192 192 "$res\mipmap-xxxhdpi\ic_launcher_round.png"

Write-Host "Done! All icons generated."
