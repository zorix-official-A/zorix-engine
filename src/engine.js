import * as THREE from '../vendor/three/three.module.js';

export const Fonts = [
  'Inter, Arial, sans-serif',
  'Arial, Helvetica, sans-serif',
  'Georgia, serif',
  'Times New Roman, serif',
  'Courier New, monospace',
  'Verdana, Geneva, sans-serif',
  'Trebuchet MS, sans-serif',
  'Impact, fantasy'
];

export class EngineObject {
  constructor({ id, name, type, mesh, components = [] }) {
    this.id = id || crypto.randomUUID();
    this.name = name;
    this.type = type;
    this.mesh = mesh;
    this.components = components;
    this.enabled = true;
    this.locked = false;
    this.physics = { useGravity: false, mass: 1, collider: true, velocity: [0, 0, 0], bounciness: 0.15 };
  }
}

export class RuntimeScript {
  constructor(kind = 'spin') {
    this.kind = kind;
    this.speed = 1;
    this.amplitude = 1;
  }

  tick(object, dt, elapsed) {
    if (this.kind === 'spin') object.mesh.rotation.y += dt * this.speed;
    if (this.kind === 'bob') object.mesh.position.y += Math.sin(elapsed * this.speed) * 0.004 * this.amplitude;
    if (this.kind === 'orbit') {
      object.mesh.position.x = Math.cos(elapsed * this.speed) * 3 * this.amplitude;
      object.mesh.position.z = Math.sin(elapsed * this.speed) * 3 * this.amplitude;
    }
  }
}

export class ZorixScript {
  constructor(source = 'spin y 1.2\nbob 0.6 0.8\npulse 0.15') {
    this.kind = 'zorixscript';
    this.speed = 1;
    this.amplitude = 1;
    this.source = source;
    this.vars = {};
    this.didStart = false;
  }

  tick(object, dt, elapsed, camera, engine) {
    if (!this.didStart) {
      this.didStart = true;
      this.runBlock('start', object, dt, elapsed, camera, engine);
    }
    this.runBlock('update', object, dt, elapsed, camera, engine);
    this.runBlock(null, object, dt, elapsed, camera, engine);
  }

