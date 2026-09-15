"""Original workshop props; Blender 5.x, no downloaded geometry or textures.
Run all: blender -b -t 2 --python workshop/assets/build-props.py
Focused: append -- --only-robot or -- --only-furnishings
"""
import bpy, math, json, sys
from mathutils import Vector, Matrix
from pathlib import Path
OUT=Path(__file__).resolve().parent
ONLY_ROBOT='--only-robot' in sys.argv
ONLY_FURNISHINGS='--only-furnishings' in sys.argv
if ONLY_ROBOT and ONLY_FURNISHINGS:raise ValueError('Choose one focused build flag')
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

def mat(name, color, rough=.65, metal=0):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=rough; p.inputs['Metallic'].default_value=metal
    return m
# Values below are scene-linear, maintaining the ivory/teal/orange family.
ivory=mat('warm ivory shell',(.79,.75,.61)); ceramic=mat('sage ceramic',(.43,.54,.49))
dark=mat('recess graphite',(.014,.033,.037),.58,.32); bronze=mat('satin bronze',(.46,.265,.10),.4,.65)
leather=mat('burnt orange upholstery',(.48,.135,.055),.86); welt=mat('warm raised upholstery welt',(.58,.20,.082),.86)
leafmat=mat('teal leaf',(.046,.16,.13),.83); leaflight=mat('leaf folded light plane',(.072,.22,.17),.84)
soil=mat('dark pot interior',(.027,.038,.027),1)
eye=mat('soft mint lens',(.37,.88,.69),.24)
p=eye.node_tree.nodes.get('Principled BSDF'); p.inputs['Emission Color'].default_value=(.18,.65,.46,1); p.inputs['Emission Strength'].default_value=.4
shell_shadow=mat('ivory lower shell plane',(.58,.60,.49),.71)
panel=mat('deep sage enamel inset',(.13,.255,.22),.58,.08)
lensglass=mat('optical smoked teal glass',(.017,.075,.071),.16,.26)
p=lensglass.node_tree.nodes.get('Principled BSDF');p.inputs['Coat Weight'].default_value=.8;p.inputs['Coat Roughness'].default_value=.12
optical=mat('optical warm silver',(.51,.59,.52),.33,.7)
allroots=[]
def finish(o,name,m,parent=None):
    o.name=name
    if m:o.data.materials.append(m)
    if parent:
        bpy.context.view_layer.update()
        world=o.matrix_world.copy(); o.parent=parent; o.matrix_world=world
    if o.type=='MESH':
        for p in o.data.polygons:p.use_smooth=True
    return o

def empty(name,loc,parent=None):
    o=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(o); o.location=loc
    bpy.context.view_layer.update()
    if parent:
        world=o.matrix_world.copy();o.parent=parent;o.matrix_world=world
    return o

def box(name,loc,dim,m,r=.08,parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=dim
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    b=o.modifiers.new('designed edge radius','BEVEL');b.width=r;b.segments=4
    bpy.ops.object.modifier_apply(modifier=b.name)
    n=o.modifiers.new('weighted planar normals','WEIGHTED_NORMAL');n.keep_sharp=True
    bpy.ops.object.modifier_apply(modifier=n.name)
    return finish(o,name,m,parent)

def uv(name,loc,dim,m,parent=None,segments=32,rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc);o=bpy.context.object;o.scale=dim
    return finish(o,name,m,parent)

def lathe(name,profile,m,parent=None,loc=(0,0,0),segments=48,caps=True):
    verts=[];faces=[]
    for radius,z in profile:
        for i in range(segments):
            a=i*math.tau/segments;verts.append((loc[0]+radius*math.cos(a),loc[1]+radius*math.sin(a),loc[2]+z))
    for j in range(len(profile)-1):
        for i in range(segments):
            a=j*segments+i;b=j*segments+(i+1)%segments;faces.append((a,b,b+segments,a+segments))
    if caps: faces.extend([tuple(reversed(range(segments))),tuple((len(profile)-1)*segments+i for i in range(segments))])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
    return finish(o,name,m,parent)

def curve(name,points,r,m,parent=None,resolution=16):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=resolution;c.bevel_depth=r;c.bevel_resolution=3
    s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type=p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);finish(o,name,m,parent)
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
    return o

