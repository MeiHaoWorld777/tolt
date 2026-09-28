#!/usr/bin/env python3
"""分析三视图设定图布局：找背景色、按列墨迹分布切分角色区块，输出预览图与切分数据。"""
import os, json
import numpy as np
from PIL import Image

SRC = "/Users/meihaoworld/Desktop/AI视频素材/AI娘角色三视图"
OUT = "/Users/meihaoworld/.zcode/workspace/default/galgame/tools/split"
os.makedirs(OUT, exist_ok=True)

FILES = [
    "千问-三视图简.png", "文心-三视图简.png", "GLM-三视图简.png",
    "GPT-三视图简.png", "kimi-三视图简.png", "MiniMax-三视图简.png",
    "蓝色白饭大肥鱼大版三视图.png", "男主角.png",
]

def analyze(path, name):
    im = Image.open(path).convert("RGB")
    W, H = im.size
    a = np.asarray(im).astype(np.int32)
    # 背景色：四角各取一块的中位色
    corners = np.concatenate([
        a[:40, :40].reshape(-1, 3), a[:40, -40:].reshape(-1, 3),
        a[-40:, :40].reshape(-1, 3), a[-40:, -40:].reshape(-1, 3)])
    bg = np.median(corners, axis=0)
    dist = np.abs(a - bg).sum(axis=2)
    ink = dist > 90
    col = ink.sum(axis=0)
    # 平滑
    k = max(3, W // 300)
    col_s = np.convolve(col, np.ones(k) / k, mode="same")
    thresh = max(2.0, H * 0.004)
    is_bg_col = col_s < thresh
    # 找背景列的连续区段（宽 > 1.2% 宽）
    gaps, start = [], None
    for x in range(W):
        if is_bg_col[x]:
            if start is None: start = x
        else:
            if start is not None:
                gaps.append((start, x)); start = None
    if start is not None: gaps.append((start, W))
    min_gap = W * 0.012
    gaps = [g for g in gaps if g[1] - g[0] >= min_gap]
    # 角色区块 = 相邻 gap 之间
    segs = []
    edges = [0] + [v for g in gaps for v in g] + [W]
    for i in range(0, len(edges) - 1, 2):
        x0, x1 = edges[i], edges[i + 1]
        mass = ink[:, x0:x1].sum()
        if mass > H * (x1 - x0) * 0.04 and (x1 - x0) > W * 0.04:
            segs.append((int(x0), int(x1), int(mass)))
    return dict(name=name, size=[W, H], bg=[int(v) for v in bg],
                gaps=[[int(a), int(b)] for a, b in gaps], segs=segs)

results = []
for f in FILES:
    p = os.path.join(SRC, f)
    r = analyze(p, f)
    results.append(r)
    print(json.dumps(r, ensure_ascii=False))

with open(os.path.join(OUT, "layout.json"), "w") as fp:
    json.dump(results, fp, ensure_ascii=False, indent=1)
print("done ->", os.path.join(OUT, "layout.json"))