  runBlock(block, object, dt, elapsed, camera, engine) {
    let activeBlock = null;
    for (const rawLine of this.source.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('//')) continue;
      if (line.endsWith(':')) {
        activeBlock = line.slice(0, -1);
        continue;
      }
      if (block !== activeBlock) continue;
      if (line.startsWith('ifkey ')) {
        const [, key, ...rest] = line.split(/\s+/);
        if (!engine?.keys?.has(key.toLowerCase())) continue;
        this.execute(rest.join(' '), object, dt, elapsed, camera, engine);
        continue;
      }
      if (line.startsWith('ifvar ')) {
        const [, name, op, value, ...rest] = line.split(/\s+/);
        const left = Number(this.vars[name] ?? 0);
        const right = Number(this.value(value));
        const ok = op === '>' ? left > right : op === '<' ? left < right : op === '==' ? left === right : op === '!=' ? left !== right : false;
        if (ok) this.execute(rest.join(' '), object, dt, elapsed, camera, engine);
        continue;
      }
      this.execute(line, object, dt, elapsed, camera, engine);
    }
  }

  value(token, fallback = 0) {
    if (token in this.vars) return this.vars[token];
    const n = Number(token);
    return Number.isFinite(n) ? n : fallback;
  }

  execute(line, object, dt, elapsed, camera, engine) {
      const [command, a = '', b = '', c = '', d = ''] = line.split(/\s+/);
      const va = Number(this.value(a, 0));
      const vb = Number(this.value(b, 0));
      const vc = Number(this.value(c, 0));
      if (command === 'spin') {
        const axis = ['x', 'y', 'z'].includes(a) ? a : 'y';
        object.mesh.rotation[axis] += dt * (Number(b) || 1);
      }
      if (command === 'bob') object.mesh.position.y += Math.sin(elapsed * (Number(a) || 1)) * 0.006 * (Number(b) || 1);
      if (command === 'sway') {
        const axis = ['x', 'y', 'z'].includes(a) ? a : 'x';
        object.mesh.position[axis] += Math.sin(elapsed * (Number(b) || 1)) * 0.015 * (Number(c) || 1);
      }
      if (command === 'orbit') {
        object.mesh.position.x = Math.cos(elapsed * (Number(a) || 1)) * (Number(b) || 3);
        object.mesh.position.z = Math.sin(elapsed * (Number(a) || 1)) * (Number(b) || 3);
      }
      if (command === 'move') object.mesh.position.add(new THREE.Vector3(va, vb, vc).multiplyScalar(dt));
      if (command === 'position') object.mesh.position.set(va, vb, vc);
      if (command === 'rotate') object.mesh.rotation.set(va, vb, vc);
      if (command === 'rotateBy') object.mesh.rotation.set(object.mesh.rotation.x + va * dt, object.mesh.rotation.y + vb * dt, object.mesh.rotation.z + vc * dt);
      if (command === 'scale') object.mesh.scale.setScalar(Number(a) || 1);
      if (command === 'scale3') object.mesh.scale.set(va || 1, vb || 1, vc || 1);
      if (command === 'pulse') {
        const scale = 1 + Math.sin(elapsed * 3) * (Number(a) || 0.1);
        object.mesh.scale.setScalar(Math.max(0.05, scale));
      }
      if (command === 'followCamera' && camera) object.mesh.position.lerp(camera.position, Math.min(1, (Number(a) || 0.5) * dt));
      if (command === 'color') {
        const material = object.mesh.material || object.mesh.children?.find(child => child.material)?.material;
        material?.color?.set(a || '#ffffff');
      }
      if (command === 'opacity') {
        const material = object.mesh.material || object.mesh.children?.find(child => child.material)?.material;
        if (material) {
          material.transparent = true;
          material.opacity = Math.max(0, Math.min(1, Number(a) || 1));
        }
      }
      if (command === 'roughness') {
        const material = object.mesh.material || object.mesh.children?.find(child => child.material)?.material;
        if (material && 'roughness' in material) material.roughness = Math.max(0, Math.min(1, Number(a) || 0));
      }
      if (command === 'metallic') {
        const material = object.mesh.material || object.mesh.children?.find(child => child.material)?.material;
        if (material && 'metalness' in material) material.metalness = Math.max(0, Math.min(1, Number(a) || 0));
      }
      if (command === 'gravity') object.physics.useGravity = a !== 'off';
      if (command === 'velocity') object.physics.velocity = [va, vb, vc];
      if (command === 'bounce') object.physics.bounciness = Math.max(0, Math.min(1, Number(a) || 0));
      if (command === 'var') this.vars[a] = this.value(b, 0);
      if (command === 'add') this.vars[a] = Number(this.vars[a] || 0) + this.value(b, 0) * dt;
      if (command === 'set') this.vars[a] = this.value(b, 0);
      if (command === 'spawn') {
        const spawned = engine?.addPrimitive?.(a || 'cube');
        if (spawned) spawned.mesh.position.copy(object.mesh.position).add(new THREE.Vector3(vb, vc, Number(d) || 0));
      }
      if (['hide', 'show', 'toggle', 'enable', 'disable'].includes(command)) {
        const targetName = [a, b, c, d].filter(Boolean).join(' ');
        const target = targetName ? engine?.findObject?.(targetName) : object;
        if (target) {
          if (command === 'hide') target.mesh.visible = false;
          if (command === 'show') target.mesh.visible = true;
          if (command === 'toggle') target.mesh.visible = !target.mesh.visible;
          if (command === 'enable') target.enabled = true;
          if (command === 'disable') target.enabled = false;
        }
      }
      if (command === 'emit') engine?.addParticles?.();
      if (command === 'camera') {
        if (a === 'follow' && camera) camera.position.lerp(object.mesh.position.clone().add(new THREE.Vector3(vb || 4, vc || 3, Number(d) || 6)), Math.min(1, dt * 2));
        if (a === 'look' && camera) camera.lookAt(object.mesh.position);
      }
      if (command === 'log') engine?.logger?.(line.slice(4));
      if (command === 'lookAtCamera' && camera) object.mesh.lookAt(camera.position);
  }
}