def shell(name,points,widths,depths,m,parent):
    verts=[];faces=[];n=24
    for (x,y,z),w,d in zip(points,widths,depths):
        for i in range(n):
            a=i*math.tau/n;verts.append((x+w*math.cos(a),y+d*math.sin(a),z))
    for j in range(len(points)-1):
        for i in range(n):a=j*n+i;b=j*n+(i+1)%n;faces.append((a,b,b+n,a+n))
    faces.extend([tuple(reversed(range(n))),tuple((len(points)-1)*n+i for i in range(n))])
    me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o)
    finish(o,name,m,parent);sub=o.modifiers.new('continuous shell curvature','SUBSURF');sub.levels=2
    bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=sub.name)
    return o

robot=empty('robot',(0,0,0));allroots.append(robot)
lathe('weighted base',[(.72,.015),(.85,.03),(.92,.12),(.91,.2),(.78,.28),(.68,.31)],dark,robot)
lathe('ceramic base fairing',[(.70,.27),(.73,.31),(.72,.4),(.58,.46),(.41,.49)],ivory,robot)
lathe('base mint seam',[(.705,.33),(.715,.35),(.705,.37)],eye,robot)
lower=empty('lower_arm',(0,0,.55),robot)
uv('shoulder boot',(0,0,.59),(.29,.26,.25),dark,lower)
shell('lower curved shell',[(.01,0,.67),(.03,0,.71),(.12,.015,.86),(.25,.03,1.4),(.27,0,1.58),(.25,0,1.62)],[.16,.22,.24,.22,.18,.13],[.17,.23,.24,.21,.18,.13],ivory,lower)
lower_shell=bpy.data.objects['lower curved shell'];lower_shell.data.materials.append(panel)
for face in lower_shell.data.polygons:
    center=sum((lower_shell.data.vertices[i].co for i in face.vertices),Vector())/len(face.vertices)
    if center.y>.14 and .85<center.z<1.43:face.material_index=1
# A telescoping actuator has a wider cylinder, a narrower sliding shaft,
# and small spherical attachments; its endpoint meets the elbow housing.
curve('actuator cylinder',[(-.16,-.17,.76),(-.07,-.20,1.02),(.01,-.21,1.27)],.052,bronze,lower)
curve('actuator sliding shaft',[(.008,-.21,1.25),(.061,-.22,1.43),(.125,-.22,1.61)],.027,optical,lower)
uv('actuator lower socket',(-.16,-.17,.76),(.077,.066,.074),dark,lower)
uv('actuator upper socket',(.125,-.22,1.61),(.068,.056,.066),dark,lower)
elbow=empty('elbow',(.25,0,1.78),lower)
# Broad cheeks give the pivot a clear axle. The dark center is recessed,
# not intersected by the spherical boot as in the previous copper disks.
housing=lathe('chamfered elbow motor housing',[(.18,-.282),(.235,-.265),(.266,-.225),(.272,-.17),(.272,.17),(.266,.225),(.235,.265),(.18,.282)],dark,elbow,segments=64)
housing.matrix_world=Matrix.Translation((.25,0,1.78))@Matrix.Rotation(math.pi/2,4,'Y')
for side in [-1,1]:
    x=.25+side*.265
    rotation=Matrix.Rotation(side*math.pi/2,4,'Y')
    def bearing(name,profile,material,caps=True):
        o=lathe(name,profile,material,elbow,segments=56,caps=caps)
        o.matrix_world=Matrix.Translation((x,0,1.78))@rotation
        return o
    bearing('ceramic pivot cheek',[(.192,-.038),(.235,-.018),(.244,.011),(.226,.045),(.18,.061),(.158,.05)],ceramic,False)
    bearing('copper bearing race',[(.170,.039),(.18,.052),(.169,.067),(.132,.067),(.126,.052)],bronze,False)
    bearing('recessed graphite axle face',[(.128,.031),(.128,.049)],dark)
    bearing('satin center axle',[(.067,.039),(.074,.047),(.067,.055)],optical)
