/**
 * Shell Models for Buckshot Roulette
 * Creates 3D shell representations
 */

import * as THREE from 'three';

export class ShellModel {
  constructor(type = 'live') {
    this.type = type;
    this.group = new THREE.Group();
    this.createShell();
  }

  createShell() {
    // Shell casing
    const casingGeometry = new THREE.CylinderGeometry(0.018, 0.02, 0.06, 12);
    const casingMaterial = new THREE.MeshStandardMaterial({
      color: this.type === 'live' ? 0xcc0000 : 0x0066cc,
      roughness: 0.5,
      metalness: 0.3
    });
    const casing = new THREE.Mesh(casingGeometry, casingMaterial);
    casing.castShadow = true;
    this.group.add(casing);

    // Brass base
    const baseGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.015, 12);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0xb8860b,
      roughness: 0.3,
      metalness: 0.8
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -0.025;
    base.castShadow = true;
    this.group.add(base);

    // Primer
    const primerGeometry = new THREE.CircleGeometry(0.008, 16);
    const primerMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.4,
      metalness: 0.5
    });
    const primer = new THREE.Mesh(primerGeometry, primerMaterial);
    primer.rotation.x = -Math.PI / 2;
    primer.position.y = -0.032;
    this.group.add(primer);
  }

  getGroup() {
    return this.group;
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  setRotation(x, y, z) {
    this.group.rotation.set(x, y, z);
  }

  dispose() {
    this.group.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        object.material.dispose();
      }
    });
  }
}

/**
 * Shell Display Manager
 * Manages display of shells on the table
 */
export class ShellDisplay {
  constructor(scene) {
    this.scene = scene;
    this.shells = [];
    this.group = new THREE.Group();
    this.scene.add(this.group);
  }

  /**
   * Show shells being loaded
   * @param {number} liveCount 
   * @param {number} blankCount 
   */
  displayShells(liveCount, blankCount) {
    this.clearShells();

    const totalShells = liveCount + blankCount;
    const radius = 0.8;
    const angleStep = (Math.PI * 0.8) / Math.max(totalShells - 1, 1);
    const startAngle = -Math.PI * 0.4;

    // Create live shells
    for (let i = 0; i < liveCount; i++) {
      const shell = new ShellModel('live');
      const angle = startAngle + i * angleStep;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius - 0.5;
      shell.setPosition(x, -0.35, z);
      shell.setRotation(Math.PI / 2 - 0.2, 0, angle);
      this.shells.push(shell);
      this.group.add(shell.getGroup());
    }

    // Create blank shells
    for (let i = 0; i < blankCount; i++) {
      const shell = new ShellModel('blank');
      const angle = startAngle + (liveCount + i) * angleStep;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius - 0.5;
      shell.setPosition(x, -0.35, z);
      shell.setRotation(Math.PI / 2 - 0.2, 0, angle);
      this.shells.push(shell);
      this.group.add(shell.getGroup());
    }
  }

  /**
   * Animate shells being loaded into the gun
   */
  async animateLoad(callback) {
    const promises = this.shells.map((shell, index) => {
      return new Promise(resolve => {
        setTimeout(() => {
          this.animateShellLoad(shell, index);
          resolve();
        }, index * 150);
      });
    });

    await Promise.all(promises);
    
    // Hide shells after loading
    setTimeout(() => {
      this.clearShells();
      if (callback) callback();
    }, 500);
  }

  animateShellLoad(shell, index) {
    const group = shell.getGroup();
    const startY = group.position.y;
    const targetY = startY + 0.5;
    const duration = 300;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Move up and fade out
      group.position.y = startY + (targetY - startY) * progress;
      group.children.forEach(child => {
        if (child.material) {
          child.material.opacity = 1 - progress;
          child.material.transparent = true;
        }
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  clearShells() {
    this.shells.forEach(shell => {
      this.group.remove(shell.getGroup());
      shell.dispose();
    });
    this.shells = [];
  }

  dispose() {
    this.clearShells();
    this.scene.remove(this.group);
  }
}

export default ShellModel;
