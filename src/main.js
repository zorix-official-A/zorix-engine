import * as THREE from '../vendor/three/three.module.js';
import { OrbitControls } from '../vendor/three/OrbitControls.js';
import { TransformControls } from '../vendor/three/TransformControls.js';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';
import { WebGameEngine, Fonts, RuntimeScript, ZorixScript } from './engine.js';

const $ = selector => document.querySelector(selector);
const engine = new WebGameEngine($('#viewport'));
const orbit = new OrbitControls(engine.camera, engine.renderer.domElement);
orbit.enableDamping = true;
orbit.target.set(0, 0.8, 0);

const transform = new TransformControls(engine.camera, engine.renderer.domElement);
transform.addEventListener('dragging-changed', event => { orbit.enabled = !event.value; });
engine.scene.add(transform);

let selected = null;
let activeView = 'scene';
let project = { name: 'Untitled Zorix Project', type: '3d' };
let uiElements = [];
let selectedUI = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const logs = [];
const gltfLoader = new GLTFLoader();
const contentPack = {
  base: './assets/zorix-content-pack',
  available: false,
  manifest: null,
  materials: null
};
engine.logger = log;

function seedScene() {
  engine.addPrimitive('plane').name = 'Ground';
  engine.addPrimitive('terrain').name = 'Sculpted Terrain';
  engine.addPrimitive('water').name = 'Water Plane';
  engine.addPrimitive('cube').name = 'Player';
  engine.addPrimitive('sphere').name = 'Pickup Orb';
  engine.addPrimitive('capsule').name = 'NPC Capsule';
  engine.addPrimitive('cylinder').name = 'Physics Barrel';
  engine.addPrimitive('torus').name = 'Portal Ring';
  engine.addPrimitive('tree').name = 'Zorix Tree';
  engine.addPrimitive('stairs').name = 'Stone Stairs';
  engine.addPrimitive('vehicle').name = 'Vehicle Blockout';
  engine.addPrimitive('wall').name = 'Level Wall';
  engine.addPrimitive('particles').name = 'Magic Particles';
  select(engine.objects.find(o => o.name === 'Player'));
  log('Made by Zorix Engine.');
  log('Scene initialized with Zorix starter objects, lights, camera, grid and scripts.');
}

function createProject(type) {
  project = { name: $('#project-name')?.value || 'My Zorix Game', type };
  localStorage.setItem('zorix-project', JSON.stringify(project));
  $('#project-modal').classList.add('hidden');
  if (type === '2d') setup2DProject();
  if (type === 'ui') setupUIProject();
  $('#status-left').textContent = `${project.name} · ${type.toUpperCase()} project`;
  log(`Project created: ${project.name} (${type}).`);
}

function setup2DProject() {
  engine.camera.position.set(0, 8, 0.01);
  engine.camera.lookAt(0, 0, 0);
  engine.camera.fov = 35;
  engine.camera.updateProjectionMatrix();
  ['platform', 'coin', 'enemy'].forEach(type => engine.addPrimitive(type));
  renderHierarchy();
}

function setupUIProject() {
  addUIElement('panel');
  addUIElement('text');
  addUIElement('button');
  renderUI();
}

function select(object) {
  selected = object;
  transform.attach(object?.mesh || null);
  renderHierarchy();
  renderInspector();
}

function renderHierarchy() {
  $('#hierarchy-list').innerHTML = engine.objects.map(object => `
    <button class="tree-row ${selected?.id === object.id ? 'active' : ''}" data-id="${object.id}">
      <span class="icon">${iconFor(object.type)}</span>
      <span>${object.name}</span>
      <small>${object.enabled ? 'on' : 'off'}</small>
    </button>
  `).join('');
}