shell('upper curved shell',[(.25,0,1.9),(.23,0,1.94),(.12,-.015,2.1),(-.08,-.02,2.39),(-.21,0,2.53),(-.22,0,2.56)],[.13,.20,.23,.23,.17,.12],[.13,.2,.22,.21,.16,.12],ceramic,elbow)
# Distinct cuffs interrupt the shell at real articulation boundaries.
lathe('shoulder articulation collar',[(.25,.67),(.257,.71),(.24,.75)],bronze,lower,loc=(.02,0,0))
lathe('wrist recessed collar',[(.155,2.51),(.178,2.54),(.173,2.60)],bronze,elbow,loc=(-.22,0,0))
curve('lower shell panel seam',[(.205,.13,.80),(.33,.14,1.10),(.40,.12,1.42)],.010,dark,lower)
curve('upper shell pale ridge',[(.37,.09,2.00),(.20,.13,2.26),(-.04,.12,2.46)],.019,ivory,elbow)
head=empty('head',(-.24,0,2.72),elbow)
lathe('neck yaw bearing',[(.13,2.46),(.178,2.48),(.19,2.51),(.19,2.58),(.17,2.62)],dark,head,loc=(-.24,0,0))
lathe('neck fitted copper lip',[(.182,2.515),(.195,2.527),(.195,2.548),(.183,2.56)],bronze,head,loc=(-.24,0,0))
# A softly squared brow, tapering cheeks and a darker lower shell read as
# authored panels at room distance, rather than an unbroken scaled sphere.
cranium=uv('formed ivory brow',(-.24,0,2.86),(.68,.46,.38),ivory,head,segments=64,rings=32)
for v in cranium.data.vertices:
    p=v.co; p.x=math.copysign(abs(p.x)**.81,p.x);p.z=math.copysign(abs(p.z)**.84,p.z)
    if p.z<0:
        p.x*=1+p.z*.10
        # The central underside lifts around the yaw bearing, exposing a
        # fitted socket while the outer jaw and the liked silhouette stay put.
        radial=math.sqrt(p.x*p.x+p.y*p.y)
        p.z+=.29*max(0,1-radial/.65)**2
cranium.data.materials.append(shell_shadow)
for face in cranium.data.polygons:
    if sum(cranium.data.vertices[i].co.z for i in face.vertices)/len(face.vertices)<-.33:face.material_index=1
# A shallow nested bezel with a teal optical face and opaque clearcoat.
# Glass depth is modeled; no transmission sorting dependency is introduced.
uv('visor recessed socket',(-.24,-.39,2.86),(.59,.135,.25),dark,head,segments=64,rings=24)
uv('satin visor perimeter',(-.24,-.435,2.86),(.563,.106,.231),bronze,head,segments=64,rings=24)
uv('curved optical face',(-.24,-.487,2.86),(.534,.073,.209),lensglass,head,segments=64,rings=24)
def oriented_lathe(name,profile,m,loc,parent,axis='face',caps=True):
    o=lathe(name,profile,m,parent,segments=40,caps=caps)
    rotation=Matrix.Rotation(math.pi/2,4,'X' if axis=='face' else 'Y')
    o.matrix_world=Matrix.Translation(loc)@rotation
    return o
for x in [-.46,-.02]:
    # Contrasting socket, metal lip, inset luminous iris and convex central lens.
    oriented_lathe('optical eye well',[(.103,0),(.111,.012),(.108,.037),(.087,.045)],dark,(x,-.539,2.875),head)
    oriented_lathe('eye satin bezel',[(.100,.033),(.102,.041),(.092,.049),(.081,.048)],optical,(x,-.539,2.875),head,caps=False)
    oriented_lathe('mint iris ring',[(.078,.041),(.08,.045),(.071,.05),(.043,.051),(.041,.046)],eye,(x,-.539,2.875),head,caps=False)
    uv('convex pupil lens',(x,-.585,2.875),(.042,.018,.056),lensglass,head)
    uv('optical catchlight',(x-.012,-.601,2.897),(.011,.004,.012),eye,head)
# A side access panel spans a meaningful portion of the cheek.
for side in [-1,1]:
    x=-.24+side*.69
    uv('cheek service panel',(x,.04,2.87),(.035,.19,.15),panel,head)
    o=oriented_lathe('cheek copper bearing rim',[(.094,0),(.1,.008),(.086,.018),(.066,.018)],bronze,(x+side*.04,.025,2.87),head,'side',False)
    if side<0:o.matrix_world=Matrix.Translation((x-.04,.025,2.87))@Matrix.Rotation(-math.pi/2,4,'Y')
