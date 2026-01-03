/**
 * 3D Scene Manager for Buckshot Roulette
 * Handles Three.js scene setup, rendering, and camera controls
 */

import * as THREE from 'three';

export class SceneManager {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.animationId = null;
    this.objects = {};
    this.lights = {};
    
    this.init();
  }

  init() {
    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 5, 20);

    // Create camera
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    this.camera.position.set(0, 3, 4);
    this.camera.lookAt(0, 0, 0);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);

    // Add lights
    this.setupLights();

    // Add environment
    this.createEnvironment();

    // Handle resize
    window.addEventListener('resize', () => this.onResize());
  }

  setupLights() {
    // Ambient light for base illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);
    this.lights.ambient = ambientLight;

    // Main spotlight from above
    const mainLight = new THREE.SpotLight(0xffffff, 100);
    mainLight.position.set(0, 8, 0);
    mainLight.angle = Math.PI / 4;
    mainLight.penumbra = 0.3;
    mainLight.decay = 2;
    mainLight.distance = 20;
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    mainLight.shadow.camera.near = 1;
    mainLight.shadow.camera.far = 15;
    this.scene.add(mainLight);
    this.lights.main = mainLight;

    // Accent lights for dramatic effect
    const redLight = new THREE.PointLight(0xff4444, 20, 10);
    redLight.position.set(-3, 2, -2);
    this.scene.add(redLight);
    this.lights.red = redLight;

    const blueLight = new THREE.PointLight(0x4444ff, 20, 10);
    blueLight.position.set(3, 2, -2);
    this.scene.add(blueLight);
    this.lights.blue = blueLight;
  }

  createEnvironment() {
    // Create table
    const tableGeometry = new THREE.CylinderGeometry(2.5, 2.5, 0.15, 32);
    const tableMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d4a22,
      roughness: 0.8,
      metalness: 0.1
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.y = -0.5;
    table.receiveShadow = true;
    this.scene.add(table);
    this.objects.table = table;

    // Table edge
    const edgeGeometry = new THREE.TorusGeometry(2.5, 0.08, 16, 32);
    const edgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.5,
      metalness: 0.3
    });
    const tableEdge = new THREE.Mesh(edgeGeometry, edgeMaterial);
    tableEdge.rotation.x = Math.PI / 2;
    tableEdge.position.y = -0.42;
    this.scene.add(tableEdge);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f0f1a,
      roughness: 0.9,
      metalness: 0
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1;
    floor.receiveShadow = true;
    this.scene.add(floor);
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  startRenderLoop(updateCallback) {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      
      if (updateCallback) {
        updateCallback();
      }

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  stopRenderLoop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  addObject(name, object) {
    this.objects[name] = object;
    this.scene.add(object);
  }

  removeObject(name) {
    if (this.objects[name]) {
      this.scene.remove(this.objects[name]);
      delete this.objects[name];
    }
  }

  getObject(name) {
    return this.objects[name];
  }

  setCameraPosition(x, y, z, lookAtX = 0, lookAtY = 0, lookAtZ = 0) {
    this.camera.position.set(x, y, z);
    this.camera.lookAt(lookAtX, lookAtY, lookAtZ);
  }

  animateCameraTo(targetPos, targetLookAt, duration = 1000) {
    const startPos = this.camera.position.clone();
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = this.easeOutCubic(progress);

      this.camera.position.lerpVectors(startPos, targetPos, eased);
      this.camera.lookAt(targetLookAt);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  dispose() {
    this.stopRenderLoop();
    
    // Dispose of geometries and materials
    this.scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

export default SceneManager;