function renderInspector() {
  if (!selected) {
    $('#inspector').innerHTML = '<p class="empty">Select an object in the scene or hierarchy.</p>';
    return;
  }
  const m = selected.mesh;
  const mat = firstMaterial(m);
  $('#inspector').innerHTML = `
    <label>Name<input data-prop="name" value="${selected.name}"></label>
    <div class="row"><label><input type="checkbox" data-prop="enabled" ${selected.enabled ? 'checked' : ''}> Enabled</label><label><input type="checkbox" data-prop="locked" ${selected.locked ? 'checked' : ''}> Lock</label></div>
    <h3>Transform</h3>
    ${vectorInputs('position', m.position)}
    ${vectorInputs('rotation', { x: THREE.MathUtils.radToDeg(m.rotation.x), y: THREE.MathUtils.radToDeg(m.rotation.y), z: THREE.MathUtils.radToDeg(m.rotation.z) })}
    ${vectorInputs('scale', m.scale)}
    <h3>Mesh / Renderer</h3>
    <label>Type<input value="${selected.type}" disabled></label>
    ${mat ? `
      <label>Material Color<input type="color" data-prop="color" value="#${mat.color?.getHexString?.() ?? 'ffffff'}"></label>
      <label>Roughness<input type="range" data-prop="roughness" min="0" max="1" step="0.01" value="${mat.roughness ?? 0.5}"></label>
      <label>Metallic<input type="range" data-prop="metalness" min="0" max="1" step="0.01" value="${mat.metalness ?? 0}"></label>
    ` : '<p class="hint">This imported/group object has no editable single material.</p>'}
    <h3>Rigidbody / Collider</h3>
    <div class="row"><label><input type="checkbox" data-prop="gravity" ${selected.physics.useGravity ? 'checked' : ''}> Use Gravity</label><label><input type="checkbox" data-prop="collider" ${selected.physics.collider ? 'checked' : ''}> Collider</label></div>
    <label>Mass<input type="number" step="0.1" min="0.1" data-prop="mass" value="${selected.physics.mass}"></label>
    <label>Bounciness<input type="range" min="0" max="1" step="0.01" data-prop="bounciness" value="${selected.physics.bounciness}"></label>
    <h3>UI / Font</h3>
    <label>Editor Font<select id="font-select">${Fonts.map(font => `<option value="${font}">${font.split(',')[0]}</option>`).join('')}</select></label>
    <h3>ZorixScript</h3>
    <label>Behaviour<select data-prop="script-kind">${['zorixscript','spin','bob','orbit','none'].map(kind => `<option ${selected.components[0]?.kind === kind ? 'selected' : ''}>${kind}</option>`).join('')}</select></label>
    <label>Speed<input type="number" step="0.1" data-prop="script-speed" value="${selected.components[0]?.speed ?? 1}"></label>
    <label>Script Source<textarea data-prop="zorix-source" spellcheck="false">${selected.components[0]?.source ?? 'update:\\n  sway x 1.4 0.9\\n  spin y 0.25'}</textarea></label>
    <p class="hint">ZorixScript supports blocks, vars, ifkey, ifvar, movement, material, physics, spawning and camera commands. See Docs tab.</p>
    <div class="actions"><button id="hide-selected">Hide</button><button id="show-selected">Show</button><button id="delete-object">Delete</button><button id="export-scene">Export Scene JSON</button><button id="save-scene">Save</button></div>
  `;
}

function renderUIInspector(item) {
  $('#inspector').innerHTML = `
    <label>UI Text<input data-ui-prop="text" value="${item.text || ''}"></label>
    <label>Action<select data-ui-prop="action">
      ${['none','hide','show','toggle','spawn','runScript'].map(action => `<option ${item.action === action ? 'selected' : ''}>${action}</option>`).join('')}
    </select></label>
    <label>Target Object<input data-ui-prop="target" value="${item.target || 'Zorix Tree'}"></label>
    <label>Spawn Type<input data-ui-prop="spawnType" value="${item.spawnType || 'coin'}"></label>
    <label>Button Script<textarea data-ui-prop="script" spellcheck="false">${item.script || 'hide Zorix Tree'}</textarea></label>
    <div class="vector">
      <span>rect</span>
      <input data-ui-prop="x" type="number" value="${item.x}">
      <input data-ui-prop="y" type="number" value="${item.y}">
      <input data-ui-prop="w" type="number" value="${item.w}">
    </div>
    <label>Height<input data-ui-prop="h" type="number" value="${item.h}"></label>
    <label>Color<input data-ui-prop="color" value="${item.color}"></label>
    <div class="actions"><button id="test-ui-action">Test Action</button><button id="delete-ui">Delete UI</button></div>
  `;
}

