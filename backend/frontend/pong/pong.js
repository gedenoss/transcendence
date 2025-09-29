
(async function startPongGame(){ 
    let gameStartTime = null;
    let gameEndTime = null;
    let gameDurationSeconds = 0;
    let engine = null;
    let scene = null;
    let advancedTexture = null;
    let renderLoop = null;
    let observers = [];
    let gameInterrupted = false;
    let gameActuallyStarted = false; 
    let autoDisposeTimeout = null;
    
      const mode = window.gameMode || "local";

    function startGameTimer() {
        gameStartTime = Date.now();
        gameEndTime = null;
        gameDurationSeconds = 0;
    }

    function stopGameTimer() {
        if (gameStartTime) {
            gameEndTime = Date.now();
            gameDurationSeconds = Math.floor((gameEndTime - gameStartTime) / 1000);
        }
    }

    const originalCountdown = countdown;
    countdown = async function(...args) {
        if (!gameStarted && !isGameOver && !gameStartTime) {
            startGameTimer();
            gameActuallyStarted = true; 
        }
        return originalCountdown.apply(this, args);
    };

const canvas = document.getElementById("renderCanvas");
engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
let isGameOver = false;
let gameStarted = false;
let isWaitingAfterGoal = false;
let hasCollidedLeft = false;
let hasCollidedRight = false;
let scoreLeft = 0;
let scoreRight = 0;
let fontDataGlobal = null;
let myText = null;
let myText2 = null;

const GAME_CONFIG = {
    playWidth: 19,
    playHeight: 3,
    ballSpeed: 0.15,
    ballInitialSpeed: 0.15,
    scoreLimit: 5,
    maxSpeed: 0.6,
    accelerationFactor: 1.01,
    minZ: -4.3,
    maxZ: 4.3,
    ballRadius: 0.15,
    paddleHalfWidth: 0.1,
    paddleHalfDepth: 0.65,
    accelerationOnHit: 1.05
};

const boxes = [];
const keys = {};
let leftPaddle, rightPaddle;

function setupEventListeners() {
    // Initialise le tableau si inexistant
    window._gameEventListeners = [];

    function addListener(target, type, handler) {
        target.addEventListener(type, handler);
        window._gameEventListeners.push({ target, type, handler });
    }

    // Handler keydown
    const keydownHandler = (e) => {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;  
        }

        const key = e.key.toLowerCase();
        keys[key] = true;

        if (key === "r" && isGameOver && mode === "local") {
            restartGame();
        }
        e.preventDefault();
    };

    // Handler keyup
    const keyupHandler = (e) => {
        keys[e.key.toLowerCase()] = false;
        e.preventDefault();
    };

    // Handler resize
    const resizeHandler = () => {
        if (engine) engine.resize();
    };

    // Ajout avec stockage
    addListener(window, "keydown", keydownHandler);
    addListener(window, "keyup", keyupHandler);
    addListener(window, "resize", resizeHandler);
}



function restartGame() {
    if (autoDisposeTimeout) {
        clearTimeout(autoDisposeTimeout);
        autoDisposeTimeout = null;
    }

    scoreLeft = 0;
    scoreRight = 0;
    isGameOver = false;
    gameStarted = false;
    isWaitingAfterGoal = false;
    hasCollidedLeft = false;
    hasCollidedRight = false;
    gameActuallyStarted = false;
    gameInterrupted = false; 
    window.enableGameMode();
    
    if (scene.victoryText) {
        scene.victoryText.dispose();
        scene.victoryText = null;
    }
    if (scene.restartText) {
        scene.restartText.dispose();
        scene.restartText = null;
    }
    
    scene.ball.isVisible = true;
    scene.ball.position.set(0, 0.5, 0);
    scene.ballVelocity.set(0, 0, 0);
    
    leftPaddle.position.set(GAME_CONFIG.playWidth / 2 - 0.2, 0.5, 0);
    rightPaddle.position.set(-GAME_CONFIG.playWidth / 2 + 0.2, 0.5, 0);
    
    updateScoreTextMeshes();
    
    setTimeout(async() => {
        await countdown();
        const direction = Math.random() < 0.5 ? -1 : 1;
        scene.ballVelocity.set(
            GAME_CONFIG.ballInitialSpeed * direction,
            0,
            (Math.random() - 0.5) * 0.02
        );
        gameStarted = true;
        gameActuallyStarted = true;
    }, 1000);
}

async function loadFont() {
    try {
        const response = await fetch("https://assets.babylonjs.com/fonts/Droid Sans_Regular.json");
        fontDataGlobal = await response.json();
        createInitialScoreText();
    } catch (error) {
        console.warn("Erreur de chargement de police:", error);
    }
}

function createInitialScoreText() {
    if (!fontDataGlobal) return;
    try {
        myText = BABYLON.MeshBuilder.CreateText("myText", scoreLeft.toString(), fontDataGlobal, {
            size: 5,
            resolution: 32, // Réduit pour les performances
            depth: 0.5
        });
        myText2 = BABYLON.MeshBuilder.CreateText("myText2", scoreRight.toString(), fontDataGlobal, {
            size: 5,
            resolution: 32,
            depth: 0.5
        });
        const scoreMaterial = new BABYLON.PBRMaterial("scoreMat", scene);
        scoreMaterial.metallic = 1.0;
        scoreMaterial.roughness = 0.1; // Plus petit = plus brillant
        scoreMaterial.albedoColor = new BABYLON.Color3(0, 0, 0); // Couleur noire
        scoreMaterial.environmentTexture = scene.environmentTexture; // Reflets HDR
        scoreMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05); // Un petit glow noir visible

        
        myText.material = scoreMaterial;
        myText2.material = scoreMaterial;
        myText.position.set(-8, 2, 4);
        myText2.position.set(8, 2, 4);
    } catch (error) {
        console.warn("Erreur création texte:", error);
    }
}

