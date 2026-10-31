"""Regenerate native/store branding from Hok's existing vector book mark.
Optional asset-authoring dependency: Pillow. No remote images or fonts.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parent.parent
PURPLE = '#5146d9'

def mark(size, foreground=False, round_icon=False):
    scale = 4
    image = Image.new('RGBA', (size*scale, size*scale), (0,0,0,0) if foreground or round_icon else PURPLE)
    draw = ImageDraw.Draw(image)
    if round_icon: draw.ellipse((0,0,size*scale-1,size*scale-1),fill=PURPLE)
    # Adaptive launcher foregrounds reserve a safe central region.
    unit = size*scale / (60 if foreground else 48)
    offset = (size*scale - 48*unit)/2
    points = [(12,12),(21,12),(24,15),(27,12),(36,12),(36,36),(27,36),(24,39),(21,36),(12,36),(12,12)]
    draw.line([(offset+x*unit, offset+y*unit) for x,y in points], fill='white', width=round(2.5*unit), joint='curve')
    draw.line([(offset+24*unit,offset+15*unit),(offset+24*unit,offset+39*unit)],fill='white',width=round(2.5*unit))
    return image.resize((size,size),Image.Resampling.LANCZOS)

def splash(size):
    image = Image.new('RGB', size, '#f7f8fc')
    icon = mark(round(min(size)*.16))
    image.paste(icon,((size[0]-icon.width)//2,(size[1]-icon.height)//2),icon)
    return image

icon = ROOT/'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
mark(1024).convert('RGB').save(icon,optimize=True)
for path in (ROOT/'ios/App/App/Assets.xcassets/Splash.imageset').glob('*.png'):
    with Image.open(path) as old: size=old.size
    splash(size).save(path,optimize=True)
res = ROOT/'android/app/src/main/res'
for density,size in [('mdpi',48),('hdpi',72),('xhdpi',96),('xxhdpi',144),('xxxhdpi',192)]:
    folder=res/f'mipmap-{density}'
    mark(size).save(folder/'ic_launcher.png',optimize=True)
    mark(size,round_icon=True).save(folder/'ic_launcher_round.png',optimize=True)
    mark(round(size*108/48),foreground=True).save(folder/'ic_launcher_foreground.png',optimize=True)
for path in res.glob('drawable*/splash.png'):
    with Image.open(path) as old: size=old.size
    splash(size).save(path,optimize=True)
mark(1024).convert('RGB').save(ROOT/'store/app-store/icon-1024.png',optimize=True)
mark(512).convert('RGB').save(ROOT/'store/play-store/icon-512.png',optimize=True)
feature=Image.new('RGB',(1024,500),'#eeecff')
feature.paste(mark(180).convert('RGB'),(90,160))
draw=ImageDraw.Draw(feature)
font_path='/System/Library/Fonts/Supplemental/Arial Bold.ttf'
body_path='/System/Library/Fonts/Supplemental/Arial.ttf'
font=ImageFont.truetype(font_path,64)
body=ImageFont.truetype(body_path,28)
draw.text((315,155),'Hok Vocabulary',font=font,fill='#23243b')
draw.text((319,250),'A world of words. Make it yours.',font=body,fill='#5146d9')
feature.save(ROOT/'store/play-store/feature-graphic-1024x500.png',optimize=True)
print('Generated native icons, launch screens, and separate store artwork.')