function firstMaterial(object) {
  if (object.material) return Array.isArray(object.material) ? object.material[0] : object.material;
  let found = null;
  object.traverse?.(child => {
    if (!found && child.material) found = Array.isArray(child.material) ? child.material[0] : child.material;
  });
  return found;
}

function vectorInputs(name, v) {
  return `<div class="vector" data-vector="${name}">
    <span>${name}</span>
    <input data-axis="x" type="number" step="0.1" value="${Number(v.x).toFixed(2)}">
    <input data-axis="y" type="number" step="0.1" value="${Number(v.y).toFixed(2)}">
    <input data-axis="z" type="number" step="0.1" value="${Number(v.z).toFixed(2)}">
  </div>`;
}

function iconFor(type) {
  return {
    sphere: '◯', plane: '▭', terrain: '▰', water: '≈', particles: '✦',
    capsule: '⬭', cylinder: '▥', cone: '△', torus: '◎', ico: '⬡', dodeca: '⬢',
    ring: '◎', wall: '▤', ramp: '◢', stairs: '▟', tree: '♣', rock: '◆',
    crate: '▣', vehicle: '▰', house: '⌂', tower: '▥', bridge: '═', coin: '◉',
    enemy: '☒', platform: '▔', portal: '◌', camera: '⌖', glb: '◇', pointLight: '●', spotLight: '◐'
  }[type] || '□';
}

function renderAssets() {
  const assets = [
    ['Cube Prefab', 'cube'], ['Sphere Prefab', 'sphere'], ['Capsule Prefab', 'capsule'], ['Tree Prefab', 'tree'],
    ['Vehicle Blockout', 'vehicle'], ['House Prefab', 'house'], ['Tower Prefab', 'tower'], ['Bridge Prefab', 'bridge'],
    ['Coin Prefab', 'coin'], ['Enemy Prefab', 'enemy'], ['Platform Prefab', 'platform'], ['Portal Prefab', 'portal'],
    ['Crate Prefab', 'crate'], ['Rock Prefab', 'rock'], ['Terrain Tile', 'terrain'],
    ['Water Plane', 'water'], ['Particle Emitter', 'particles'], ['Point Light', 'pointLight'], ['Spot Light', 'spotLight'],
    ['ZorixScript Runtime', 'Script'], ['Player Controller', 'Script'], ['Default Scene', 'Scene'], ['Readable Font Set', 'Font'],
    ['Sky Image Importer', 'Importer'], ['GLB Importer', 'Importer'], ['Runtime Build', 'Build'], ['23MB Content Pack', 'Content']
  ];
  const packAssets = contentPack.available ? [
    ['Use Pack Sky', 'pack-sky'],
    ['Terrain Albedo', 'pack-terrain'],
    ['Terrain Normal', 'pack-terrain-normal'],
    ['Water Normal', 'pack-water-normal'],
    ['Crate Material', 'pack-crate'],
    ['Metal Material', 'pack-metal'],
    ['Load Starter Scene', 'pack-scene']
  ] : [
    ['Content Pack Not Found', 'Missing']
  ];
  $('#asset-grid').innerHTML = [...assets, ...packAssets].map(([name, type]) => `<button class="asset" data-asset="${type}"><b>${type}</b><span>${name}</span></button>`).join('');
}

