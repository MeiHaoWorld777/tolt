"""拾遗潮 · Blender 背景批量渲染（15 场景）
用法: Blender --background --factory-startup --python make_bgs.py
输出: assets/bg/<id>.png
"""
import bpy, math, random, time
from mathutils import Vector

OUT_DIR = "/Users/meihaoworld/.zcode/workspace/default/galgame/assets/bg/"
SC = None

# ---------------- 基础工具 ----------------
def mat_diffuse(name, color, rough=0.5, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    nt.links.new(b.outputs[0], out.inputs[0])
    return m

def mat_emit(name, color, strength):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = (*color, 1)
    e.inputs["Strength"].default_value = strength
    nt.links.new(e.outputs[0], out.inputs[0])
    return m

def mat_sky(name, c_bot, c_top, strength=1.0):
    """竖直渐变天幕"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    e = nt.nodes.new("ShaderNodeEmission"); e.inputs["Strength"].default_value = strength
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    mr = nt.nodes.new("ShaderNodeMapRange")
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    mr.inputs["From Min"].default_value = 0.0; mr.inputs["From Max"].default_value = 1.0
    ramp.color_ramp.elements[0].color = (*c_bot, 1)
    ramp.color_ramp.elements[1].color = (*c_top, 1)
    nt.links.new(tc.outputs["Generated"], sep.inputs[0])
    nt.links.new(sep.outputs["Z"], mr.inputs["Value"])
    nt.links.new(mr.outputs[0], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], e.inputs["Color"])
    nt.links.new(e.outputs[0], out.inputs[0])
    return m

def link_to(o, m): o.data.materials.append(m)

def box(name, x0, y0, z0, x1, y1, z1, m):
    bpy.ops.mesh.primitive_cube_add(location=((x0+x1)/2, (y0+y1)/2, (z0+z1)/2))
    o = bpy.context.active_object; o.name = name
    o.scale = ((x1-x0)/2, (y1-y0)/2, (z1-z0)/2)
    link_to(o, m); return o

def cyl(name, x, y, z, r, h, m, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x,y,z), rotation=rot)
    o = bpy.context.active_object; o.name = name; link_to(o, m); return o

def sphere(name, x, y, z, r, m, scale=(1,1,1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=(x,y,z), segments=24, ring_count=16)
    o = bpy.context.active_object; o.name = name; o.scale = scale
    bpy.ops.object.shade_smooth(); link_to(o, m); return o

def disc(name, x, y, z, r, m, rot=(math.pi/2,0,0)):
    bpy.ops.mesh.primitive_circle_add(radius=r, location=(x,y,z), rotation=rot, fill_type="NGON")
    o = bpy.context.active_object; o.name = name; link_to(o, m); return o

def plane(name, x0, x1, z0, z1, y, m):
    bpy.ops.mesh.primitive_plane_add(size=1, location=((x0+x1)/2, y, (z0+z1)/2),
                                     rotation=(math.pi/2, 0, 0))
    o = bpy.context.active_object; o.name = name
    o.scale = ((x1-x0)/2, (z1-z0)/2, 1)
    link_to(o, m); return o

def pt_light(name, x, y, z, energy, color, radius=0.1):
    li = bpy.data.lights.new(name, 'POINT'); li.energy = energy; li.color = color; li.shadow_soft_size = radius
    o = bpy.data.objects.new(name, li); o.location = (x,y,z); SC.collection.objects.link(o); return o

def area_light(name, loc, target, energy, color, size):
    li = bpy.data.lights.new(name, 'AREA'); li.energy = energy; li.color = color; li.size = size
    o = bpy.data.objects.new(name, li); o.location = loc
    d = Vector(target) - Vector(loc)
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    SC.collection.objects.link(o); return o

def sun_light(name, energy, color, rot):
    li = bpy.data.lights.new(name, 'SUN'); li.energy = energy; li.color = color; li.angle = math.radians(4)
    o = bpy.data.objects.new(name, li); o.rotation_euler = rot
    SC.collection.objects.link(o); return o

def camera(loc, target, lens=30, fstop=0.0, focus_d=None):
    cam = bpy.data.cameras.new("cam"); cam.lens = lens; cam.sensor_width = 36
    if fstop: cam.dof.use_dof = True; cam.dof.aperture_fstop = fstop
    if focus_d: cam.dof.focus_distance = focus_d
    o = bpy.data.objects.new("cam", cam); o.location = loc
    d = Vector(target) - Vector(loc)
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    SC.collection.objects.link(o); SC.camera = o; return o

def world(color, strength):
    w = bpy.data.worlds.new("w"); SC.world = w; w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (*color, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = strength

def stars(n, x0, x1, y, z0, z1, seed=3, r=0.08, m=None):
    rnd = random.Random(seed)
    m = m or mat_emit("star", (0.9, 0.94, 1.0), 6)
    for i in range(n):
        sphere(f"star{i}", rnd.uniform(x0, x1), y - rnd.uniform(0, 2), rnd.uniform(z0, z1), rnd.uniform(r*0.4, r), m)

def setup_render(samples=104):
    SC.render.engine = 'CYCLES'
    SC.render.resolution_x = 1440; SC.render.resolution_y = 810
    SC.cycles.samples = samples; SC.cycles.use_adaptive_sampling = True
    SC.cycles.use_denoising = True
    try: SC.cycles.denoiser = 'OPENIMAGEDENOISE'
    except Exception: pass
    try: SC.view_settings.view_transform = 'AgX'
    except Exception: pass
    try: SC.view_settings.look = 'AgX - Punchy'
    except Exception: pass
    SC.view_settings.exposure = 0.4
    try: add_glare(0.9)
    except Exception as e: print("glare skip", e)
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'; prefs.get_devices()
        ok = False
        for d in prefs.devices: d.use = d.type == 'METAL'; ok = ok or d.use
        SC.cycles.device = 'GPU' if ok else 'CPU'
    except Exception:
        SC.cycles.device = 'CPU'

def mat_wood(name, c1=(0.42,0.27,0.15), c2=(0.24,0.14,0.075), rough=0.32, scale=1.4, wscale=1.1):
    """程序化木纹：波浪纹理+噪声扰动+凹凸"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Roughness"].default_value = rough
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (scale, scale, scale)
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.inputs["Scale"].default_value = wscale; wave.inputs["Distortion"].default_value = 7.0; wave.inputs["Detail"].default_value = 2.0
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*c2, 1); ramp.color_ramp.elements[1].color = (*c1, 1)
    nt.links.new(tc.outputs["Object"], mp.inputs[0])
    nt.links.new(mp.outputs[0], wave.inputs[0])
    nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(ramp.outputs["Color"], out.inputs[0]) if False else None
    nt.links.new(b.outputs[0], out.inputs[0])
    return m

def mat_plaster(name, c=(0.8,0.76,0.68), rough=0.85, scale=7.0, vary=0.06):
    """墙面：噪声微变色"""
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    b = nt.nodes.new("ShaderNodeBsdfPrincipled")
    b.inputs["Roughness"].default_value = rough
    tc = nt.nodes.new("ShaderNodeTexCoord")
    noise = nt.nodes.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = scale
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.35; ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[0].color = (c[0]-vary, c[1]-vary, c[2]-vary, 1)
    ramp.color_ramp.elements[1].color = (c[0]+vary, c[1]+vary, c[2]+vary, 1)
    nt.links.new(tc.outputs["Object"], noise.inputs[0])
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(b.outputs[0], out.inputs[0])
    return m

def add_glare(threshold=1.0):
    """辉光合成：让灯与发光体带柔和光晕"""
    SC.use_nodes = True
    nt = SC.node_tree
    nt.nodes.clear()
    rl = nt.nodes.new("CompositorNodeRLayers")
    gl = nt.nodes.new("CompositorNodeGlare")
    gl.glare_type = "FOG_GLOW"; gl.quality = "HIGH"
    try: gl.threshold = threshold
    except Exception: pass
    out = nt.nodes.new("CompositorNodeComposite")
    nt.links.new(rl.outputs[0], gl.inputs[0])
    nt.links.new(gl.outputs[0], out.inputs[0])

def cyl_between(name, p1, p2, r, m):
    p1 = Vector(p1); p2 = Vector(p2)
    mid = (p1 + p2) / 2
    d = p2 - p1; length = d.length
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=length, location=mid)
    o = bpy.context.active_object; o.name = name
    o.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    link_to(o, m); return o

# ---------------- 剪影鲸鱼（XZ 轮廓，朝向镜头） ----------------
WHALE_PTS = [(0.32,0.02),(0.24,0.11),(0.12,0.14),(-0.04,0.115),(-0.18,0.05),
             (-0.34,0.17),(-0.26,0.03),(-0.34,-0.08),(-0.16,-0.07),(0.02,-0.115),
             (0.20,-0.08),(0.29,-0.045)]

def whale_cutout(name, x, y, z, s, rz, thick=0.045, m=None, eye=True, eye_m=None):
    verts = [(px*s, 0, pz*s) for (px, pz) in WHALE_PTS]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], [list(range(len(verts)))])
    mesh.validate()
    o = bpy.data.objects.new(name, mesh); SC.collection.objects.link(o)
    mod = o.modifiers.new("sol", 'SOLIDIFY'); mod.thickness = thick; mod.offset = 0
    o.location = (x, y, z); o.rotation_euler = (0, 0, rz)
    link_to(o, m)
    if eye:
        import bmesh
        e = bpy.data.meshes.new(name+"_eye")
        bm = bmesh.new(); bmesh.ops.create_circle(bm, radius=0.045*s, segments=16, cap_ends=True)
        bm.to_mesh(e); bm.free()
        eo = bpy.data.objects.new(name+"_eye", e); SC.collection.objects.link(eo)
        emo = eo.modifiers.new("sol", 'SOLIDIFY'); emo.thickness = thick+0.006; emo.offset = 0
        eo.location = (x + 0.2*s, y - (thick+0.006)/2 - 0.001, z + 0.035*s)
        link_to(eo, eye_m)
    return o

