from PIL import Image, ImageDraw

# Config
WIDTH, HEIGHT = 512, 512
VIEWBOX_SIZE = 24
COLOR = "#FAFF00" 
OUTPUT_PATH = "packages/frontend/public/assets/logo.png"

# Polygon Points from SVG: M13 2 L3 14 H12 L11 22 L21 10 H12 L13 2 Z
# (13, 2) -> (3, 14) -> (12, 14) -> (11, 22) -> (21, 10) -> (12, 10) -> (13, 2)
points = [
    (13, 2),
    (3, 14),
    (12, 14),
    (11, 22),
    (21, 10),
    (12, 10),
    (13, 2)
]

# Scale points
scale_x = WIDTH / VIEWBOX_SIZE
scale_y = HEIGHT / VIEWBOX_SIZE

scaled_points = [(x * scale_x, y * scale_y) for x, y in points]

# Draw
image = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)

# Draw polygon with fill and stroke (to simulate the stroke-width=2 effect, we can just draw slightly larger or stroke)
# The SVG had stroke-width="2" which in 24px viewbox is significant (~8% of width).
# 2px in 24px viewbox -> 2 * (512/24) = 42.6px stroke width in 512px image.
# ImageDraw.polygon allows fill and outline.
stroke_width = int(2 * scale_x)

draw.polygon(scaled_points, fill=COLOR, outline=COLOR)

# The SVG had stroke-linejoin="round". PIL polygon draw is sharp.
# To approximate the thick stroke, we can draw lines.
draw.line(scaled_points, fill=COLOR, width=stroke_width, joint="curve")

image.save(OUTPUT_PATH)
print(f"Saved logo to {OUTPUT_PATH}")
