/**
 * Minimal demo app for makehuman-js-new.
 *
 * It is deliberately dependency-free beyond what this repository already ships:
 * three r82 (node_modules), OrbitControls, and dist/makehuman.js built by `npm run build`.
 * The load sequence (resources -> Human -> loadModel -> proxies -> loadTargets) mirrors
 * the upstream makehuman-js-example, which needed six CDN libraries to do the same.
 */
'use strict'

var DATA_URL = '../node_modules/makehuman-data/public/data/'

var OUTFITS = [
  {
    label: 'Casual (m)',
    gender: 0.9,
    proxies: ['male_casualsuit01', 'shoes02', 'short02', 'eyebrow009'],
  },
  {
    label: 'Suit (m)',
    gender: 0.9,
    proxies: ['male_elegantsuit01', 'shoes05', 'short03', 'eyebrow010'],
  },
  {
    label: 'Casual (f)',
    gender: 0.1,
    proxies: ['female_casualsuit01', 'shoes04', 'bob02', 'eyebrow010'],
  },
  {
    label: 'Sport (f)',
    gender: 0.1,
    proxies: ['female_sportsuit01', 'shoes01', 'ponytail01', 'eyebrow010'],
  },
]

var MODIFIER_DEFAULTS = {
  'macrodetails/Gender': 0.9,
  'macrodetails/Age': 0.45,
  'macrodetails-height/Height': 0.55,
  'macrodetails-universal/Weight': 0.5,
  'macrodetails-universal/Muscle': 0.55,
  'macrodetails-proportions/BodyProportions': 0.8,
}

var state = {
  human: null,
  spin: true,
  outfit: 0,
  targetsReady: false,
  // Rest pose by default: every pose in makehuman-data drives the hand and finger chain
  // through bone.parent, and the wrists tear apart. Selecting one in the UI shows it.
  pose: null,
}

var els = {
  viewport: document.getElementById('viewport'),
  status: document.getElementById('status'),
  outfits: document.getElementById('outfits'),
  pose: document.getElementById('pose'),
  randomize: document.getElementById('randomize'),
  spin: document.getElementById('spin'),
}

var scene, camera, renderer, controls, pivot

function status(text, busy) {
  els.status.textContent = text
  els.status.classList.toggle('busy', Boolean(busy))
}

function fetchJson(url) {
  return fetch(url).then(function (response) {
    if (!response.ok) throw new Error(url + ' -> HTTP ' + response.status)
    return response.json()
  })
}

function initScene() {
  scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0x0d1117, 40, 90)

  camera = new THREE.PerspectiveCamera(32, 1, 0.5, 400)
  camera.position.set(0, 11, 34)

  renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x0d1117)
  els.viewport.appendChild(renderer.domElement)

  controls = new THREE.OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 10, 0)
  controls.enablePan = false
  controls.minDistance = 12
  controls.maxDistance = 70

  // key light from the front-left, cool rim from behind, soft ambient fill
  var key = new THREE.DirectionalLight(0xffffff, 0.85)
  key.position.set(-18, 26, 30)
  scene.add(key)

  var rim = new THREE.DirectionalLight(0x8fd8ff, 0.55)
  rim.position.set(16, 18, -22)
  scene.add(rim)

  scene.add(new THREE.HemisphereLight(0xdfe9f5, 0x0b0f14, 0.55))

  var floor = new THREE.Mesh(
    new THREE.CircleGeometry(9, 64),
    new THREE.MeshBasicMaterial({ color: 0x121a24 })
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.02
  scene.add(floor)

  // No GridHelper here on purpose: once a clothing proxy loads, its geometry ends up
  // overwritten with the garment's vertices and the grid renders as a white wireframe
  // shirt under the model. Left as a note for whoever adds scene helpers next.

  pivot = new THREE.Object3D()
  scene.add(pivot)

  window.addEventListener('resize', resize)
  resize()
}