function renderModulePanel(name) {
  const panel = $('#module-panel');
  const modules = {
    animator: [
      ['Animator Controller', 'Create timeline-like behaviours with ZorixScript commands.'],
      ['Clips', 'Idle: bob 0.8 0.4 · Rotate: spin y 1.2 · Orbit: orbit 0.7 3'],
      ['Preview', 'Press Play to evaluate object scripts in the scene.']
    ],
    physics: [
      ['Zorix Physics', 'Gravity, mass, collider and bounciness are editable in Inspector.'],
      ['World Gravity', `${engine.gravity} m/s²`],
      ['Collision Plane', 'Ground plane at y = 0.55 for basic rigidbody tests.']
    ],
    lighting: [
      ['Lighting', 'Directional, hemisphere, point and spot lights are available.'],
      ['Environment', 'Use Sky Image to import an equirectangular sky/background.'],
      ['Quality', 'Ultra enables high pixel ratio, tone mapping and soft shadows.']
    ],
    ui: [
      ['UI Designer', '<button data-ui-create="button">Add Button</button><button data-ui-create="text">Add Text</button><button data-ui-create="panel">Add Panel</button>'],
      ['Selected UI', 'UI elements render over the Scene/Game view and are saved in browser storage.'],
      ['PWA Export', '<button id="export-pwa">Export PWA Files</button><button id="export-html">Export Standalone HTML</button>']
    ],
    build: [
      ['Build Settings', 'Browser/WebGL target. Static files can be hosted on any HTTP server.'],
      ['PWA', 'Export manifest.webmanifest and sw.js from UI Designer or Build panel.'],
      ['Export', '<button id="export-pwa-build">Export PWA Files</button><button id="export-project-json">Export Project JSON</button>']
    ],
    docs: [
      ['Blocks', 'start: runs once. update: runs every frame. Lines outside blocks also run every frame.'],
      ['Variables', 'var hp 100 · add timer 1 · set speed 2 · ifvar timer > 3 color #ff3355'],
      ['Input', 'ifkey w move 0 0 -3 · ifkey a move -3 0 0 · ifkey space velocity 0 5 0'],
      ['Motion', 'move x y z · position x y z · rotate x y z · rotateBy x y z · sway x 1.4 0.9 · orbit 0.7 3'],
      ['3D / FX', 'spawn cube 0 1 0 · emit · camera follow 4 3 6 · camera look'],
      ['Material / Physics', 'color #44aaff · opacity 0.5 · roughness 0.2 · metallic 1 · gravity on · bounce 0.8']
    ]
  };
  panel.innerHTML = `<div class="module-grid">${(modules[name] || []).map(([title, body]) => `<article><b>${title}</b><span>${body}</span></article>`).join('')}</div>`;
}

function log(message) {
  logs.unshift(`[${new Date().toLocaleTimeString()}] ${message}`);
  $('#console').innerHTML = logs.slice(0, 80).map(line => `<div>${line}</div>`).join('');
}

function setTool(mode) {
  document.querySelectorAll('.tool').forEach(btn => btn.classList.remove('active'));
  $(`#tool-${mode}`)?.classList.add('active');
  if (mode !== 'select') transform.setMode(mode === 'move' ? 'translate' : mode);
}

document.addEventListener('click', event => {
  const uiNode = event.target.closest('[data-ui-id]');
  if (uiNode) {
    const item = uiElements.find(element => element.id === uiNode.dataset.uiId);
    if (item) {
      selectedUI = item;
      renderUIInspector(item);
      if (item.type === 'button' && engine.running) runUIAction(item);
    }
  }
  const row = event.target.closest('.tree-row');
  if (row) select(engine.objects.find(o => o.id === row.dataset.id));
  const tab = event.target.closest('.tab');
  if (tab?.dataset.view) {
    activeView = tab.dataset.view;
    document.querySelectorAll('.center > .tabs .tab').forEach(t => t.classList.toggle('active', t === tab));
    log(`Switched to ${activeView} view.`);
  }
  if (tab?.dataset.bottom) {
    document.querySelectorAll('.bottom .tab').forEach(t => t.classList.toggle('active', t === tab));
    $('#asset-grid').classList.toggle('hidden', tab.dataset.bottom !== 'assets');
    $('#console').classList.toggle('hidden', tab.dataset.bottom !== 'console');
    $('#module-panel').classList.toggle('hidden', ['assets', 'console'].includes(tab.dataset.bottom));
    if (!['assets', 'console'].includes(tab.dataset.bottom)) renderModulePanel(tab.dataset.bottom);
  }
  const asset = event.target.closest('.asset');
  if (asset && ['cube','sphere','capsule','tree','vehicle','house','tower','bridge','coin','enemy','platform','portal','crate','rock','terrain','water','particles','pointLight','spotLight'].includes(asset.dataset.asset)) {
    select(engine.addPrimitive(asset.dataset.asset));
    log(`Created from Project: ${asset.dataset.asset}`);
  }
  if (asset?.dataset.asset?.startsWith('pack-')) handleContentPackAsset(asset.dataset.asset);
  if (event.target.id === 'add-object') openAddMenu();
  if (event.target.id === 'duplicate') select(engine.duplicate(selected));
  if (event.target.id === 'hide-selected' && selected) { selected.mesh.visible = false; log(`Hidden ${selected.name}.`); }
  if (event.target.id === 'show-selected' && selected) { selected.mesh.visible = true; log(`Shown ${selected.name}.`); }
  if (event.target.id === 'delete-object') { engine.remove(selected); select(engine.objects[0] || null); log('Deleted selected object.'); }
  if (event.target.id === 'export-scene') download('scene.json', engine.serialize(), 'application/json');
  if (event.target.id === 'save-scene') { localStorage.setItem('zorix-scene', engine.serialize()); log('Scene saved to browser storage.'); }
  if (event.target.dataset.projectType) createProject(event.target.dataset.projectType);
  if (event.target.id === 'open-existing') $('#project-modal').classList.add('hidden');
  if (event.target.dataset.uiCreate) addUIElement(event.target.dataset.uiCreate);
  if (event.target.id === 'export-pwa' || event.target.id === 'export-pwa-build') exportPWA();
  if (event.target.id === 'export-html') exportStandaloneHTML();
  if (event.target.id === 'export-project-json') exportProjectJSON();
  if (event.target.id === 'test-ui-action' && selectedUI) runUIAction(selectedUI);
  if (event.target.id === 'delete-ui' && selectedUI) {
    uiElements = uiElements.filter(item => item.id !== selectedUI.id);
    selectedUI = null;
    renderUI();
    renderInspector();
  }
});

