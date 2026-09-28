"""鲸落咖啡馆 · 3D 背景渲染（Blender 5.x headless）
用法: Blender --background --factory-startup --python cafe_scene.py
输出: assets/blender/cafe_whale_bg.png (1440x810)
"""
import bpy, math, sys, random
from mathutils import Vector

# ---------- 基础 ----------
OUT = "/Users/yourname/.zcode/workspace/default/galgame/assets/blender/cafe_whale_bg.png"
BLEND = "/Users/yourname/.zcode/workspace/default/galgame/tools/blender/cafe_scene.blend"

bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(7)

SC = bpy.context.scene

# ---------- 材质工具 ----------
def mat_diffuse(name, color, rough=0.5, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Base Color"].default_value = (*color, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    nt.links.new(bsdf.outputs[0], out.inputs[0])
    return m

def mat_emit(name, color, strength):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (*color, 1)
    em.inputs["Strength"].default_value = strength
    nt.links.new(em.outputs[0], out.inputs[0])
    return m

def link_to(obj, m):
    obj.data.materials.append(m)

def box(name, x0, y0, z0, x1, y1, z1, m):
    bpy.ops.mesh.primitive_cube_add(location=((x0+x1)/2, (y0+y1)/2, (z0+z1)/2))
    o = bpy.context.active_object; o.name = name
    o.scale = ((x1-x0)/2, (y1-y0)/2, (z1-z0)/2)
    link_to(o, m)
    return o

def cyl(name, x, y, z, r, h, m, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x,y,z), rotation=rot)
    o = bpy.context.active_object; o.name = name
    link_to(o, m)
    return o

def sphere(name, x, y, z, r, m, scale=(1,1,1), rot=(0,0,0)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z), rotation=rot, segments=24, ring_count=16)
    o = bpy.context.active_object; o.name = name
    o.scale = scale
    bpy.ops.object.shade_smooth()
    link_to(o, m)
    return o

# ---------- 材质库 ----------
M_FLOOR   = mat_diffuse("floor", (0.27, 0.155, 0.08), 0.3)
M_FLOOR2  = mat_diffuse("floor2", (0.24, 0.145, 0.08), 0.35)
M_WALL    = mat_diffuse("wall", (0.62, 0.50, 0.38), 0.8)
M_CEIL    = mat_diffuse("ceil", (0.30, 0.24, 0.19), 0.9)
M_WALNUT  = mat_diffuse("walnut", (0.16, 0.095, 0.05), 0.28)
M_NAVY    = mat_diffuse("navy", (0.075, 0.13, 0.24), 0.55)
M_BLUE    = mat_diffuse("whaleblue", (0.22, 0.38, 0.62), 0.45)
M_CREAM   = mat_diffuse("cream", (0.85, 0.78, 0.62), 0.5)
M_METAL   = mat_diffuse("metal", (0.35, 0.36, 0.38), 0.25, 1.0)
M_DARK    = mat_diffuse("dark", (0.05, 0.05, 0.06), 0.7)
M_CUP     = mat_diffuse("cup", (0.88, 0.84, 0.76), 0.35)
M_COFFEE  = mat_diffuse("coffee", (0.12, 0.07, 0.04), 0.25)
M_SEA     = mat_diffuse("sea", (0.02, 0.05, 0.09), 0.14)
M_LAND    = mat_diffuse("land", (0.015, 0.025, 0.04), 0.8)
M_GLOW    = mat_emit("glow", (1.0, 0.72, 0.42), 6.0)
M_GLOW_S  = mat_emit("glow_s", (1.0, 0.78, 0.5), 0.9)
M_MOON    = mat_emit("moon", (0.92, 0.95, 1.0), 5.0)
M_SKY     = mat_emit("sky", (0.05, 0.09, 0.17), 1.0)
M_SHOPLIGHT = mat_emit("shoplight", (1.0, 0.75, 0.45), 2.4)
M_SIGN    = mat_emit("sign", (0.5, 0.75, 1.0), 0.9)
M_JAR     = mat_diffuse("jar", (0.7, 0.55, 0.35), 0.35)
M_JAR2    = mat_diffuse("jar2", (0.45, 0.5, 0.42), 0.35)