# ================= 场景建造函数 =================
def build_cafe():
    M_FLOOR = mat_diffuse("floor", (0.27,0.155,0.08), 0.3); M_FLOOR2 = mat_diffuse("f2", (0.2,0.115,0.06), 0.35)
    M_WALL = mat_plaster("wall", (0.6,0.48,0.36), 0.85, 6.0, 0.07); M_CEIL = mat_diffuse("ceil", (0.3,0.24,0.19), 0.9)
    M_WALNUT = mat_diffuse("walnut", (0.16,0.095,0.05), 0.28); M_NAVY = mat_diffuse("navy", (0.075,0.13,0.24), 0.55)
    M_BLUE = mat_diffuse("whb", (0.22,0.38,0.62), 0.45); M_CREAM = mat_diffuse("cream", (0.85,0.78,0.62), 0.5)
    M_METAL = mat_diffuse("metal", (0.35,0.36,0.38), 0.25, 1.0); M_DARK = mat_diffuse("dark", (0.05,0.05,0.06), 0.7)
    M_CUP = mat_diffuse("cup", (0.88,0.84,0.76), 0.35); M_SEA = mat_diffuse("sea", (0.02,0.05,0.09), 0.14)
    M_LAND = mat_diffuse("land", (0.015,0.025,0.04), 0.8)
    M_GLOW = mat_emit("glow", (1.0,0.72,0.42), 6); M_GLOW_S = mat_emit("glow_s", (1.0,0.78,0.5), 0.9)
    M_MOON = mat_emit("moon", (0.92,0.95,1.0), 5); M_SKY = mat_emit("sky", (0.05,0.09,0.17), 1.0)
    M_SHOPL = mat_emit("shopl", (1.0,0.75,0.45), 2.4); M_SIGN = mat_emit("sign", (0.5,0.75,1.0), 0.9)
    W, D, H = 8.0, 6.0, 3.0
    box("floor", -W/2,-D/2,-0.05, W/2,D/2,0, M_FLOOR)
    for i in range(-5,6): box(f"pl{i}", -W/2, i*0.75-0.008, 0.001, W/2, i*0.75+0.008, 0.004, M_FLOOR2)
    box("ceil", -W/2,-D/2,H, W/2,D/2,H+0.05, M_CEIL)
    WX0,WX1,WZ0,WZ1 = 1.1,3.4,0.85,2.45
    box("wB_L",-W/2,2.95,0,WX0,3.0,H,M_WALL); box("wB_R",WX1,2.95,0,W/2,3.0,H,M_WALL)
    box("wB_T",WX0,2.95,WZ1,WX1,3.0,H,M_WALL); box("wB_B",WX0,2.95,0,WX1,3.0,WZ0,M_WALL)
    box("wL",-W/2,-D/2,0,-W/2+0.05,3.0,H,M_WALL); box("wR",W/2-0.05,-D/2,0,W/2,3.0,H,M_WALL)
    for (a,b,c,d2,e,f) in [(WX0-0.04,2.93,WZ0-0.04,WX1+0.04,2.98,WZ0),(WX0-0.04,2.93,WZ1,WX1+0.04,2.98,WZ1+0.04),
        (WX0-0.04,2.93,WZ0,WX0,2.98,WZ1),(WX1,2.93,WZ0,WX1+0.04,2.98,WZ1),
        ((WX0+WX1)/2-0.02,2.93,WZ0,(WX0+WX1)/2+0.02,2.98,WZ1),(WX0-0.04,2.93,(WZ0+WZ1)/2-0.02,WX1+0.04,2.98,(WZ0+WZ1)/2+0.02)]:
        box("frame",a,b,c,d2,e,f,M_DARK)
    box("sea",-30,4.0,-0.5,40,60,-0.02,M_SEA)
    box("sky",-40,55,-2,40,58,32,M_SKY)
    disc("moon",12,50,8.5,1.6,M_MOON)
    box("glade",11.2,5.0,0.0,12.8,30,0.015,mat_emit("glade",(0.4,0.5,0.68),0.16))
    box("cbody",-2.3,2.45,0,1.1,3.15,0.95,M_NAVY); box("ctop",-2.42,2.36,0.95,1.22,3.24,1.06,M_WALNUT)
    box("ckick",-2.3,2.45,0,1.1,2.55,0.12,M_DARK)
    box("machine",-1.5,2.6,1.06,-0.95,3.05,1.5,mat_diffuse("mach",(0.38,0.09,0.07),0.3,0.6))
    box("mtop",-1.55,2.55,1.5,-0.9,3.1,1.58,M_DARK)
    glass = bpy.data.materials.new("glass"); glass.use_nodes = True
    nt = glass.node_tree; nt.nodes.clear()
    o2 = nt.nodes.new("ShaderNodeOutputMaterial"); g2 = nt.nodes.new("ShaderNodeBsdfGlass")
    g2.inputs["Roughness"].default_value = 0.03
    nt.links.new(g2.outputs[0], o2.inputs[0])
    sphere("dome",0.45,2.85,1.06,0.19,glass); cyl("dplate",0.45,2.85,1.055,0.2,0.015,M_METAL)
    sphere("cake",0.45,2.85,1.13,0.11,M_CREAM)
    for (cx,cy) in [(-0.35,2.62),(0.05,2.95),(0.65,2.6),(-2.0,2.8)]:
        cyl("sau",cx,cy,1.068,0.075,0.012,M_CUP); cyl("cup",cx,cy,1.10,0.05,0.07,M_CUP)
    box("shelf",-1.7,2.86,1.88,0.7,2.92,1.93,M_WALNUT)
    rnd = random.Random(5)
    for i in range(5):
        hh = rnd.uniform(0.14,0.24)
        cyl(f"jar{i}",-1.55+i*0.4,2.89,1.93+hh/2,rnd.uniform(0.045,0.065),hh,
            mat_diffuse(f"j{i}", (0.7,0.55,0.35) if i%2 else (0.45,0.5,0.42), 0.35))
    box("shelf_l",-1.72,2.92,1.80,0.72,2.95,1.86,M_GLOW_S)
    whale_cutout("sw",-0.62,2.925,2.5,1.15,0.0,0.03,M_SIGN,eye=False)
    whale_cutout("wh1",-1.55,2.2,2.1,1.0,0.12,0.045,M_BLUE,eye=True,eye_m=M_CREAM)
    whale_cutout("wh2",0.42,2.45,2.28,0.72,-0.15,0.045,M_BLUE,eye=True,eye_m=M_CREAM)
    whale_cutout("wh3",1.85,1.9,2.02,0.55,0.08,0.045,M_BLUE,eye=True,eye_m=M_CREAM)
    for (hx,hy,hz,s) in [(-1.55,2.2,2.1,1.0),(0.42,2.45,2.28,0.72),(1.85,1.9,2.02,0.55)]:
        cyl("str",hx,hy,(hz+0.15*s+H)/2,0.006,H-(hz+0.15*s),M_DARK)
    whale_cutout("logo",-0.62,2.43,0.58,0.62,0.0,0.02,M_SIGN,eye=False)
    def lamp(lx,ly,drop):
        zs = H - drop
        cyl("cord",lx,ly,(H+zs+0.12)/2,0.008,H-zs-0.12,M_DARK)
        bpy.ops.mesh.primitive_cone_add(radius1=0.16,radius2=0.035,depth=0.16,location=(lx,ly,zs))
        cone = bpy.context.active_object; link_to(cone,M_DARK)
        sphere("bulb",lx,ly,zs-0.10,0.045,M_GLOW)
        pt_light("lp",lx,ly,zs-0.12,40,(1.0,0.72,0.45),0.08)
    lamp(-1.15,1.15,0.52); lamp(0.4,1.85,0.62); lamp(1.85,0.2,0.45)
    sun_light("moonbeam",3.2,(0.55,0.68,1.0),(math.radians(-52),math.radians(14),math.radians(-24)))
    area_light("winfill",(2.25,4.5,1.8),(2.25,2.0,1.2),55,(0.45,0.6,1.0),2.2)
    area_light("bounce",(0.0,-1.0,2.75),(0.0,1.5,0.0),30,(1.0,0.8,0.58),4.0)
    area_light("cwarm",(-0.6,2.2,2.6),(-0.6,2.6,1.0),30,(1.0,0.75,0.48),1.6)
    world((0.012,0.02,0.045),0.6)
    camera((0.15,-1.55,1.44),(0.0,2.9,1.06),26,3.8,3.8)
    SC.view_settings.exposure = 0.42

def build_classroom(sunset=False):
    M_FLOOR = mat_wood("f",(0.5,0.33,0.18),(0.3,0.19,0.1),0.35,1.1,1.0); M_WALL = mat_plaster("w",(0.8,0.77,0.65),0.88,8.0,0.05)
    M_CEIL = mat_diffuse("c",(0.9,0.88,0.8),0.9); M_WOOD = mat_diffuse("wd",(0.55,0.36,0.2),0.4)
    M_DARK = mat_diffuse("dk",(0.1,0.1,0.11),0.6); M_BOARD = mat_diffuse("bd",(0.13,0.24,0.19),0.75)
    W, D, H = 9.0, 7.0, 3.2
    box("fl",-W/2,-D/2,-0.05,W/2,D/2,0,M_FLOOR)
    box("ce",-W/2,-D/2,H,W/2,D/2,H+0.05,M_CEIL)
    box("bw",-W/2,D-0.05,0,W/2,D,H,M_WALL)
    box("fw",-W/2,-D,0,W/2,-D+0.05,H,M_WALL)
    box("lw",-W/2,-D,0,-W/2+0.05,D,H,M_WALL)
    box("rw",W/2-0.05,-D,0,W/2,D,H,M_WALL)
    box("bb",W*0.18,D-0.06,H*0.42,W*0.62,D-0.02,H*0.72,M_BOARD)
    box("bbf",W*0.17,D-0.07,H*0.40,W*0.63,D-0.055,H*0.74,M_WOOD)
    rnd = random.Random(3)
    for i in range(5):
        box(f"chalk{i}",W*0.2+i*0.06,D-0.055,H*0.55+i*0.03,W*0.28+i*0.1,D-0.052,H*0.555+i*0.03,
            mat_emit("ch",(0.9,0.9,0.86),0.6))
    # 课桌 4x4
    for r in range(4):
        for c2 in range(4):
            x = -2.4 + c2*1.6; y = -1.2 + r*1.35
            if y > D-1.6: continue
            box(f"dt{r}{c2}",x-0.55,y-0.38,0.68,x+0.55,y+0.38,0.76,M_WOOD)
            box(f"dl{r}{c2}",x-0.5,y-0.34,0,x+0.5,y-0.28,0.68,M_DARK)
            box(f"dr{r}{c2}",x-0.5,y+0.28,0,x+0.5,y+0.34,0.68,M_DARK)
            box(f"ch{r}{c2}",x-0.3,y-0.62,0.42,x+0.3,y-0.56,0.46,M_WOOD)
            box(f"cb{r}{c2}",x-0.28,y-0.62,0,x+0.28,y-0.56,0.42,M_DARK)
    # 左墙窗
    sky_c = (0.85,0.92,1.0) if not sunset else (0.95,0.55,0.3)
    M_SKY = mat_emit("sky",( *sky_c,), 3.2 if not sunset else 2.6)
    for w_i in range(3):
        z0 = 0.9; z1 = 2.3; y0 = -2.2 + w_i*2.3
        box(f"wf{w_i}",-W/2+0.02,y0-0.06,z0-0.06,-W/2+0.07,y0+1.7,z1+0.06,M_DARK)
        plane(f"wg{w_i}",-W/2+0.08,-W/2+0.1,y0,z0,y0+1.64,z1,M_SKY) if False else None
        # 用竖直平面
        bpy.ops.mesh.primitive_plane_add(size=1, location=(-W/2+0.09, y0+0.82, (z0+z1)/2), rotation=(0, math.pi/2, 0))
        g = bpy.context.active_object; g.name = f"wg{w_i}"; g.scale = ((z1-z0)/2, 1.64/2, 1); link_to(g, M_SKY)
    if sunset:
        sun_light("sun",5.5,(1.0,0.45,0.2),(math.radians(-38),math.radians(-78),0))
        area_light("warm",(0,-D+0.5,2.6),(0,0,1.0),40,(1.0,0.6,0.3),5)
        world((0.09,0.05,0.03),0.8)
        SC.view_settings.exposure = 0.32
    else:
        sun_light("sun",4.0,(1.0,0.95,0.85),(math.radians(-50),math.radians(-60),0))
        area_light("fill",(0,-D+0.5,2.6),(0,0,1.0),60,(1.0,0.97,0.9),5)
        world((0.5,0.6,0.75),0.5)
        SC.view_settings.exposure = 0.35
    camera((W*0.42,-D+1.1,1.35),(W*0.36,2.5,1.15),28,4.0,5.0)

def build_library():
    M_FLOOR = mat_wood("f",(0.24,0.16,0.09),(0.13,0.08,0.045),0.38,1.0,0.8); M_WALL = mat_diffuse("w",(0.3,0.24,0.18),0.85)
    M_WOOD = mat_wood("wd",(0.3,0.19,0.1),(0.16,0.09,0.05),0.4,1.6,1.4); M_DARK = mat_diffuse("dk",(0.06,0.05,0.05),0.7)
    M_LAMP = mat_emit("lp",(1.0,0.72,0.4),4)
    W, D, H = 10.0, 8.0, 3.4
    box("fl",-W/2,-D/2,-0.05,W/2,D/2,0,M_FLOOR)
    box("ce",-W/2,-D/2,H,W/2,D/2,H+0.05,M_WALL)
    box("bw",-W/2,D-0.05,0,W/2,D,H,M_WALL); box("fw",-W/2,-D,0,W/2,-D+0.05,H,M_WALL)
    box("lw",-W/2,-D,0,-W/2+0.05,D,H,M_WALL); box("rw",W/2-0.05,-D,0,W/2,D,H,M_WALL)
    rnd = random.Random(9)
    def shelf(sx, sy, w, rot=0):
        box(f"sf{sx}{sy}",sx-0.05,sy-0.18,0.2,sx+w,sy+0.18,2.2,M_WOOD)
        for lv in range(4):
            z = 0.42 + lv*0.5
            box(f"sl{sx}{sy}{lv}",sx,sy-0.15,z,sx+w-0.05,sy+0.15,z+0.035,M_WOOD)
            bx = sx + 0.06
            while bx < sx + w - 0.15:
                bh = rnd.uniform(0.22,0.36); bw = rnd.uniform(0.03,0.06)
                hue = rnd.random()
                col = [(0.5,0.2,0.15),(0.15,0.3,0.45),(0.5,0.42,0.2),(0.2,0.4,0.25),(0.35,0.2,0.4),(0.55,0.3,0.1)][int(hue*5.99)]
                box(f"bk{bx:.1f}{lv}",bx,sy-0.13,z+0.035,bx+bw,sy+0.13,z+0.035+bh,
                    mat_diffuse(f"bm{bx:.1f}{lv}",col,0.6))
                bx += bw + 0.008
    shelf(-4.6, -1.6, 2.2); shelf(-1.4, -1.6, 2.2); shelf(1.8, -1.6, 2.2)
    shelf(-4.6, 2.4, 2.2); shelf(-1.4, 2.4, 2.2); shelf(1.8, 2.4, 2.2)
    # 阅读桌 + 绿罩台灯
    for (tx,ty) in [(-2.6,0.4),(1.0,0.4)]:
        box(f"tb{tx}",tx-1.1,ty-0.5,0.7,tx+1.1,ty+0.5,0.76,M_WOOD)
        box(f"tl{tx}",tx-1.0,ty-0.44,0,tx-0.94,ty-0.38,0.7,M_DARK)
        box(f"tr{tx}",tx+0.94,ty-0.44,0,tx+1.0,ty-0.38,0.7,M_DARK)
        for lx in [tx-0.55,tx+0.55]:
            cyl("lst",lx,ty,1.0,0.02,0.45,M_METAL if False else M_DARK)
            bpy.ops.mesh.primitive_cone_add(radius1=0.13,radius2=0.04,depth=0.14,location=(lx,ty,1.3))
            cone = bpy.context.active_object; link_to(cone, M_DARK)
            disc("llp",lx,ty,1.24,0.09,M_LAMP)
            pt_light("llp_l",lx,ty,1.2,18,(1.0,0.72,0.4),0.12)
    area_light("amb",(0,0,3.1),(0,0,0),95,(1.0,0.78,0.5),6)
    pt_light("warm1",-2.6,0.4,1.9,25,(1.0,0.7,0.4),0.3)
    pt_light("warm2",1.0,0.4,1.9,25,(1.0,0.7,0.4),0.3)
    world((0.02,0.015,0.01),0.6)
    SC.view_settings.exposure = 0.72
    camera((1.35,-2.6,1.55),(0.9,0.9,1.05),32,4.0,3.2)