function resize() {
  var width = els.viewport.clientWidth
  var height = els.viewport.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

function animate() {
  requestAnimationFrame(animate)
  if (state.spin && pivot) pivot.rotation.y += 0.004
  controls.update()
  render()
}

function render() {
  if (!state.human) return
  state.human.onBeforeRender()
  renderer.render(scene, camera)
  state.human.onAfterRender()
}

function applyModifier(name, value) {
  var modifier = state.human.modifiers.children[name]
  if (!modifier) return
  modifier.setValue(value)
  modifier.updateValue()
}

function known(name) {
  // toggleProxy() builds a Proxy from the string when the name is unknown, and the URL
  // parser throws on anything that isn't group/name/file.json — so filter first.
  return state.human.proxies.children.some(function (proxy) {
    return proxy.name === name
  })
}

function setOutfit(index) {
  var outfit = OUTFITS[index]
  state.outfit = index

  OUTFITS.forEach(function (other) {
    other.proxies.filter(known).forEach(function (proxy) {
      state.human.proxies.toggleProxy(proxy, false)
    })
  })
  var pending = outfit.proxies.filter(known).map(function (proxy) {
    return state.human.proxies.toggleProxy(proxy, true)
  })

  Array.prototype.forEach.call(els.outfits.children, function (button, i) {
    button.setAttribute('aria-pressed', String(i === index))
  })

  if (state.targetsReady) {
    applyModifier('macrodetails/Gender', outfit.gender)
    syncSliders()
  }

  // Clothing is fitted to the body when it loads. Re-apply the pose afterwards, otherwise
  // a garment that arrives mid-pose keeps stale bind matrices and its vertices stretch away.
  return Promise.all(pending).then(function () {
    if (state.pose) state.human.setPose(state.pose)
  })
}

function syncSliders() {
  document.querySelectorAll('.row').forEach(function (row) {
    var modifier = state.human.modifiers.children[row.dataset.mod]
    if (!modifier) return
    var value = modifier.getValue()
    row.querySelector('input').value = value
    row.querySelector('b').textContent = Number(value).toFixed(2)
  })
}

function buildControls() {
  OUTFITS.forEach(function (outfit, index) {
    var button = document.createElement('button')
    button.type = 'button'
    button.textContent = outfit.label
    button.setAttribute('aria-pressed', String(index === state.outfit))
    button.addEventListener('click', function () {
      setOutfit(index)
    })
    els.outfits.appendChild(button)
  })

  var rest = document.createElement('option')
  rest.value = ''
  rest.textContent = 'rest (no pose)'
  els.pose.appendChild(rest)
  Object.keys(state.human.poses).forEach(function (pose) {
    var option = document.createElement('option')
    option.value = pose
    option.textContent = pose
    els.pose.appendChild(option)
  })
  els.pose.value = state.pose || ''
  els.pose.addEventListener('change', function () {
    state.pose = els.pose.value || null
    if (state.pose) state.human.setPose(state.pose)
    else location.reload()
  })

  document.querySelectorAll('.row input').forEach(function (input) {
    input.addEventListener('input', function () {
      var row = input.closest('.row')
      row.querySelector('b').textContent = Number(input.value).toFixed(2)
      applyModifier(row.dataset.mod, Number(input.value))
    })
  })

  els.randomize.addEventListener('click', function () {
    if (!state.targetsReady) return
    state.human.modifiers.randomize()
    syncSliders()
  })

  els.spin.addEventListener('click', function () {
    state.spin = !state.spin
    els.spin.textContent = state.spin ? 'Stop spin' : 'Start spin'
  })
}

function start() {
  initScene()
  animate()

  fetchJson(DATA_URL + 'resources.json')
    .then(function (resources) {
      resources.baseUrl = DATA_URL
      state.human = new makehuman.Human(resources)
      pivot.add(state.human)

      status('loading base mesh…', true)
      return state.human.loadModel().then(function () {
        return resources
      })
    })
    .then(function (resources) {
      buildControls()
      // ?targets=0 skips the 138 MB morph-target blob (sliders stay inert) — useful when
      // bisecting whether a rendering artefact comes from posing or from the targets
      if (new URLSearchParams(location.search).get('targets') === '0') return null
      status('loading morph targets (~138 MB)…', true)
      return state.human.loadTargets(resources.baseUrl + 'targets/' + resources.targets)
    })
    .then(function () {
      // Order matters: reshape the body first, pose it, and dress it last — clothing is
      // fitted to the body it finds, so anything arriving out of order ends up stretched.
      state.targetsReady = new URLSearchParams(location.search).get('targets') !== '0'
      if (state.targetsReady) {
        Object.keys(MODIFIER_DEFAULTS).forEach(function (name) {
          applyModifier(name, MODIFIER_DEFAULTS[name])
        })
        syncSliders()
      }
      var params = new URLSearchParams(location.search)
      if (params.get('pose')) state.pose = params.get('pose')
      if (state.pose) state.human.setPose(state.pose)
      if (params.get('outfit') === 'none') return null
      return setOutfit(0)
    })
    .then(function () {
      status('ready — drag to orbit, sliders reshape the mesh live')
      window.__demoReady = true
      // handles for scripted captures (docs/preview.gif) and for debugging in the console
      window.__demo = {
        state: state,
        scene: scene,
        camera: camera,
        controls: controls,
        pivot: pivot,
        renderer: renderer,
        setOutfit: setOutfit,
        applyModifier: applyModifier,
        syncSliders: syncSliders,
      }
    })
    .catch(function (error) {
      status('failed: ' + error.message)
      window.__demoError = String(error && error.stack ? error.stack : error)
      console.error(error)
    })
}

start()
