#!/usr/bin/env python3
"""从三视图切分角色区块 -> 泛洪去背景 -> 输出透明立绘候选 + 预览拼图"""
import os, json
import numpy as np
from PIL import Image, ImageFilter

SRC = "/Users/meihaoworld/Desktop/AI视频素材/AI娘角色三视图"
ROOT = "/Users/meihaoworld/.zcode/workspace/default/galgame"
OUT = os.path.join(ROOT, "tools/split")
os.makedirs(OUT, exist_ok=True)

FILES = {
    "qwen": "千问-三视图简.png", "ernie": "文心-三视图简.png",
    "glm": "GLM-三视图简.png", "gpt": "GPT-三视图简.png",
    "kimi": "kimi-三视图简.png", "minimax": "MiniMax-三视图简.png",
    "momo": "蓝色白饭大肥鱼大版三视图.png", "male": "男主角.png",
}

def load_rgb(path):
    im = Image.open(path).convert("RGB")
    return im, np.asarray(im).astype(np.int32)

def global_bg(a):
    H, W = a.shape[:2]
    s = 40 if min(H, W) > 200 else 8
    corners = np.concatenate([a[:s, :s].reshape(-1, 3), a[:s, -s:].reshape(-1, 3),
                              a[-s:, :s].reshape(-1, 3), a[-s:, -s:].reshape(-1, 3)])
    return np.median(corners, axis=0)

def ink_mask(a, bg, t=90):
    return np.abs(a - bg).sum(axis=2) > t