def build_rooftop(night=False):
    M_FLOOR = mat_diffuse("f",(0.4,0.4,0.42) if not night else (0.16,0.17,0.2),0.85)
    M_FENCE = mat_diffuse("fc",(0.5,0.54,0.6),0.5,0.6); M_DARK = mat_diffuse("dk",(0.08,0.09,0.11),0.7)
    M_BLD = mat_diffuse("b",(0.24,0.28,0.36) if not night else (0.06,0.07,0.1),0.8)
    W, D, H = 16.0, 10.0, 0.0
    box("fl",-W/2,-D/2,-0.5,W/2,D/2,0,M_FLOOR)
    # 围栏
    for i in range(21):
        cyl(f"p{i}",-8+i*0.8,4.8,0.55,0.03,1.1,M_FENCE)
    box("r1",-8.2,4.8,1.0,8.2,4.86,1.06,M_FENCE)
    box("r2",-8.2,4.8,0.55,8.2,4.86,0.6,M_FENCE)
    # 水塔
    box("tank",-6.6,3.6,1.2,-4.9,5.0,2.5,M_DARK)
    cyl("tankleg1",-6.3,4.2,0.6,0.07,1.2,M_DARK); cyl("tankleg2",-5.2,4.4,0.6,0.07,1.2,M_DARK)
    # 远景城市
    rnd = random.Random(7)
    for i in range(14):
        bx = -14 + i*2.1; bh = rnd.uniform(2.5,8.5)
        box(f"b{i}",bx,10+rnd.uniform(0,6),0,bx+rnd.uniform(1.4,2.4),12+rnd.uniform(0,6),bh,M_BLD)
        if night:
            for wx in range(int(bh*2)):
                if rnd.random() < 0.28:
                    box(f"win{i}{wx}",bx+rnd.uniform(0.1,1.2),9.9,rnd.uniform(0.4,bh-0.3),
                        bx+rnd.uniform(1.3,2.0),10.0,rnd.uniform(0.45,bh-0.2),mat_emit(f"ww{i}{wx}",(1.0,0.8,0.45),2.2))
    if night:
        box("sky",-30,14,-2,30,20,24,mat_emit("skyn",(0.02,0.045,0.1),1.0))
        disc("moon",-4,16,9,1.3,mat_emit("mn",(0.92,0.95,1.0),5))
        stars(40,-14,14,15,4,12,seed=5)
        area_light("cityglow",(0,10,2.0),(0,2,0.8),30,(1.0,0.7,0.4),6)
        world((0.01,0.02,0.05),0.5)
        SC.view_settings.exposure = 0.3
        camera((3.2,-3.6,1.5),(-2.0,4.5,2.2),30,4.0,7.0)
    else:
        box("sky",-30,14,-2,30,20,24,mat_sky("skyd",(0.75,0.85,0.95),(0.3,0.55,0.9),1.2))
        sun_light("sun",4.5,(1.0,0.95,0.85),(math.radians(-55),math.radians(20),0))
        world((0.4,0.55,0.75),0.6)
        SC.view_settings.exposure = 0.32
        camera((3.2,-3.6,1.5),(-2.0,4.5,2.2),30,4.0,7.0)

def build_seaside(mode):
    night = mode == "night"; sunset = mode == "sunset"
    M_SAND = mat_diffuse("sd",(0.82,0.72,0.55) if not night else (0.14,0.14,0.17),0.9)
    M_SEA = mat_diffuse("sea",(0.1,0.32,0.48) if mode=="day" else ((0.04,0.14,0.24) if not night else (0.04,0.1,0.18)),0.12)
    M_ROCK = mat_diffuse("rk",(0.1,0.1,0.11),0.9)
    box("sand",-16,-2,-0.3,16,8,0.0,M_SAND)
    box("sea",-30,-60,-0.5,30,0.6,-0.02,M_SEA)
    sky_c = {"day":((0.65,0.82,0.95),(0.25,0.5,0.85)), "sunset":((0.98,0.6,0.3),(0.25,0.25,0.5)), "night":((0.04,0.07,0.15),(0.01,0.02,0.06))}[mode]
    box("sky",-30,-54,-2,30,-50,26,mat_sky("skyc",*sky_c,1.2))
    if mode == "day":
        disc("sun",-6,-40,11,2.2,mat_emit("sn",(1.0,0.97,0.85),8))
        sun_light("sun",4.0,(1.0,0.95,0.85),(math.radians(-58),math.radians(-15),0))
        world((0.45,0.6,0.8),0.6); SC.view_settings.exposure = 0.35
    elif mode == "sunset":
        disc("sun",0,-38,2.6,3.2,mat_emit("sn",(1.0,0.72,0.38),9))
        box("glade",-1.6,-30,0.0,1.6,-0.5,0.02,mat_emit("gl",(1.0,0.72,0.42),0.7))
        area_light("warm",(0,-1,4),(0,-6,0),50,(1.0,0.55,0.3),8)
        world((0.35,0.2,0.15),0.8); SC.view_settings.exposure = 0.28
        rocks = [(-6,3,0.9),(5,5,1.3),(-9,6,1.6)]
    else:
        disc("moon",-4,-40,12,1.9,mat_emit("sn",(0.92,0.95,1.0),6))
        box("glade",-4.8,-30,0.0,-3.2,-0.5,0.02,mat_emit("gl",(0.6,0.72,0.95),0.4))
        stars(46,-24,24,-45,6,20,seed=9)
        area_light("moonl",(-4,-20,10),(-2,4,0),34,(0.6,0.72,1.0),7)
        world((0.008,0.015,0.04),0.6); SC.view_settings.exposure = 0.3
    if mode != "day":
        rocks = [(-6,3,0.9),(5,5,1.3),(-9,6,1.6)] if mode=="night" else [(-6,3,0.9),(5,5,1.3)]
        for i,(rx,ry,rr) in enumerate(rocks):
            sphere(f"rock{i}",rx,ry,rr*0.2,rr,M_ROCK,scale=(1.3,1.0,0.55))
    # 海鸟（日落/白天）
    if mode != "night":
        for i,(bx,by,bz) in enumerate([(-3,10,6),(2,12,7),(-7,14,8)]):
            box(f"bird{i}",bx,by,bz,bx+0.5,by+0.08,bz+0.04,M_ROCK)
    # 岸边浪花线 + 远处小岛
    box("foam",-14,0.1,0.0,14,0.35,0.03,mat_emit("fm",(0.92,0.95,0.98),0.9 if mode!="night" else 0.25))
    sphere("isle",9,-26,0.3,2.2,M_ROCK,scale=(1.6,1.0,0.28))
    if mode == "day":
        camera((0.0,4.8,1.55),(-0.3,-4,2.3),30,6.0,9.0); SC.view_settings.exposure = 0.42
    elif mode == "sunset":
        camera((0.0,4.8,1.5),(-0.2,-4,1.9),30,5.0,9.0); SC.view_settings.exposure = 0.34
    else:
        camera((0.0,4.8,1.55),(-0.5,-4,2.1),30,5.0,9.0); SC.view_settings.exposure = 0.5

def build_festival():
    M_GROUND = mat_plaster("g",(0.17,0.14,0.15),0.92,10.0,0.03); M_WOOD = mat_diffuse("w",(0.3,0.2,0.12),0.7)
    M_DARK = mat_diffuse("dk",(0.05,0.04,0.05),0.8); M_SKY = mat_emit("sk",(0.03,0.045,0.09),1.0)
    M_LANT = mat_emit("la",(1.0,0.55,0.2),2.2); M_STALL = mat_emit("st",(1.0,0.68,0.32),1.8)
    box("gnd",-12,-1,-0.1,12,14,0,M_GROUND)
    box("sky",-20,6,-2,20,10,18,M_SKY)
    rnd = random.Random(4)
    for side in (-1,1):
        for i in range(4):
            sx = -6 + i*4 + (0.4 if side<0 else 0); sy = 1.5 if side<0 else 4.2
            off = side * 2.6
            # 开放式摊位：顶板+两侧板+背板+内发光
            box(f"top{side}{i}",sx+off-1.35,sy-1.0,1.62,sx+off+1.35,sy+1.0,1.78,M_WOOD)
            box(f"sideL{side}{i}",sx+off-1.3,sy-0.95,0,sx+off-1.2,sy+0.95,1.62,M_WOOD)
            box(f"sideR{side}{i}",sx+off+1.2,sy-0.95,0,sx+off+1.3,sy+0.95,1.62,M_WOOD)
            box(f"back{side}{i}",sx+off-1.3,sy+0.85,0,sx+off+1.3,sy+0.95,1.6,M_WOOD)
            box(f"glow{side}{i}",sx+off-1.1,sy+0.7,0.55,sx+off+1.1,sy+0.82,1.45,M_STALL)
            box(f"counter{side}{i}",sx+off-1.2,sy-0.85,0.7,sx+off+1.2,sy-0.6,0.85,M_WOOD)
            for s2 in range(4):
                box(f"aw{side}{i}{s2}",sx+off-1.3+s2*0.66,sy-1.02+0.02*side,1.78,sx+off-1.0+s2*0.66,sy+1.02,1.86,
                    mat_diffuse(f"awm{side}{i}{s2}",(0.75,0.2,0.15) if s2%2 else (0.9,0.88,0.82),0.7))
            pt_light(f"stl{side}{i}",sx+off,sy,1.5,14,(1.0,0.62,0.3),0.4)
            # 摊位小物
            sphere(f"good{side}{i}",sx+off-0.4,sy-0.7,0.92,0.09,mat_diffuse(f"gm{side}{i}",(0.9,0.5,0.3),0.6))
            box(f"good2{side}{i}",sx+off+0.2,sy-0.75,0.85,sx+off+0.6,sy-0.5,1.0,
                mat_diffuse(f"g2m{side}{i}",(0.4,0.55,0.8),0.6))
    # 灯笼串
    for (y0,h) in [(2.0,2.9),(2.1,2.45)]:
        for i in range(16):
            lx = -7.5 + i*1.0; sag = math.sin((lx+7.5)/15*math.pi)*0.45
            sphere(f"lant{i}{h}",lx,y0,h-sag,0.15,M_LANT)
    world((0.012,0.014,0.025),0.5)
    area_light("warm",(0,2.8,3.6),(0,2.8,0),80,(1.0,0.62,0.32),9)
    SC.view_settings.exposure = 0.52
    camera((0.6,-1.3,1.9),(0.3,8,2.2),26,5.5,9.0)