# Thin dark seams are actual panel boundaries, kept below the crown surface.
curve('head rear access seam',[(-.81,.18,2.94),(-.62,.31,3.11),(-.24,.35,3.16),(.14,.31,3.10),(.33,.18,2.94)],.009,dark,head)
curve('aerial',[(-.02,.12,3.16),(.025,.14,3.35),(.15,.14,3.46)],.022,bronze,head)
uv('aerial tip',(.15,.14,3.46),(.048,.048,.048),eye,head)

if not ONLY_ROBOT:
    sofa=empty('sofa',(0,0,0));allroots.append(sofa)
    box('floating bronze frame',(0,0,.43),(3.72,1.8,.15),bronze,.055,sofa)
    for x in [-1.59,1.59]:
        for y in [-.64,.64]:
            o=box('tapered foot',(x,y,.22),(.105,.115,.43),dark,.022,sofa);o.rotation_euler.y=-x*.035
    box('upholstered lower shell',(0,0,.64),(3.73,1.82,.32),leather,.13,sofa)
    box('fitted upholstered back support',(0,.80,1.04),(3.53,.17,.78),leather,.07,sofa)
    # Superellipsoid gives inflated cushion centers rather than beveled flat cubes.
    def cushion(name,loc,dim,m,parent,tilt=0):
        def signed(v,e):return math.copysign(abs(v)**e,v)
        verts=[];faces=[];nu=48;nv=24
        for j in range(nv+1):
            v=-math.pi/2+j*math.pi/nv
            for i in range(nu):
                u=i*math.tau/nu
                verts.append((dim[0]/2*signed(math.cos(v),.38)*signed(math.cos(u),.26),dim[1]/2*signed(math.cos(v),.38)*signed(math.sin(u),.26),dim[2]/2*signed(math.sin(v),.38)))
        for j in range(nv):
            for i in range(nu):a=j*nu+i;b=j*nu+(i+1)%nu;faces.append((a,b,b+nu,a+nu))
        me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler.x=tilt;bpy.context.view_layer.update();finish(o,name,m,parent)
        if name=='crowned seat cushion':
            for v in me.vertices:
                if v.co.z>0:
                    v.co.z-=.024*math.exp(-((v.co.x/.5)**2+(v.co.y/.58)**2))*v.co.z/(dim[2]*.5)
        return o
    for x in [-.81,.81]:
        cushion('crowned seat cushion',(x,-.10,.88),(1.57,1.51,.30),leather,sofa)
        cushion('reclined back cushion',(x,.60,1.29),(1.56,.34,.92),leather,sofa,-.13)
        # Welt follows the cushion's own curved face, including its recline.
        back_seam=[]
        for i in range(33):
            a=i*math.tau/32
            xlocal=.95*.78*math.copysign(abs(math.cos(a))**.38,math.cos(a))
            zlocal=.95*.46*math.copysign(abs(math.sin(a))**.38,math.sin(a))
            cv=math.sqrt(max(0,1-(abs(zlocal)/.46)**(2/.38)))
            cu=min(1,(abs(xlocal)/(.78*cv**.38))**(1/.26))
            ylocal=-.17*cv**.38*max(0,1-cu*cu)**(.26/2)-.004
            local=Vector((xlocal,ylocal,zlocal))
            back_seam.append(Matrix.Rotation(-.13,3,'X')@local+Vector((x,.60,1.29)))
        curve('back cushion tailored welt',back_seam,.007,welt,sofa,resolution=3)
        pts=[(x+math.copysign(abs(math.cos(i*math.tau/32))**.26,math.cos(i*math.tau/32))*.788,-.1+math.copysign(abs(math.sin(i*math.tau/32))**.26,math.sin(i*math.tau/32))*.758,.88) for i in range(33)]
        curve('seat stitched welt',pts,.008,welt,sofa,resolution=3)
    for x in [-1.75,1.75]:cushion('soft arm bolster',(x,.01,1.03),(.30,1.76,.60),leather,sofa)

    plant=empty('plant',(0,0,0));allroots.append(plant)
    leafsoft=mat('soft teal leaf plane',(.058,.185,.149),.79)
    midrib=mat('leaf center rib',(.083,.22,.169),.82)
    lathe('ceramic planter',[(.43,.015),(.455,.025),(.47,.05),(.48,.13),(.555,.64),(.59,.80),(.601,.85),(.60,.886),(.584,.910),(.552,.916),(.532,.90),(.526,.87),(.524,.80)],ivory,plant,segments=64)
    lathe('inset planter foot',[(.405,.006),(.433,.013),(.442,.031),(.441,.047)],ceramic,plant,segments=64)
    lathe('pot rim inset',[(.533,.852),(.536,.876),(.532,.892)],bronze,plant,caps=False,segments=64)
    uv('soft soil bed',(0,0,.845),(.524,.524,.038),soil,plant)
    for i in range(13):
        a=i*2.399;h=1.1+.75*((i*7)%13)/12;reach=.46+.23*((i*3)%11)/10
        base=Vector((.13*math.cos(a),.13*math.sin(a),.86));tip=Vector((reach*math.cos(a),reach*math.sin(a),.88+h))
        curve('leaf basal stem',[base,base+Vector((.04*math.cos(a),.04*math.sin(a),.12)),base+Vector((.075*math.cos(a),.075*math.sin(a),.25))],.009,leafmat,plant,resolution=4)
        verts=[];faces=[];steps=28;rib=[]
        for j in range(steps+1):
            t=j/steps
            bow=.16+.07*math.sin(i*1.7)
            center=base+(tip-base)*t+Vector((math.cos(a)*bow*math.sin(t*math.pi),math.sin(a)*bow*math.sin(t*math.pi),.085*math.sin(t*math.pi)))
            width=(.15+.035*math.sin(i*2.1))*math.sin(math.pi*t)**.82
            for k in [-1,-.5,0,.5,1]:
                twist=.26*math.sin(t*math.pi+i*.7)
                side=Vector((-math.sin(a+twist),math.cos(a+twist),0))
                v=center+side*width*k+Vector((0,0,-abs(k)**1.6*width*.28))
                verts.append(v)
            if j%3==0 and .09<t<.9:rib.append(center+Vector((0,0,.006)))
        for j in range(steps):
            for k in range(4):q=j*5+k;faces.append((q,q+1,q+6,q+5))
        me=bpy.data.meshes.new('cupped pointed leaf');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('cupped leaf %02d'%i,me);bpy.context.collection.objects.link(o);finish(o,o.name,leafmat if i%3 else leafsoft,plant);o.data.materials.append(leafsoft)
        for face in me.polygons:
            if face.index%4>=2:face.material_index=1
        mod=o.modifiers.new('leaf thickness','SOLIDIFY');mod.thickness=.004;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        curve('leaf midrib',rib,.004,midrib,plant,resolution=3)

