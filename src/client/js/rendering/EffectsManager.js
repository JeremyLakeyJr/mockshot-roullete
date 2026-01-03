/**
 * Visual Effects for Buckshot Roulette
 * Particle systems, flashes, and other effects
 */

import * as THREE from 'three';

export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.activeEffects = [];
  }

  /**
   * Create muzzle flash effect
   * @param {THREE.Vector3} position 
   */
  createMuzzleFlash(position) {
    // Flash light
    const flashLight = new THREE.PointLight(0xffaa00, 50, 5);
    flashLight.position.copy(position);
    this.scene.add(flashLight);

    // Flash geometry
    const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
      transparent: true,
      opacity: 1
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(position);
    this.scene.add(flash);

    // Animate flash
    const startTime = performance.now();
    const duration = 100;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        flash.scale.setScalar(1 + progress * 2);
        flashMaterial.opacity = 1 - progress;
        flashLight.intensity = 50 * (1 - progress);
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(flash);
        this.scene.remove(flashLight);
        flashGeometry.dispose();
        flashMaterial.dispose();
      }
    };

    animate();
  }

  /**
   * Create smoke particles
   * @param {THREE.Vector3} position 
   */
  createSmoke(position) {
    const particleCount = 20;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(0.03 + Math.random() * 0.03, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0x666666,
        transparent: true,
        opacity: 0.6
      });
      const particle = new THREE.Mesh(geometry, material);
      
      particle.position.copy(position);
      particle.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.02,
        Math.random() * 0.015,
        (Math.random() - 0.5) * 0.02
      );
      
      this.scene.add(particle);
      particles.push({ mesh: particle, material, geometry });
    }

    const startTime = performance.now();
    const duration = 1500;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;

      particles.forEach(({ mesh, material }) => {
        mesh.position.add(mesh.velocity);
        mesh.scale.multiplyScalar(1.02);
        material.opacity = 0.6 * (1 - progress);
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        particles.forEach(({ mesh, material, geometry }) => {
          this.scene.remove(mesh);
          geometry.dispose();
          material.dispose();
        });
      }
    };

    animate();
  }

  /**
   * Create damage indicator
   * @param {string} target - 'player' or 'opponent'
   */
  createDamageFlash(target) {
    // Red flash overlay on screen
    const flashOverlay = document.createElement('div');
    flashOverlay.className = 'damage-flash';
    flashOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, transparent 30%, rgba(255, 0, 0, 0.4) 100%);
      pointer-events: none;
      z-index: 1000;
      animation: damageFlash 0.3s ease-out forwards;
    `;
    document.body.appendChild(flashOverlay);

    setTimeout(() => {
      document.body.removeChild(flashOverlay);
    }, 300);
  }

  /**
   * Create blank shot effect (click sound visualization)
   * @param {THREE.Vector3} position 
   */
  createBlankEffect(position) {
    // Small spark
    const sparkGeometry = new THREE.SphereGeometry(0.02, 8, 8);
    const sparkMaterial = new THREE.MeshBasicMaterial({
      color: 0xffcc00,
      transparent: true,
      opacity: 1
    });
    const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
    spark.position.copy(position);
    this.scene.add(spark);

    const startTime = performance.now();
    const duration = 200;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        sparkMaterial.opacity = 1 - progress;
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(spark);
        sparkGeometry.dispose();
        sparkMaterial.dispose();
      }
    };

    animate();
  }

  /**
   * Create victory particles
   */
  createVictoryEffect() {
    const colors = [0xffd700, 0x00ff00, 0x00ffff, 0xff00ff];
    const particleCount = 100;

    for (let i = 0; i < particleCount; i++) {
      const geometry = new THREE.SphereGeometry(0.02, 4, 4);
      const material = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 1
      });
      const particle = new THREE.Mesh(geometry, material);

      particle.position.set(
        (Math.random() - 0.5) * 3,
        Math.random() * 2,
        (Math.random() - 0.5) * 3
      );
      particle.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.05,
        0.02 + Math.random() * 0.03,
        (Math.random() - 0.5) * 0.05
      );

      this.scene.add(particle);
      this.particles.push({ mesh: particle, material, geometry });
    }

    const startTime = performance.now();
    const duration = 3000;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;

      this.particles.forEach(({ mesh, material }) => {
        mesh.position.add(mesh.velocity);
        mesh.velocity.y -= 0.0008; // Gravity
        material.opacity = Math.max(0, 1 - progress);
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.clearParticles();
      }
    };

    animate();
  }

  /**
   * Create defeat effect (darker atmosphere)
   */
  createDefeatEffect() {
    // Darken the scene
    const vignette = document.createElement('div');
    vignette.className = 'defeat-vignette';
    vignette.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: radial-gradient(circle, transparent 20%, rgba(0, 0, 0, 0.7) 100%);
      pointer-events: none;
      z-index: 1000;
      animation: defeatFade 1s ease-out forwards;
    `;
    document.body.appendChild(vignette);

    setTimeout(() => {
      document.body.removeChild(vignette);
    }, 3000);
  }

  clearParticles() {
    this.particles.forEach(({ mesh, material, geometry }) => {
      this.scene.remove(mesh);
      geometry.dispose();
      material.dispose();
    });
    this.particles = [];
  }

  dispose() {
    this.clearParticles();
  }
}

export default EffectsManager;