def build_ferris(night=True):
    M_GND = mat_diffuse("g",(0.1,0.11,0.13) if night else (0.42,0.44,0.4),0.9 if night else 0.85)
    M_SKY = mat_emit("sk",(0.02,0.04,0.1) if night else (0.55,0.75,0.95),1.0 if night else 1.1)
    M_STR = mat_diffuse("st",(0.16,0.2,0.28) if night else (0.75,0.5,0.35),0.5,0.4)
    M_CAB = mat_emit("cab",(1.0,0.78,0.42) if night else (0.9,0.92,0.95),3.2 if night else 0.25)
    M_CAB2 = mat_diffuse("cabd",(0.25,0.3,0.4) if night else (0.85,0.4,0.4),0.4)
    M_DARK = mat_diffuse("dk",(0.05,0.05,0.07),0.8)
    M_WIN = mat_emit("win",(1.0,0.82,0.5),2.2)
    box("gnd",-24,-8,-0.2,24,12,0,M_GND)
    if night:
        box("sky",-30,10,-2,30,14,26,M_SKY)
        stars(60,-18,18,9,6,22,seed=13)
    else:
        box("sky",-30,10,-2,30,14,26,mat_sky("skd",(0.85,0.9,0.92),(0.35,0.6,0.9),1.15))
        sun_light("sun",3.6,(1.0,0.95,0.85),(math.radians(-50),math.radians(-25),0))
        for i in range(6):
            sphere(f"cloud{i}",-14+i*5.5,6,9+ (i%3)*1.4,1.3,mat_diffuse("cl",(0.95,0.95,0.97),0.9),scale=(1.8,1.0,0.5))
    # 远景城市
    rnd = random.Random(21)
    for i in range(12):
        bx = 3 + i*1.7; bh = rnd.uniform(1.6,5.2)
        box(f"b{i}",bx,7.6,0,bx+1.25,9.6,bh,M_DARK)
        for wx in range(int(bh*2)):
            if rnd.random()< (0.3 if night else 0.1):
                box(f"ww{i}{wx}",bx+rnd.uniform(0.08,0.85),7.55,rnd.uniform(0.3,bh-0.2),bx+rnd.uniform(0.95,1.15),7.6,rnd.uniform(0.35,bh-0.1),M_WIN)
    # ---- 摩天轮主体 ----
    CX, CY, CZ, R = -3.2, 5.0, 4.4, 3.3
    # 轮圈：分段方块拼环（绕开 torus 操作符的 5.1 崩溃）
    for rr in (R, R-0.22):
        for i in range(24):
            a = i/24*math.pi*2
            seg = box(f"rim{rr:.2f}_{i}", 0,0,0, 0.28,0.09,0.09, M_STR)
            seg.location = (CX+math.cos(a)*rr, CY, CZ+math.sin(a)*rr)
            seg.rotation_euler = (0, -a, 0)
    # 辐条（双十字）
    for i in range(8):
        a = i/8*math.pi*2
        cyl_between(f"sp{i}", (CX,CY,CZ), (CX+math.cos(a)*R, CY, CZ+math.sin(a)*R), 0.035, M_STR)
    # 悬挂式座舱：吊臂在轮缘下方
    for i in range(10):
        a = i/10*math.pi*2
        px, pz = CX+math.cos(a)*R, CZ+math.sin(a)*R
        cyl_between(f"hd{i}", (px,CY,pz), (px,CY,pz-0.22), 0.025, M_STR)
        box(f"cab{i}",px-0.17,CY-0.18,pz-0.52,px+0.17,CY+0.18,pz-0.2,M_CAB2)
        if night:
            box(f"cabw{i}",px-0.12,CY-0.185,pz-0.46,px+0.12,CY-0.17,pz-0.26,M_CAB)
    sphere("hub",CX,CY,CZ,0.2,M_STR)
    cyl("axle",CX,CY-0.4,CZ,0.06,0.8,M_STR,rot=(math.pi/2,0,0))
    # A字支架（前后各一对）+ 横撑
    for dy in (-0.55, 0.55):
        cyl_between(f"legA{dy}", (CX-0.55,CY+dy,CZ), (CX-2.0,CY+dy,0), 0.08, M_STR)
        cyl_between(f"legB{dy}", (CX+0.55,CY+dy,CZ), (CX+2.0,CY+dy,0), 0.08, M_STR)
    cyl_between("baseA", (CX-2.0,CY-0.55,0.05), (CX-2.0,CY+0.55,0.05), 0.07, M_STR)
    cyl_between("baseB", (CX+2.0,CY-0.55,0.05), (CX+2.0,CY+0.55,0.05), 0.07, M_STR)
    cyl_between("cross", (CX-1.9,CY-0.55,CZ*0.45), (CX+1.9,CY-0.55,CZ*0.45), 0.05, M_STR)
    # 登舱平台
    box("plat",CX-0.9,CY-1.1,0,CX+0.9,CY-0.55,0.5,M_STR)
    if night:
        pt_light("platl",CX,CY-0.8,1.0,20,(1.0,0.75,0.45),0.3)
        world((0.01,0.015,0.04),0.5); SC.view_settings.exposure = 0.36
        camera((4.6,-2.6,2.0),(CX,CY,CZ-0.3),32,5.0,10.0)
    else:
        world((0.4,0.55,0.75),0.6); SC.view_settings.exposure = 0.34
        camera((4.6,-2.6,2.0),(CX,CY,CZ-0.3),32,6.0,10.0)

def build_ferris_night(): build_ferris(True)
def build_ferris_day(): build_ferris(False)

def build_minshuku():
    M_DECK = mat_wood("dk",(0.5,0.33,0.18),(0.32,0.2,0.11),0.5,1.0,1.1); M_WOOD = mat_diffuse("w",(0.5,0.35,0.2),0.55)
    M_POST = mat_diffuse("p",(0.35,0.22,0.12),0.6); M_SEA = mat_diffuse("sea",(0.06,0.16,0.26),0.2)
    M_DARK = mat_diffuse("dk2",(0.08,0.06,0.05),0.8)
    box("deck",-6,-1,-0.1,6,4,0,M_DECK)
    for i in range(-4,5): box(f"pk{i}",-6,i*0.55-0.01,0.001,6,i*0.55+0.01,0.006,M_WOOD)
    box("sea",-30,8,-0.5,30,50,-0.02,M_SEA)
    box("sky",-30,44,-2,30,48,22,mat_sky("skc",(0.98,0.62,0.32),(0.2,0.2,0.45),1.3))
    disc("sun",1.2,38,2.2,2.6,mat_emit("sn",(1.0,0.7,0.35),9))
    box("glade",0.3,3.5,0.0,2.1,30,0.02,mat_emit("gl",(1.0,0.7,0.4),0.6))
    # 檐廊顶
    box("eave",-6,-1.4,2.5,6,0.6,2.65,M_DARK)
    box("roof",-6.3,-1.7,2.62,6.3,0.9,2.8,M_POST)
    for i in range(5):
        cyl(f"post{i}",-4.8+i*2.4,0.4,1.25,0.07,2.5,M_POST)
    box("rail",-6,2.6,0.55,6,2.68,0.62,M_POST)
    box("rail2",-6,2.6,1.0,6,2.68,1.07,M_POST)
    # 风铃
    cyl("wstr",-2.2,2.5,2.1,0.004,0.3,M_DARK)
    sphere("wbell",-2.2,2.5,1.9,0.06,mat_diffuse("glass2",(0.8,0.88,0.92),0.2))
    area_light("warm",(0,0,2.3),(0,3,1.0),30,(1.0,0.62,0.35),5)
    area_light("dusk",(0,4,3.5),(0,2,0.5),26,(1.0,0.5,0.28),7)
    world((0.1,0.06,0.05),0.7)
    SC.view_settings.exposure = 0.3
    camera((0,1.6,1.42),(0.3,8,0.9),32,4.0,8.0)

def build_bedroom():
    M_FLOOR = mat_wood("f",(0.42,0.29,0.16),(0.26,0.17,0.09),0.4,1.2,1.0); M_WALL = mat_plaster("w",(0.58,0.53,0.46),0.88,6.0,0.05)
    M_WOOD = mat_diffuse("wd",(0.5,0.34,0.2),0.45); M_DARK = mat_diffuse("dk",(0.1,0.1,0.12),0.7)
    M_BED = mat_diffuse("bd",(0.75,0.72,0.78),0.8); M_BLUE = mat_diffuse("bl",(0.2,0.32,0.55),0.7)
    W, D, H = 5.0, 4.5, 2.8
    box("fl",-W/2,-D/2,-0.05,W/2,D/2,0,M_FLOOR)
    box("ce",-W/2,-D/2,H,W/2,D/2,H+0.05,M_WALL)
    box("bw",-W/2,D-0.05,0,W/2,D,H,M_WALL); box("lw",-W/2,-D,0,-W/2+0.05,D,H,M_WALL)
    box("rw",W/2-0.05,-D,0,W/2,D,H,M_WALL); box("fw",-W/2,-D,0,W/2,-D+0.05,H,M_WALL)
    # 床
    box("bed",-1.9,D-1.5,0,-0.1,D-0.3,0.45,M_WOOD)
    box("mat",-1.85,D-1.45,0.45,-0.15,D-0.38,0.62,M_BED)
    box("blanket",-1.85,D-1.1,0.6,-0.15,D-0.38,0.72,M_BLUE)
    box("pillow",-1.7,D-1.38,0.62,-0.9,D-1.02,0.76,mat_diffuse("pw",(0.92,0.9,0.86),0.85))
    # 书桌 + 台灯 + 笔记本
    box("desk",0.6,-D+0.4,0.72,2.1,-D+1.1,0.78,M_WOOD)
    box("dl1",0.65,-D+0.45,0,0.71,-D+0.5,0.72,M_DARK); box("dl2",1.95,-D+0.45,0,2.01,-D+0.5,0.72,M_DARK)
    box("laptop",1.0,-D+0.55,0.78,1.45,-D+0.9,0.84,M_DARK)
    box("screen",1.03,-D+0.86,0.84,1.42,-D+0.88,1.12,mat_emit("scr",(0.5,0.7,1.0),1.6))
    cyl("lmp",1.85,-D+0.6,0.92,0.02,0.3,M_DARK)
    bpy.ops.mesh.primitive_cone_add(radius1=0.09,radius2=0.03,depth=0.1,location=(1.85,-D+0.6,1.12))
    cone = bpy.context.active_object; link_to(cone,M_DARK)
    pt_light("deskl",1.85,-D+0.6,1.02,16,(1.0,0.72,0.42),0.09)
    # 窗（右墙）
    box("wfr",W/2-0.07,0.8,0.8,W/2-0.02,2.3,2.1,M_DARK)
    plane("wsky",0.0,0.0,0,0,0,M_DARK) if False else None
    bpy.ops.mesh.primitive_plane_add(size=1,location=(W/2-0.055,1.55,1.45),rotation=(0,-math.pi/2,0))
    wg = bpy.context.active_object; wg.scale=(0.72,0.62,1)
    link_to(wg, mat_emit("wsky",(0.06,0.1,0.2),1.4))
    # 城市窗景剪影
    box("city1",W/2-0.05,1.0,0.9,W/2-0.045,1.25,1.7,M_DARK)
    box("city2",W/2-0.05,1.7,0.85,W/2-0.045,2.0,1.55,M_DARK)
    # 海报（左墙）
    plane("poster",-W/2+0.06,-W/2+0.065,1.2,2.0,0,M_BLUE) if False else None
    bpy.ops.mesh.primitive_plane_add(size=1,location=(-W/2+0.06,0.5,1.7),rotation=(0,math.pi/2,0))
    po = bpy.context.active_object; po.scale=(0.34,0.46,1); link_to(po, mat_emit("po",(0.35,0.55,0.95),1.3))
    area_light("room",(0,-0.5,2.6),(0,1,0.8),38,(1.0,0.85,0.7),4)
    pt_light("moonw",W/2+0.4,1.55,1.5,10,(0.6,0.72,1.0),0.15)
    world((0.02,0.025,0.04),0.5)
    SC.view_settings.exposure = 0.52
    camera((-W/2+0.5,-D+0.7,1.5),(W/2-0.5,D-0.9,0.85),28,4.5,3.6)

def build_cake():
    M_FLOOR = mat_diffuse("f",(0.78,0.68,0.72),0.4); M_WALL = mat_diffuse("w",(0.94,0.87,0.88),0.9)
    M_CEIL = mat_diffuse("c",(0.98,0.94,0.94),0.9); M_WOOD = mat_diffuse("wd",(0.72,0.52,0.4),0.45)
    M_GLASS = None
    glass = bpy.data.materials.new("gl"); glass.use_nodes = True
    nt = glass.node_tree; nt.nodes.clear()
    o2 = nt.nodes.new("ShaderNodeOutputMaterial"); g2 = nt.nodes.new("ShaderNodeBsdfGlass")
    g2.inputs["Roughness"].default_value = 0.05
    nt.links.new(g2.outputs[0], o2.inputs[0])
    M_CREAM = mat_diffuse("cr",(0.98,0.92,0.88),0.5)
    M_PINK = mat_diffuse("pk",(0.95,0.6,0.68),0.5); M_CHOC = mat_diffuse("ch",(0.35,0.2,0.12),0.4)
    M_KIWI = mat_diffuse("kw",(0.6,0.8,0.4),0.5); M_GOLD = mat_emit("gd",(1.0,0.85,0.55),1.6)
    W, D, H = 7.0, 6.0, 3.0
    box("fl",-W/2,-D/2,-0.05,W/2,D/2,0,M_FLOOR)
    box("ce",-W/2,-D/2,H,W/2,D/2,H+0.05,M_CEIL)
    box("bw",-W/2,D-0.05,0,W/2,D,H,M_WALL); box("fw",-W/2,-D,0,W/2,-D+0.05,H,M_WALL)
    box("lw",-W/2,-D,0,-W/2+0.05,D,H,M_WALL); box("rw",W/2-0.05,-D,0,W/2,D,H,M_WALL)
    # 展示柜
    box("cb",-2.6,1.6,0,2.0,2.4,0.5,M_WOOD)
    box("cv",-2.6,1.6,0.5,2.0,2.4,1.25,glass)
    box("cw",-2.65,1.55,1.25,2.05,2.45,1.32,M_WOOD)
    rnd = random.Random(8)
    for i in range(6):
        cx = -2.3 + i*0.72
        cyl(f"ck{i}",cx,2.0,0.62,rnd.uniform(0.14,0.18),0.16,[M_CREAM,M_PINK,M_CHOC][i%3])
        sphere(f"top{i}",cx,2.0,0.73,0.06,[M_PINK,M_CHOC,M_KIWI][i%3])
    # 吊灯
    for lx in [-1.8,0.2,1.8]:
        cyl("cord",lx,0.6,(H-0.5+H)/2,0.008,0.5,M_WOOD)
        sphere("shade",lx,0.6,H-0.55,0.16,M_CREAM,scale=(1,0.7,0.8))
        sphere("bulb",lx,0.6,H-0.66,0.05,M_GOLD)
        pt_light("pl",lx,0.6,H-0.72,22,(1.0,0.82,0.62),0.1)
    # 樱花吊饰
    for i in range(6):
        sx = -2.4 + i*0.96
        cyl("sstr",sx,0.9,H-0.75,0.004,0.4,M_WOOD)
        sphere("sfl",sx,0.9,H-1.2,0.06,M_PINK,scale=(1.2,0.7,0.7))
    # 招牌
    box("sign",-1.5,D-0.08,2.2,1.5,D-0.03,2.75,M_WOOD)
    disc("signt",0,D-0.1,2.48,0.55,M_CREAM,rot=(math.pi/2,0,0))
    # 背墙货架与罐子
    for lv in range(2):
        box(f"sh{lv}",-2.4,D-0.15,1.5+lv*0.7,2.4,D-0.08,1.56+lv*0.7,M_WOOD)
        for i2 in range(7):
            jx = -2.2 + i2*0.72; hh = rnd.uniform(0.16,0.3)
            cyl(f"jar{lv}{i2}",jx,D-0.3,1.56+lv*0.7+hh/2,0.06,hh,[M_PINK,M_CREAM,M_KIWI][(i2+lv)%3])
    # 墙面装饰圆盘
    for i2,(dx,dz) in enumerate([(-2.9,2.0),(-2.2,2.35),(2.6,2.1),(3.1,2.4)]):
        cyl(f"deco{i2}",dx,D-0.07,dz,0.16,0.02,[M_PINK,M_CREAM,M_KIWI][i2%3],rot=(math.pi/2,0,0))
    area_light("warm",(0,-0.5,2.6),(0,1.5,0.8),55,(1.0,0.85,0.78),5)
    world((0.4,0.34,0.36),0.7)
    SC.view_settings.exposure = 0.5
    camera((0.3,-1.35,1.42),(0,2.4,0.98),30,4.0,3.6)