# Robot-only UV bake. Generated coordinates keep the ceramic wash and brushed
# roughness continuous before baking; the resulting atlas follows each part.
def bake_robot_finish(root):
    prefix=root.name
    objects=[o for o in root.children_recursive if o.type=='MESH']
    clones={}
    for o in objects:
        for slot in o.material_slots:
            original=slot.material
            if original not in clones:
                copied=original.copy();copied.name=original.name+' / '+prefix+' finish';clones[original]=copied
            slot.material=clones[original]
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects:o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=math.radians(66),island_margin=.012,area_weight=.2,correct_aspect=True,scale_to_bounds=True)
    bpy.ops.object.mode_set(mode='OBJECT')
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.threads_mode='FIXED';scene.render.threads=2
    scene.render.bake.margin=8
    baked=[]
    for channel,size in [('color',1024),('roughness',1024)]:
        img=bpy.data.images.new(prefix+' painted '+channel,width=size,height=size,alpha=False)
        if channel=='roughness':img.colorspace_settings.name='Non-Color'
        restore=[]
        for m in clones.values():
            nodes=m.node_tree.nodes;links=m.node_tree.links;p=nodes.get('Principled BSDF');out=nodes.get('Material Output')
            restore.append((m,out,out.inputs['Surface'].links[0].from_socket))
            emission=nodes.new('ShaderNodeEmission');links.new(emission.outputs[0],out.inputs['Surface'])
            tex=nodes.new('ShaderNodeTexImage');tex.image=img;nodes.active=tex
            coord=nodes.new('ShaderNodeTexCoord');stretch=nodes.new('ShaderNodeVectorMath');stretch.operation='MULTIPLY'
            is_metal=p.inputs['Metallic'].default_value>.3
            stretch.inputs[1].default_value=(4,24,4) if is_metal else (4,4,4)
            links.new(coord.outputs['Generated'],stretch.inputs[0]);noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=1;noise.inputs['Detail'].default_value=2;links.new(stretch.outputs[0],noise.inputs['Vector'])
            if channel=='color':
                # Low-amplitude paint variation; cavity response is capped at
                # 18 percent so it supports form without dirty black creases.
                base=tuple(p.inputs['Base Color'].default_value)
                ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=tuple(c*.94 for c in base[:3])+(1,);ramp.color_ramp.elements[1].color=tuple(min(1,c*1.045) for c in base[:3])+(1,)
                links.new(noise.outputs['Fac'],ramp.inputs[0])
                ao=nodes.new('ShaderNodeAmbientOcclusion');ao.inputs['Distance'].default_value=.085;ao.samples=16
                cavity=nodes.new('ShaderNodeMapRange');cavity.inputs['From Min'].default_value=0;cavity.inputs['From Max'].default_value=1;cavity.inputs['To Min'].default_value=.82;cavity.inputs['To Max'].default_value=1;links.new(ao.outputs['AO'],cavity.inputs['Value'])
                multiply=nodes.new('ShaderNodeMixRGB');multiply.blend_type='MULTIPLY';multiply.inputs[0].default_value=1;links.new(ramp.outputs['Color'],multiply.inputs[1]);links.new(cavity.outputs[0],multiply.inputs[2]);links.new(multiply.outputs[0],emission.inputs['Color'])
                if is_metal or 'optical' in m.name or 'lens' in m.name:
                    links.remove(emission.inputs['Color'].links[0]);emission.inputs['Color'].default_value=base
            else:
                rough=p.inputs['Roughness'].default_value
                remap=nodes.new('ShaderNodeMapRange');remap.inputs['To Min'].default_value=max(.05,rough-(.045 if is_metal else .055));remap.inputs['To Max'].default_value=min(1,rough+(.045 if is_metal else .055));links.new(noise.outputs['Fac'],remap.inputs['Value']);links.new(remap.outputs[0],emission.inputs['Color'])
        bpy.ops.object.bake(type='EMIT')
        img.filepath_raw=str(OUT/(prefix+'-'+channel+'.png'));img.file_format='PNG';img.save();img.pack();baked.append(img)
        for m,out,socket in restore:m.node_tree.links.new(socket,out.inputs['Surface'])
    for m in clones.values():
        nodes=m.node_tree.nodes;links=m.node_tree.links;p=nodes.get('Principled BSDF')
        color=nodes.new('ShaderNodeTexImage');color.image=baked[0];links.new(color.outputs['Color'],p.inputs['Base Color'])
        rough=nodes.new('ShaderNodeTexImage');rough.image=baked[1];links.new(rough.outputs['Color'],p.inputs['Roughness'])
    return [{'name':img.name,'size':list(img.size)} for img in baked]