# ---------- 悬挂鲸鱼挂饰（木质剪影风） ----------
WHALE_PTS = [(0.32, 0.02), (0.24, 0.11), (0.12, 0.14), (-0.04, 0.115), (-0.18, 0.05),
             (-0.34, 0.17), (-0.26, 0.03), (-0.34, -0.08), (-0.16, -0.07), (0.02, -0.115),
             (0.20, -0.08), (0.29, -0.045)]

def whale_cutout(name, x, y, z, s, rz, thick=0.045, mat=None, eye=True):
    mat = mat or M_BLUE
    verts = [(px * s, py * s, 0) for (px, py) in WHALE_PTS]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], [list(range(len(verts)))])
    mesh.validate()
    o = bpy.data.objects.new(name, mesh)
    SC.collection.objects.link(o)
    mod = o.modifiers.new("sol", 'SOLIDIFY'); mod.thickness = thick; mod.offset = 0
    o.location = (x, y, z); o.rotation_euler = (0, 0, rz)
    link_to(o, mat)
    if eye:
        import bmesh
        e = bpy.data.meshes.new(name + "_eye")
        bm = bmesh.new(); bmesh.ops.create_circle(bm, radius=0.045 * s, segments=16, cap_ends=True)
        bm.to_mesh(e); bm.free()
        eo = bpy.data.objects.new(name + "_eye", e)
        SC.collection.objects.link(eo)
        emo = eo.modifiers.new("sol", 'SOLIDIFY'); emo.thickness = thick + 0.006; emo.offset = 0
        eo.location = (x + 0.20 * s, y, z + 0.035 * s)
        link_to(eo, M_CREAM)
    return o


# ---------- 房间 ----------
W, D, H = 8.0, 6.0, 3.0
floor = box("floor", -W/2, -D/2, -0.05, W/2, D/2, 0, M_FLOOR)
# 木板缝
for i in range(-5, 6):
    box(f"plank{i}", -W/2, i*0.75-0.008, 0.001, W/2, i*0.75+0.008, 0.004, M_FLOOR2)
box("ceiling", -W/2, -D/2, H, W/2, D/2, H+0.05, M_CEIL)
# 背墙（右侧留窗）
WX0, WX1, WZ0, WZ1 = 1.1, 3.4, 0.85, 2.45   # 窗洞
box("wallB_L", -W/2, 2.95, 0, WX0, 3.0, H, M_WALL)
box("wallB_R", WX1, 2.95, 0, W/2, 3.0, H, M_WALL)
box("wallB_T", WX0, 2.95, WZ1, WX1, 3.0, H, M_WALL)
box("wallB_B", WX0, 2.95, 0, WX1, 3.0, WZ0, M_WALL)
# 左墙 + 右墙
box("wallL", -W/2, -D/2, 0, -W/2+0.05, 3.0, H, M_WALL)
box("wallR", W/2-0.05, -D/2, 0, W/2, 3.0, H, M_WALL)
# 窗框
for (fx0,fy0,fz0,fx1,fy1,fz1) in [
    (WX0-0.04, 2.93, WZ0-0.04, WX1+0.04, 2.98, WZ0), (WX0-0.04, 2.93, WZ1, WX1+0.04, 2.98, WZ1+0.04),
    (WX0-0.04, 2.93, WZ0, WX0, 2.98, WZ1), (WX1, 2.93, WZ0, WX1+0.04, 2.98, WZ1),
    ((WX0+WX1)/2-0.02, 2.93, WZ0, (WX0+WX1)/2+0.02, 2.98, WZ1),
    (WX0-0.04, 2.93, (WZ0+WZ1)/2-0.02, WX1+0.04, 2.98, (WZ0+WZ1)/2+0.02)]:
    box("frame", fx0, fy0, fz0, fx1, fy1, fz1, M_DARK)