function updateScoreTextMeshes() {
    if (!fontDataGlobal || !myText || !myText2) return;
    try {
        myText.dispose();
        myText2.dispose();

        myText = BABYLON.MeshBuilder.CreateText("myText", scoreLeft.toString(), fontDataGlobal, {
            size: 5,
            resolution: 32,
            depth: 0.5
        });
        myText2 = BABYLON.MeshBuilder.CreateText("myText2", scoreRight.toString(), fontDataGlobal, {
            size: 5,
            resolution: 32,
            depth: 0.5
        });
        const scoreMaterial = new BABYLON.PBRMaterial("scoreMat", scene);
        scoreMaterial.metallic = 1.0;
        scoreMaterial.roughness = 0.1; // Plus petit = plus brillant
        scoreMaterial.albedoColor = new BABYLON.Color3(0, 0, 0); // Couleur noire
        scoreMaterial.environmentTexture = scene.environmentTexture; // Reflets HDR
        scoreMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05); // Un petit glow noir visible
        
        myText.material = scoreMaterial;
        myText2.material = scoreMaterial;
        myText.position.set(-8, 2, 4);
        myText2.position.set(8, 2, 4);
    } catch (error) {
        console.warn("Erreur mise à jour score:", error);
    }
}

function createLights(scene) {
    const colors = [
        new BABYLON.Color3(1.0, 0.1, 0.5),
        new BABYLON.Color3(1.0, 0.1, 0.5),
        new BABYLON.Color3(1.0, 0.1, 0.5),
        new BABYLON.Color3(1.0, 0.1, 0.5)
    ];
    const positions = [
        new BABYLON.Vector3(-8, 5.2, 5),
        new BABYLON.Vector3(-2.7, 5.2, 5),
        new BABYLON.Vector3(2.7, 5.2, 5),
        new BABYLON.Vector3(8, 5.2, 5)
    ];
    for (let i = 0; i < 4; i++) {
        const box = BABYLON.MeshBuilder.CreateBox(`lightBox${i}`, {
            width: 4,
            height: 10,
            depth: 0.1
        }, scene);

        const material = new BABYLON.StandardMaterial(`lightMat${i}`, scene);
        material.disableLighting = true;
        material.emissiveColor = colors[i];
        box.material = material;

        box.position = positions[i];

        const pointLight = new BABYLON.RectAreaLight(`pointLight${i}`, new BABYLON.Vector3(0, 0, 0), 6, 6, scene);
        pointLight.parent = box;
        pointLight.diffuse = colors[i];
        pointLight.specular = colors[i];
        pointLight.intensity = 2;
        boxes.push({ box, light: pointLight, material });
    }
}