SCENES = {
    "cafe_whale": build_cafe,
    "classroom_day": lambda: build_classroom(False),
    "classroom_sunset": lambda: build_classroom(True),
    "library": build_library,
    "rooftop": lambda: build_rooftop(False),
    "rooftop_night": lambda: build_rooftop(True),
    "shopping_night": lambda: None,   # 占位，见下
    "seaside_day": lambda: build_seaside("day"),
    "seaside_sunset": lambda: build_seaside("sunset"),
    "seaside_night": lambda: build_seaside("night"),
    "festival_street": build_festival,
    "ferris_night": build_ferris_night,
    "ferris_day": build_ferris_day,
    "minshuku_veranda": build_minshuku,
    "bedroom": build_bedroom,
    "cake_shop": build_cake,
}

def build_shopping_night():
    M_GND = mat_diffuse("g",(0.1,0.1,0.12),0.35)
    M_BLD = mat_diffuse("b",(0.1,0.11,0.14),0.8); M_DARK = mat_diffuse("dk",(0.04,0.04,0.06),0.8)
    M_SKY = mat_emit("sk",(0.03,0.045,0.08),1.0)
    W = 14.0
    box("gnd",-W,-2,-0.1,W,14,0,M_GND)
    box("sky",-24,6,-2,24,10,16,M_SKY)
    sign_cols = [(1.0,0.35,0.3),(0.4,0.7,1.0),(1.0,0.75,0.3),(0.7,0.5,1.0),(0.4,0.9,0.7)]
    rnd = random.Random(17)
    for side in (-1,1):
        for i in range(5):
            bx = -6 + i*3
            off = side * 4.2
            bh = rnd.uniform(3.0,4.5)
            box(f"b{side}{i}",bx-1.3,off-(1.6 if side<0 else 0)-0.0,0,bx+1.3,off+(1.6 if side>0 else 0),bh,M_BLD)
            col = sign_cols[(i + (0 if side<0 else 2)) % 5]
            box(f"sg{side}{i}",bx-1.0,off-side*1.62,bh-1.5,bx+1.0,off-side*1.55,bh-0.9,
                mat_emit(f"sm{side}{i}",col,3.0))
            # 店内光
            box(f"shopg{side}{i}",bx-1.1,off-side*1.5,0.0,bx+1.1,off-side*1.45,2.2,
                mat_emit(f"sgm{side}{i}",(1.0,0.8,0.5),1.1))
    # 路灯
    for lx in [-4.5,0,4.5]:
        cyl("lpole",lx,3.4,1.9,0.05,3.8,M_DARK)
        sphere("lbulb",lx,3.4,3.85,0.1,mat_emit("lb",(1.0,0.8,0.5),7))
        pt_light("lpl",lx,3.4,3.8,40,(1.0,0.75,0.45),0.2)
    # 灯笼串
    for h in [3.1]:
        for i in range(14):
            lx = -6.5+i*1.0; sag = math.sin((lx+6.5)/13*math.pi)*0.4
            sphere(f"lant{i}",lx,3.4,h-sag,0.1,mat_emit("lantm",(1.0,0.5,0.18),4))
    stars(30,-10,10,5,6,12,seed=6)
    world((0.008,0.01,0.02),0.5)
    SC.view_settings.exposure = 0.36
    camera((0,-1.0,1.6),(0.3,7,1.8),32,4.5,8.0)
SCENES["shopping_night"] = build_shopping_night

# ================= 追加场景 =================
def tree(name, x, y, s, trunk_m, leaf_m):
    cyl(f"{name}_tr", x, y, 0.7*s, 0.09*s, 1.4*s, trunk_m)
    rnd = random.Random(int(x*7+y*13))
    for i in range(4):
        sphere(f"{name}_l{i}", x+rnd.uniform(-0.5,0.5)*s, y+rnd.uniform(-0.4,0.4)*s,
               1.5*s+rnd.uniform(-0.2,0.5)*s, 0.55*s, leaf_m, scale=(1,1,0.85))

def build_title():
    """主页主视觉：夜海悬崖灯塔（参考用户提供的概念图）"""
    M_SEA = mat_diffuse("sea", (0.012, 0.035, 0.075), 0.08)
    M_ROCK = mat_diffuse("rock", (0.012, 0.014, 0.018), 0.85)
    M_HILL = mat_diffuse("hill", (0.02, 0.03, 0.022), 0.9)
    M_LH = mat_diffuse("lh", (0.16, 0.16, 0.15), 0.55)
    M_BLD = mat_diffuse("bld", (0.05, 0.055, 0.07), 0.8)
    M_DARK = mat_diffuse("dk", (0.015, 0.015, 0.02), 0.85)
    M_WARM = mat_emit("warm", (1.0, 0.78, 0.45), 3.2)
    M_LAMP = mat_emit("lamp", (1.0, 0.9, 0.62), 22.0)

    # ---- 夜空（渐变 + 月晕）----
    box("sky", -70, -46, -4, 70, -42, 34, mat_sky("sk", (0.055, 0.075, 0.14), (0.008, 0.014, 0.038), 1.3))
    # 月亮与地平线光
    disc("moon", 22, -44, 7.5, 1.7, mat_emit("mn", (0.9, 0.93, 1.0), 9))
    stars(160, -55, 40, -44, 5, 26, seed=33, r=0.09)
    # ---- 海面 ----
    box("sea", -60, -44, -0.6, 60, 6, 0, M_SEA)
    # 月光水路
    box("glade", 19.5, -42, 0.0, 24.5, -8, 0.012, mat_emit("gl", (0.5, 0.6, 0.85), 1.0))

    # ---- 远景城市（地平线上）----
    rnd = random.Random(15)
    for i in range(16):
        bx = -24 + i * 1.9
        bh = rnd.uniform(0.8, 2.6)
        box(f"city{i}", bx, -22 - rnd.uniform(0, 3), 0, bx + rnd.uniform(1.0, 1.5), -20 - rnd.uniform(0, 2), bh, M_DARK)
        for wx in range(int(bh * 3)):
            if rnd.random() < 0.32:
                box(f"cw{i}{wx}", bx + rnd.uniform(0.05, 0.7), -21.5 - rnd.uniform(0, 1.5), rnd.uniform(0.1, bh - 0.1),
                    bx + rnd.uniform(0.75, 1.0), -21.4 - rnd.uniform(0, 1), rnd.uniform(0.15, bh - 0.05), M_WARM)

    # ---- 悬崖（右侧）----
    box("cliff", -22, -3, 0, -7, 7, 5.5, M_ROCK)
    box("cliff2", -9, -1.5, 0, -5.5, 3.5, 2.6, M_ROCK)
    for i in range(7):  # 崖壁凹凸
        sphere(f"cr{i}", -rnd.uniform(7.5, 14), rnd.uniform(-3.4, -2.2), rnd.uniform(0.5, 4.8),
               rnd.uniform(0.5, 1.3), M_ROCK, scale=(1, 0.8, 0.9))
    # ---- 崖顶建筑群 ----
    for i, (bx, by, bw, bh) in enumerate([(9.5, 3.4, 2.6, 2.6), (12.6, 3.2, 2.2, 3.4), (15.2, 3.6, 2.8, 2.2), (18.2, 3.4, 2.4, 2.9)]):
        box(f"hb{i}", bx, by, 5.5, bx + bw, by + 2.2, 5.5 + bh, M_BLD)
        for wx in range(int(bw * 3)):
            for wy in range(int(bh * 2)):
                if rnd.random() < 0.42:
                    box(f"hw{i}{wx}{wy}", bx + 0.15 + wx * 0.33, by + 2.14, 5.7 + wy * 0.42,
                        bx + 0.32 + wx * 0.33, by + 2.2, 5.95 + wy * 0.42, M_WARM)
    # 远处高楼剪影
    for i in range(6):
        box(f"tb{i}", -11 - i * 1.6, 5.8, 5.5, -11.9 - i * 1.6, 6.4, 5.5 + rnd.uniform(2.5, 4.5), M_DARK)

    # ---- 灯塔（崖顶右侧）----
    LX, LY, LZ = -7.8, 1.2, 5.3
    cyl("lh_body", LX, LY, LZ + 4.2, 0.75, 8.4, M_LH)
    cyl("lh_b1", LX, LY, LZ + 0.4, 1.0, 0.8, M_LH)
    cyl("lh_gal", LX, LY, LZ + 8.5, 1.05, 0.18, M_DARK)
    cyl("lh_lamp", LX, LY, LZ + 9.2, 0.62, 1.1, M_DARK)
    sphere("lh_bulb", LX, LY, LZ + 9.2, 0.34, M_LAMP)
    cyl("lh_cap", LX, LY, LZ + 9.9, 0.85, 0.3, M_DARK)
    sphere("lh_finial", LX, LY, LZ + 10.2, 0.12, M_DARK)

    # ---- 石阶（崖前蜿蜒而下）----
    for i in range(12):
        sx = -10.5 + i * 0.42
        sz = 5.2 - i * 0.38
        sy = -2.2 - i * 0.22
        box(f"step{i}", sx, sy - 0.7, sz, sx + 1.5, sy + 0.7, sz + 0.22, M_HILL)
    # ---- 石阶灯柱（暖光）----
    for i, (lx, ly, lz) in enumerate([(-9.9, -2.0, 4.4), (-9.1, -2.6, 3.6), (-8.2, -3.1, 2.9), (-7.4, -3.5, 2.2), (-6.7, -3.8, 1.5)]):
        cyl(f"lpole{i}", lx, ly, lz + 0.55, 0.05, 1.1, M_DARK)
        box(f"llant{i}", lx - 0.11, ly - 0.11, lz + 0.85, lx + 0.11, ly + 0.11, lz + 1.25, M_WARM)
        pt_light(f"lpl{i}", lx, ly, lz + 1.05, 26, (1.0, 0.72, 0.4), 0.4)

    # ---- 前景礁石 ----
    rnd2 = random.Random(27)
    for i in range(16):
        rx = rnd2.uniform(-8, 14); ry = rnd2.uniform(-7, 0); rr = rnd2.uniform(0.5, 1.7)
        sphere(f"rock{i}", rx, ry, rr * 0.25, rr, M_ROCK, scale=(rnd2.uniform(1.1, 1.7), 1, rnd2.uniform(0.5, 0.8)))

    # ---- 七帆灯标 + 纸船 ----
    seven = [(0.45, 0.6, 1.0), (0.42, 0.5, 0.95), (0.62, 0.66, 0.82), (0.85, 0.88, 0.95),
             (0.68, 0.72, 0.96), (0.98, 0.6, 0.38), (0.44, 0.72, 0.9)]
    for i, col in enumerate(seven):
        lx = 5.5 - i * 2.1 + random.uniform(-0.3, 0.3)
        ly = -14 + i * 1.35
        sphere(f"sail{i}", lx, ly, 0.3, 0.2, mat_emit(f"sailm{i}", col, 7))
        box(f"sailref{i}", lx - 0.5, ly - 2.4, -0.005, lx + 0.5, ly - 0.5, 0.01, mat_emit(f"refm{i}", col, 0.8))
        pt_light(f"sailpt{i}", lx, ly, 0.5, 5, col, 0.5)
    # 纸船（小白楔形）
    for i in range(9):
        bx = rnd2.uniform(-16, 2); by = rnd2.uniform(-12, -2)
        bpy.ops.mesh.primitive_cube_add(location=(bx, by, 0.06))
        boat = bpy.context.active_object; boat.name = f"boat{i}"; boat.scale = (0.22, 0.14, 0.05)
        link_to(boat, mat_emit("btm", (0.75, 0.8, 0.88), 0.5))

    # ---- 灯光 ----
    area_light("skyfill", (0, -20, 18), (0, 0, 2), 25, (0.25, 0.38, 0.62), 14)
    area_light("cityglow", (-8, -18, 3), (0, -5, 1), 18, (1.0, 0.7, 0.4), 8)
    area_light("cliffwarm", (-11, 1.0, 8), (-9, -2, 2), 32, (1.0, 0.68, 0.38), 7)
    sun_light("moonlight", 1.6, (0.5, 0.62, 0.95), (math.radians(-62), math.radians(18), math.radians(-15)))
    world((0.006, 0.01, 0.025), 0.8)
    SC.view_settings.exposure = 0.78
    camera((-2.5, 30.0, 9.8), (-7.0, -16, 6.2), 36, 9.0, 30.0)