# ---------- 窗外夜海 ----------
sea = box("sea", -30, 4.0, -0.5, 40, 60, -0.02, M_SEA)
sky = box("sky", -40, 55, -2, 40, 58, 32, M_SKY)
bpy.ops.mesh.primitive_circle_add(radius=1.6, location=(12, 50, 8.5), rotation=(math.pi/2, 0, 0), fill_type="NGON")
moon = bpy.context.active_object; moon.name = "moon"; link_to(moon, M_MOON)
# 远处灯塔剪影 + 灯
# 海面月光水路（细微）
box("moonglade", 11.2, 5.0, 0.0, 12.8, 30, 0.015, mat_emit("glade", (0.4, 0.5, 0.68), 0.16))
# 星星
import random as _r
_r.seed(11)
for i in range(26):
    sx = _r.uniform(9, 30); sz = _r.uniform(4.5, 12); ss = _r.uniform(0.05, 0.11)
    sphere(f"star{i}", sx, 46, sz, ss, M_MOON if i % 3 else M_SKY)

# ---------- 吧台 ----------
box("counter_body", -2.3, 2.45, 0, 1.1, 3.15, 0.95, M_NAVY)
box("counter_top", -2.42, 2.36, 0.95, 1.22, 3.24, 1.06, M_WALNUT)
box("counter_kick", -2.3, 2.45, 0, 1.1, 2.55, 0.12, M_DARK)
# 吧台正面的鲸鱼logo
whale_cutout("logo_whale", -0.62, 2.43, 0.58, 0.62, 0.0, thick=0.02, mat=M_SIGN, eye=False)
# 台面物件：咖啡机
box("machine", -1.5, 2.6, 1.06, -0.95, 3.05, 1.5, mat_diffuse("machine", (0.38, 0.09, 0.07), 0.3, 0.6))
box("machine_top", -1.55, 2.55, 1.5, -0.9, 3.1, 1.58, M_DARK)
cyl("machine_g1", -1.36, 2.7, 1.02, 0.045, 0.12, M_DARK)
cyl("machine_g2", -1.1, 2.7, 1.02, 0.045, 0.12, M_DARK)
# 蛋糕罩（玻璃半球）
glass = bpy.data.materials.new("glass"); glass.use_nodes = True
nt = glass.node_tree; nt.nodes.clear()
out = nt.nodes.new("ShaderNodeOutputMaterial")
gsdf = nt.nodes.new("ShaderNodeBsdfGlass")
gsdf.inputs["Roughness"].default_value = 0.03
nt.links.new(gsdf.outputs[0], out.inputs[0])
sphere("dome", 0.45, 2.85, 1.06, 0.19, glass)
cyl("dome_plate", 0.45, 2.85, 1.055, 0.2, 0.015, M_METAL)
sphere("cake", 0.45, 2.85, 1.13, 0.11, M_CREAM)
# 杯子们
for (cx, cy) in [(-0.35, 2.62), (0.05, 2.95), (0.65, 2.6), (-2.0, 2.8)]:
    cyl("saucer", cx, cy, 1.068, 0.075, 0.012, M_CUP)
    cyl("cup", cx, cy, 1.10, 0.05, 0.07, M_CUP)
    cyl("coffee", cx, cy, 1.132, 0.042, 0.006, M_COFFEE)
# 背架与罐子
box("shelf", -1.7, 2.86, 1.88, 0.7, 2.92, 1.93, M_WALNUT)
for i in range(5):
    jx = -1.55 + i * 0.4
    hh = random.uniform(0.14, 0.24)
    cyl(f"jar{i}", jx, 2.89, 1.93 + hh/2, random.uniform(0.045, 0.065), hh, M_JAR if i % 2 else M_JAR2)