function playLightWave(startIndex, direction = 1) {
    const delay = 100;
    const color = new BABYLON.Color3(1.0, 0.1, 0.5);

    for (let i = 0; i < Math.min(boxes.length, 4); i++) {
        const index = startIndex + i * direction;
        if (index < 0 || index >= boxes.length) break;

        setTimeout(() => {
            const { box, light, material } = boxes[index];
            if (box && light && material) {
                box.scaling.setAll(1.2);
                light.intensity = 3;
                material.emissiveColor = color;
                light.diffuse = color;
                setTimeout(() => {
                    box.scaling.setAll(1);
                    light.intensity = 1;
                }, delay);
            }
        }, delay * i);
    }
}

async function resetBallWithDelay() {
    scene.ball.position.set(0, 0.5, 0);
    scene.ballVelocity.set(0, 0, 0);
    countdown();
    await new Promise(resolve => setTimeout(resolve, 500));
    const direction = Math.random() < 0.5 ? -1 : 1;
    scene.ballVelocity.set(
        GAME_CONFIG.ballInitialSpeed * direction,
        0,
        (Math.random() - 0.5) * 0.02
    );
    isWaitingAfterGoal = false;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function countdown() {
    if (boxes.length === 0) return; // Sécurité si les boxes ne sont pas encore créées
    
    const delay = 300; // Réduit pour un effet plus rapide
    const green = new BABYLON.Color3(0.2, 1.0, 0.2);
    const pink = new BABYLON.Color3(1.0, 0.1, 0.5);
    const originalIntensity = 2;
    const highlightIntensity = 4;

    try {
        for (let i = 0; i < boxes.length; i++) {
            const { box, light, material } = boxes[i];
            
            if (box && light && material) {
                box.scaling.setAll(1.1);
                material.emissiveColor = green;
                light.diffuse = green;
                light.intensity = highlightIntensity;

                await sleep(delay);

                box.scaling.setAll(1.0);
                material.emissiveColor = pink;
                light.diffuse = pink;
                light.intensity = originalIntensity;
            }
        }

        for (let i = 0; i < boxes.length; i++) {
            const { box, light, material } = boxes[i];
            if (box && light && material) {
                box.scaling.setAll(1.2);
                material.emissiveColor = green;
                light.diffuse = green;
                light.intensity = highlightIntensity;
            }
        }

        await sleep(delay);

        for (let i = 0; i < boxes.length; i++) {
            const { box, light, material } = boxes[i];
            if (box && light && material) {
                box.scaling.setAll(1.0);
                material.emissiveColor = pink;
                light.diffuse = pink;
                light.intensity = originalIntensity;
            }
        }

        await sleep(delay);

    } catch (error) {
        console.warn("Erreur dans countdown:", error);
        
        for (let i = 0; i < boxes.length; i++) {
            const { box, light, material } = boxes[i];
            if (box && light && material) {
                box.scaling.setAll(1.0);
                material.emissiveColor = pink;
                light.diffuse = pink;
                light.intensity = originalIntensity;
            }
        }
    }
}


async function resetBallWithDelay() {
    if (!window.gameActive || !scene || !scene.ball || !scene.ballVelocity) return;
    
    scene.ball.position.set(0, 0.5, 0);
    scene.ballVelocity.set(0, 0, 0);
    
    await countdown();
    
    await sleep(200);
    
    const direction = Math.random() < 0.5 ? -1 : 1;
    scene.ballVelocity.set(
        GAME_CONFIG.ballInitialSpeed * direction,
        0,
        (Math.random() - 0.5) * 0.02
    );
    
    isWaitingAfterGoal = false;
}

function createScene() {
    const scene = new BABYLON.Scene(engine);
    const hdrTexture = BABYLON.CubeTexture.CreateFromPrefilteredData(
        "https://playground.babylonjs.com/textures/environment.env",
        scene
    );
    scene.environmentTexture = hdrTexture;

    scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);
    window.gameActive = true;

    const camera2 = new BABYLON.ArcRotateCamera(
        "cam2",
        Math.PI / 2 + Math.PI,      // alpha : vue en oblique (-45° sur le côté)
        Math.PI / 3,     // beta  : ≃51° (un peu plus haut qu’avant)
        20,                // radius : 12 unités (très proche)
        new BABYLON.Vector3(0, 1, 0), // cible un peu surélevée
        scene
    );
    camera2.lowerRadius = 8;
    camera2.upperRadius = 20;
    camera2.lowerBeta   = Math.PI / 6;  // 30°
    camera2.upperBeta   = Math.PI / 2;  // 90°
    camera2.detachControl(canvas);

    const ground = BABYLON.MeshBuilder.CreateGround("ground", {
        width: 20, 
        height: 10
    }, scene);
    
    const mirrorMat = new BABYLON.PBRMaterial("mirror", scene);
    mirrorMat.metallic = 1.0;
    mirrorMat.roughness = 0.1;
    mirrorMat.environmentTexture = hdrTexture; // ou scene.environmentTexture
    mirrorMat.albedoColor = new BABYLON.Color3(0, 0, 0);
    ground.material = mirrorMat;
    scene.ground = ground;

    const scoreMaterial = new BABYLON.PBRMaterial("scoreMat", scene);
    scoreMaterial.metallic = 1.0;
    scoreMaterial.roughness = 0.1; // Plus petit = plus brillant
    scoreMaterial.albedoColor = new BABYLON.Color3(0, 0, 0); // Couleur noire
    scoreMaterial.environmentTexture = scene.environmentTexture; // Reflets HDR
    scoreMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05); // Un petit glow noir visible

    const paddleOptions = { width: 0.2, height: 0.3, depth: 1.3 };
    leftPaddle = BABYLON.MeshBuilder.CreateBox("leftPaddle", paddleOptions, scene);
    leftPaddle.position.set(GAME_CONFIG.playWidth / 2 - 0.2, 0.5, 0);
    rightPaddle = BABYLON.MeshBuilder.CreateBox("rightPaddle", paddleOptions, scene);
    rightPaddle.position.set(-GAME_CONFIG.playWidth / 2 + 0.2, 0.5, 0);
    
    const rightMaterial = new BABYLON.PBRMaterial("rightPaddleMat", scene);
    rightMaterial.metallic = 1.0;
    rightMaterial.roughness = 0.2;
    rightMaterial.albedoColor = new BABYLON.Color3(0.1, 0.6, 1);
    rightMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.6, 1);
    rightPaddle.material = rightMaterial;

    const leftMaterial = new BABYLON.PBRMaterial("leftPaddleMat", scene);
    leftMaterial.metallic = 1.0;
    leftMaterial.roughness = 0.2;
    leftMaterial.albedoColor = new BABYLON.Color3(1, 0.1, 0.1);
    leftMaterial.emissiveColor = new BABYLON.Color3(1, 0.1, 0.1);
    leftPaddle.material = leftMaterial;
    
    const ball = BABYLON.MeshBuilder.CreateSphere("ball", { diameter: 0.3 }, scene);
    ball.position.set(0, 0.5, 0);

    const ballMaterial = new BABYLON.StandardMaterial("ballMat", scene);
    ballMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
    ball.material = ballMaterial;
    scene.ball = ball;
    scene.ballVelocity = new BABYLON.Vector3(0, 0, 0);
    
    countdown();

    scene.explosionSpheres = [];
    for (let i = 0; i < 500; i++) {
        const sphere = BABYLON.MeshBuilder.CreateSphere(`particle${i}`, {
            diameter: 0.2 + Math.random() * 0.4,
            segments: 6 // Réduit pour les performances
        }, scene);
        const mat = new BABYLON.StandardMaterial(`particleMat${i}`, scene);
        sphere.isVisible = false;
        scene.explosionSpheres.push(sphere);
    }
    dynamicTexture = new BABYLON.DynamicTexture("dtScore", { width:512, height:256 }, scene, false);
    dynamicTexture.hasAlpha = true;

    createLights(scene);
    
    
    const reflectionProbe = new BABYLON.ReflectionProbe("probe", 512, scene);
    boxes.forEach(({ box }) => reflectionProbe.renderList.push(box));

    mirrorMat.reflectionTexture  = reflectionProbe.cubeTexture;
    mirrorMat.reflectivityColor  = new BABYLON.Color3(1, 1, 1); // intensité des reflets
    mirrorMat.useMicroSurfaceFromReflectivityMapAlpha = false;

    mirrorMat.reflectivityFresnelParameters = new BABYLON.FresnelParameters();
    mirrorMat.reflectivityFresnelParameters.power = 1;
    
    setTimeout(async() => {
        await countdown();
        const direction = Math.random() < 0.5 ? -1 : 1;
        scene.ballVelocity.set(
            GAME_CONFIG.ballInitialSpeed * direction,
            0,
            (Math.random() - 0.5) * 0.02
        );
        gameStarted = true;
    }, 2000);
    return scene;
}