document.addEventListener('input', event => {
  if (event.target.dataset.uiProp && selectedUI) {
    const prop = event.target.dataset.uiProp;
    selectedUI[prop] = ['x','y','w','h'].includes(prop) ? Number(event.target.value) : event.target.value;
    renderUI();
    return;
  }
  if (!selected) return;
  const prop = event.target.dataset.prop;
  const vector = event.target.closest('[data-vector]');
  if (vector) {
    const axis = event.target.dataset.axis;
    const value = Number(event.target.value);
    const key = vector.dataset.vector;
    if (key === 'rotation') selected.mesh.rotation[axis] = THREE.MathUtils.degToRad(value);
    else selected.mesh[key][axis] = value;
  }
  if (prop === 'name') { selected.name = event.target.value; selected.mesh.name = selected.name; renderHierarchy(); }
  if (prop === 'enabled') selected.enabled = event.target.checked;
  if (prop === 'locked') selected.locked = event.target.checked;
  if (prop === 'gravity') selected.physics.useGravity = event.target.checked;
  if (prop === 'collider') selected.physics.collider = event.target.checked;
  if (prop === 'mass') selected.physics.mass = Number(event.target.value);
  if (prop === 'bounciness') selected.physics.bounciness = Number(event.target.value);
  if (prop === 'color') firstMaterial(selected.mesh)?.color?.set(event.target.value);
  if (prop === 'roughness' || prop === 'metalness') {
    const mat = firstMaterial(selected.mesh);
    if (mat && prop in mat) mat[prop] = Number(event.target.value);
  }
  if (prop === 'script-kind') {
    selected.components = event.target.value === 'none' ? [] : [event.target.value === 'zorixscript' ? new ZorixScript() : new RuntimeScript(event.target.value)];
    renderInspector();
  }
  if (prop === 'script-speed' && selected.components[0]) selected.components[0].speed = Number(event.target.value);
  if (prop === 'zorix-source') {
    if (!(selected.components[0] instanceof ZorixScript)) selected.components = [new ZorixScript()];
    selected.components[0].source = event.target.value;
  }
  if (event.target.id === 'font-select') document.documentElement.style.setProperty('--app-font', event.target.value);
});

engine.canvas.addEventListener('pointerdown', event => {
  if (event.target !== engine.canvas || selected?.locked) return;
  const rect = engine.canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, engine.camera);
  const hits = raycaster.intersectObjects(engine.objects.map(o => o.mesh), true);
  if (hits[0]) select(engine.objects.find(o => o.id === hits[0].object.userData.engineId));
});

