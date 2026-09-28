#!/usr/bin/env python3
"""从用户提供的透明三视图中提取正面立绘，替换 assets/sprites/"""
import os
import numpy as np
from PIL import Image, ImageFilter

SRC = "/Users/meihaoworld/Desktop/人物三视图_透明背景"
OUT = "/Users/meihaoworld/.zcode/workspace/default/galgame/assets/sprites"
os.makedirs(OUT, exist_ok=True)

# character_0X -> 角色
MAP = {
    "character_01.png": "momo",
    "character_02.png": "male",
    "character_03.png": "qwen",
    "character_04.png": "ernie",
    "character_05.png": "glm",
    "character_06.png": "gpt",
    "character_07.png": "kimi",
    "character_08.png": "minimax",
}
TARGET_H = 1500  # 统一立绘高度

def segments_by_alpha(alpha, min_gap_frac=0.02):
    H, W = alpha.shape
    ink = (alpha > 28).sum(axis=0)
    k = max(3, W // 400)
    ink = np.convolve(ink, np.ones(k) / k, mode="same")
    thr = max(1.5, H * 0.003)
    gaps, start = [], None
    for x in range(W):
        if ink[x] < thr:
            if start is None: start = x
        else:
            if start is not None:
                gaps.append((start, x)); start = None
    if start is not None: gaps.append((start, W))
    gaps = [g for g in gaps if g[1] - g[0] >= W * min_gap_frac]
    edges = [0] + [v for g in gaps for v in g] + [W]
    segs = []
    for i in range(0, len(edges) - 1, 2):
        a0, b0 = edges[i], edges[i + 1]
        if (b0 - a0) > W * 0.08 and (alpha[:, a0:b0] > 28).sum() > H * 0.02:
            segs.append((a0, b0))
    return segs

def clean_edges(im):
    """清理白边：低alpha归零 + 边缘轻羽化"""
    a = np.array(im)
    alpha = a[:, :, 3].astype(np.int32)
    alpha[alpha < 30] = 0
    # 半透明像素做轻度去污（把接近白的低alpha像素压暗alpha）
    a[:, :, 3] = alpha.astype(np.uint8)
    im = Image.fromarray(a, "RGBA")
    # 轻微收缩边缘，去除白边 halo
    al = im.getchannel("A").filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    im.putalpha(al)
    return im

for fname, cid in MAP.items():
    p = os.path.join(SRC, fname)
    im = Image.open(p).convert("RGBA")
    alpha = np.array(im)[:, :, 3]
    segs = segments_by_alpha(alpha)
    if not segs:
        print("!! no segments:", fname); continue
    # 正面 = 最左侧视图
    x0, x1 = segs[0]
    crop = im.crop((max(0, x0 - 6), 0, min(im.width, x1 + 6), im.height))
    # 透明区裁边
    a = np.array(crop)
    ys, xs = np.where(a[:, :, 3] > 28)
    if len(xs):
        crop = crop.crop((max(0, xs.min() - 6), max(0, ys.min() - 6),
                          min(crop.width, xs.max() + 6), min(crop.height, ys.max() + 6)))
    crop = clean_edges(crop)
    # 统一高度
    if crop.height != TARGET_H:
        w = int(crop.width * TARGET_H / crop.height)
        crop = crop.resize((w, TARGET_H), Image.LANCZOS)
    crop.save(os.path.join(OUT, f"{cid}.png"))
    # 顺带保存侧面视图备用
    if len(segs) >= 2:
        sx0, sx1 = segs[1]
        side = im.crop((max(0, sx0 - 6), 0, min(im.width, sx1 + 6), im.height))
        a = np.array(side)
        ys, xs = np.where(a[:, :, 3] > 28)
        if len(xs):
            side = side.crop((max(0, xs.min() - 6), max(0, ys.min() - 6),
                              min(side.width, xs.max() + 6), min(side.height, ys.max() + 6)))
        side = clean_edges(side)
        if side.height != TARGET_H:
            side = side.resize((int(side.width * TARGET_H / side.height), TARGET_H), Image.LANCZOS)
        side.save(os.path.join(OUT, f"{cid}_side.png"))
    print(f"{cid}: front {crop.size}, segments={len(segs)}")
print("done")
