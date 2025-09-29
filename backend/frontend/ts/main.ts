// main.ts - Point d'entrée de l'application SPA
import { Router } from "./router.js";
import { AuthPage } from "./pages/auth.js";
import { GamePage } from "./pages/game.js";
import "./sus.js";


class App {
  private router: Router;

  constructor() {
    this.router = new Router();
    //this.verifyToken();
    this.initializeApp();
    
    // Fermer proprement la WebSocket quand l'utilisateur quitte la page
    window.onbeforeunload = () => {
      if (window.socket && window.socket.readyState === WebSocket.OPEN) {
        window.socket.close();
      }
    };
  }

  private initializeApp(): void {
    //def les routes
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
    // retour et avance a revoir
    window.addEventListener("popstate", () => {
      this.router.navigate(window.location.pathname);
    });

    // start sur auth
    const currentPath = window.location.pathname;
    this.router.navigate(currentPath === "/" ? "/auth" : currentPath);
  }
}
// google auth
declare global {
  interface Window {
    handleCredentialResponse: (response: any) => void;
    router: Router;
    socket?: WebSocket;
  }
}

// DOM a revoir
document.addEventListener("DOMContentLoaded", () => {
  const app = new App();
  window.router = app["router"];
});