# ================= 图鉴 CG 背景 =================
def build_cg_fireworks():
    M_SEA = mat_diffuse("sea",(0.03,0.06,0.12),0.12); M_DARK = mat_diffuse("dk",(0.02,0.02,0.035),0.9)
    box("sea",-30,-30,-0.5,30,10,-0.02,M_SEA)
    box("sky",-30,-34,-2,30,-30,26,mat_sky("sk",(0.07,0.09,0.16),(0.015,0.02,0.05),1.1))
    stars(70,-26,26,-31,8,22,seed=77)
    box("shore",-16,4,-0.4,16,9,0.5,M_DARK)
    for i in range(10):
        sphere(f"ppl{i}",-9+i*2,5.6,0.75,0.28,M_DARK,scale=(0.7,0.5,1))
    box("glade",6.0,2.0,0.0,8.0,10,0.015,mat_emit("gl",(0.5,0.6,0.85),0.3))
    world((0.01,0.012,0.025),0.5); SC.view_settings.exposure = 0.42
    camera((0,9.5,3.2),(0,-6,6.0),30,8.0,20.0)

def build_cg_ferris():
    M_WALL = mat_plaster("w",(0.16,0.2,0.3),0.7,5.0,0.05); M_DARK = mat_diffuse("dk",(0.07,0.08,0.11),0.6)
    M_SEAT = mat_diffuse("st",(0.22,0.28,0.4),0.6); M_WIN = mat_emit("wn",(0.9,0.94,1.0),0.9)
    W, D, H = 6.0, 5.0, 4.0
    box("fl",-W/2,-D/2,-0.05,W/2,D/2,0,M_DARK)
    box("ceil",-W/2,-D/2,H,W/2,D/2,H+0.05,M_DARK)
    box("lw",-W/2,-D/2,0,-W/2+0.06,D,H,M_WALL); box("rw",W/2-0.06,-D/2,0,W/2,D,H,M_WALL)
    box("bw",-W/2,D-0.06,0,W/2,D,H,M_WALL)
    box("fw1",-W/2,-D/2,0,-W/2+0.06,D,H,M_WALL)
    # 大窗（正面挖空：左右上梁）
    box("fL",-W/2,-D/2+0.02,0,-W/2+0.3,D-0.06,H,M_WALL)
    box("fR",W/2-0.3,-D/2+0.02,0,W/2,D,H,M_WALL)
    box("fT",-W/2+0.3,-D/2+0.02,H-0.5,W/2-0.3,D-0.06,H,M_WALL)
    box("fB",-W/2+0.3,-D/2+0.02,0.55,W/2-0.3,D-0.06,0.62,M_WALL)
    box("mullX",-0.06,-D/2+0.03,0.62,0.06,D-0.06,H-0.5,M_DARK)
    # 窗外夜景：城市+远处摩天轮灯
    box("night",-14,-D/2-0.2,0,14,-D/2-0.1,14,mat_sky("ng",(0.05,0.09,0.18),(0.015,0.03,0.07),1.1))
    rnd = random.Random(4)
    for i in range(9):
        bx = -9 + i*2.1; bh = rnd.uniform(1.5,4.5)
        box(f"cb{i}",bx,-D/2-0.18,0,bx+1.4,-D/2-0.12,bh,M_DARK)
        for wx in range(int(bh*2)):
            if rnd.random()<0.3:
                box(f"cw{i}{wx}",bx+rnd.uniform(0.05,0.9),-D/2-0.19,rnd.uniform(0.3,bh-0.2),bx+rnd.uniform(1.0,1.3),-D/2-0.18,rnd.uniform(0.35,bh-0.1),M_WIN)
    for i in range(16):
        a = i/16*math.pi*2
        sphere(f"fl{i}",-3.2+math.cos(a)*2.0,-D/2-0.15,3.0+math.sin(a)*2.0,0.09,mat_emit("flm",(1.0,0.78,0.42),5))
    box("seatL",-1.7,-1.3,0,-0.3,-0.4,0.5,M_SEAT)
    box("seatR",0.3,-1.3,0,1.7,-0.4,0.5,M_SEAT)
    area_light("cool",(0,3.2,3.2),(0,-1,1.2),14,(0.7,0.8,1.0),4)
    world((0.01,0.015,0.03),0.5); SC.view_settings.exposure = 0.5
    camera((0,-1.9,1.55),(0,3.5,1.9),32,6.0,6.0)

def build_cg_piano():
    M_FLOOR = mat_wood("f",(0.34,0.22,0.12),(0.2,0.12,0.06),0.4,1.2,1.0)
    M_DARK = mat_diffuse("dk",(0.07,0.08,0.1),0.5); M_WALL = mat_plaster("w",(0.36,0.34,0.42),0.85,6.0,0.05)
    W, D, H = 9.0, 7.0, 3.0
    box("fl",-W/2,-D/2,-0.05,W/2,D/2,0,M_FLOOR)
    box("ce",-W/2,-D/2,H,W/2,D/2,H+0.05,M_WALL)
    box("bw",-W/2,D-0.05,0,W/2,D,H,M_WALL); box("lw",-W/2,-D,0,-W/2+0.05,D,H,M_WALL)
    box("rw",W/2-0.05,-D,0,W/2,D,H,M_WALL); box("fw",-W/2,-D,0,W/2,-D+0.05,H,M_WALL)
    box("pbody",-1.3,0.7,0.55,1.4,2.4,1.0,M_DARK)
    box("plid",-1.3,0.7,1.0,1.4,2.4,1.04,M_DARK)
    box("pkey",-1.3,0.62,0.72,1.4,1.0,0.82,mat_diffuse("wk",(0.85,0.84,0.8),0.4))
    for i in range(13):
        box(f"bk{i}",-1.24+i*0.19,0.64,0.82,-1.15+i*0.19,0.94,0.86,M_DARK)
    box("bench",-0.55,0.0,0.42,0.55,0.5,0.5,M_DARK)
    # 大窗与月光
    bpy.ops.mesh.primitive_plane_add(size=1,location=(2.8,-D/2+0.03,1.6),rotation=(-math.pi/2,0,0))
    g = bpy.context.active_object; g.scale=(1.7,0.95,1); link_to(g, mat_emit("wn",(0.75,0.82,1.0),1.6))
    box("wf",1.0,-D/2+0.01,0.6,4.6,-D/2+0.06,2.6,M_DARK)
    sun_light("moon",2.6,(0.6,0.72,1.0),(math.radians(-38),math.radians(24),0))
    area_light("fill",(0,1.0,2.6),(0,0,0.6),12,(0.5,0.6,0.9),5)
    world((0.02,0.025,0.05),0.6); SC.view_settings.exposure = 0.78
    camera((-3.4,-2.2,1.6),(0.8,1.6,1.0),32,4.0,4.5)

def build_cg_whale():
    box("water",-20,-10,-14,20,10,10,mat_diffuse("wt",(0.015,0.06,0.12),0.3))
    # 光柱
    for i in range(5):
        x = -8+i*4
        bpy.ops.mesh.primitive_cone_add(radius1=3.2, radius2=0.4, depth=16,
            location=(x,0,2), rotation=(0.12*math.sin(i*2),0,0))
        cone = bpy.context.active_object; cone.name=f"ray{i}"
        link_to(cone, mat_emit("raym",(0.35,0.6,0.85),0.5))
    sphere("whale",-2,-3,-1,1.6,mat_diffuse("wh",(0.06,0.16,0.28),0.6),scale=(2.0,0.9,0.7))
    world((0.005,0.02,0.05),1.0); SC.view_settings.exposure = 0.9
    camera((0,-9,0.5),(0,2,-0.5),32,8.0,20.0)

def build_cg_tide():
    M_SAND = mat_diffuse("sd",(0.08,0.1,0.13),0.25); M_SEA = mat_diffuse("sea",(0.03,0.08,0.15),0.15)
    box("sand",-16,-6,-0.2,16,8,0,M_SAND)
    box("sea",-30,-30,-0.4,30,0.2,-0.02,M_SEA)
    box("sky",-30,-34,-2,30,-30,24,mat_sky("sk",(0.05,0.08,0.15),(0.01,0.02,0.05),1.1))
    disc("moon",5,-30,9,1.8,mat_emit("mn",(0.92,0.95,1.0),7))
    stars(70,-26,26,-31,6,20,seed=91)
    box("tideglow",-14,2.5,0.0,14,3.4,0.02,mat_emit("tg",(0.35,0.75,0.95),1.4))
    area_light("moonl",(3,-8,7),(0,3,0),40,(0.6,0.75,1.0),7)
    world((0.01,0.015,0.035),0.6); SC.view_settings.exposure = 0.6
    camera((0,5.6,1.7),(0,-8,1.0),30,6.0,12.0)

def build_cg_star():
    M_HILL = mat_diffuse("h",(0.02,0.03,0.045),0.9)
    box("sky",-30,-34,-2,30,-30,28,mat_sky("sk",(0.05,0.08,0.16),(0.008,0.015,0.04),1.2))
    stars(150,-26,26,-31,4,24,seed=55)
    box("hill",-20,4,-1,20,10,1.4,M_HILL)
    box("hill2",-14,2,-0.5,14,6,0.8,M_HILL)
    world((0.006,0.01,0.025),0.7); SC.view_settings.exposure = 0.85
    camera((0,7.5,1.8),(0,-10,6.5),30,8.0,20.0)

SCENES["cg_fireworks"] = build_cg_fireworks
SCENES["cg_ferris"] = build_cg_ferris
SCENES["cg_piano"] = build_cg_piano
SCENES["cg_whale"] = build_cg_whale
SCENES["cg_tide"] = build_cg_tide
SCENES["cg_star"] = build_cg_star
SCENES["title"] = build_title




# ================= 追加场景（恢复） =================
def tree(name, x, y, s, trunk_m, leaf_m):
    cyl(f"{name}_tr", x, y, 0.7*s, 0.09*s, 1.4*s, trunk_m)
    rnd = random.Random(int(x*7+y*13))
    for i in range(4):
        sphere(f"{name}_l{i}", x+rnd.uniform(-0.5,0.5)*s, y+rnd.uniform(-0.4,0.4)*s,
               1.5*s+rnd.uniform(-0.2,0.5)*s, 0.55*s, leaf_m, scale=(1,1,0.85))

def build_school_gate():
    M_PATH = mat_diffuse("pa",(0.6,0.58,0.52),0.8); M_BRICK = mat_diffuse("br",(0.62,0.42,0.3),0.7)
    M_SKY = mat_sky("sk",(0.85,0.9,0.95),(0.4,0.65,0.92),1.2)
    M_GRASS = mat_diffuse("gr",(0.4,0.55,0.3),0.85); M_BLD = mat_diffuse("bl",(0.8,0.77,0.68),0.8)
    M_DARK = mat_diffuse("dk",(0.15,0.15,0.16),0.6); M_SIGN = mat_diffuse("sg",(0.28,0.42,0.6),0.5)
    M_PINK = mat_diffuse("pk",(0.95,0.78,0.86),0.8)
    box("gnd",-10,-6,-0.1,10,10,0,M_GRASS)
    box("path",-1.6,-6,0.001,1.6,4,0.01,M_PATH)
    box("sky",-20,6,-2,20,10,20,M_SKY)
    box("bld",-7,5,0,7,7.5,4.2,M_BLD)
    rnd = random.Random(6)
    for i in range(10):
        box(f"bw{i}",-6.4+i*1.3,4.97,1.2,-5.6+i*1.3,5.0,2.6,mat_emit("bwm",(0.55,0.7,0.85),0.35))
    for gx in (-2.1,2.1):
        cyl("post",gx,2.6,1.4,0.28,2.8,M_BRICK)
        box("cap",gx-0.36,2.24,2.8,gx+0.36,2.96,3.0,M_DARK)
    box("archbar",-2.4,2.3,2.95,2.4,2.88,3.4,M_DARK)
    for i in range(9):
        cyl("fence",-1.4+i*0.35,2.7,0.5,0.025,1.0,M_DARK)
        cyl("fence2",1.05+i*0.35,2.7,0.5,0.025,1.0,M_DARK)
    box("frail",-1.55,2.7,0.95,1.4,2.76,1.0,M_DARK)
    box("frail2",0.9,2.7,0.95,3.9,2.76,1.0,M_DARK)
    tree("sak1",-4.2,1.2,1.6,M_DARK,M_PINK)
    tree("sak2",4.2,1.0,1.8,M_DARK,M_PINK)
    tree("sak3",-6.0,3.0,1.2,M_DARK,M_PINK)
    sun_light("sun",3.8,(1.0,0.96,0.88),(math.radians(-48),math.radians(-18),0))
    world((0.4,0.55,0.75),0.6)
    SC.view_settings.exposure = 0.36
    camera((0,-3.6,1.5),(0,3,1.6),30,5.0,7.0)