$('#tool-select').onclick = () => setTool('select');
$('#tool-move').onclick = () => setTool('move');
$('#tool-rotate').onclick = () => setTool('rotate');
$('#tool-scale').onclick = () => setTool('scale');
$('#quick-create').onchange = event => {
  if (!event.target.value) return;
  select(engine.addPrimitive(event.target.value));
  log(`Created ${event.target.value}.`);
  event.target.value = '';
};
$('#quality').onchange = event => {
  engine.setQuality(event.target.value);
  log(`Render quality set to ${event.target.value}.`);
};
$('#import-sky').onclick = () => $('#sky-file').click();
$('#import-glb').onclick = () => $('#glb-file').click();
$('#sky-file').onchange = event => {
  const file = event.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  engine.setSkyImage(url);
  log(`Sky image imported: ${file.name}`);
};
$('#glb-file').onchange = event => {
  const file = event.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  gltfLoader.load(url, gltf => {
    const object = engine.addImportedObject(gltf.scene, file.name.replace(/\.(glb|gltf)$/i, ''));
    select(object);
    log(`GLB imported: ${file.name}`);
  }, undefined, error => {
    console.error(error);
    log(`GLB import failed: ${file.name}`);
  });
};
$('#play').onclick = () => { engine.start(); $('#runtime-banner').classList.remove('hidden'); log('Runtime started.'); };
$('#pause').onclick = () => { engine.paused = !engine.paused; log(engine.paused ? 'Runtime paused.' : 'Runtime resumed.'); };
$('#stop').onclick = () => { engine.stop(); $('#runtime-banner').classList.add('hidden'); log('Runtime stopped.'); };

function openAddMenu() {
  const type = prompt('Add primitive: cube, sphere, capsule, cylinder, plane', 'cube');
  if (!type) return;
  select(engine.addPrimitive(type.trim().toLowerCase()));
  log(`Added ${type}.`);
}

function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
  log(`Exported ${filename}.`);
}

function addUIElement(type) {
  const element = {
    id: crypto.randomUUID(),
    type,
    text: type === 'button' ? 'Zorix Button' : type === 'text' ? 'Zorix Text' : '',
    x: 24 + uiElements.length * 18,
    y: 24 + uiElements.length * 18,
    w: type === 'panel' ? 220 : 150,
    h: type === 'panel' ? 110 : 42,
    color: type === 'panel' ? 'rgba(12,18,28,.72)' : '#4aa3ff',
    action: type === 'button' ? 'hide' : 'none',
    target: 'Zorix Tree',
    spawnType: 'coin',
    script: 'hide Zorix Tree'
  };
  uiElements.push(element);
  selectedUI = element;
  renderUI();
  renderUIInspector(element);
  log(`UI ${type} added.`);
}

function renderUI() {
  const layer = $('#ui-layer');
  layer.innerHTML = uiElements.map(item => {
    const style = `left:${item.x}px;top:${item.y}px;width:${item.w}px;height:${item.h}px;`;
    if (item.type === 'button') return `<button class="ui-widget ui-button" data-ui-id="${item.id}" style="${style}background:${item.color}">${item.text}</button>`;
    if (item.type === 'text') return `<div class="ui-widget ui-text" data-ui-id="${item.id}" style="${style}">${item.text}</div>`;
    return `<div class="ui-widget ui-panel" data-ui-id="${item.id}" style="${style}"></div>`;
  }).join('');
  localStorage.setItem('zorix-ui', JSON.stringify(uiElements));
}

function runUIAction(item) {
  const target = engine.findObject(item.target);
  if (item.action === 'hide' && target) target.mesh.visible = false;
  if (item.action === 'show' && target) target.mesh.visible = true;
  if (item.action === 'toggle' && target) target.mesh.visible = !target.mesh.visible;
  if (item.action === 'spawn') engine.addPrimitive(item.spawnType || 'coin');
  if (item.action === 'runScript') new ZorixScript(item.script || '').execute(item.script || '', target || selected || engine.objects[0], 0.016, engine.elapsed, engine.camera, engine);
  renderHierarchy();
  log(`UI action: ${item.action} ${item.target || ''}`);
}

