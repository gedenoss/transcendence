// pour SPA
export class Router {
  private routes: Map<string, () => void> = new Map();
  private currentPath: string = "";

  addRoute(path: string, handler: () => void): void {
    this.routes.set(path, handler);
  }

  //navigue vers une nouvelle page (sans rechargement a revoir)
  navigate(path: string): void {
    if (this.currentPath === path) {
      return;
    }

    const handler = this.routes.get(path);

    if (handler) {
      // maj sans recharger la page a rvoir aussi
      if (window.location.pathname !== path) {
        window.history.pushState({}, "", path);
      }
      this.currentPath = path;
      handler();

      console.log(`🚀 Navigated to: ${path}`);
    } else {
      console.warn(`⚠️ Route not found: ${path}`);
      this.navigate("/auth");
    }
  }

  getCurrentPath(): string {
    return this.currentPath;
  }

  hasRoute(path: string): boolean {
    return this.routes.has(path);
  }

  //revenir en arriere
  goBack(): void {
    window.history.back();
  }

  //avancer
  goForward(): void {
    window.history.forward();
  }
}