# 架下暖灯带（细条）
box("shelf_light", -1.72, 2.92, 1.80, 0.72, 2.95, 1.86, M_GLOW_S)
# 墙上鲸鱼招牌（剪影）
whale_cutout("sign_whale", -0.62, 2.925, 2.5, 1.15, 0.0, thick=0.03, mat=M_SIGN, eye=False)

# 菜单小黑板（背墙左侧）
box("menu_frame", -2.72, 2.94, 1.35, -2.08, 2.97, 2.05, M_WALNUT)
box("menu", -2.66, 2.94, 1.41, -2.14, 2.955, 1.99, M_DARK)
for i in range(4):
    box(f"menu_line{i}", -2.6, 2.953, 1.84 - i*0.14, -2.3 + (i%2)*0.16, 2.958, 1.865 - i*0.14, M_SHOPLIGHT)

whale_cutout("wh1", -1.55, 2.2, 2.1, 1.0, 0.12)
whale_cutout("wh2", 0.42, 2.45, 2.28, 0.72, -0.15)
whale_cutout("wh3", 1.85, 1.9, 2.02, 0.55, 0.08)
for (hx, hy, hz, s) in [(-1.55, 2.2, 2.1, 1.0), (0.42, 2.45, 2.28, 0.72), (1.85, 1.9, 2.02, 0.55)]:
    cyl("string", hx, hy, (hz + 0.15 * s + H)/2, 0.006, H - (hz + 0.15 * s), M_DARK)

# ---------- 吊灯 ----------
def lamp(name, x, y, top_z, drop):
    z_shade = top_z - drop
    cyl(f"{name}_cord", x, y, (top_z + z_shade + 0.12)/2, 0.008, top_z - z_shade - 0.12, M_DARK)
    bpy.ops.mesh.primitive_cone_add(radius1=0.16, radius2=0.035, depth=0.16, location=(x, y, z_shade), rotation=(0, 0, 0))
    cone = bpy.context.active_object; cone.name = f"{name}_shade"; link_to(cone, M_DARK)
    sphere(f"{name}_bulb", x, y, z_shade - 0.10, 0.045, M_GLOW)
    li = bpy.data.lights.new(f"{name}_pt", 'POINT'); li.energy = 40; li.color = (1.0, 0.72, 0.45); li.shadow_soft_size = 0.08
    lo = bpy.data.objects.new(f"{name}_pt", li); lo.location = (x, y, z_shade - 0.12)
    SC.collection.objects.link(lo)
lamp("lamp1", -1.15, 1.15, H, 0.52)
lamp("lamp2", 0.4, 1.85, H, 0.62)
lamp("lamp3", 1.85, 0.2, H, 0.45)

# ---------- 客座区 ----------
def table(name, x, y):
    cyl(f"{name}_leg", x, y, 0.36, 0.05, 0.72, M_DARK)
    cyl(f"{name}_foot", x, y, 0.02, 0.24, 0.04, M_DARK)
    cyl(f"{name}_top", x, y, 0.74, 0.42, 0.035, M_WALNUT)
table("t1", -1.45, 0.35)
table("t2", 1.6, 0.1)
# 椅凳
def stool(x, y, rz):
    cyl("st_leg", x, y, 0.22, 0.032, 0.44, M_DARK)
    cyl("st_seat", x, y, 0.46, 0.17, 0.05, M_NAVY)
stool(-2.15, 0.6, 0)
stool(-0.75, 0.05, 0)
stool(1.6, -0.6, 0)
stool(2.25, 0.5, 0)
# 前景桌上：可可杯+小奶罐
cyl("f_saucer", -1.38, 0.28, 0.762, 0.085, 0.014, M_CUP)
cyl("f_cup", -1.38, 0.28, 0.80, 0.055, 0.085, M_CUP)
cyl("f_cocoa", -1.38, 0.28, 0.838, 0.048, 0.006, mat_diffuse("cocoa", (0.45, 0.28, 0.16), 0.3))
cyl("f_milk", -1.08, 0.45, 0.80, 0.045, 0.1, M_METAL)
cyl("t2_cup", 1.66, 0.06, 0.80, 0.055, 0.085, M_CUP)
cyl("t2_sa", 1.66, 0.06, 0.762, 0.085, 0.014, M_CUP)

