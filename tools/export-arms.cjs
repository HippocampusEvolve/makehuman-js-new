// Exports the two arms (deltoid → fingertips) of a MakeHuman body as one skinned GLB
// for a first-person view: the full rig (so the game can pose it by bone name), the
// skin faces whose dominant joint is an arm bone, the skin diffuse map. No clothing,
// no actions. Usage: node tools/export-arms.cjs recipes/vigil-worker-01.json exports/arms-01
const fs = require('node:fs'), path = require('node:path')
const { DATA, THREE, mh } = require('./npc-assembly.cjs')
const { GLBWriter } = require('./glb-writer.cjs')
const bodyData = require(DATA + '/models/human_full_size.json')
// Both the bone node and its `____head` pivot carry weights in the head/tail rig.
const ARM = /^(shoulder01|upperarm0[12]|lowerarm0[12]|wrist|metacarpal[1-4]|finger[1-5]-[1-3])\.(L|R)(____head)?$/

async function buildHuman(recipe) {
  const h = new mh.Human()
  h.metadata = bodyData.metadata
  h.geometry = new THREE.JSONLoader().parse({ ...bodyData, materials: [] }).geometry
  const materials = bodyData.materials.map((m, i) => new THREE.MeshPhongMaterial({ name: m.DbgName, visible: i === 0 }))
  h.mesh = new THREE.SkinnedMesh(h.geometry, new THREE.MultiMaterial(materials))
  h.add(h.mesh); h.skeleton = h.mesh.skeleton; h.updateJointPositions()
  const data = fs.readFileSync(DATA + '/targets/targets.bin')
  h.targets.bufferLoader.load = (_, done) => done(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
  await h.loadTargets()
  mh.applyCharacter(h, recipe.body)
  h.geometry.computeVertexNormals()
  h.setPose(); h.updateMatrixWorld(true); h.skeleton.update()
  return h
}

function dominantJoint(g, vi) {
  const js = g.skinIndices[vi], ws = g.skinWeights[vi]
  let best = js.x, bw = ws.x
  for (const k of ['y', 'z', 'w']) if (ws[k] > bw) { bw = ws[k]; best = js[k] }
  return best
}

async function exportArms(recipePath, destination) {
  const recipe = JSON.parse(fs.readFileSync(recipePath, 'utf8'))
  const h = await buildHuman(recipe)
  const writer = new GLBWriter(), g = writer.json
  const bones = h.skeleton.bones, boneIndex = new Map(bones.map((b, i) => [b, i + 1]))
  g.nodes[0] = { name: 'arms', scale: [.1, .1, .1], children: [] }
  for (const b of bones) g.nodes.push({ name: b.name, translation: b.position.toArray(), rotation: b.quaternion.toArray(),
    ...(b.children.some(c => boneIndex.has(c)) ? { children: b.children.filter(c => boneIndex.has(c)).map(c => boneIndex.get(c)) } : {}) })
  for (const b of bones) if (!boneIndex.has(b.parent)) g.nodes[0].children.push(boneIndex.get(b))
  g.skins = [{ name: 'MakeHuman-arms', joints: bones.map(b => boneIndex.get(b)),
    inverseBindMatrices: writer.accessor(h.skeleton.boneInverses.flatMap(m => m.toArray()), 'MAT4') }]

  // Skin material: the diffuse atlas only (the arms use a corner of it; 1024 keeps the hands crisp).
  const skinFile = path.resolve(DATA, recipe.skin), spec = JSON.parse(fs.readFileSync(skinFile, 'utf8'))
  const sharp = require('sharp')
  const png = await sharp(path.resolve(path.dirname(skinFile), spec.mapDiffuse)).resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer()
  g.images.push({ name: 'skin', mimeType: 'image/png', bufferView: writer.view(png) })
  g.textures.push({ source: 0, sampler: 0 })
  // One primitive per arm so the game can dress each hand separately (gloves, signs).
  const geo = h.geometry
  const faces = geo.faces.map((f, i) => f.materialIndex === 0 && [f.a, f.b, f.c].every(vi => ARM.test(bones[dominantJoint(geo, vi)].name)) ? i : -1).filter(i => i >= 0)
  if (!faces.length) throw new Error('No arm faces; skin faces: ' + geo.faces.filter(f => f.materialIndex === 0).length)
  const primitives = [], stats = { vertices: 0, triangles: 0 }
  for (const side of ['L', 'R']) {
    const mat = g.materials.push({ name: 'skin.' + side, pbrMetallicRoughness: { baseColorFactor: [1, 1, 1, 1], baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: .82 } }) - 1
    const position = [], normal = [], uv = [], joints = [], weights = [], indices = [], cache = new Map()
    for (const fi of faces) {
      const f = geo.faces[fi]
      if (!bones[dominantJoint(geo, f.a)].name.includes('.' + side)) continue
      ;[f.a, f.b, f.c].forEach((vi, corner) => {
        const p = geo.vertices[vi], n = f.vertexNormals[corner] || f.normal, t = geo.faceVertexUvs[0]?.[fi]?.[corner] || new THREE.Vector2()
        const key = [vi, n.x.toFixed(6), n.y.toFixed(6), n.z.toFixed(6), t.x, t.y].join(',')
        let index = cache.get(key)
        if (index === undefined) {
          index = position.length / 3; cache.set(key, index)
          position.push(...p.toArray()); normal.push(...n.clone().normalize().toArray()); uv.push(t.x, 1 - t.y)
          const js = geo.skinIndices[vi].toArray(), ws = geo.skinWeights[vi].toArray(), sum = ws.reduce((a, b) => a + b, 0)
          if (sum <= 0) throw new Error('Unweighted vertex ' + vi)
          joints.push(...js); weights.push(...ws.map(w => w / sum))
        }
        indices.push(index)
      })
    }
    const attributes = { POSITION: writer.accessor(position, 'VEC3', 5126, 34962), NORMAL: writer.accessor(normal, 'VEC3', 5126, 34962),
      TEXCOORD_0: writer.accessor(uv, 'VEC2', 5126, 34962), JOINTS_0: writer.accessor(joints, 'VEC4', 5123, 34962), WEIGHTS_0: writer.accessor(weights, 'VEC4', 5126, 34962) }
    primitives.push({ attributes, indices: writer.accessor(indices, 'SCALAR', position.length / 3 > 65535 ? 5125 : 5123, 34963), material: mat })
    stats.vertices += position.length / 3; stats.triangles += indices.length / 3
  }
  g.meshes.push({ name: 'arms', primitives })
  g.scenes[0].nodes.push(g.nodes.push({ name: 'arms', mesh: 0, skin: 0 }) - 1)

  const glb = writer.finish()
  fs.mkdirSync(destination, { recursive: true })
  fs.writeFileSync(path.join(destination, 'arms.raw.glb'), glb)
  const world = name => { const b = bones.find(b => b.name === name); const v = new THREE.Vector3(); b.updateMatrixWorld(true); v.setFromMatrixPosition(b.matrixWorld); return v.multiplyScalar(.1).toArray().map(x => +x.toFixed(3)) }
  const report = { file: path.resolve(destination, 'arms.raw.glb'), bytes: glb.length, vertices: stats.vertices, triangles: stats.triangles, bones: bones.length,
    armBones: bones.filter(b => ARM.test(b.name)).length, worldMetres: Object.fromEntries(['head', 'eye.R', 'upperarm01.R', 'upperarm01.L', 'lowerarm01.R', 'wrist.R', 'finger3-3.R', 'finger1-3.R'].map(n => [n, world(n)])) }
  fs.writeFileSync(path.join(destination, 'report.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
}

const args = process.argv.slice(2)
if (args.length !== 2) { console.error('usage: node tools/export-arms.cjs <recipe.json> <destination-dir>'); process.exit(2) }
exportArms(args[0], args[1]).catch(e => { console.error(e); process.exit(1) })