# Bake only selected assets; hidden neighbors cannot contaminate contact maps.
if ONLY_FURNISHINGS:allroots=[sofa,plant]
finish_records={}
for target in allroots:
    for o in [robot]+list(robot.children_recursive):o.hide_render=target!=robot
    for other in allroots:
        for o in [other]+list(other.children_recursive):o.hide_render=other!=target
    finish_records[target.name]=bake_robot_finish(target)
for target in allroots:
    for o in [target]+list(target.children_recursive):o.hide_render=False

report=json.loads((OUT/'manifest.json').read_text()) if (ONLY_ROBOT or ONLY_FURNISHINGS) and (OUT/'manifest.json').exists() else {}
for root in allroots:
    bpy.ops.object.select_all(action='DESELECT');objects=[root]+list(root.children_recursive)
    for o in objects:o.select_set(True)
    bpy.context.view_layer.update();lo=Vector((1e9,)*3);hi=Vector((-1e9,)*3);tris=0
    for o in objects:
        if o.type!='MESH':continue
        o.data.calc_loop_triangles();tris+=len(o.data.loop_triangles)
        for corner in o.bound_box:
            p=o.matrix_world@Vector(corner)
            for k in range(3):lo[k]=min(lo[k],p[k]);hi[k]=max(hi[k],p[k])
    bpy.ops.export_scene.gltf(filepath=str(OUT/(root.name+'.glb')),export_format='GLB',use_selection=True,export_yup=True,export_apply=True)
    report[root.name]={'bounds_blender_z_up':[list(lo),list(hi)],'triangles':tris,'objects':len(objects),'nodes':[o.name for o in objects if o.type=='EMPTY'],'file_bytes':(OUT/(root.name+'.glb')).stat().st_size}