function exportPWA() {
  const manifest = {
    name: project.name,
    short_name: 'Zorix',
    start_url: './index.html',
    display: 'standalone',
    background_color: '#0d1118',
    theme_color: '#4aa3ff',
    icons: []
  };
  const sw = `self.addEventListener('install',event=>{event.waitUntil(caches.open('zorix-pwa-v1').then(c=>c.addAll(['./','./index.html','./src/main.js','./src/styles.css','./src/engine.js'])))});self.addEventListener('fetch',event=>{event.respondWith(caches.match(event.request).then(r=>r||fetch(event.request)))})`;
  download('manifest.webmanifest', JSON.stringify(manifest, null, 2), 'application/manifest+json');
  download('sw.js', sw, 'text/javascript');
  log('PWA files exported.');
}

function exportStandaloneHTML() {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${project.name}</title><link rel="manifest" href="./manifest.webmanifest"></head><body><h1>${project.name}</h1><p>Copy this beside your Zorix Engine files.</p><script>if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js')</script></body></html>`;
  download('pwa-index.html', html, 'text/html');
}

function exportProjectJSON() {
  download('zorix-project.json', JSON.stringify({ project, scene: JSON.parse(engine.serialize()), ui: uiElements }, null, 2), 'application/json');
}

function loop() {
  orbit.update();
  engine.tick();
  requestAnimationFrame(loop);
}

async function loadContentPack() {
  try {
    const manifest = await fetch(`${contentPack.base}/manifest.json`, { cache: 'no-store' });
    if (!manifest.ok) throw new Error('manifest missing');
    contentPack.manifest = await manifest.json();
    const materials = await fetch(`${contentPack.base}/materials/zorix_materials.json`, { cache: 'no-store' });
    contentPack.materials = materials.ok ? await materials.json() : null;
    contentPack.available = true;
    log(`Content pack loaded: ${contentPack.manifest.files?.length || 0} files.`);
  } catch {
    contentPack.available = false;
    log('Content pack not found. Engine will run without built-in resources.');
  }
  renderAssets();
}

function handleContentPackAsset(type) {
  if (!contentPack.available) return log('Content pack is not available.');
  const tex = name => `${contentPack.base}/textures/${name}`;
  if (type === 'pack-sky') {
    engine.setSkyImage(tex('zorix_sky_panorama.png'));
    log('Applied content pack sky.');
  }
  if (type === 'pack-terrain') {
    const target = selected || engine.objects.find(o => o.type === 'terrain') || engine.addPrimitive('terrain');
    select(target);
    engine.applyTextureToSelected(target, tex('terrain_albedo_4k.png'), { repeat: 2 });
    log('Applied terrain albedo to selected object.');
  }
  if (type === 'pack-terrain-normal') {
    const target = selected || engine.objects.find(o => o.type === 'terrain');
    engine.applyNormalToSelected(target, tex('terrain_normal_4k.png'), { repeat: 2 });
    log('Applied terrain normal map.');
  }
  if (type === 'pack-water-normal') {
    const target = selected || engine.objects.find(o => o.type === 'water') || engine.addPrimitive('water');
    select(target);
    engine.applyNormalToSelected(target, tex('water_normal_4k.png'), { repeat: 4 });
    log('Applied water normal map.');
  }
  if (type === 'pack-crate') {
    const target = selected || engine.addPrimitive('crate');
    select(target);
    engine.applyTextureToSelected(target, tex('crate_albedo_4k.png'), { repeat: 1 });
    log('Applied crate material.');
  }
  if (type === 'pack-metal') {
    const target = selected || engine.addPrimitive('cube');
    select(target);
    engine.applyTextureToSelected(target, tex('metal_albedo_4k.png'), { repeat: 1 });
    log('Applied metal material.');
  }
  if (type === 'pack-scene') {
    ['tree', 'rock', 'crate', 'vehicle', 'pointLight', 'spotLight'].forEach(kind => engine.addPrimitive(kind));
    renderHierarchy();
    log('Loaded starter scene objects from content pack preset.');
  }
}

seedScene();
try {
  const savedProject = JSON.parse(localStorage.getItem('zorix-project') || 'null');
  if (savedProject) {
    project = savedProject;
    $('#project-modal').classList.add('hidden');
  }
  uiElements = JSON.parse(localStorage.getItem('zorix-ui') || '[]');
  renderUI();
} catch {}
loadContentPack();
loop();