function startRenderLoop() {
    engine.runRenderLoop(() => {
        if (!window.gameActive || !scene || !scene.ball) return;
        const ball = scene.ball;
        const velocity = scene.ballVelocity;
        function clampVelocity() {
            const speed = velocity.length();
            if (speed > GAME_CONFIG.maxSpeed) {
                velocity.scaleInPlace(GAME_CONFIG.maxSpeed / speed);
            }
        }
        if (keys["i"] && leftPaddle.position.z + GAME_CONFIG.ballSpeed <= GAME_CONFIG.maxZ) {
            leftPaddle.position.z += GAME_CONFIG.ballSpeed;
        }
        if (keys["k"] && leftPaddle.position.z - GAME_CONFIG.ballSpeed >= GAME_CONFIG.minZ) {
            leftPaddle.position.z -= GAME_CONFIG.ballSpeed;
        }
        if (keys["w"] && rightPaddle.position.z + GAME_CONFIG.ballSpeed <= GAME_CONFIG.maxZ) {
            rightPaddle.position.z += GAME_CONFIG.ballSpeed;
        }
        if (keys["s"] && rightPaddle.position.z - GAME_CONFIG.ballSpeed >= GAME_CONFIG.minZ) {
            rightPaddle.position.z -= GAME_CONFIG.ballSpeed;
        }
        if (gameStarted && !isGameOver) {
            ball.position.addInPlace(velocity);
        }
        if (isGameOver) {
            scene.render();
            return;
        }
        if (ball.position.z <= GAME_CONFIG.minZ || ball.position.z >= GAME_CONFIG.maxZ) {
            velocity.z *= -1;
        }
        if (ball.position.x < leftPaddle.position.x - 1) {
            hasCollidedLeft = false;
        }
        if (ball.position.x > rightPaddle.position.x + 1) {
            hasCollidedRight = false;
        }
        if (velocity.x > 0 && !hasCollidedLeft &&
            Math.abs(ball.position.x - leftPaddle.position.x) < GAME_CONFIG.paddleHalfWidth + GAME_CONFIG.ballRadius &&
            Math.abs(ball.position.z - leftPaddle.position.z) < GAME_CONFIG.paddleHalfDepth) {
            
            velocity.x = -Math.abs(velocity.x) * GAME_CONFIG.accelerationFactor;
            const offset = ball.position.z - leftPaddle.position.z;
            velocity.z = offset * 0.1;
            clampVelocity();
            playLightWave(3, -1);
            velocity.scaleInPlace(GAME_CONFIG.accelerationOnHit);
            hasCollidedLeft = true;
        }
        if (velocity.x < 0 && !hasCollidedRight &&
            Math.abs(ball.position.x - rightPaddle.position.x) < GAME_CONFIG.paddleHalfWidth + GAME_CONFIG.ballRadius &&
            Math.abs(ball.position.z - rightPaddle.position.z) < GAME_CONFIG.paddleHalfDepth) {
            
            velocity.x = Math.abs(velocity.x) * GAME_CONFIG.accelerationFactor;
            const offset = ball.position.z - rightPaddle.position.z;
            velocity.z = offset * 0.1;
            clampVelocity();
            playLightWave(0, 1);
            velocity.scaleInPlace(GAME_CONFIG.accelerationOnHit);
            hasCollidedRight = true;
        }
        if (!isWaitingAfterGoal && Math.abs(ball.position.x) > GAME_CONFIG.playWidth / 2 + 1) {
            if (ball.position.x > 0) {
                scoreLeft++;
            } else {
                scoreRight++;
            }
            updateScoreTextMeshes();
            if (scoreLeft >= GAME_CONFIG.scoreLimit || scoreRight >= GAME_CONFIG.scoreLimit) {
    isGameOver = true;
    ball.isVisible = false;
    const winner = scoreLeft >= GAME_CONFIG.scoreLimit ? "PLAYER 1" : "PLAYER 2";
    stopGameTimer();

    if (window.gameActive && gameActuallyStarted && !gameInterrupted) {
        setTimeout(async () => {
            await GamePage.createMatch("local", scoreLeft, scoreRight, gameDurationSeconds);
            window.enableGameMode();
        }, 0);
    } else if (gameInterrupted) {
        console.log("🚫 Match NOT recorded - game was interrupted");
    }

    
    if (fontDataGlobal) {
        try {
            const victoryText = BABYLON.MeshBuilder.CreateText("victoryText", 
                winner + " WON !", fontDataGlobal, {
                size: 1,
                resolution: 32,
                depth: 0.5
            });
            
            victoryText.position.set(0, 4.5, 2);
            
            const textMaterial = new BABYLON.StandardMaterial("victoryMat", scene);
            textMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            textMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
            textMaterial.specularPower = 64;
            textMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
            victoryText.material = textMaterial;
            
           if (mode === "local"){  
            const restartText = BABYLON.MeshBuilder.CreateText("restartText", 
                "PRESS R TO RESTART (3s)", fontDataGlobal, {
                size: 0.5,
                resolution: 32,
                depth: 0.2
            });
            
            restartText.position.set(0, 3, 0);
            restartText.material = textMaterial;
            scene.victoryText = victoryText;
            scene.restartText = restartText;
        }
        } catch (error) {
            console.warn("Erreur création texte victoire:", error);
        }
    }
    
        if ( mode === "local" ){    
            autoDisposeTimeout = setTimeout(() => {
            window.disposeGame();
            window.startGame();
            }, 3000);
        }
    
    scene.render();
    return;
}
            isWaitingAfterGoal = true;
            
            const particlesToUse = Math.min(scene.explosionSpheres.length, 20);
            for (let i = 0; i < particlesToUse; i++) {
                const sphere = scene.explosionSpheres[i];
                sphere.position.copyFrom(ball.position);
                sphere.isVisible = true;
                const dir = new BABYLON.Vector3(
                    (Math.random() - 0.5) * 2,
                    Math.random(),
                    (Math.random() - 0.5) * 2
                ).normalize().scale(0.3 + Math.random() * 0.5);
                setTimeout(() => {
                    sphere.isVisible = false;
                }, 800);
                const animateParticle = () => {
                    if (sphere.isVisible) {
                        sphere.position.addInPlace(dir);
                        dir.scaleInPlace(0.98); // Décélération
                        requestAnimationFrame(animateParticle);
                    }
                };
                animateParticle();
            }
            resetBallWithDelay();
        }
        scene.render();
    });
}