for name,textures in finish_records.items():
    report[name]['finish']={'textures':textures,'ao_baked':True,'note':'Original generated material variation and directional roughness in shared UV atlases; contact shading capped at 18 percent; no direct lighting baked.'}
report['finish']={'note':'See each asset finish record for texture dimensions and baked shading details.'}
(OUT/'manifest.json').write_text(json.dumps(report,indent=2))
# One actual geometry render for delivery QA; model placement here is after export.
if not ONLY_ROBOT:
    robot.location.x=-3.1;sofa.location.x=-.6 if ONLY_FURNISHINGS else .5;plant.location.x=2.7 if ONLY_FURNISHINGS else 3.5
bpy.ops.mesh.primitive_plane_add(size=200);ground=bpy.context.object;ground.data.materials.append(mat('preview floor',(.55,.61,.57)))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20;scene.render.threads_mode='FIXED';scene.render.threads=2
scene.world.color=(.32,.38,.40)
for loc,power,size in [((-3,-5,7),1600,5),((4,1,5),1100,4)]:
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(6,-12,7));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,1.3))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=10;scene.camera=cam
if ONLY_ROBOT:
    cam.location=(4,-9,4.3);cam.rotation_euler=(Vector((-.12,0,1.83))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=4.1
if ONLY_FURNISHINGS:
    cam.location=(5,-10,6);cam.rotation_euler=(Vector((.6,0,1.25))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=7.4
scene.render.resolution_x=800 if ONLY_ROBOT else 1100;scene.render.resolution_y=1000 if ONLY_ROBOT else 650;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/('robot-pass4.png' if ONLY_ROBOT else 'furnishings-pass2.png' if ONLY_FURNISHINGS else 'props-preview.png'));bpy.ops.render.render(write_still=True)
if ONLY_ROBOT:
    cam.location=(2.4,-7.5,3.9);cam.rotation_euler=(Vector((-.24,0,2.86))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=1.9
    scene.render.filepath=str(OUT/'robot-pass4-detail.png');bpy.ops.render.render(write_still=True)
    cam.location=(3.0,-5,2.7);cam.rotation_euler=(Vector((.12,0,1.62))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=1.65
    scene.render.filepath=str(OUT/'robot-pass4-joint.png');bpy.ops.render.render(write_still=True)
    if '--compare-with' in sys.argv:
        cam.location=(2.4,-7.5,3.9);cam.rotation_euler=(Vector((-.24,0,2.86))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=1.9
        prior=Path(sys.argv[sys.argv.index('--compare-with')+1])
        for o in [robot]+list(robot.children_recursive):o.hide_render=True
        bpy.ops.import_scene.gltf(filepath=str(prior))
        scene.render.filepath=str(OUT/'robot-pass1-detail.png');bpy.ops.render.render(write_still=True)
        cam.location=(4,-9,4.3);cam.rotation_euler=(Vector((-.12,0,1.83))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=4.1
        scene.render.filepath=str(OUT/'robot-pass1.png');bpy.ops.render.render(write_still=True)
if ONLY_FURNISHINGS:
    for target,aim,scale in [(sofa,Vector((-.6,0,1.04)),4.5),(plant,Vector((2.7,0,1.4)),3.2)]:
        for other in allroots:
            for o in [other]+list(other.children_recursive):o.hide_render=other!=target
        cam.location=aim+Vector((3,-6,3));cam.rotation_euler=(aim-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale
        scene.render.resolution_x=900;scene.render.resolution_y=1000 if target==plant else 700
        scene.render.filepath=str(OUT/(target.name+'-pass2.png'));bpy.ops.render.render(write_still=True)
print('PROP_REPORT '+json.dumps(report))
