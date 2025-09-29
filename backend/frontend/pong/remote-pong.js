(() => {
  // Protection
  if (window.RemotePongGame) {
    console.warn("RemotePongGame déjà défini — réutilisation.");
    return;
  }
  class RemotePongGame {
    constructor() {

      this.gameStartTime = null;
      this.gameEndTime = null;
      this.gameDurationSeconds = 0;
      this.isGameOver = false;
      this.gameStarted = false;
      this.isWaitingAfterGoal = false;
      this.hasCollidedLeft = false;
      this.hasCollidedRight = false;
      this.scoreLeft = 0;
      this.scoreRight = 0;
      this.fontDataGlobal = null;
      this.myText = null;
      this.myText2 = null;

      this.socket = null;
      this.playerId = null;
      this.isPlayer1 = false;
      this.isMaster = false;
      this.gameState = null;
      this.player1Name = null;
      this.player2Name = null;
      this.player1Login = null;
      this.player2Login = null;

      this.canvas = null;
      this.engine = null;
      this.scene = null;
      this.leftPaddle = null;
      this.rightPaddle = null;
      this.boxes = [];
      this.keys = {};

      this.GAME_CONFIG = {
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
        accelerationOnHit: 1.05,
      };
    }

    async connectToServer() {
      try {
        // Utiliser la socket globale créée par game.ts
        this.socket = window.gameSocket;

        if (!this.socket) {
          console.error("Pas de gameSocket trouvée");
          return;
        }

        if (window.gameInitData) {
          this.handleGameInit(window.gameInitData);
        }

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            data.isRemote = true;
            this.handleServerMessage(data);
          } catch (error) {
            console.error("Erreur parsing message:", error);
          }
        };

        this.socket.onclose = () => {
          console.log("Connexion fermée");
        };

        this.socket.onerror = (error) => {
          console.error("Erreur WebSocket:", error);
        };

        console.log("Connecté au serveur de jeu");
      } catch (error) {
        console.error("Erreur connexion serveur:", error);
      }
    }

    handleServerMessage(data) {
      switch (data.type) {
        case "waiting_for_opponent":
          this.playerId = data.playerId;
          this.isPlayer1 = data.playerSide === "left";
          this.isMaster = data.playerIndex === 0;
          this.isLeftPlayer = data.isLeftPlayer;

          console.log("⏳ En attente du deuxième joueur...", {
            playerId: this.playerId,
            isPlayer1: this.isPlayer1,
            isMaster: this.isMaster,
          });
          break;

        case "game_init":
          this.handleGameInit(data);
          break;

        case "paddle_movement":
          this.updateOpponentPaddle(data);
          break;

        case "physics_update":
          if (!this.isMaster) {
            this.updateBallFromServer(data);
          }
          break;

        case "goal_scored":
          this.handleGoal(data);
          break;

        case "game_started":
          this.handleGameStart(data);
          break;

        case "player_disconnected":
          this.handlePlayerDisconnected(data);
          break;

        case "visual_effect":
          this.handleVisualEffect(data);
          break;

        default:
          console.log("Message non géré:", data);
      }
    }

    handleGameInit(data) {
      this.playerId = data.playerId;
      this.isPlayer1 = data.playerSide === "left";
      this.isMaster = data.playerIndex === 0;
      this.gameState = data.gameState;
      this.isLeftPlayer = data.isLeftPlayer;
      this.player1Name = data.player1Name;
      this.player2Name = data.player2Name;
      this.player1Login = data.player1Login;
      this.player2Login = data.player2Login;

      
      if (window.renderControlsScreen) {
        window.renderControlsScreen(data.playerSide);
      }
    }

    dispose() {
      if (this.engine) {
        this.engine.stopRenderLoop();
      }

      this.removeEventListeners();

      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
      }

      if (this.scene) {
        this.scene.dispose();
        this.scene = null;
      }

      if (this.engine) {
        this.engine.dispose();
        this.engine = null;
      }

      console.log("RemotePongGame nettoyé");
    }

    async createGameScene() {
      const canvas = document.getElementById("renderCanvas");
      if (!canvas) {
        console.error("Canvas 'renderCanvas' introuvable !");
        return;
      }
      this.canvas = canvas;
      this.engine = new BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
      });
      this.scene = new BABYLON.Scene(this.engine);

      const hdrTexture = BABYLON.CubeTexture.CreateFromPrefilteredData(
        "https://playground.babylonjs.com/textures/environment.env",
        this.scene,
      );
      this.scene.environmentTexture = hdrTexture;
      this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 1);

      const camera2 = new BABYLON.ArcRotateCamera(
        "cam2",
        Math.PI / 2 + Math.PI,
        Math.PI / 3,
        20,
        new BABYLON.Vector3(0, 1, 0),
        this.scene,
      );
      camera2.lowerRadius = 8;
      camera2.upperRadius = 20;
      camera2.lowerBeta = Math.PI / 6;
      camera2.upperBeta = Math.PI / 2;
      camera2.detachControl(canvas);

      const ground = BABYLON.MeshBuilder.CreateGround(
        "ground",
        {
          width: 20,
          height: 10,
        },
        this.scene,
      );

      const mirrorMat = new BABYLON.PBRMaterial("mirror", this.scene);
      mirrorMat.metallic = 1.0;
      mirrorMat.roughness = 0.1;
      mirrorMat.environmentTexture = hdrTexture;
      mirrorMat.albedoColor = new BABYLON.Color3(0, 0, 0);
      ground.material = mirrorMat;
      this.scene.ground = ground;

      const paddleOptions = { width: 0.2, height: 0.3, depth: 1.3 };
      this.leftPaddle = BABYLON.MeshBuilder.CreateBox(
        "leftPaddle",
        paddleOptions,
        this.scene,
      );
      this.leftPaddle.position.set(
        this.GAME_CONFIG.playWidth / 2 - 0.2,
        0.5,
        0,
      );
      this.rightPaddle = BABYLON.MeshBuilder.CreateBox(
        "rightPaddle",
        paddleOptions,
        this.scene,
      );
      this.rightPaddle.position.set(
        -this.GAME_CONFIG.playWidth / 2 + 0.2,
        0.5,
        0,
      );

      const rightMaterial = new BABYLON.PBRMaterial(
        "rightPaddleMat",
        this.scene,
      );
      rightMaterial.metallic = 1.0;
      rightMaterial.roughness = 0.2;
      rightMaterial.albedoColor = new BABYLON.Color3(0.1, 0.6, 1);
      rightMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.6, 1);
      this.rightPaddle.material = rightMaterial;

      const leftMaterial = new BABYLON.PBRMaterial("leftPaddleMat", this.scene);
      leftMaterial.metallic = 1.0;
      leftMaterial.roughness = 0.2;
      leftMaterial.albedoColor = new BABYLON.Color3(1, 0.1, 0.1);
      leftMaterial.emissiveColor = new BABYLON.Color3(1, 0.1, 0.1);
      this.leftPaddle.material = leftMaterial;

      const ball = BABYLON.MeshBuilder.CreateSphere(
        "ball",
        { diameter: 0.3 },
        this.scene,
      );
      ball.position.set(0, 0.5, 0);

      const ballMaterial = new BABYLON.StandardMaterial("ballMat", this.scene);
      ballMaterial.emissiveColor = new BABYLON.Color3(1, 1, 1);
      ball.material = ballMaterial;
      this.scene.ball = ball;
      this.scene.ballVelocity = new BABYLON.Vector3(0, 0, 0);

      this.scene.explosionSpheres = [];
      for (let i = 0; i < 500; i++) {
        const sphere = BABYLON.MeshBuilder.CreateSphere(
          `particle${i}`,
          {
            diameter: 0.2 + Math.random() * 0.4,
            segments: 6,
          },
          this.scene,
        );
        sphere.isVisible = false;
        this.scene.explosionSpheres.push(sphere);
      }

      this.dynamicTexture = new BABYLON.DynamicTexture(
        "dtScore",
        { width: 512, height: 256 },
        this.scene,
        false,
      );
      this.dynamicTexture.hasAlpha = true;

      this.createLights(this.scene);

      const reflectionProbe = new BABYLON.ReflectionProbe(
        "probe",
        512,
        this.scene,
      );
      this.boxes.forEach(({ box }) => reflectionProbe.renderList.push(box));

      mirrorMat.reflectionTexture = reflectionProbe.cubeTexture;
      mirrorMat.reflectivityColor = new BABYLON.Color3(1, 1, 1);
      mirrorMat.useMicroSurfaceFromReflectivityMapAlpha = false;

      mirrorMat.reflectivityFresnelParameters = new BABYLON.FresnelParameters();
      mirrorMat.reflectivityFresnelParameters.power = 1;

      if (this.isMaster) {
        setTimeout(async () => {
          this.sendVisualEffect("countdown", {});
          await this.countdown();
          const direction = Math.random() < 0.5 ? -1 : 1;
          this.scene.ballVelocity.set(
            this.GAME_CONFIG.ballInitialSpeed * direction,
            0,
            (Math.random() - 0.5) * 0.02,
          );
          this.gameStarted = true;
          this.startGameTimer();
          this.sendGameStart();
        }, 2000);
      }
      await this.loadFont();
      await this.setupEventListeners();
      await this.startRenderLoop();
    }

    async setupEventListeners() {
      this.keydownHandler = (e) => {
        const key = e.key.toLowerCase();
        this.keys[key] = true;

        e.preventDefault();
      };

      this.keyupHandler = (e) => {
        this.keys[e.key.toLowerCase()] = false;
        e.preventDefault();
      };

      this.resizeHandler = () => {
        if (this.engine) {
          this.engine.resize();
        }
      };

      window.addEventListener("keydown", this.keydownHandler);
      window.addEventListener("keyup", this.keyupHandler);
      window.addEventListener("resize", this.resizeHandler);
    }

    removeEventListeners() {
      if (this.keydownHandler) {
        window.removeEventListener("keydown", this.keydownHandler);
        this.keydownHandler = null;
      }

      if (this.keyupHandler) {
        window.removeEventListener("keyup", this.keyupHandler);
        this.keyupHandler = null;
      }

      if (this.resizeHandler) {
        window.removeEventListener("resize", this.resizeHandler);
        this.resizeHandler = null;
      }

      this.keys = {};
    }

    async startRenderLoop() {
      this.engine.runRenderLoop(() => {
        if (!this.scene || !this.scene.ball) return;

        // Contrôles des paddles (UN SEUL paddle par joueur)
        this.updatePaddleControls();

        // Physique - SEULEMENT si je suis le master
        if (this.isMaster && this.gameStarted && !this.isGameOver) {
          this.updateGamePhysics();
          this.sendBallUpdate();
        }

        this.scene.render();
      });
    }

    updatePaddleControls() {
      const speed = this.GAME_CONFIG.ballSpeed;
      let moved = false;

      if (this.isLeftPlayer) {
        if (
          this.keys["w"] &&
          this.rightPaddle.position.z + speed <= this.GAME_CONFIG.maxZ
        ) {
          this.rightPaddle.position.z += speed;
          moved = true;
        }
        if (
          this.keys["s"] &&
          this.rightPaddle.position.z - speed >= this.GAME_CONFIG.minZ
        ) {
          this.rightPaddle.position.z -= speed;
          moved = true;
        }
      } else {
        if (
          this.keys["i"] &&
          this.leftPaddle.position.z + speed <= this.GAME_CONFIG.maxZ
        ) {
          this.leftPaddle.position.z += speed;
          moved = true;
        }
        if (
          this.keys["k"] &&
          this.leftPaddle.position.z - speed >= this.GAME_CONFIG.minZ
        ) {
          this.leftPaddle.position.z -= speed;
          moved = true;
        }
      }

      if (moved) {
        this.sendPaddleMovement();
      }
    }

    updateGamePhysics() {
      const ball = this.scene.ball;
      const velocity = this.scene.ballVelocity;

      const clampVelocity = () => {
        const speed = velocity.length();
        if (speed > this.GAME_CONFIG.maxSpeed) {
          velocity.scaleInPlace(this.GAME_CONFIG.maxSpeed / speed);
        }
      };

      ball.position.addInPlace(velocity);

      if (
        ball.position.z <= this.GAME_CONFIG.minZ ||
        ball.position.z >= this.GAME_CONFIG.maxZ
      ) {
        velocity.z *= -1;
      }

      if (ball.position.x < this.leftPaddle.position.x - 1) {
        this.hasCollidedLeft = false;
      }
      if (ball.position.x > this.rightPaddle.position.x + 1) {
        this.hasCollidedRight = false;
      }

      if (
        velocity.x > 0 &&
        !this.hasCollidedLeft &&
        Math.abs(ball.position.x - this.leftPaddle.position.x) <
          this.GAME_CONFIG.paddleHalfWidth + this.GAME_CONFIG.ballRadius &&
        Math.abs(ball.position.z - this.leftPaddle.position.z) <
          this.GAME_CONFIG.paddleHalfDepth
      ) {
        velocity.x =
          -Math.abs(velocity.x) * this.GAME_CONFIG.accelerationFactor;
        const offset = ball.position.z - this.leftPaddle.position.z;
        velocity.z = offset * 0.1;
        clampVelocity();
        this.playLightWave(3, -1);
        velocity.scaleInPlace(this.GAME_CONFIG.accelerationOnHit);
        this.hasCollidedLeft = true;

        this.sendVisualEffect("lightwave", { startIndex: 3, direction: -1 });
      }

      if (
        velocity.x < 0 &&
        !this.hasCollidedRight &&
        Math.abs(ball.position.x - this.rightPaddle.position.x) <
          this.GAME_CONFIG.paddleHalfWidth + this.GAME_CONFIG.ballRadius &&
        Math.abs(ball.position.z - this.rightPaddle.position.z) <
          this.GAME_CONFIG.paddleHalfDepth
      ) {
        velocity.x = Math.abs(velocity.x) * this.GAME_CONFIG.accelerationFactor;
        const offset = ball.position.z - this.rightPaddle.position.z;
        velocity.z = offset * 0.1;
        clampVelocity();
        this.playLightWave(0, 1);
        velocity.scaleInPlace(this.GAME_CONFIG.accelerationOnHit);
        this.hasCollidedRight = true;

        this.sendVisualEffect("lightwave", { startIndex: 0, direction: 1 });
      }

      if (
        !this.isWaitingAfterGoal &&
        Math.abs(ball.position.x) > this.GAME_CONFIG.playWidth / 2 + 1
      ) {
        let goalScored = false;

        if (ball.position.x > 0) {
          this.scoreLeft++;
          goalScored = true;
        } else {
          this.scoreRight++;
          goalScored = true;
        }

        if (goalScored) {
          this.updateScoreTextMeshes();
          this.sendGoalUpdate();
          if (
            this.scoreLeft >= this.GAME_CONFIG.scoreLimit ||
            this.scoreRight >= this.GAME_CONFIG.scoreLimit
          ) {
            this.endGame();
            return;
          }

          this.playExplosionAnimation();
          this.resetBallWithDelay();
        }
      }
      this.sendBallUpdate();
    }

    sendPaddleMovement() {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        const paddle = this.isLeftPlayer ? this.rightPaddle : this.leftPaddle;
        this.socket.send(
          JSON.stringify({
            type: "paddle_movement",
            position: paddle.position.z,
            playerSide: this.isLeftPlayer ? "left" : "right",
            playerId: this.playerId,
            fromPlayer: this.playerId,
            timestamp: Date.now(),
          }),
        );
      }
    }

    updateOpponentPaddle(data) {
      if (data.fromPlayer !== this.playerId) {
        if (data.playerSide === "left" && !this.isPlayer1) {
          this.rightPaddle.position.z = data.position;
        } else if (data.playerSide === "right" && this.isPlayer1) {
          this.leftPaddle.position.z = data.position;
        }
      }
    }

    sendBallUpdate() {
      if (
        this.isMaster &&
        this.socket &&
        this.socket.readyState === WebSocket.OPEN
      ) {
        this.socket.send(
          JSON.stringify({
            type: "physics_update",
            ball: {
              x: this.scene.ball.position.x,
              y: this.scene.ball.position.y,
              z: this.scene.ball.position.z,
              velocityX: this.scene.ballVelocity.x,
              velocityY: this.scene.ballVelocity.y,
              velocityZ: this.scene.ballVelocity.z,
            },
            gameState: {
              gameStarted: this.gameStarted,
              isWaitingAfterGoal: this.isWaitingAfterGoal,
            },
            timestamp: Date.now(),
          }),
        );
      }
    }

    updateBallFromServer(data) {
      if (!this.isMaster && this.scene && this.scene.ball && data.ball) {
        this.scene.ball.position.x = data.ball.x;
        this.scene.ball.position.y = data.ball.y || 0.5;
        this.scene.ball.position.z = data.ball.z;

        this.scene.ballVelocity.x = data.ball.velocityX;
        this.scene.ballVelocity.y = data.ball.velocityY || 0;
        this.scene.ballVelocity.z = data.ball.velocityZ;

        if (data.gameState) {
          this.gameStarted = data.gameState.gameStarted;
          this.isWaitingAfterGoal = data.gameState.isWaitingAfterGoal;
        }
      }
    }

    sendGoalUpdate() {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(
          JSON.stringify({
            type: "goal_scored",
            scoreLeft: this.scoreLeft,
            scoreRight: this.scoreRight,
            timestamp: Date.now(),
          }),
        );
      }
    }

    handleGoal(data) {
      if (!this.isMaster) {
        this.scoreLeft = data.scoreLeft;
        this.scoreRight = data.scoreRight;
        this.updateScoreTextMeshes();

        if (
          this.scoreLeft >= this.GAME_CONFIG.scoreLimit ||
          this.scoreRight >= this.GAME_CONFIG.scoreLimit
        ) {
          this.endGame();
        }
      }
    }

    sendGameStart() {
      if (
        this.isMaster &&
        this.socket &&
        this.socket.readyState === WebSocket.OPEN
      ) {
        this.socket.send(
          JSON.stringify({
            type: "game_started",
            ballVelocity: {
              x: this.scene.ballVelocity.x,
              y: this.scene.ballVelocity.y,
              z: this.scene.ballVelocity.z,
            },
            timestamp: Date.now(),
          }),
        );
      }
    }

    handleGameStart(data) {
      if (!this.isMaster) {
        this.gameStarted = true;
        this.startGameTimer();

        if (this.scene && this.scene.ballVelocity && data.ballVelocity) {
          this.scene.ballVelocity.x = data.ballVelocity.x;
          this.scene.ballVelocity.y = data.ballVelocity.y;
          this.scene.ballVelocity.z = data.ballVelocity.z;
        }
      }
    }

    async endGame() {
      this.isGameOver = true;
      if (this.scene && this.scene.ball) {
        this.scene.ball.isVisible = false;
      }
      const winner =
        this.scoreLeft >= this.GAME_CONFIG.scoreLimit
          ? this.player1Name
          : this.player2Name;

      this.stopGameTimer();

      if (this.fontDataGlobal) {
        this.createVictoryText(winner);
      }

      if (this.isMaster) {
        await this.saveMatchToDatabase();
      }

      setTimeout(() => {
        this.sendGameEnd();
        this.dispose();
      }, 2000);
    }

    async saveMatchToDatabase() {
      try {
        await GamePage.createMatch(
          "remote",
          this.scoreLeft,
          this.scoreRight,
          this.gameDurationSeconds,
          this.player1Login,
          this.player2Login,
        );
      } catch (error) {
        console.error("Erreur lors de l'enregistrement du match:", error);

        if (GamePage && GamePage.showProfileAlert) {
          GamePage.showProfileAlert(
            "profile-alert",
            "Erreur lors de l'enregistrement du match",
          );
        }
      }
    }

    async sendGameEnd() {
      if (this.engine) {
        this.engine.stopRenderLoop();
      }

      this.dispose();
      window.handleRemoteGameMessage({
        type: "game_ended",
        isRemote: true,
      });
    }

    handlePlayerDisconnected(data) {

      this.removeEventListeners();
      this.dispose();

      if (this.engine) {
        this.engine.stopRenderLoop();
      }

      if (this.isGameOver) {
        this.sendGameEnd();
        return;
      }

      if (window.handleRemoteGameMessage) {
        if (!this.isGameOver) {
          window.handleRemoteGameMessage({
            ...(data || {}),
            type: "player_disconnected",
            isRemote: true,
          });
        }
      }
    }

    startGameTimer() {
      this.gameStartTime = Date.now();
      this.gameEndTime = null;
      this.gameDurationSeconds = 0;
    }

    stopGameTimer() {
      if (this.gameStartTime) {
        this.gameEndTime = Date.now();
        this.gameDurationSeconds = Math.floor(
          (this.gameEndTime - this.gameStartTime) / 1000,
        );
      }
    }

    async loadFont() {
      try {
        const response = await fetch(
          "https://assets.babylonjs.com/fonts/Droid Sans_Regular.json",
        );
        this.fontDataGlobal = await response.json();
        this.createInitialScoreText();
      } catch (error) {
        console.warn("Erreur de chargement de police:", error);
      }
    }

    createInitialScoreText() {
      if (!this.fontDataGlobal) return;
      try {
        this.myText = BABYLON.MeshBuilder.CreateText(
          "myText",
          this.scoreLeft.toString(),
          this.fontDataGlobal,
          {
            size: 5,
            resolution: 32,
            depth: 0.5,
          },
        );
        this.myText2 = BABYLON.MeshBuilder.CreateText(
          "myText2",
          this.scoreRight.toString(),
          this.fontDataGlobal,
          {
            size: 5,
            resolution: 32,
            depth: 0.5,
          },
        );

        const scoreMaterial = new BABYLON.PBRMaterial("scoreMat", this.scene);
        scoreMaterial.metallic = 1.0;
        scoreMaterial.roughness = 0.1;
        scoreMaterial.albedoColor = new BABYLON.Color3(0, 0, 0);
        scoreMaterial.environmentTexture = this.scene.environmentTexture;
        scoreMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05);

        this.myText.material = scoreMaterial;
        this.myText2.material = scoreMaterial;
        this.myText.position.set(-8, 2, 4);
        this.myText2.position.set(8, 2, 4);
      } catch (error) {
        console.warn("Erreur création texte:", error);
      }
    }

    updateScoreTextMeshes() {
      if (!this.fontDataGlobal || !this.myText || !this.myText2) return;
      try {
        this.myText.dispose();
        this.myText2.dispose();

        this.myText = BABYLON.MeshBuilder.CreateText(
          "myText",
          this.scoreLeft.toString(),
          this.fontDataGlobal,
          {
            size: 5,
            resolution: 32,
            depth: 0.5,
          },
        );
        this.myText2 = BABYLON.MeshBuilder.CreateText(
          "myText2",
          this.scoreRight.toString(),
          this.fontDataGlobal,
          {
            size: 5,
            resolution: 32,
            depth: 0.5,
          },
        );

        const scoreMaterial = new BABYLON.PBRMaterial("scoreMat", this.scene);
        scoreMaterial.metallic = 1.0;
        scoreMaterial.roughness = 0.1;
        scoreMaterial.albedoColor = new BABYLON.Color3(0, 0, 0);
        scoreMaterial.environmentTexture = this.scene.environmentTexture;
        scoreMaterial.emissiveColor = new BABYLON.Color3(0.05, 0.05, 0.05);

        this.myText.material = scoreMaterial;
        this.myText2.material = scoreMaterial;
        this.myText.position.set(-8, 2, 4);
        this.myText2.position.set(8, 2, 4);
      } catch (error) {
        console.warn("Erreur mise à jour score:", error);
      }
    }

    createLights(scene) {
      const colors = [
        new BABYLON.Color3(1.0, 0.1, 0.5),
        new BABYLON.Color3(1.0, 0.1, 0.5),
        new BABYLON.Color3(1.0, 0.1, 0.5),
        new BABYLON.Color3(1.0, 0.1, 0.5),
      ];
      const positions = [
        new BABYLON.Vector3(-8, 5.2, 5),
        new BABYLON.Vector3(-2.7, 5.2, 5),
        new BABYLON.Vector3(2.7, 5.2, 5),
        new BABYLON.Vector3(8, 5.2, 5),
      ];

      for (let i = 0; i < 4; i++) {
        const box = BABYLON.MeshBuilder.CreateBox(
          `lightBox${i}`,
          {
            width: 4,
            height: 10,
            depth: 0.1,
          },
          scene,
        );

        const material = new BABYLON.StandardMaterial(`lightMat${i}`, scene);
        material.disableLighting = true;
        material.emissiveColor = colors[i];
        box.material = material;

        box.position = positions[i];

        const pointLight = new BABYLON.RectAreaLight(
          `pointLight${i}`,
          new BABYLON.Vector3(0, 0, 0),
          6,
          6,
          scene,
        );
        pointLight.parent = box;
        pointLight.diffuse = colors[i];
        pointLight.specular = colors[i];
        pointLight.intensity = 2;
        this.boxes.push({ box, light: pointLight, material });
      }
    }

    playLightWave(startIndex, direction = 1) {
      const delay = 100;
      const color = new BABYLON.Color3(1.0, 0.1, 0.5);

      for (let i = 0; i < Math.min(this.boxes.length, 4); i++) {
        const index = startIndex + i * direction;
        if (index < 0 || index >= this.boxes.length) break;

        setTimeout(() => {
          const { box, light, material } = this.boxes[index];
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

    sendVisualEffect(type, data) {
      if (
        this.isMaster &&
        this.socket &&
        this.socket.readyState === WebSocket.OPEN
      ) {
        this.socket.send(
          JSON.stringify({
            type: "visual_effect",
            effectType: type,
            effectData: data,
            timestamp: Date.now(),
          }),
        );
      }
    }

    handleVisualEffect(data) {
      if (!this.isMaster) {
        switch (data.effectType) {
          case "lightwave":
            this.playLightWave(
              data.effectData.startIndex,
              data.effectData.direction,
            );
            break;
          case "countdown":
            this.countdown();
            break;
          case "explosion":
            this.playExplosionAnimationAtPosition(data.effectData.ballPosition);
            break;
        }
      }
    }

    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async countdown() {
      if (this.boxes.length === 0) return;

      const delay = 300;
      const green = new BABYLON.Color3(0.2, 1.0, 0.2);
      const pink = new BABYLON.Color3(1.0, 0.1, 0.5);
      const originalIntensity = 2;
      const highlightIntensity = 4;

      try {
        for (let i = 0; i < this.boxes.length; i++) {
          const { box, light, material } = this.boxes[i];

          if (box && light && material) {
            box.scaling.setAll(1.1);
            material.emissiveColor = green;
            light.diffuse = green;
            light.intensity = highlightIntensity;

            await this.sleep(delay);

            box.scaling.setAll(1.0);
            material.emissiveColor = pink;
            light.diffuse = pink;
            light.intensity = originalIntensity;
          }
        }

        for (let i = 0; i < this.boxes.length; i++) {
          const { box, light, material } = this.boxes[i];
          if (box && light && material) {
            box.scaling.setAll(1.2);
            material.emissiveColor = green;
            light.diffuse = green;
            light.intensity = highlightIntensity;
          }
        }

        await this.sleep(delay);

        for (let i = 0; i < this.boxes.length; i++) {
          const { box, light, material } = this.boxes[i];
          if (box && light && material) {
            box.scaling.setAll(1.0);
            material.emissiveColor = pink;
            light.diffuse = pink;
            light.intensity = originalIntensity;
          }
        }

        await this.sleep(delay);
      } catch (error) {
        console.warn("Erreur dans countdown:", error);
      }
    }

    playExplosionAnimation() {
      this.isWaitingAfterGoal = true;

      if (this.isMaster) {
        this.sendVisualEffect("explosion", {
          ballPosition: {
            x: this.scene.ball.position.x,
            y: this.scene.ball.position.y,
            z: this.scene.ball.position.z,
          },
        });
      }

      const particlesToUse = Math.min(this.scene.explosionSpheres.length, 20);
      for (let i = 0; i < particlesToUse; i++) {
        const sphere = this.scene.explosionSpheres[i];
        sphere.position.copyFrom(this.scene.ball.position);
        sphere.isVisible = true;
        const dir = new BABYLON.Vector3(
          (Math.random() - 0.5) * 2,
          Math.random(),
          (Math.random() - 0.5) * 2,
        )
          .normalize()
          .scale(0.3 + Math.random() * 0.5);

        setTimeout(() => {
          sphere.isVisible = false;
        }, 800);

        const animateParticle = () => {
          if (sphere.isVisible) {
            sphere.position.addInPlace(dir);
            dir.scaleInPlace(0.98);
            requestAnimationFrame(animateParticle);
          }
        };
        animateParticle();
      }
    }

    playExplosionAnimationAtPosition(ballPosition) {
      this.isWaitingAfterGoal = true;

      const particlesToUse = Math.min(this.scene.explosionSpheres.length, 20);
      for (let i = 0; i < particlesToUse; i++) {
        const sphere = this.scene.explosionSpheres[i];

        sphere.position.set(ballPosition.x, ballPosition.y, ballPosition.z);
        sphere.isVisible = true;

        const dir = new BABYLON.Vector3(
          (Math.random() - 0.5) * 2,
          Math.random(),
          (Math.random() - 0.5) * 2,
        )
          .normalize()
          .scale(0.3 + Math.random() * 0.5);

        setTimeout(() => {
          sphere.isVisible = false;
        }, 800);

        const animateParticle = () => {
          if (sphere.isVisible) {
            sphere.position.addInPlace(dir);
            dir.scaleInPlace(0.98);
            requestAnimationFrame(animateParticle);
          }
        };
        animateParticle();
      }
    }

    async resetBallWithDelay() {
      if (!this.scene || !this.scene.ball || !this.scene.ballVelocity) return;

      this.scene.ball.position.set(0, 0.5, 0);
      this.scene.ballVelocity.set(0, 0, 0);

      if (this.isMaster) {
        this.sendVisualEffect("countdown", {});
      }
      await this.countdown();
      await this.sleep(200);

      const direction = Math.random() < 0.5 ? -1 : 1;
      this.scene.ballVelocity.set(
        this.GAME_CONFIG.ballInitialSpeed * direction,
        0,
        (Math.random() - 0.5) * 0.02,
      );

      this.isWaitingAfterGoal = false;
    }

    createVictoryText(winner) {
      try {
        const victoryText = BABYLON.MeshBuilder.CreateText(
          "victoryText",
          winner + " WON !",
          this.fontDataGlobal,
          {
            size: 1,
            resolution: 32,
            depth: 0.5,
          },
        );

        victoryText.position.set(0, 4.5, 2);

        const textMaterial = new BABYLON.StandardMaterial(
          "victoryMat",
          this.scene,
        );
        textMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        textMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
        textMaterial.specularPower = 64;
        textMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        victoryText.material = textMaterial;

        restartText.position.set(0, 3, 0);
        restartText.material = textMaterial;
        this.scene.victoryText = victoryText;
        this.scene.restartText = restartText;
      } catch (error) {
        console.warn("Erreur création texte victoire:", error);
      }
    }

    // Initialisation
    async init() {
      await this.connectToServer();
    }
  }

  window.disposeGame = function () {
    if (window.remotePongGameInstance) {
      window.remotePongGameInstance.dispose();
      window.remotePongGameInstance = null;
    }

    window.gameActive = false;
  };

  window.RemotePongGame = RemotePongGame;
})();

window.remotePongGameInstance = new window.RemotePongGame();
window.remotePongGameInstance.init();