def build_corridor():
    M_FLOOR = mat_wood("f",(0.56,0.46,0.34),(0.38,0.3,0.22),0.4,1.2,1.0); M_WALL = mat_plaster("w",(0.85,0.83,0.76),0.85)
    M_CEIL = mat_diffuse("c",(0.92,0.9,0.86),0.9); M_DARK = mat_diffuse("dk",(0.2,0.18,0.16),0.7)
    M_DOOR = mat_diffuse("dr",(0.55,0.38,0.24),0.55)
    L, Wd, H = 16.0, 3.0, 2.9
    box("fl",-L/2,-Wd/2,-0.05,L/2,Wd/2,0,M_FLOOR)
    box("ce",-L/2,-Wd/2,H,L/2,Wd/2,H+0.05,M_CEIL)
    box("wl",-L/2,-Wd/2,0,-L/2+0.05,Wd/2,H,M_WALL)
    box("wr",L/2-0.05,-Wd/2,0,L/2,Wd/2,H,M_WALL)
    box("wend",-L/2-0.02,-Wd/2,0,-L/2,Wd/2,H,M_WALL)
    box("wstart",L/2,-Wd/2,0,L/2+0.02,Wd/2,H,M_WALL)
    M_SKY = mat_emit("sk",(0.8,0.9,1.0),2.6)
    for i in range(4):
        wx = -6 + i*4
        bpy.ops.mesh.primitive_plane_add(size=1,location=(wx,Wd/2-0.02,1.5),rotation=(0,math.pi/2,0))
        g = bpy.context.active_object; g.scale=(0.85,0.8,1); link_to(g,M_SKY)
        box(f"wf{i}",wx-0.95,Wd/2-0.07,0.65,wx+0.95,Wd/2-0.02,2.35,M_DARK)
        box(f"wm{i}",wx-0.05,Wd/2-0.06,0.65,wx+0.05,Wd/2-0.03,2.35,M_DARK)
        area_light(f"wl{i}",(wx,Wd/2+0.3,1.5),(wx,-Wd/2,0.9),20,(0.85,0.9,1.0),2.0)
    for i in range(3):
        dx = -5.5 + i*5
        box(f"door{i}",dx,-Wd/2+0.02,0,dx+1.0,-Wd/2+0.06,2.1,M_DOOR)
    for i in range(3):
        box(f"cl{i}",-6.5+i*4.5,-Wd/2+0.03,2.3,-5.5+i*4.5,-Wd/2+0.05,2.55,M_DARK)
    for i in range(4):
        box(f"clight{i}",-6+i*4,-0.25,H-0.06,-4.4+i*4,0.25,H-0.02,mat_emit("clm",(1.0,0.95,0.85),2.4))
    world((0.25,0.28,0.32),0.5)
    SC.view_settings.exposure = 0.4
    camera((L/2-1.2,-0.55,1.5),(-L/2,0.3,1.35),32,5.0,8.0)

def build_music_room():
    M_FLOOR = mat_wood("f",(0.52,0.35,0.19),(0.32,0.2,0.1),0.35,1.1,1.0); M_WALL = mat_plaster("w",(0.84,0.78,0.64),0.88,7.0,0.05)
    M_DARK = mat_diffuse("dk",(0.08,0.08,0.1),0.5); M_WHITE = mat_diffuse("wh",(0.9,0.88,0.82),0.4)
    W, D, H = 9.0, 7.0, 3.0
    box("fl",-W/2,-D/2,-0.05,W/2,D/2,0,M_FLOOR)
    for i in range(-4,5): box(f"pk{i}",-W/2,i*0.8-0.008,0.001,W/2,i*0.8+0.008,0.004,M_DARK)
    box("ce",-W/2,-D/2,H,W/2,D/2,H+0.05,M_WALL)
    box("bw",-W/2,D-0.05,0,W/2,D,H,M_WALL); box("lw",-W/2,-D,0,-W/2+0.05,D,H,M_WALL)
    box("rw",W/2-0.05,-D,0,W/2,D,H,M_WALL); box("fw",-W/2,-D,0,W/2,-D+0.05,H,M_WALL)
    box("pbody",-1.2,0.6,0.55,1.5,2.3,1.0,M_DARK)
    box("plid",-1.2,0.6,1.0,1.5,2.3,1.04,M_DARK)
    box("pkey",-1.2,0.55,0.72,1.5,0.95,0.82,M_WHITE)
    for i in range(14):
        box(f"bk{i}",-1.16+i*0.19,0.62,0.82,-1.06+i*0.19,0.92,0.86,M_DARK)
    cyl("pl1",-1.05,0.75,0.28,0.04,0.55,M_DARK); cyl("pr1",1.35,0.75,0.28,0.04,0.55,M_DARK)
    box("bench",-0.5,0.05,0.42,0.5,0.5,0.5,M_DARK)
    M_SKY = mat_emit("sk",(0.95,0.6,0.35),2.8)
    for i in range(2):
        wx = -2.6 + i*4.4
        bpy.ops.mesh.primitive_plane_add(size=1,location=(wx,-D/2+0.03,1.55),rotation=(-math.pi/2,0,0))
        g = bpy.context.active_object; g.scale=(1.5,0.85,1); link_to(g,M_SKY)
        box(f"wf{i}",wx-1.55,-D/2+0.01,0.7,wx+1.55,-D/2+0.06,2.4,M_DARK)
    sun_light("sun",4.5,(1.0,0.6,0.3),(math.radians(-35),math.radians(20),0))
    box("chair",-2.0,-1.4,0,-1.4,-0.8,0.85,M_DARK)
    box("stand",2.2,-1.0,0,2.5,-0.7,1.2,M_DARK)
    area_light("warm",(0,-0.5,2.6),(0,1.5,0.8),30,(1.0,0.7,0.45),5)
    world((0.15,0.1,0.08),0.6)
    SC.view_settings.exposure = 0.42
    camera((3.2,-2.4,1.55),(0,2,1.1),30,4.0,4.0)

def build_courtyard():
    M_GRASS = mat_diffuse("g",(0.35,0.5,0.25),0.85); M_PATH = mat_diffuse("pa",(0.7,0.66,0.55),0.85)
    M_BLD = mat_diffuse("b",(0.8,0.77,0.66),0.8); M_DARK = mat_diffuse("dk",(0.15,0.15,0.16),0.6)
    M_SKY = mat_sky("sk",(0.85,0.9,0.95),(0.35,0.6,0.9),1.15)
    M_LEAF = mat_diffuse("lf",(0.3,0.5,0.22),0.8); M_PINK = mat_diffuse("pk",(0.95,0.78,0.86),0.8)
    box("grass",-11,-7,-0.1,11,7,0,M_GRASS)
    box("pathH",-11,-1.1,0.001,11,1.1,0.01,M_PATH)
    box("pathV",-0.9,-7,0.001,0.9,7,0.01,M_PATH)
    box("sky",-20,8,-2,20,12,20,M_SKY)
    box("bld",-9,5.5,0,9,7.2,4.0,M_BLD)
    for i in range(8):
        box(f"bw{i}",-8.2+i*2.0,5.45,1.1,-7.3+i*2.0,5.5,2.7,mat_emit("bwm",(0.5,0.66,0.82),0.3))
    box("roofline",-9.1,5.4,4.0,9.1,7.3,4.15,M_DARK)
    tree("t1",-7.5,4.8,1.5,M_DARK,M_LEAF)
    tree("t2",-7.0,-3.2,1.4,M_DARK,M_LEAF)
    tree("t3",7.2,4.4,1.2,M_DARK,M_PINK)
    box("bench",-2.8,3.4,0.4,-1.8,3.7,0.46,M_DARK)
    sun_light("sun",3.8,(1.0,0.96,0.88),(math.radians(-50),math.radians(-15),0))
    world((0.4,0.55,0.75),0.6)
    SC.view_settings.exposure = 0.36
    camera((6.8,-5.6,1.9),(-1.0,5,1.3),30,5.0,9.0)

def build_station(rain):
    M_FLOOR = mat_diffuse("f",(0.3,0.31,0.34) if rain else (0.5,0.5,0.5),0.15 if rain else 0.7)
    M_PLAT = mat_diffuse("p",(0.42,0.44,0.47) if rain else (0.62,0.62,0.62),0.5)
    M_DARK = mat_diffuse("dk",(0.06,0.07,0.09),0.7); M_YEL = mat_diffuse("yl",(0.85,0.7,0.2),0.6)
    W, D = 16.0, 9.0
    box("plat",-W/2,-1.2,-0.1,W/2,D,0,M_PLAT)
    box("track",-W/2,-2.6,-0.3,W/2,-1.2,0,M_DARK)
    box("ground2",-W/2,-6,-0.35,W/2,-2.6,-0.25,M_DARK)
    box("yel",-W/2,0.2,0.005,W/2,0.34,0.012,M_YEL)
    M_CANO = mat_diffuse("cn",(0.2,0.22,0.28) if rain else (0.5,0.54,0.6),0.6)
    box("canopy",-W/2,1.6,2.5,W/2,4.0,2.62,M_CANO)
    for i in range(6):
        cyl("cpl",-W/2+1.2+i*2.8,2.8,1.25,0.06,2.5,M_DARK)
    box("train",-W/2+0.5,-2.35,0.1,W/2-2.0,-1.35,1.7,M_DARK)
    for i in range(9):
        box(f"tw{i}",-W/2+1.0+i*1.55,-2.38,0.55,-W/2+2.2+i*1.55,-2.32,1.35,
            mat_emit("twm",(0.75,0.85,0.95) if rain else (0.9,0.95,1.0),0.5 if rain else 1.4))
    box("sign",-2.0,3.2,1.7,0.4,3.26,2.15,M_DARK)
    box("signt",-1.85,3.24,1.78,0.55,3.26,2.07,mat_emit("sm",(0.7,0.85,1.0) if rain else (0.9,0.6,0.5),1.6))
    for i in range(4):
        cyl("swl",-W/2+2+i*3.4,0.9,0.85,0.02,2.0,M_DARK)
    if rain:
        world((0.08,0.1,0.15),0.8)
        area_light("plat_l",(0,1.0,2.4),(0,0.5,0.8),95,(0.8,0.86,1.0),7)
        for i in range(5):
            pt_light(f"sl{i}",-6+i*3.0,2.8,2.3,25,(0.85,0.9,1.0),0.25)
        SC.view_settings.exposure = 0.52
    else:
        world((0.45,0.58,0.75),0.7)
        sun_light("sun",3.6,(1.0,0.96,0.9),(math.radians(-55),math.radians(-10),0))
        SC.view_settings.exposure = 0.35
    camera((4.8,5.4,1.55),(-2.0,-1.0,1.1),30,5.0,7.0)
def build_station_rain(): build_station(True)
def build_station_day(): build_station(False)

def build_street(night, rain):
    M_ROAD = mat_diffuse("rd",(0.05,0.05,0.06) if night else (0.3,0.3,0.32),0.1 if rain else 0.6)
    M_BLD = mat_diffuse("b",(0.07,0.08,0.1) if night else (0.55,0.54,0.52),0.8)
    M_DARK = mat_diffuse("dk",(0.04,0.04,0.05),0.8)
    W = 12.0
    box("road",-W,-6,-0.1,W,14,0,M_ROAD)
    if rain:
        for i in range(8):
            box(f"pud{i}",-W+0.5+i*2.8,1.0+i*1.4,0.005,-W+2.2+i*2.8,2.6+i*1.4,0.008,
                mat_emit("pdm",(0.5,0.6,0.8) if night else (0.7,0.75,0.85),0.35 if night else 0.15))
    box("sky",-20,8,-2,20,12,18,mat_sky("sk",(0.06,0.075,0.12) if night else ((0.5,0.42,0.5) if rain else (0.5,0.62,0.85)),(0.01,0.02,0.05) if night else (0.85,0.7,0.75) if rain else (0.7,0.8,0.95),1.1))
    sign_cols = [(1.0,0.35,0.3),(0.4,0.7,1.0),(1.0,0.75,0.3),(0.7,0.5,1.0),(0.4,0.9,0.7)]
    rnd = random.Random(17)
    for side in (-1,1):
        for i in range(5):
            bx = -6 + i*3
            off = side * 5.6
            bh = rnd.uniform(3.4,5.2)
            box(f"b{side}{i}",bx-1.4,off-(1.7 if side<0 else 0),0,bx+1.4,off+(1.7 if side>0 else 0),bh,M_BLD)
            col = sign_cols[(i + (0 if side<0 else 2)) % 5]
            box(f"sg{side}{i}",bx-0.8,off-side*1.55,bh-1.4,bx+0.8,off-side*1.48,bh-0.8,
                mat_emit(f"sm{side}{i}",col,2.6 if night else 0.25))
            box(f"shopg{side}{i}",bx-1.1,off-side*1.45,0.0,bx+1.1,off-side*1.4,2.2,
                mat_emit(f"sgm{side}{i}",(1.0,0.8,0.5),1.2 if night else 0.3))
    if night:
        for lx in [-4,0,4]:
            cyl("lpole",lx,3.2,1.9,0.05,3.8,M_DARK)
            sphere("lbulb",lx,3.2,3.85,0.1,mat_emit("lb",(1.0,0.8,0.5),6))
            pt_light("lpl",lx,3.2,3.7,35,(1.0,0.75,0.45),0.2)
            if rain:
                box(f"lcone{lx}",lx-0.7,3.1,3.7,lx+0.7,3.3,3.95,M_DARK)
    if rain:
        rnd2 = random.Random(3)
        for i in range(50):
            rx = rnd2.uniform(-W, W); ry = rnd2.uniform(-4, 12); rz = rnd2.uniform(0.5, 6)
            box(f"rn{i}",rx,ry,rz,rx+0.015,ry+0.015,rz+0.5,mat_emit("rnm",(0.6,0.7,0.85),0.8 if night else 1.2))
    world((0.01,0.012,0.025) if night else ((0.3,0.26,0.3) if rain else (0.4,0.5,0.7)),0.6)
    SC.view_settings.exposure = 0.36 if night else (0.46 if rain else 0.38)
    camera((0.3,-2.2,1.75),(0.2,9,2.1),30,5.5,10.0)
