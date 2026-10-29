import bpy
import os
import sys
import bmesh

out = sys.argv[sys.argv.index('--') + 1]
max_tex = int(sys.argv[sys.argv.index('--') + 2]) if len(sys.argv) > sys.argv.index('--') + 2 else 0

# Remove the CyArk-derived Lanzón geometry and its material from this source.
removed = 0
for obj in [o for o in bpy.data.objects if o.type == 'MESH']:
    mesh = obj.data
    slots = [i for i, m in enumerate(mesh.materials) if m and m.name == 'MAT-Chavin_Lanzon_Scan']
    if not slots:
        continue
    slot = slots[0]
    bm = bmesh.new()
    bm.from_mesh(mesh)
    faces = [f for f in bm.faces if f.material_index == slot]
    if faces:
        bmesh.ops.delete(bm, geom=faces, context='FACES')
    bm.to_mesh(mesh)
    bm.free()
    removed += len(faces)
    mesh.materials.pop(index=slot)
    for poly in mesh.polygons:
        if poly.material_index > slot:
            poly.material_index -= 1
    print(f'REMOVED_LANZON_FACES {obj.name} {len(faces)}')

if max_tex:
    for image in bpy.data.images:
        if image.users == 0 or image.type != 'IMAGE':
            continue
        width, height = image.size
        if max(width, height) <= max_tex:
            continue
        scale = max_tex / max(width, height)
        image.scale(max(1, round(width * scale)), max(1, round(height * scale)))
        image.pack()

meshes = [obj for obj in bpy.data.objects if obj.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for obj in meshes:
    obj.hide_set(False)
    obj.select_set(True)
if meshes:
    bpy.context.view_layer.objects.active = meshes[0]
os.makedirs(os.path.dirname(out), exist_ok=True)
bpy.ops.export_scene.gltf(
    use_selection=True,
    filepath=out,
    export_format='GLB',
    export_apply=True,
    export_yup=True,
    export_cameras=False,
    export_lights=False,
    export_animations=False,
    export_materials='EXPORT',
    export_image_format='WEBP',
    export_image_quality=80,
    export_normals=True,
    export_texcoords=True,
    export_extras=True,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
    export_draco_position_quantization=14,
    export_draco_normal_quantization=10,
    export_draco_texcoord_quantization=12,
)
print(f'CHAVIN_EXPORT_OK {out} BYTES {os.path.getsize(out)} REMOVED {removed}')
