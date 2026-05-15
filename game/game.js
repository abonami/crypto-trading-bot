class HorrorGame {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x0a0a0a);
    document.body.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 1.6, 0);
    this.scene.fog = new THREE.Fog(0x0a0a0a, 100, 200);

    this.gameState = 'menu'; // menu, playing, gameOver, stageTransition
    this.currentStage = 1;
    this.maxStages = 5;
    this.playerHealth = 100;
    this.maxHealth = 100;
    this.enemies = [];
    this.enemiesDefeated = 0;
    this.currentEnemyCount = 4;

    this.setupLighting();
    this.setupEnvironment();
    this.setupControls();
    this.setupEventListeners();

    this.animate();
  }

  setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    // Red directional light for horror effect
    const directionalLight = new THREE.DirectionalLight(0xff0000, 0.5);
    directionalLight.position.set(10, 20, 10);
    this.scene.add(directionalLight);

    // Green spotlight for atmosphere
    const spotLight = new THREE.SpotLight(0x00ff00, 1);
    spotLight.position.set(0, 10, 0);
    spotLight.castShadow = true;
    this.scene.add(spotLight);
  }

  setupEnvironment() {
    // Floor
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    // Walls
    const wallGeometry = new THREE.BoxGeometry(100, 20, 2);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });

    const wall1 = new THREE.Mesh(wallGeometry, wallMaterial);
    wall1.position.z = -50;
    this.scene.add(wall1);

    const wall2 = new THREE.Mesh(wallGeometry, wallMaterial);
    wall2.position.z = 50;
    this.scene.add(wall2);

    // Atmosphere particles
    this.createAtmosphere();
  }

  createAtmosphere() {
    const particleCount = 100;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 200;
      positions[i + 1] = Math.random() * 40;
      positions[i + 2] = (Math.random() - 0.5) * 200;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00ff00,
      size: 0.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.3
    });

    this.particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(this.particles);
  }

  setupControls() {
    this.keys = {};
    this.mouse = { x: 0, y: 0, click: false };

    document.addEventListener('keydown', (e) => {
      this.keys[e.key.toUpperCase()] = true;
    });

    document.addEventListener('keyup', (e) => {
      this.keys[e.key.toUpperCase()] = false;
    });

    document.addEventListener('mousemove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    document.addEventListener('mousedown', () => {
      if (this.gameState === 'playing') {
        this.playerAttack();
        this.mouse.click = true;
      }
    });

    document.addEventListener('mouseup', () => {
      this.mouse.click = false;
    });
  }

  setupEventListeners() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  startGame() {
    this.gameState = 'stageTransition';
    document.getElementById('main-menu').style.display = 'none';
    this.spawnEnemies();
    this.showStageTransition();
  }

  spawnEnemies() {
    // Clear old enemies
    this.enemies.forEach(enemy => {
      this.scene.remove(enemy.mesh);
    });
    this.enemies = [];

    // Calculate enemy count for current stage
    let enemyCount = this.currentStage === this.maxStages ? 6 : 4;

    for (let i = 0; i < enemyCount; i++) {
      const enemy = this.createEnemy(i, enemyCount);
      this.enemies.push(enemy);
    }

    this.currentEnemyCount = enemyCount;
    this.enemiesDefeated = 0;
  }

  createEnemy(index, total) {
    // Create enemy body
    const geometry = new THREE.CapsuleGeometry(0.5, 1.8, 4, 8);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff0000 + (index * 0x001010),
      roughness: 0.7
    });
    const mesh = new THREE.Mesh(geometry, material);

    // Position enemies in circle around player
    const angle = (index / total) * Math.PI * 2;
    const radius = 5 + index * 0.5;
    mesh.position.x = Math.cos(angle) * radius;
    mesh.position.z = Math.sin(angle) * radius;
    mesh.position.y = 0;

    this.scene.add(mesh);

    return {
      mesh: mesh,
      health: 30 + (this.currentStage * 10),
      maxHealth: 30 + (this.currentStage * 10),
      speed: 0.5 + (this.currentStage * 0.1),
      damage: 5 + (this.currentStage * 2),
      attackCooldown: 0,
      index: index + 1
    };
  }

  updatePlayerMovement() {
    if (this.gameState !== 'playing') return;

    const moveSpeed = 0.2;
    const direction = new THREE.Vector3();

    if (this.keys['W']) direction.z -= 1;
    if (this.keys['S']) direction.z += 1;
    if (this.keys['A']) direction.x -= 1;
    if (this.keys['D']) direction.x += 1;

    if (direction.length() > 0) {
      direction.normalize();
      this.camera.position.x += direction.x * moveSpeed;
      this.camera.position.z += direction.z * moveSpeed;
    }

    // Look around with mouse
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y -= this.mouse.x * 0.01;
    this.camera.rotation.x -= this.mouse.y * 0.01;

    this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
  }

  updateEnemies() {
    if (this.gameState !== 'playing') return;

    this.enemies.forEach((enemy, index) => {
      if (enemy.health <= 0) return;

      // AI: Move towards player
      const direction = new THREE.Vector3();
      direction.subVectors(this.camera.position, enemy.mesh.position);
      direction.normalize();

      enemy.mesh.position.x += direction.x * enemy.speed;
      enemy.mesh.position.z += direction.z * enemy.speed;

      // Face player
      enemy.mesh.lookAt(this.camera.position);

      // Enemy attack
      const distToPlayer = this.camera.position.distanceTo(enemy.mesh.position);
      if (distToPlayer < 2) {
        enemy.attackCooldown--;
        if (enemy.attackCooldown <= 0) {
          this.takeDamage(enemy.damage);
          enemy.attackCooldown = 60;
        }
      }
    });

    // Remove defeated enemies
    this.enemies = this.enemies.filter(e => {
      if (e.health <= 0) {
        this.scene.remove(e.mesh);
        this.enemiesDefeated++;
        return false;
      }
      return true;
    });

    this.updateUI();

    // Check stage complete
    if (this.enemies.length === 0 && this.gameState === 'playing') {
      this.nextStage();
    }
  }

  playerAttack() {
    const raycaster = new THREE.Raycaster();
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.camera.quaternion);
    raycaster.ray.direction.copy(forward);
    raycaster.ray.origin.copy(this.camera.position);

    const intersects = raycaster.intersectObjects(this.enemies.map(e => e.mesh));

    if (intersects.length > 0) {
      const hitEnemy = this.enemies.find(e => e.mesh === intersects[0].object);
      if (hitEnemy) {
        hitEnemy.health -= 15;
        // Visual feedback
        hitEnemy.mesh.material.color.setHex(0xffff00);
        setTimeout(() => {
          if (hitEnemy.health > 0) {
            hitEnemy.mesh.material.color.setHex(0xff0000 + (hitEnemy.index * 0x001010));
          }
        }, 100);
      }
    }
  }

  takeDamage(amount) {
    this.playerHealth = Math.max(0, this.playerHealth - amount);

    if (this.playerHealth <= 0) {
      this.gameOver(false);
    }
  }

  nextStage() {
    if (this.currentStage >= this.maxStages) {
      this.gameOver(true);
    } else {
      this.currentStage++;
      this.gameState = 'stageTransition';
      this.showStageTransition();
      this.spawnEnemies();
    }
  }

  showStageTransition() {
    const transitionEl = document.getElementById('stage-transition');
    document.getElementById('transition-text').textContent = `المرحلة ${this.currentStage}`;
    transitionEl.style.display = 'block';

    setTimeout(() => {
      transitionEl.style.display = 'none';
      this.gameState = 'playing';
    }, 3000);
  }

  gameOver(won) {
    this.gameState = 'gameOver';
    const menu = document.getElementById('game-over');
    const message = document.getElementById('end-message');

    if (won) {
      message.textContent = 'لقد فزت! انتهيت من جميع المراحل!';
      message.style.color = '#0f0';
    } else {
      message.textContent = 'لقد خسرت! حاول مرة أخرى';
      message.style.color = '#f00';
    }

    menu.style.display = 'block';
  }

  updateUI() {
    const healthPercent = (this.playerHealth / this.maxHealth) * 100;
    document.getElementById('health-fill').style.width = healthPercent + '%';
    document.getElementById('stage-num').textContent = this.currentStage;
    document.getElementById('enemy-num').textContent = this.enemiesDefeated + 1;
    document.getElementById('remaining').textContent = Math.max(0, this.enemies.length);
  }

  restart() {
    this.currentStage = 1;
    this.playerHealth = this.maxHealth;
    this.enemiesDefeated = 0;
    this.gameState = 'menu';
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('main-menu').style.display = 'block';
    this.camera.position.set(0, 1.6, 0);
    this.camera.rotation.set(0, 0, 0);
  }

  animate = () => {
    requestAnimationFrame(this.animate);

    if (this.gameState === 'playing') {
      this.updatePlayerMovement();
      this.updateEnemies();
    }

    // Rotate particles for atmosphere
    if (this.particles) {
      this.particles.rotation.y += 0.0001;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize game
const game = new HorrorGame();
