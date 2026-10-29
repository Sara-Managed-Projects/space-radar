# No bpy.ops: read evaluated meshes straight into numpy, per part group; write raw arrays + materials json.
import bpy, sys, os, json, numpy as np, mathutils
SRC, OUT = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.open_mainfile(filepath=SRC)
dg = bpy.context.evaluated_depsgraph_get()
objs = list(bpy.data.objects); byname = {o.name: o for o in objs}
kids = {}
for o in objs: kids.setdefault(o.parent.name if o.parent else None, []).append(o)
def sub(root):
    out = []
    def walk(o):
        out.append(o)
        for c in kids.get(o.name, []): walk(c)
    walk(byname[root]); return out
def meshes(lst, skip=()):
    sk = set(o.name for s in skip for o in sub(s))
    return [o for o in lst if o.type == 'MESH' and o.name not in sk and len(o.data.polygons) > 0]
G = {
 'srb-right': meshes(sub('Dummy_SRB0')), 'srb-left': meshes(sub('Dummy_SRB_')),
 'core-stage': meshes(sub('Dummy_Core')), 'core-engines': meshes(sub('Dummy_Engs')),
 'lvsa': meshes(sub('Dummy_LVSA'), skip=['Dummy_ICPS']),
 'icps': meshes(sub('ICPS_2015_')) + meshes(sub('Dummy_ICPS')) + meshes(sub('Dummy_MPCV')),
 'las': meshes(sub('LAS_&_Abor')) + meshes(sub('Ogive_Orio')) + meshes(sub('Dummy_Orio')),
 'fairing-a': meshes(sub('Dummy_ESM0')), 'fairing-b': meshes(sub('Dummy_ESM1')), 'fairing-c': meshes(sub('Dummy_ESM2')),
 'hatchbox': meshes(sub('Dummy_NewS')) + meshes(sub('Panel_camp')),
}
def mat_rgb(m):
    if m is None: return [0.5, 0.5, 0.5]
    if m.use_nodes and m.node_tree:
        for n in m.node_tree.nodes:
            if n.type == 'BSDF_PRINCIPLED':
                bc = n.inputs['Base Color']
                if bc.is_linked and bc.links[0].from_node.type == 'MIX_RGB':
                    c1 = bc.links[0].from_node.inputs['Color1'].default_value
                    return [float(c1[0]) * 0.8, float(c1[1]) * 0.8, float(c1[2]) * 0.8]
                v = bc.default_value; return [float(v[0]), float(v[1]), float(v[2])]
    return [float(m.diffuse_color[0]), float(m.diffuse_color[1]), float(m.diffuse_color[2])]
MIN_FRAC = float(os.environ.get('MINFRAC', '0.0025'))
only = os.environ.get('ONLY')
for name, lst in G.items():
    if only and name not in only.split(','): continue
    # group diagonal from bound boxes
    lo = np.array([1e9]*3); hi = np.array([-1e9]*3)
    for o in lst:
        w = np.array([(o.matrix_world @ mathutils.Vector(c))[:] for c in o.bound_box]); lo = np.minimum(lo, w.min(0)); hi = np.maximum(hi, w.max(0))
    diag = float(np.linalg.norm(hi - lo)); Ps = []; Ts = []; Ms = []; mats = {}; base = 0; kept = 0; dropped = 0
    for o in lst:
        w = np.array([(o.matrix_world @ mathutils.Vector(c))[:] for c in o.bound_box]); od = float(np.linalg.norm(w.max(0) - w.min(0)))
        if od < MIN_FRAC * diag: dropped += 1; continue
        eo = o.evaluated_get(dg); me = eo.to_mesh(); me.calc_loop_triangles()
        nv = len(me.vertices); nt = len(me.loop_triangles)
        if nt == 0: eo.to_mesh_clear(); continue
        co = np.empty(nv * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
        tv = np.empty(nt * 3, np.int32); me.loop_triangles.foreach_get('vertices', tv); tv = tv.reshape(-1, 3)
        mi = np.empty(nt, np.int32); me.loop_triangles.foreach_get('material_index', mi)
        M = np.array(o.matrix_world, dtype=np.float64); wco = co @ M[:3, :3].T + M[:3, 3]
        if np.linalg.det(M[:3, :3]) < 0: tv = tv[:, ::-1]   # mirrored object: keep outward winding
        yup = np.stack([wco[:, 0], wco[:, 2], -wco[:, 1]], 1).astype(np.float32)
        slots = [s.material for s in o.material_slots]
        gid = []
        for s in slots:
            key = s.name if s else '_none'
            if key not in mats: mats[key] = {'idx': len(mats), 'rgb': mat_rgb(s)}
            gid.append(mats[key]['idx'])
        if not gid: key = '_none'; mats.setdefault(key, {'idx': len(mats), 'rgb': [0.5]*3}); gid = [mats[key]['idx']]
        gid = np.array(gid, np.int32); mi = gid[np.clip(mi, 0, len(gid) - 1)]
        Ps.append(yup); Ts.append(tv + base); Ms.append(mi); base += nv; kept += nt; eo.to_mesh_clear()
    P = np.concatenate(Ps); T = np.concatenate(Ts).astype(np.uint32); M = np.concatenate(Ms).astype(np.uint16)
    P.tofile(f'{OUT}/{name}.P.f32'); T.tofile(f'{OUT}/{name}.T.u32'); M.tofile(f'{OUT}/{name}.M.u16')
    json.dump({'mats': [{'name': k, 'rgb': v['rgb'], 'idx': v['idx']} for k, v in mats.items()], 'nv': int(len(P)), 'nt': int(len(T))}, open(f'{OUT}/{name}.json', 'w'))
    print('EXTRACTED', name, 'objects', len(lst), 'dropped small', dropped, 'tris', kept, 'verts', len(P), 'mats', len(mats), flush=True)