def build_rain_street(): build_street(True, True)
def build_night_street(): build_street(True, False)

def build_minshuku(outside):
    if outside:
        M_GND = mat_diffuse("g",(0.35,0.32,0.28),0.85); M_WOOD = mat_wood("w",(0.5,0.36,0.22),(0.3,0.2,0.12),0.6)
        M_ROOF = mat_diffuse("rf",(0.2,0.14,0.1),0.75); M_DARK = mat_diffuse("dk",(0.08,0.06,0.05),0.8)
        M_SKY = mat_sky("sk",(0.9,0.6,0.35),(0.3,0.28,0.5),1.2)
        box("gnd",-10,-5,-0.1,10,8,0,M_GND)
        box("sea",-24,-3,-0.4,24,0.5,-0.02,mat_diffuse("sea",(0.1,0.2,0.3),0.25))
        box("sky",-20,-40,-2,20,-36,18,M_SKY)
        disc("sun",-2,-34,2.4,2.2,mat_emit("sn",(1.0,0.65,0.3),8))
        box("house",-3.4,0.5,0.6,3.4,3.6,2.6,M_WOOD)
        box("roof",-3.9,0.1,2.5,3.9,4.0,2.85,M_ROOF)
        box("roof2",-3.6,0.3,2.3,3.6,3.7,2.55,M_ROOF)
        for i in range(4):
            box(f"win{i}",-2.6+i*1.5,0.42,1.0,-1.9+i*1.5,0.48,1.9,mat_emit("wm",(1.0,0.75,0.42),1.6))
        box("deck",-3.0,-0.6,0.05,3.0,0.7,0.35,M_WOOD)
        for i in range(4):
            cyl("dpost",-2.6+i*1.7,-0.35,0.85,0.05,1.05,M_DARK)
        cyl("lant_p",2.9,-0.5,1.7,0.02,0.5,M_DARK)
        sphere("lant",2.9,-0.5,1.95,0.12,mat_emit("lm",(1.0,0.6,0.25),4))
        pt_light("lant_l",2.9,-0.5,1.95,12,(1.0,0.6,0.25),0.15)
        tree("tr1",-6.5,1.5,1.4,M_DARK,mat_diffuse("lf",(0.25,0.35,0.2),0.8))
        area_light("dusk",(0,-2,3.2),(0,2,1.0),30,(1.0,0.55,0.3),6)
        world((0.12,0.08,0.06),0.7)
        SC.view_settings.exposure = 0.38
        camera((0.4,-3.4,1.6),(0.1,2.4,1.6),30,5.0,7.0)
    else:
        M_TATAMI = mat_wood("tt",(0.76,0.66,0.4),(0.62,0.52,0.3),0.75,2.2,0.5); M_WALL = mat_plaster("w",(0.9,0.86,0.75),0.88,7.0,0.045)
        M_DARK = mat_diffuse("dk",(0.25,0.2,0.14),0.7); M_SHOJI = mat_emit("sj",(0.98,0.94,0.82),1.1)
        W, D, H = 8.0, 7.0, 2.9
        box("fl",-W/2,-D/2,-0.05,W/2,D/2,0,M_TATAMI)
        for i in range(4):
            box(f"tline{i}",-W/2,i*D/4-0.01,0.001,W/2,i*D/4+0.01,0.004,M_DARK)
        box("ce",-W/2,-D/2,H,W/2,D/2,H+0.05,M_WALL)
        box("bw",-W/2,D-0.05,0,W/2,D,H,M_WALL)
        box("lw",-W/2,-D,0,-W/2+0.05,D,H,M_WALL); box("rw",W/2-0.05,-D,0,W/2,D,H,M_WALL)
        for i in range(4):
            sx = -3.0 + i*1.6
            box(f"sf{i}",sx,D-0.08,0.1,sx+1.45,D-0.03,2.3,M_DARK)
            bpy.ops.mesh.primitive_plane_add(size=1,location=(sx+0.72,D-0.045,1.2),rotation=(math.pi/2,0,0))
            sp = bpy.context.active_object; sp.scale=(0.66,1.02,1); link_to(sp,M_SHOJI)
        box("table",-1.2,-0.6,0.35,1.2,0.6,0.44,M_DARK)
        box("tleg1",-1.1,-0.52,0,1.05,-0.46,0.35,M_DARK)
        for (cx,cy) in [(-0.6,1.2),(0.6,1.2)]:
            cyl("zabu",cx,cy,0.03,0.28,0.06,mat_diffuse("zu",(0.4,0.45,0.6),0.8))
        box("kettle",-0.25,-0.15,0.44,0.25,0.15,0.56,M_DARK)
        area_light("warm",(0,2.2,2.4),(0,0,0.5),40,(1.0,0.85,0.62),6)
        world((0.2,0.17,0.13),0.6)
        SC.view_settings.exposure = 0.45
        camera((3.0,-2.6,1.5),(-0.6,2.2,0.9),30,4.5,4.0)
def build_minshuku_out(): build_minshuku(True)
def build_minshuku_room(): build_minshuku(False)

def build_park_entrance():
    M_GND = mat_diffuse("g",(0.55,0.53,0.45),0.85); M_SKY = mat_sky("sk",(0.85,0.9,0.95),(0.4,0.65,0.9),1.15)
    M_ARCH = mat_diffuse("ar",(0.85,0.45,0.5),0.5); M_DARK = mat_diffuse("dk",(0.12,0.12,0.14),0.6)
    M_LEAF = mat_diffuse("lf",(0.35,0.55,0.28),0.8); M_BOOTH = mat_diffuse("bo",(0.9,0.88,0.8),0.7)
    box("gnd",-12,-6,-0.1,12,10,0,M_GND)
    box("sky",-20,8,-2,20,12,20,M_SKY)
    for gx in (-2.6,2.6):
        cyl("gpost",gx,2.8,1.5,0.24,3.0,M_ARCH)
    box("garch",-2.85,2.55,2.9,2.85,3.05,3.5,M_ARCH)
    box("gsign",-1.5,2.62,3.0,1.5,2.98,3.4,mat_emit("gm",(1.0,0.6,0.5),1.2))
    CX,CY,CZ,R = 4.5,8.5,4.2,2.6
    for i in range(24):
        a = i/24*math.pi*2
        seg = box(f"fr{i}",0,0,0,0.22,0.07,0.07,M_DARK)
        seg.location = (CX+math.cos(a)*R,CY,CZ+math.sin(a)*R)
        seg.rotation_euler = (0,-a,0)
    for dy in (-0.4,0.4):
        cyl_between("flegL",(CX-0.4,CY+dy,CZ),(CX-1.3,CY+dy,0),0.05,M_DARK)
        cyl_between("flegR",(CX+0.4,CY+dy,CZ),(CX+1.3,CY+dy,0),0.05,M_DARK)
    box("booth",-4.5,3.2,0,-3.4,4.2,1.5,M_BOOTH)
    box("broof",-4.6,3.1,1.5,-3.3,4.3,1.62,M_ARCH)
    for i,(bx,by,col) in enumerate([(-1.0,0.5,(0.9,0.3,0.3)),(-0.5,0.7,(0.3,0.5,0.9)),(-1.4,0.8,(0.95,0.8,0.3))]):
        sphere("bal"+str(i),bx,by,1.9+ i*0.1,0.14,mat_diffuse("bm"+str(i),col,0.4),scale=(1,1,1.15))
        cyl("bst"+str(i),bx,by,1.35,0.004,1.1,M_DARK)
    tree("tr1",-6.5,2.0,1.5,M_DARK,M_LEAF)
    tree("tr2",6.8,1.0,1.3,M_DARK,M_LEAF)
    sun_light("sun",3.8,(1.0,0.96,0.88),(math.radians(-50),math.radians(-20),0))
    world((0.4,0.55,0.75),0.6)
    SC.view_settings.exposure = 0.36
    camera((0,-3.4,1.42),(0.5,6,2.4),30,6.0,9.0)

def build_shopping(daymode):
    M_ROAD = mat_diffuse("rd",(0.4,0.4,0.42) if daymode else (0.08,0.08,0.1),0.6)
    M_BLD = mat_diffuse("b",(0.72,0.7,0.66) if daymode else (0.09,0.1,0.13),0.8)
    M_DARK = mat_diffuse("dk",(0.1,0.1,0.12),0.7)
    M_SKY = mat_sky("sk",(0.85,0.9,0.95) if daymode else (0.5,0.42,0.5),(0.4,0.62,0.9) if daymode else (0.15,0.1,0.25),1.1)
    W = 12.0
    box("road",-W,-6,-0.1,W,14,0,M_ROAD)
    box("sky",-20,8,-2,20,12,18,M_SKY)
    sign_cols = [(0.75,0.3,0.28),(0.35,0.55,0.8),(0.8,0.6,0.28),(0.55,0.42,0.75),(0.35,0.7,0.6)]
    rnd = random.Random(17)
    for side in (-1,1):
        for i in range(5):
            bx = -6 + i*3
            off = side * 4.4
            bh = rnd.uniform(3.2,4.8)
            box(f"b{side}{i}",bx-1.4,off-(1.7 if side<0 else 0),0,bx+1.4,off+(1.7 if side>0 else 0),bh,M_BLD)
            col = sign_cols[(i + (0 if side<0 else 2)) % 5]
            box(f"sg{side}{i}",bx-1.0,off-side*1.72,bh-1.7,bx+1.0,off-side*1.64,bh-1.0,
                mat_diffuse(f"sm{side}{i}",col,0.5) if daymode else mat_emit(f"sme{side}{i}",col,2.4))
            box(f"shopg{side}{i}",bx-1.2,off-side*1.58,0.0,bx+1.2,off-side*1.52,2.3,
                mat_diffuse(f"sgm{side}{i}",(0.85,0.83,0.75),0.6) if daymode else mat_emit(f"sgme{side}{i}",(1.0,0.8,0.5),1.0))
    if not daymode:
        for lx in [-4,0,4]:
            cyl("lpole",lx,3.2,1.9,0.05,3.8,M_DARK)
            sphere("lbulb",lx,3.2,3.85,0.1,mat_emit("lb",(1.0,0.8,0.5),6))
            pt_light("lpl",lx,3.2,3.7,30,(1.0,0.75,0.45),0.2)
        for h in [3.2]:
            for i in range(14):
                lx = -6.5+i*1.0; sag = math.sin((lx+6.5)/13*math.pi)*0.4
                sphere(f"lant{i}",lx,3.4,h-sag,0.1,mat_emit("lantm",(1.0,0.5,0.18),3.5))
        world((0.06,0.05,0.08),0.6); SC.view_settings.exposure = 0.36
    else:
        sun_light("sun",3.8,(1.0,0.96,0.9),(math.radians(-52),math.radians(-15),0))
        world((0.45,0.55,0.7),0.6); SC.view_settings.exposure = 0.36
    camera((0.3,-2.0,1.7),(0.2,9,2.4),30,5.5,10.0)
def build_shopping_day(): build_shopping(True)
def build_shopping_dusk(): build_shopping(False)
SCENES["park_entrance"] = build_park_entrance
SCENES["ferris_day"] = build_ferris_day
SCENES["school_gate"] = build_school_gate
SCENES["corridor"] = build_corridor
SCENES["music_room"] = build_music_room
SCENES["courtyard"] = build_courtyard
SCENES["station_rain"] = build_station_rain
SCENES["station_day"] = build_station_day
SCENES["rain_street"] = build_rain_street
SCENES["night_street"] = build_night_street
SCENES["minshuku_out"] = build_minshuku_out
SCENES["minshuku_room"] = build_minshuku_room
SCENES["shopping_day"] = build_shopping_day
SCENES["shopping_dusk"] = build_shopping_dusk

# ================= 渲染循环 =================
import os, sys
only = None
for i, a in enumerate(sys.argv):
    if a == "--scene": only = sys.argv[i+1]
os.makedirs(OUT_DIR, exist_ok=True)
todo = {k: v for k, v in SCENES.items() if only is None or k == only}
for name, builder in todo.items():
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True)
    SC = bpy.context.scene
    builder()
    setup_render()
    SC.render.filepath = OUT_DIR + name + ".png"
    bpy.ops.render.render(write_still=True)
    print(f"BG_DONE {name} {time.time()-t0:.0f}s", flush=True)
print("ALL_BGS_DONE")