async function init() {
    scene = createScene();
    setupEventListeners();
    await loadFont();
    startRenderLoop();
}

init();

window.disposeGame = function () {
    console.log("🧹 disposeGame() called — on arrête et on clean");

    if (autoDisposeTimeout) {
        clearTimeout(autoDisposeTimeout);
        autoDisposeTimeout = null;
    }

    if (window.gameActive && gameActuallyStarted && !isGameOver) {
        gameInterrupted = true;
        console.log("game interrupted - will not be recorded");
    }
    window.gameActive = false;

    try {
    if (engine && renderLoop) {
      engine.stopRenderLoop(renderLoop);
      console.log("render loop stopped");
    }

    if (scene) {
      scene.dispose(true, true);
    }

    if (engine) {
      engine.dispose();
    }
    this.scene = ''
    if (advancedTexture) {
      advancedTexture.dispose();
    }

    if (engine && engine.onResizeObservable) {
      observers.forEach(obs => {
        try {
          engine.onResizeObservable.remove(obs);
        } catch (e) {
          console.warn("erreur suppression observer:", e);
        }
      });
      observers = [];
    }

    if (window._gameEventListeners) {
        window._gameEventListeners.forEach(({ target, type, handler }) => {
            target.removeEventListener(type, handler);
        });
        window._gameEventListeners = [];
    }

    if (window._gameTimeouts) {
      window._gameTimeouts.forEach(id => clearTimeout(id));
      window._gameTimeouts = [];
    }
    if (window._gameIntervals) {
      window._gameIntervals.forEach(id => clearInterval(id));
      window._gameIntervals = [];
    }

    window.currentGameState = null;
    window.gameStarted = false;
    window.gamePaused = false;
    window.matchId = null;
    window.players = null;
    window.ball = null;
    window.score = { left: 0, right: 0 };

    if (window._createMatchTimeout) {
      clearTimeout(window._createMatchTimeout);
      window._createMatchTimeout = null;
    }

  } catch (err) {
    console.warn("Erreur dans disposeGame:", err);
  }

  engine = null;
  scene = null;
  renderLoop = null;
  advancedTexture = null;

  console.log("Game fully cleaned up");
};

window.addEventListener("resize", () => engine.resize());
}) ();