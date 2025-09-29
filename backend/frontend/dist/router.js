export class Router {
    constructor() {
        this.routes = new Map();
        this.currentPath = "";
    }
    addRoute(path, handler) {
        this.routes.set(path, handler);
    }
    navigate(path) {
        if (this.currentPath === path) {
            return;
        }
        const handler = this.routes.get(path);
        if (handler) {
            if (window.location.pathname !== path) {
                window.history.pushState({}, "", path);
            }
            this.currentPath = path;
            handler();
            console.log(`🚀 Navigated to: ${path}`);
        }
        else {
            console.warn(`⚠️ Route not found: ${path}`);
            this.navigate("/auth");
        }
    }
    getCurrentPath() {
        return this.currentPath;
    }
    hasRoute(path) {
        return this.routes.has(path);
    }
    goBack() {
        window.history.back();
    }
    goForward() {
        window.history.forward();
    }
}
//# sourceMappingURL=router.js.map
