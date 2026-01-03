/**
 * 3D Shotgun Model for Buckshot Roulette
 * Creates and animates the shotgun using Three.js primitives
 */

import * as THREE from 'three';

export class ShotgunModel {
  constructor() {
    this.group = new THREE.Group();
    this.parts = {};
    this.animations = {};
    this.isAnimating = false;
    
    this.createShotgun();
  }

  createShotgun() {
    // Main body (receiver)
    const bodyGeometry = new THREE.BoxGeometry(0.15, 0.12, 0.8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.4,
      metalness: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.z = -0.1;
    body.castShadow = true;
    this.parts.body = body;
    this.group.add(body);

    // Barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.035, 0.04, 0.6, 16);
    const barrelMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.3,
      metalness: 0.9
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.7;
    barrel.position.y = 0.02;
    barrel.castShadow = true;
    this.parts.barrel = barrel;
    this.group.add(barrel);

    // Stock
    const stockGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.35);
    const stockMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a3728,
      roughness: 0.7,
      metalness: 0.1
    });
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.z = 0.38;
    stock.position.y = -0.02;
    stock.castShadow = true;
    this.parts.stock = stock;
    this.group.add(stock);

    // Grip
    const gripGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.08);
    const gripMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      roughness: 0.8,
      metalness: 0.1
    });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.y = -0.12;
    grip.position.z = 0.1;
    grip.rotation.x = 0.2;
    grip.castShadow = true;
    this.parts.grip = grip;
    this.group.add(grip);

    // Trigger guard
    const guardGeometry = new THREE.TorusGeometry(0.04, 0.008, 8, 12, Math.PI);
    const guardMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.4,
      metalness: 0.8
    });
    const guard = new THREE.Mesh(guardGeometry, guardMaterial);
    guard.rotation.x = Math.PI;
    guard.position.y = -0.06;
    guard.position.z = 0.02;
    this.parts.guard = guard;
    this.group.add(guard);

    // Pump handle
    const pumpGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.18, 12);
    const pumpMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      roughness: 0.7,
      metalness: 0.1
    });
    const pump = new THREE.Mesh(pumpGeometry, pumpMaterial);
    pump.rotation.x = Math.PI / 2;
    pump.position.z = -0.35;
    pump.position.y = -0.06;
    pump.castShadow = true;
    this.parts.pump = pump;
    this.group.add(pump);

    // Chamber indicator light
    const indicatorGeometry = new THREE.SphereGeometry(0.015, 8, 8);
    const indicatorMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 0.5
    });
    const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
    indicator.position.set(0.08, 0.06, -0.1);
    this.parts.indicator = indicator;
    this.group.add(indicator);

    // Position the whole group
    this.group.rotation.y = Math.PI;
    this.group.position.set(0, 0, 0.5);
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

  /**
   * Animate pump action
   */
  async animatePump() {
    if (this.isAnimating) return;
    this.isAnimating = true;

    const pump = this.parts.pump;
    const originalZ = pump.position.z;
    const pullbackZ = originalZ + 0.15;
    
    // Pull back
    await this.animateProperty(pump.position, 'z', pullbackZ, 150);
    // Push forward
    await this.animateProperty(pump.position, 'z', originalZ, 100);

    this.isAnimating = false;
  }

  /**
   * Animate shooting recoil
   */
  async animateShoot() {
    if (this.isAnimating) return;
    this.isAnimating = true;

    const originalZ = this.group.position.z;
    const originalRotX = this.group.rotation.x;

    // Recoil back and up
    await Promise.all([
      this.animateProperty(this.group.position, 'z', originalZ + 0.2, 80),
      this.animateProperty(this.group.rotation, 'x', originalRotX - 0.15, 80)
    ]);

    // Return to position
    await Promise.all([
      this.animateProperty(this.group.position, 'z', originalZ, 200),
      this.animateProperty(this.group.rotation, 'x', originalRotX, 200)
    ]);

    this.isAnimating = false;
  }

  /**
   * Animate pointing at target
   * @param {string} target - 'self' or 'opponent'
   */
  async animateAim(target) {
    if (this.isAnimating) return;
    this.isAnimating = true;

    const targetRotY = target === 'self' ? Math.PI - 0.3 : Math.PI + 0.3;
    const targetPosX = target === 'self' ? 0.3 : -0.3;

    await Promise.all([
      this.animateProperty(this.group.rotation, 'y', targetRotY, 300),
      this.animateProperty(this.group.position, 'x', targetPosX, 300)
    ]);

    this.isAnimating = false;
  }

  /**
   * Reset to center position
   */
  async resetPosition() {
    if (this.isAnimating) return;
    this.isAnimating = true;

    await Promise.all([
      this.animateProperty(this.group.rotation, 'y', Math.PI, 300),
      this.animateProperty(this.group.position, 'x', 0, 300)
    ]);

    this.isAnimating = false;
  }

  /**
   * Animate loading shells
   */
  async animateLoad() {
    if (this.isAnimating) return;
    this.isAnimating = true;

    // Tilt the gun to show loading
    await this.animateProperty(this.group.rotation, 'z', 0.5, 300);
    
    // Flash the indicator
    this.parts.indicator.material.emissiveIntensity = 2;
    await this.delay(500);
    this.parts.indicator.material.emissiveIntensity = 0.5;

    // Return to position
    await this.animateProperty(this.group.rotation, 'z', 0, 300);

    this.isAnimating = false;
  }

  /**
   * Set indicator color based on shell type
   * @param {string} type - 'live', 'blank', or 'neutral'
   */
  setIndicatorColor(type) {
    const colors = {
      live: { color: 0xff0000, emissive: 0xff0000 },
      blank: { color: 0x0088ff, emissive: 0x0088ff },
      neutral: { color: 0x00ff00, emissive: 0x00ff00 }
    };

    const colorSet = colors[type] || colors.neutral;
    this.parts.indicator.material.color.setHex(colorSet.color);
    this.parts.indicator.material.emissive.setHex(colorSet.emissive);
  }

  /**
   * Helper to animate a property
   */
  animateProperty(obj, prop, target, duration) {
    return new Promise(resolve => {
      const start = obj[prop];
      const startTime = performance.now();

      const update = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = this.easeOutCubic(progress);

        obj[prop] = start + (target - start) * eased;

        if (progress < 1) {
          requestAnimationFrame(update);
        } else {
          resolve();
        }
      };

      update();
    });
  }

  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

export default ShotgunModel;
