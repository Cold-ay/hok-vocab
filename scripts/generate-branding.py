"""Generate Hok's vector mark and native/store assets. Requires Pillow.
The same path geometry feeds SVG, Android vectors, and antialiased PNGs.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PURPLE = '#5146d9'
MINT = '#c5f4c8'
# A pair of open pages, with a conversational tail on the right page.
LEFT = [('M', 23, 35), ('Q', 35, 29, 47, 37), ('L', 47, 70),
        ('Q', 35, 63, 23, 68), ('L', 23, 35), ('Z',)]
RIGHT = [('M', 53, 37), ('Q', 65, 29, 77, 35), ('L', 77, 68),
         ('Q', 68, 65, 63, 67), ('L', 54, 76), ('L', 54, 70),
         ('L', 53, 70), ('L', 53, 37), ('Z',)]
SPARK = [('M', 77, 16), ('Q', 78.5, 24.5, 87, 26),
         ('Q', 78.5, 27.5, 77, 36), ('Q', 75.5, 27.5, 67, 26),
         ('Q', 75.5, 24.5, 77, 16), ('Z',)]
SHAPES = [(LEFT, '#ffffff'), (RIGHT, '#ffffff'), (SPARK, MINT)]


def path_data(segments):
    return ' '.join(s[0] + ' '.join(str(n) for n in s[1:]) for s in segments)


def polygon(segments):
    points = []
    current = (0, 0)
    for command, *values in segments:
        if command in ('M', 'L'):
            current = tuple(values)
            points.append(current)
        elif command == 'Q':
            control, end = tuple(values[:2]), tuple(values[2:])
            start = current
            for i in range(1, 33):
                t = i / 32
                points.append(tuple((1-t)**2*start[j]+2*(1-t)*t*control[j]+t*t*end[j] for j in range(2)))
            current = end
    return points


def mark(size, foreground=False, round_icon=False):
    # Render large then reduce once; tiny favicon strokes stay smooth.
    scale = 4
    length = size * scale
    if foreground:
        image = Image.new('RGBA', (length, length))
    else:
        ramp = Image.linear_gradient('L').resize((length, length))
        image = Image.merge('RGB', tuple(ramp.point(lambda v, a=a, b=b: round(a+(b-a)*v/255))
                    for a,b in zip((117, 99, 237), (62, 49, 182)))).convert('RGBA')
    draw = ImageDraw.Draw(image)
    # Adaptive foreground safe zone; the OS supplies its own background and mask.
    factor = .68 if foreground else 1
    offset = length * (1-factor) / 2
    for segments, color in SHAPES:
        draw.polygon([(offset+x*length/100*factor, offset+y*length/100*factor)
                      for x,y in polygon(segments)], fill=color)
    if round_icon:
        mask = Image.new('L', (length,length))
        ImageDraw.Draw(mask).ellipse((0,0,length-1,length-1), fill=255)
        image.putalpha(mask)
    return image.resize((size,size),Image.Resampling.LANCZOS)


def splash(size):
    image = Image.new('RGB', size, '#f7f8fc')
    icon = mark(round(min(size)*.16))
    mask = Image.new('L',icon.size)
    ImageDraw.Draw(mask).rounded_rectangle((0,0,icon.width-1,icon.height-1),radius=icon.width*.22,fill=255)
    image.paste(icon,((size[0]-icon.width)//2,(size[1]-icon.height)//2),mask)
    return image


paths = ''.join(f'<path fill="{color}" d="{path_data(segments)}"/>' for segments,color in SHAPES)
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="indigo" x2="0" y2="1"><stop stop-color="#7563ed"/><stop offset="1" stop-color="#3e31b6"/></linearGradient></defs><rect width="100" height="100" rx="23" fill="url(#indigo)"/>{paths}</svg>'''
(ROOT/'public/favicon.svg').write_text(svg+'\n')
(ROOT/'public/hok-icon.svg').write_text(svg+'\n')
mark(180).convert('RGB').save(ROOT/'public/apple-touch-icon.png',optimize=True)
mark(32).convert('RGB').save(ROOT/'public/favicon-32.png',optimize=True)
mark(192).convert('RGB').save(ROOT/'public/icon-192.png',optimize=True)
mark(512).convert('RGB').save(ROOT/'public/icon-512.png',optimize=True)
mark(1024).convert('RGB').save(ROOT/'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png',optimize=True)
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
# Android vector equivalents, including Android 13 themed icons.
for filename, monochrome in [('ic_launcher_foreground.xml',False),('ic_launcher_monochrome.xml',True)]:
    android_paths = ''.join(f'<path android:fillColor="{color if not monochrome else "#ffffff"}" android:pathData="{path_data(segments)}"/>' for segments,color in SHAPES)
    (res/'drawable-v24'/filename).write_text(f'''<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="100" android:viewportHeight="100"><group android:translateX="16" android:translateY="16" android:scaleX="0.68" android:scaleY="0.68">{android_paths}</group></vector>\n''')
for name in ['ic_launcher','ic_launcher_round']:
    folder=res/'mipmap-anydpi-v33'
    folder.mkdir(exist_ok=True)
    (folder/f'{name}.xml').write_text('''<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@drawable/ic_launcher_foreground"/><monochrome android:drawable="@drawable/ic_launcher_monochrome"/></adaptive-icon>\n''')
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
draw.text((319,250),'A world of words. Make it yours.',font=body,fill=PURPLE)
feature.save(ROOT/'store/play-store/feature-graphic-1024x500.png',optimize=True)
preview=mark(512)
mask=Image.new('L',(512,512))
ImageDraw.Draw(mask).rounded_rectangle((0,0,511,511),radius=116,fill=255)
preview.putalpha(mask)
preview.save(ROOT/'store/app-store/icon-preview.png',optimize=True)
print('Generated Hok vector mark, browser icons, native icons, themed Android icon, splash screens, and store artwork.')
