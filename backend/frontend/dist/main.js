import { Router } from "./router.js";
import { AuthPage } from "./pages/auth.js";
import { GamePage } from "./pages/game.js";
import "./sus.js";
class App {
    constructor() {
        this.router = new Router();
        this.initializeApp();
        window.onbeforeunload = () => {
            if (window.socket && window.socket.readyState === WebSocket.OPEN) {
                window.socket.close();
            }
        };
    }
    initializeApp() {
        this.router.addRoute("/", () => {
            new AuthPage();
        });
        this.router.addRoute("/auth", () => {
            new AuthPage();
        });
        this.router.addRoute("/game", () => {
            new GamePage();
        });
        this.router.addRoute("/game/tournament", () => {
            new GamePage();
        });
        this.router.addRoute("/game/dashboard", () => {
            new GamePage();
        });
        this.router.addRoute("/game/profile", () => {
            new GamePage();
        });
        window.addEventListener("popstate", () => {
            this.router.navigate(window.location.pathname);
        });
        const currentPath = window.location.pathname;
        this.router.navigate(currentPath === "/" ? "/auth" : currentPath);
    }
}
document.addEventListener("DOMContentLoaded", () => {
    const app = new App();
    window.router = app["router"];
});
//# sourceMappingURL=main.js.map
