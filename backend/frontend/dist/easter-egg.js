class PoopEasterEgg {
    constructor(targetSelector = "h1, .logo, [data-easter-egg]") {
        this.clickCount = 0;
        this.isPoopMode = false;
        this.targetSelector = targetSelector;
        this.init();
    }
    init() {
        this.addPoopAnimation();
        this.attachGlobalListener();
    }
    attachGlobalListener() {
        document.addEventListener("click", (e) => {
            const target = e.target;
            if (target.matches(this.targetSelector) ||
                target.closest(this.targetSelector)) {
                this.handleClick();
            }
        });
    }
    
    handleClick() {
        this.clickCount++;
        if (this.clickCount === 10) {
            this.triggerPoopAvalanche();
        }
        setTimeout(() => {
            this.clickCount = 0;
        }, 3000);
    }
    triggerPoopAvalanche() {
        if (this.isPoopMode)
            return;
        this.isPoopMode = true;
        this.clickCount = 0;
        console.log("💩 EASTER EGG ACTIVATED! 💩");
        const poopContainer = document.createElement("div");
        poopContainer.id = "poop-container";
        poopContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 99999;
      overflow: hidden;
    `;
        document.body.appendChild(poopContainer);
        for (let i = 0; i < 50; i++) {
            setTimeout(() => {
                this.createFallingPoop(poopContainer);
                this.playSynthPoop();
            }, i * 100);
        }
        setTimeout(() => {
            this.cleanupPoopAvalanche();
        }, 10000);
        this.showMessage();
    }
    createFallingPoop(container) {
        const poop = document.createElement("div");
        poop.textContent = "💩";
        poop.style.cssText = `
      position: absolute;
      font-size: ${Math.random() * 20 + 20}px;
      left: ${Math.random() * 100}vw;
      top: -50px;
      animation: poopFall ${Math.random() * 3 + 2}s linear forwards;
      transform: rotate(${Math.random() * 360}deg);
    `;
        container.appendChild(poop);
        setTimeout(() => {
            poop.remove();
        }, 5000);
    }
    cleanupPoopAvalanche() {
        const container = document.getElementById("poop-container");
        if (container)
            container.remove();
        this.isPoopMode = false;
    }
    addPoopAnimation() {
        if (document.getElementById("poop-animation"))
            return;
        const style = document.createElement("style");
        style.id = "poop-animation";
        style.textContent = `
      @keyframes poopFall {
        0% {
          transform: translateY(-50px) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translateY(100vh) rotate(360deg);
          opacity: 0.5;
        }
      }
    `;
        document.head.appendChild(style);
    }
    showMessage() {
        if (window.gamePageInstance?.showProfileAlert) {
            window.gamePageInstance.showProfileAlert("profile-success", "CACA KI PU", "success");
        }
        else {
            this.createSimpleAlert("CACA KI PU");
        }
    }
    createSimpleAlert(message) {
        const alert = document.createElement("div");
        alert.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 100000;
      padding: 16px 24px;
      background: rgba(34, 197, 94, 0.1);
      border: 1px solid rgb(34, 197, 94);
      border-radius: 8px;
      color: rgb(34, 197, 94);
      font-family: monospace;
      font-weight: bold;
      backdrop-filter: blur(8px);
    `;
        alert.textContent = message;
        document.body.appendChild(alert);
        setTimeout(() => {
            alert.remove();
        }, 3000);
    }
    playSynthPoop() {
        const ctx = new (window.AudioContext ||
            window.webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(40 + Math.random() * 30, ctx.currentTime);
        gain.gain.setValueAtTime(1, ctx.currentTime);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.frequency.exponentialRampToValueAtTime(10 + Math.random() * 10, ctx.currentTime + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        oscillator.stop(ctx.currentTime + 0.4);
    }
}
let globalPoopEasterEgg;
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        globalPoopEasterEgg = new PoopEasterEgg();
    });
}
else {
    globalPoopEasterEgg = new PoopEasterEgg();
}
export { PoopEasterEgg };
//# sourceMappingURL=easter-egg.js.map