def segments(a, bg, x0=0, x1=None, min_gap_frac=0.012):
    H, W = a.shape[:2]
    x1 = x1 or W
    ink = ink_mask(a[:, x0:x1], bg)
    col = ink.sum(axis=0)
    k = max(3, (x1 - x0) // 300)
    col = np.convolve(col, np.ones(k) / k, mode="same")
    thresh = max(2.0, H * 0.004)
    is_bg = col < thresh
    gaps, start = [], None
    for x in range(x1 - x0):
        if is_bg[x]:
            if start is None: start = x
        else:
            if start is not None: gaps.append((start, x)); start = None
    if start is not None: gaps.append((start, x1 - x0))
    min_gap = (x1 - x0) * min_gap_frac
    gaps = [g for g in gaps if g[1] - g[0] >= min_gap]
    edges = [0] + [v for g in gaps for v in g] + [x1 - x0]
    segs = []
    for i in range(0, len(edges) - 1, 2):
        a0, b0 = edges[i], edges[i + 1]
        mass = ink[:, a0:b0].sum()
        if mass > H * (b0 - a0) * 0.04 and (b0 - a0) > (x1 - x0) * 0.04:
            segs.append((a0 + x0, b0 + x0))
    return segs

def interior_bbox(a, bg):
    """鲸鱼娘：找装饰边框内的内容区（从中心泛洪近背景色区域取 bbox）。"""
    H, W = a.shape[:2]
    near = np.abs(a - bg).sum(axis=2) < 70
    from collections import deque
    seen = np.zeros((H, W), bool)
    cy, cx = H // 2, W // 2
    if not near[cy, cx]:
        ys, xs = np.where(near)
        d = (ys - cy) ** 2 + (xs - cx) ** 2
        cy, cx = ys[d.argmin()], xs[d.argmin()]
    dq = deque([(cy, cx)]); seen[cy, cx] = True
    ys, xs = [cy], [cx]
    while dq:
        y, x = dq.popleft()
        for ny, nx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
            if 0 <= ny < H and 0 <= nx < W and near[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; dq.append((ny, nx)); ys.append(ny); xs.append(nx)
    return min(xs), min(ys), max(xs), max(ys)

def flood_remove(crop, label_crop_frac=0.0):
    """背景去除：边界泛洪 + 封闭背景口袋清除 + 全局近色清除。返回 RGBA。"""
    if label_crop_frac > 0:
        h = crop.height
        crop = crop.crop((0, 0, crop.width, int(h * (1 - label_crop_frac))))
    a = np.asarray(crop).astype(np.int32)
    H, W = a.shape[:2]
    bg = global_bg(a)
    dist = np.abs(a - bg).sum(axis=2)
    far = dist >= 60
    from collections import deque
    outside = np.zeros((H, W), bool)
    dq = deque()
    for x in range(W):
        for y in (0, H - 1):
            if not far[y, x] and not outside[y, x]:
                outside[y, x] = True; dq.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if not far[y, x] and not outside[y, x]:
                outside[y, x] = True; dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for ny, nx in ((y-1,x),(y+1,x),(y,x-1),(y,x+1)):
            if 0 <= ny < H and 0 <= nx < W and not outside[ny, nx] and not far[ny, nx]:
                cd = np.abs(a[ny, nx] - a[y, x]).sum()
                if cd < 30:
                    outside[ny, nx] = True; dq.append((ny, nx))
    # 封闭背景口袋：未被泛洪到达的近背景连通区
    remaining = ~outside
    near_bg = dist < 90
    from scipy import ndimage
    lab, n = ndimage.label(remaining)
    if n > 0:
        idx = np.arange(1, n + 1)
        fractions = ndimage.mean(near_bg.astype(np.float32), lab, index=idx)
        sizes = ndimage.sum(remaining, lab, index=idx)
        mean_dists = ndimage.mean(dist.astype(np.float32), lab, index=idx)
        for i in range(n):
            sz = sizes[i]
            tiny_pocket = sz < 0.08 * H * W
            if sz > 40 and ((fractions[i] > 0.72) or (tiny_pocket and (fractions[i] > 0.55 or mean_dists[i] < 80))):
                outside[lab == i + 1] = True
    # 极近背景色的孤立点
    outside |= (dist < 14) & (lab == 0)
    alpha = np.where(outside, 0, 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, "L").filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    rgba = np.dstack([np.asarray(crop), np.asarray(alpha_img)])
    return Image.fromarray(rgba, "RGBA")

def tight_crop(rgba, pad=6):
    a = np.asarray(rgba)
    ys, xs = np.where(a[:, :, 3] > 12)
    if len(xs) == 0: return rgba
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    return rgba.crop((max(0, x0 - pad), max(0, y0 - pad),
                      min(rgba.width, x1 + pad), min(rgba.height, y1 + pad)))

# ---------- 主流程 ----------
crops = {}   # id -> list of RGBA PIL
for cid, fname in FILES.items():
    im, a = load_rgb(os.path.join(SRC, fname))
    bg = global_bg(a)
    if cid == "momo":
        # 带装饰边框的特殊图：按视觉测定的百分比框裁切三个视图
        W, H = im.size
        boxes = [(0.08, 0.02, 0.355, 0.79),   # 正面（含鲸鱼尾）
                 (0.355, 0.02, 0.63, 0.79),   # 侧面
                 (0.635, 0.02, 0.915, 0.79)]  # 背面（含尾）
        regions = [(int(W * a_), int(H * b_), int(W * c_), int(H * d_)) for a_, b_, c_, d_ in boxes]
    else:
        segs = segments(a, bg)
        # 过宽的区块（多视图粘连）做更细的二次切分
        expanded = []
        for (sx, ex) in segs:
            if (ex - sx) > im.width * 0.40:
                sub = segments(a, bg, x0=sx, x1=ex, min_gap_frac=0.004)
                if len(sub) >= 2:
                    expanded.extend(sub); continue
            expanded.append((sx, ex))
        segs = expanded
        regions = [(sx, 0, ex, im.height) for (sx, ex) in segs]
    crops[cid] = []
    for i, (rx0, ry0, rx1, ry1) in enumerate(regions):
        c = im.crop((rx0, ry0, rx1, ry1))
        frac = 0.10 if cid == "momo" else (0.06 if cid == "male" else 0.0)
        c = flood_remove(c, label_crop_frac=frac)
        c = tight_crop(c)
        crops[cid].append(c)
    print(cid, fname, "segments:", len(crops[cid]),
          [f"{c.width}x{c.height}" for c in crops[cid]])

# 保存候选 + 预览
for cid, lst in crops.items():
    for i, c in enumerate(lst):
        c.save(os.path.join(OUT, f"{cid}_{i+1}.png"))

# 预览拼图：每行一个角色，格内缩小立绘
TH = 200
cols = max(len(v) for v in crops.values())
rows = list(crops.keys())
cell_w = 180
prev = Image.new("RGB", (cols * cell_w + 20, len(rows) * (TH + 40) + 20), (30, 30, 40))
from PIL import ImageDraw
d = ImageDraw.Draw(prev)
for r, cid in enumerate(rows):
    d.text((10, r * (TH + 40) + 25), cid, fill=(255, 220, 120))
    for i, c in enumerate(crops[cid]):
        h = TH
        w = int(c.width * h / max(1, c.height))
        if w > cell_w - 10:
            w = cell_w - 10; h = int(c.height * w / max(1, c.width))
        cm = c.resize((w, h))
        bgc = Image.new("RGB", (w, h), (90, 120, 150))
        bgc.paste(cm, (0, 0), cm)
        prev.paste(bgc, (20 + i * cell_w, r * (TH + 40) + 40))
        d.text((20 + i * cell_w, r * (TH + 40) + 42), f"#{i+1}", fill=(255, 80, 80))
prev.save(os.path.join(OUT, "preview.jpg"), quality=88)
print("preview ->", os.path.join(OUT, "preview.jpg"))
