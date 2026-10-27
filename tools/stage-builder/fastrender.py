"""A quick picture of an exported json (the groups lib.Model.export writes): painter's algorithm with PIL polygons, the
app's three-step toon ramp, flat per-face shading. Far faster than lib.render under load; good enough for silhouette,
colour and part placement. python3 fastrender.py in.json out.png [az,el ...] [--size N] [--title T]"""
import json, math, sys
import numpy as np
from PIL import Image, ImageDraw

def hexrgb(h): return np.array([int(h[i:i+2],16)/255 for i in (1,3,5)])

def load(path):
    d = json.load(open(path))
    tris = []   # (role, rgb, P(3,3))
    for g in d['groups']:
        P = np.array(g['positions']); I = np.array(g['indices']).reshape(-1,3)
        tris.append((g['role'], hexrgb(g['colour']), P[I]))
    return tris

def render(tris, views, size=460, ss=2, title=None, light=(0.5,0.8,0.35)):
    allp = np.vstack([t[2].reshape(-1,3) for t in tris]); lo, hi = allp.min(0), allp.max(0)
    centre = (lo+hi)/2; radius = np.linalg.norm(hi-lo)/2
    L = np.array(light)/np.linalg.norm(light)
    S = size*ss; tiles = []
    for az, el in views:
        a, e = math.radians(az), math.radians(el)
        eye = np.array([math.sin(a)*math.cos(e), math.sin(e), math.cos(a)*math.cos(e)])
        fwd = -eye; right = np.cross(fwd,[0,1,0]); right/=np.linalg.norm(right); up = np.cross(right,fwd)
        sc = S*0.46/radius
        items = []
        for role, rgb, T in tris:
            P = T - centre
            x = P@right*sc + S/2; y = S/2 - P@up*sc; z = P@fwd
            n = np.cross(T[:,1]-T[:,0], T[:,2]-T[:,0]); ln = np.linalg.norm(n,axis=1)+1e-12; n/=ln[:,None]
            facing = n@eye
            d = n@L
            for k in np.nonzero(facing>0)[0]:
                step = 1.0 if d[k]>0.55 else 0.78 if d[k]>0.15 else 0.5 if d[k]>-0.2 else 0.36
                spec = 0.0
                if role in ('foil','solar-panel'):
                    h = L+eye; h/=np.linalg.norm(h); spec = 0.25*max(0.0,float(n[k]@h))**12
                col = np.clip(rgb*step+spec,0,1)
                items.append((z[k].mean(), [(x[k,i],y[k,i]) for i in range(3)], tuple(int(c*255) for c in col)))
        items.sort(key=lambda t: -t[0])
        im = Image.new('RGB',(S,S),(14,16,22)); dr = ImageDraw.Draw(im)
        for _, poly, col in items: dr.polygon(poly, fill=col)
        im = im.resize((size,size), Image.LANCZOS)
        ImageDraw.Draw(im).text((6,6),'az %d el %d'%(az,el),fill=(200,200,200))
        tiles.append(im)
    cols = min(3,len(tiles)); rows = (len(tiles)+cols-1)//cols; top = 24 if title else 0
    sheet = Image.new('RGB',(cols*size, rows*size+top),(14,16,22))
    for k,im in enumerate(tiles): sheet.paste(im,((k%cols)*size,(k//cols)*size+top))
    if title: ImageDraw.Draw(sheet).text((8,6),title,fill=(230,230,230))
    return sheet

if __name__ == '__main__':
    argv = sys.argv[1:]; opts = {}; pos = []
    i = 0
    while i < len(argv):
        if argv[i] in ('--size', '--title'): opts[argv[i]] = argv[i+1]; i += 2
        else: pos.append(argv[i]); i += 1
    js, out = pos[0], pos[1]
    views = [tuple(float(v) for v in s.split(',')) for s in pos[2:]] or [(30,12),(120,8),(210,18),(300,6),(0,65),(0,-55)]
    render(load(js), views, int(opts.get('--size', 460)), title=opts.get('--title', js.split('/')[-1])).save(out)