export class WebGameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#8fbdea');
    this.scene.fog = new THREE.FogExp2('#8fbdea', 0.025);
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.camera.position.set(6, 5, 8);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.clock = new THREE.Clock();
    this.objects = [];
    this.running = false;
    this.paused = false;
    this.elapsed = 0;
    this.gravity = -9.81;
    this.keys = new Set();
    this.logger = null;
    window.addEventListener('keydown', event => this.keys.add(event.key.toLowerCase()));
    window.addEventListener('keyup', event => this.keys.delete(event.key.toLowerCase()));
    this.grid = new THREE.GridHelper(40, 40, '#5f6c7a', '#3d4653');
    this.scene.add(this.grid);
    this.createLighting();
    this.createSkyDome();
  }

  findObject(name) {
    const needle = String(name || '').toLowerCase();
    return this.objects.find(object => object.name.toLowerCase() === needle)
      || this.objects.find(object => object.name.toLowerCase().includes(needle));
  }

  createLighting() {
    const hemi = new THREE.HemisphereLight('#dce8ff', '#1a1b20', 1.8);
    hemi.name = 'Global Hemisphere';
    const sun = new THREE.DirectionalLight('#ffffff', 3);
    sun.name = 'Directional Light';
    sun.position.set(4, 7, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -18;
    sun.shadow.camera.right = 18;
    sun.shadow.camera.top = 18;
    sun.shadow.camera.bottom = -18;
    this.scene.add(hemi, sun);
  }

  createSkyDome() {
    const geometry = new THREE.SphereGeometry(180, 48, 24);
    const material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color('#5fa8ff') },
        bottomColor: { value: new THREE.Color('#eef7ff') }
      },
      vertexShader: 'varying vec3 vWorldPosition; void main(){ vec4 p = modelMatrix * vec4(position,1.0); vWorldPosition = p.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vWorldPosition; void main(){ float h = normalize(vWorldPosition).y * .5 + .5; gl_FragColor = vec4(mix(bottomColor, topColor, smoothstep(.05, .9, h)), 1.0); }'
    });
    const sky = new THREE.Mesh(geometry, material);
    sky.name = 'Procedural Sky';
    this.scene.add(sky);
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.camera.aspect = rect.width / Math.max(rect.height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height, false);
  }

  addPrimitive(type = 'cube') {
    if (type === 'pointLight' || type === 'spotLight') return this.addLight(type);
    if (type === 'particles') return this.addParticles();
    if (type === 'camera') return this.addCameraMarker();
    if (['tree', 'vehicle', 'stairs', 'house', 'tower', 'bridge', 'coin', 'enemy', 'platform', 'portal'].includes(type)) return this.addComposite(type);
    const material = new THREE.MeshStandardMaterial({
      color: this.defaultColor(type),
      roughness: type === 'water' ? 0.05 : 0.38,
      metalness: type === 'water' ? 0.15 : 0.08,
      transparent: type === 'water',
      opacity: type === 'water' ? 0.72 : 1
    });
    const geometry = this.geometryFor(type);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set((this.objects.length % 5) * 1.5 - 3, ['plane', 'terrain', 'water'].includes(type) ? 0 : 0.8, Math.floor(this.objects.length / 5) * 1.5 - 1);
    mesh.name = `${type[0].toUpperCase()}${type.slice(1)}`;
    const object = new EngineObject({ name: mesh.name, type, mesh, components: [new ZorixScript()] });
    mesh.userData.engineId = object.id;
    this.objects.push(object);
    this.scene.add(mesh);
    return object;
  }

  geometryFor(type) {
    if (type === 'sphere') return new THREE.SphereGeometry(0.72, 48, 24);
    if (type === 'capsule') return new THREE.CapsuleGeometry(0.45, 1.1, 12, 24);
    if (type === 'cylinder') return new THREE.CylinderGeometry(0.55, 0.55, 1.2, 32);
    if (type === 'cone') return new THREE.ConeGeometry(0.65, 1.35, 48);
    if (type === 'torus') return new THREE.TorusGeometry(0.55, 0.18, 20, 72);
    if (type === 'ico') return new THREE.IcosahedronGeometry(0.75, 2);
    if (type === 'dodeca') return new THREE.DodecahedronGeometry(0.75, 1);
    if (type === 'ring') return new THREE.TorusGeometry(0.8, 0.07, 12, 72);
    if (type === 'wall') return new THREE.BoxGeometry(3.2, 1.7, 0.18);
    if (type === 'ramp') return this.createRampGeometry();
    if (type === 'rock') return new THREE.IcosahedronGeometry(0.8, 1);
    if (type === 'crate') return new THREE.BoxGeometry(1, 1, 1, 2, 2, 2);
    if (type === 'terrain') return this.createTerrainGeometry();
    if (type === 'water') return new THREE.PlaneGeometry(5, 5, 48, 48).rotateX(-Math.PI / 2);
    if (type === 'plane') return new THREE.BoxGeometry(4, 0.08, 4);
    return new THREE.BoxGeometry(1.2, 1.2, 1.2);
  }

  defaultColor(type) {
    return {
      sphere: '#4aa3ff',
      capsule: '#f7bf4f',
      cylinder: '#ff7b72',
      cone: '#c891ff',
      torus: '#6ee7d8',
      ico: '#6aa9ff',
      dodeca: '#b58cff',
      ring: '#ffcf5a',
      wall: '#98a2b3',
      ramp: '#a87953',
      rock: '#7d8795',
      crate: '#a66b3f',
      terrain: '#4c9a54',
      water: '#35b7ff',
      plane: '#556270'
    }[type] || '#7bd88f';
  }

  createTerrainGeometry() {
    const geometry = new THREE.PlaneGeometry(8, 8, 64, 64).rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const y = Math.sin(x * 1.7) * 0.18 + Math.cos(z * 1.35) * 0.22 + Math.sin((x + z) * 2.1) * 0.08;
      positions.setY(i, y);
    }
    geometry.computeVertexNormals();
    return geometry;
  }

  createRampGeometry() {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -0.8, -0.45, -0.7,  0.8, -0.45, -0.7,  0.8, -0.45, 0.7, -0.8, -0.45, 0.7,
      -0.8, -0.45, -0.7,  0.8, -0.45, -0.7,  0.8, 0.45, 0.7, -0.8, -0.45, 0.7
    ]);
    const indices = [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 0, 4, 7, 0, 7, 3, 1, 5, 6, 1, 6, 2, 3, 2, 6, 3, 6, 7];
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  addComposite(type) {
    const group = new THREE.Group();
    const make = (geometry, color, position, scale = [1, 1, 1]) => {
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.45 }));
      mesh.position.set(...position);
      mesh.scale.set(...scale);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    };
    if (type === 'tree') {
      make(new THREE.CylinderGeometry(0.16, 0.22, 1.2, 14), '#7b4f2d', [0, 0.6, 0]);
      make(new THREE.ConeGeometry(0.85, 1.4, 28), '#2f9e55', [0, 1.6, 0]);
      make(new THREE.ConeGeometry(0.65, 1.1, 28), '#37b568', [0, 2.15, 0]);
    }
    if (type === 'vehicle') {
      make(new THREE.BoxGeometry(1.8, 0.45, 0.9), '#e0565b', [0, 0.55, 0]);
      make(new THREE.BoxGeometry(0.9, 0.45, 0.72), '#ff8a65', [0.1, 0.95, 0]);
      for (const x of [-0.62, 0.62]) for (const z of [-0.52, 0.52]) make(new THREE.CylinderGeometry(0.18, 0.18, 0.16, 24).rotateX(Math.PI / 2), '#15191f', [x, 0.28, z]);
    }
    if (type === 'stairs') {
      for (let i = 0; i < 5; i++) make(new THREE.BoxGeometry(1.6, 0.22, 0.45), '#8a96a8', [0, 0.12 + i * 0.22, -0.9 + i * 0.36]);
    }
    if (type === 'house') {
      make(new THREE.BoxGeometry(1.8, 1.2, 1.6), '#d9b38c', [0, 0.65, 0]);
      make(new THREE.ConeGeometry(1.35, 0.9, 4).rotateY(Math.PI / 4), '#8f3d3d', [0, 1.65, 0]);
      make(new THREE.BoxGeometry(0.42, 0.7, 0.08), '#2d1b12', [0, 0.35, -0.82]);
    }
    if (type === 'tower') {
      make(new THREE.CylinderGeometry(0.45, 0.55, 2.4, 18), '#9aa6b2', [0, 1.2, 0]);
      make(new THREE.ConeGeometry(0.72, 0.8, 18), '#5d6b86', [0, 2.75, 0]);
    }
    if (type === 'bridge') {
      make(new THREE.BoxGeometry(3.8, 0.18, 0.85), '#9b6b43', [0, 0.55, 0]);
      for (const x of [-1.6, 1.6]) for (const z of [-0.5, 0.5]) make(new THREE.BoxGeometry(0.12, 0.7, 0.12), '#5c3b26', [x, 0.9, z]);
    }
    if (type === 'coin') {
      make(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 48).rotateX(Math.PI / 2), '#ffd54a', [0, 1, 0]);
    }
    if (type === 'enemy') {
      make(new THREE.SphereGeometry(0.5, 32, 16), '#e74c5b', [0, 0.85, 0]);
      make(new THREE.ConeGeometry(0.22, 0.55, 18), '#2d1114', [-0.25, 1.2, 0.35]);
      make(new THREE.ConeGeometry(0.22, 0.55, 18), '#2d1114', [0.25, 1.2, 0.35]);
    }
    if (type === 'platform') {
      make(new THREE.BoxGeometry(2.4, 0.22, 1.4), '#6aa9ff', [0, 0.55, 0]);
    }
    if (type === 'portal') {
      make(new THREE.TorusGeometry(0.8, 0.08, 20, 72), '#7d5cff', [0, 1.1, 0]);
      make(new THREE.CircleGeometry(0.7, 48), '#25d0ff', [0, 1.1, -0.02]);
    }
    group.position.set((this.objects.length % 5) * 1.5 - 3, 0, Math.floor(this.objects.length / 5) * 1.5 - 1);
    group.name = type;
    const object = new EngineObject({ name: type[0].toUpperCase() + type.slice(1), type, mesh: group, components: [new ZorixScript('spin y 0.4')] });
    group.userData.engineId = object.id;
    group.traverse(child => { child.userData.engineId = object.id; });
    this.objects.push(object);
    this.scene.add(group);
    return object;
  }

  addCameraMarker() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.42, 0.35), new THREE.MeshBasicMaterial({ color: '#d7e1ff', wireframe: true }));
    const lens = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.45, 4), new THREE.MeshBasicMaterial({ color: '#7aa7ff', wireframe: true }));
    lens.rotation.y = Math.PI / 4;
    lens.position.z = -0.38;
    group.add(body, lens);
    group.position.set(0, 2.2, 3);
    group.name = 'Camera Marker';
    const object = new EngineObject({ name: 'Camera Marker', type: 'camera', mesh: group, components: [] });
    group.userData.engineId = object.id;
    group.traverse(child => { child.userData.engineId = object.id; });
    this.objects.push(object);
    this.scene.add(group);
    return object;
  }

  addImportedObject(root, name = 'Imported GLB') {
    root.name = name;
    root.position.set(0, 0.2, 0);
    const object = new EngineObject({ name, type: 'glb', mesh: root, components: [] });
    root.userData.engineId = object.id;
    root.traverse(child => {
      child.userData.engineId = object.id;
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    this.objects.push(object);
    this.scene.add(root);
    return object;
  }

  setSkyImage(url) {
    new THREE.TextureLoader().load(url, texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.mapping = THREE.EquirectangularReflectionMapping;
      this.scene.background = texture;
      this.scene.environment = texture;
      this.scene.fog = null;
    });
  }

  applyTextureToSelected(object, url, options = {}) {
    if (!object) return;
    new THREE.TextureLoader().load(url, texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(options.repeat || 1, options.repeat || 1);
      object.mesh.traverse?.(child => {
        if (child.material) {
          const material = Array.isArray(child.material) ? child.material[0] : child.material;
          material.map = texture;
          material.needsUpdate = true;
        }
      });
      if (object.mesh.material) {
        const material = Array.isArray(object.mesh.material) ? object.mesh.material[0] : object.mesh.material;
        material.map = texture;
        material.needsUpdate = true;
      }
    });
  }

  applyNormalToSelected(object, url, options = {}) {
    if (!object) return;
    new THREE.TextureLoader().load(url, texture => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(options.repeat || 1, options.repeat || 1);
      object.mesh.traverse?.(child => {
        if (child.material && 'normalMap' in child.material) {
          child.material.normalMap = texture;
          child.material.needsUpdate = true;
        }
      });
      if (object.mesh.material && 'normalMap' in object.mesh.material) {
        object.mesh.material.normalMap = texture;
        object.mesh.material.needsUpdate = true;
      }
    });
  }

  addLight(type) {
    const light = type === 'spotLight'
      ? new THREE.SpotLight('#fff1c1', 45, 20, Math.PI / 5, 0.45)
      : new THREE.PointLight('#8bd3ff', 18, 16);
    light.position.set(0, 3.5, 1.5);
    light.castShadow = true;
    const helperMesh = new THREE.Mesh(
      type === 'spotLight' ? new THREE.ConeGeometry(0.28, 0.6, 24) : new THREE.SphereGeometry(0.22, 24, 12),
      new THREE.MeshBasicMaterial({ color: type === 'spotLight' ? '#fff1c1' : '#8bd3ff' })
    );
    helperMesh.add(light);
    helperMesh.name = type;
    const object = new EngineObject({ name: type === 'spotLight' ? 'Spot Light' : 'Point Light', type, mesh: helperMesh, components: [] });
    helperMesh.userData.engineId = object.id;
    this.objects.push(object);
    this.scene.add(helperMesh);
    return object;
  }

  addParticles() {
    const count = 260;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 4;
      positions[i * 3 + 1] = Math.random() * 3 + 0.3;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: '#ffe08a', size: 0.05, transparent: true, opacity: 0.9 });
    const points = new THREE.Points(geometry, material);
    points.name = 'Particle Cloud';
    const object = new EngineObject({ name: 'Particle Cloud', type: 'particles', mesh: points, components: [new RuntimeScript('spin')] });
    points.userData.engineId = object.id;
    this.objects.push(object);
    this.scene.add(points);
    return object;
  }

  setQuality(level) {
    const settings = {
      ultra: { pixelRatio: 2, shadows: true, tone: 1.2 },
      high: { pixelRatio: 1.5, shadows: true, tone: 1.1 },
      balanced: { pixelRatio: 1, shadows: true, tone: 1 },
      low: { pixelRatio: 0.75, shadows: false, tone: 0.95 }
    }[level] || {};
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, settings.pixelRatio || 1));
    this.renderer.shadowMap.enabled = settings.shadows;
    this.renderer.toneMappingExposure = settings.tone;
  }

  duplicate(object) {
    if (!object) return null;
    const mesh = object.mesh.clone();
    mesh.traverse?.(child => {
      if (child.geometry) child.geometry = child.geometry.clone();
      if (child.material) child.material = Array.isArray(child.material) ? child.material.map(m => m.clone()) : child.material.clone();
    });
    if (mesh.geometry) mesh.geometry = object.mesh.geometry.clone();
    if (mesh.material) mesh.material = Array.isArray(object.mesh.material) ? object.mesh.material.map(m => m.clone()) : object.mesh.material.clone();
    mesh.position.x += 1.2;
    mesh.name = `${object.name} Copy`;
    const copy = new EngineObject({
      name: mesh.name,
      type: object.type,
      mesh,
      components: object.components.map(c => Object.assign(c.kind === 'zorixscript' ? new ZorixScript(c.source) : new RuntimeScript(c.kind), c))
    });
    mesh.userData.engineId = copy.id;
    this.objects.push(copy);
    this.scene.add(mesh);
    return copy;
  }

  remove(object) {
    if (!object) return;
    this.scene.remove(object.mesh);
    object.mesh.traverse?.(child => {
      child.geometry?.dispose?.();
      if (Array.isArray(child.material)) child.material.forEach(material => material.dispose?.());
      else child.material?.dispose?.();
    });
    object.mesh.geometry?.dispose?.();
    if (Array.isArray(object.mesh.material)) object.mesh.material.forEach(material => material.dispose?.());
    else object.mesh.material?.dispose?.();
    this.objects = this.objects.filter(item => item.id !== object.id);
  }

  start() {
    this.running = true;
    this.paused = false;
    this.clock.start();
  }

  stop() {
    this.running = false;
    this.paused = false;
    this.elapsed = 0;
  }

  tick() {
    this.resize();
    const dt = Math.min(this.clock.getDelta(), 0.033);
    if (this.running && !this.paused) {
      this.elapsed += dt;
      for (const object of this.objects) {
        if (object.enabled) {
          object.components.forEach(component => component.tick(object, dt, this.elapsed, this.camera, this));
          this.tickPhysics(object, dt);
        }
      }
    }
    this.renderer.render(this.scene, this.camera);
  }

  tickPhysics(object, dt) {
    if (!object.physics?.useGravity) return;
    const velocity = object.physics.velocity;
    velocity[1] += this.gravity * dt;
    object.mesh.position.x += velocity[0] * dt;
    object.mesh.position.y += velocity[1] * dt;
    object.mesh.position.z += velocity[2] * dt;
    if (object.physics.collider && object.mesh.position.y < 0.55) {
      object.mesh.position.y = 0.55;
      velocity[1] = Math.abs(velocity[1]) * object.physics.bounciness;
      if (Math.abs(velocity[1]) < 0.2) velocity[1] = 0;
    }
  }

  serialize() {
    return JSON.stringify({
      camera: this.camera.position.toArray(),
      objects: this.objects.map(object => ({
        id: object.id,
        name: object.name,
        type: object.type,
        enabled: object.enabled,
        physics: object.physics,
        transform: {
          position: object.mesh.position.toArray(),
          rotation: object.mesh.rotation.toArray().slice(0, 3),
          scale: object.mesh.scale.toArray()
        },
        material: this.serializeMaterial(object.mesh),
        components: object.components
      }))
    }, null, 2);
  }

  serializeMaterial(mesh) {
    let material = mesh.material;
    mesh.traverse?.(child => {
      if (!material && child.material) material = Array.isArray(child.material) ? child.material[0] : child.material;
    });
    if (Array.isArray(material)) material = material[0];
    if (!material) return null;
    return {
      color: material.color ? `#${material.color.getHexString()}` : null,
      roughness: material.roughness ?? null,
      metalness: material.metalness ?? null
    };
  }
}