# ---------- 灯光 ----------
def area_light(name, x, y, z, ex, ey, ez, energy, color, size):
    li = bpy.data.lights.new(name, 'AREA'); li.energy = energy; li.color = color; li.size = size
    lo = bpy.data.objects.new(name, li); lo.location = (x, y, z)
    d = Vector((ex, ey, ez)) - Vector((x, y, z))
    lo.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    SC.collection.objects.link(lo)
    return lo
# 月光（从窗口斜射）
sun = bpy.data.lights.new("moonbeam", 'SUN'); sun.energy = 3.2; sun.color = (0.55, 0.68, 1.0); sun.angle = math.radians(3)
so = bpy.data.objects.new("moonbeam", sun); so.rotation_euler = (math.radians(-52), math.radians(14), math.radians(-24))
SC.collection.objects.link(so)
# 窗口冷色补光
area_light("win_fill", 2.25, 4.5, 1.8, 2.25, 2.0, 1.2, 55, (0.45, 0.6, 1.0), 2.2)
# 室内整体柔光（模拟环境反弹）
area_light("bounce", 0.0, -1.0, 2.75, 0.0, 1.5, 0.0, 30, (1.0, 0.8, 0.58), 4.0)
# 吧台区内局部暖光
area_light("counter_warm", -0.6, 2.2, 2.6, -0.6, 2.6, 1.0, 30, (1.0, 0.75, 0.48), 1.6)
# 世界环境
w = bpy.data.worlds.new("world"); SC.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.012, 0.02, 0.045, 1)
w.node_tree.nodes["Background"].inputs[1].default_value = 0.6

# ---------- 相机 ----------
cam = bpy.data.cameras.new("cam"); cam.lens = 26; cam.sensor_width = 36
cam.dof.use_dof = True
cam.dof.aperture_fstop = 3.8
cam_obj = bpy.data.objects.new("cam", cam); SC.collection.objects.link(cam_obj)
cam_obj.location = (0.15, -1.55, 1.44)
d = Vector((0.0, 2.9, 1.06)) - Vector(cam_obj.location)
cam_obj.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
cam.dof.focus_distance = 3.8
SC.camera = cam_obj

# ---------- 渲染设置 ----------
SC.render.engine = 'CYCLES'
SC.render.resolution_x = 1440
SC.render.resolution_y = 810
SC.cycles.samples = 128
SC.cycles.use_adaptive_sampling = True
SC.cycles.use_denoising = True
try:
    SC.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception:
    pass
try:
    SC.view_settings.view_transform = 'AgX'
except Exception:
    pass
try:
    SC.view_settings.look = 'AgX - Punchy'
except Exception:
    pass
SC.view_settings.exposure = 0.42
SC.render.film_transparent = False

# GPU 尝试（Metal），失败回退 CPU
used_gpu = False
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type = 'METAL'
    prefs.get_devices()
    n = 0
    for dev in prefs.devices:
        dev.use = dev.type != 'CPU'
        if dev.use: n += 1
    if n > 0:
        SC.cycles.device = 'GPU'
        used_gpu = True
    print("GPU devices:", [(d.name, d.type, d.use) for d in prefs.devices])
except Exception as e:
    print("GPU setup failed:", e)
if not used_gpu:
    SC.cycles.device = 'CPU'
    SC.cycles.samples = 96
print("device:", SC.cycles.device)

# ---------- 保存与渲染 ----------
bpy.ops.wm.save_as_mainfile(filepath=BLEND)
SC.render.filepath = OUT
import time
t0 = time.time()
bpy.ops.render.render(write_still=True)
print("RENDER_DONE", round(time.time() - t0, 1), "s ->", OUT)
