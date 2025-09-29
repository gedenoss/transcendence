
export let socket: WebSocket;

export function tryConnectWebSocketIfAuthenticated() {
  // Si une socket existe déjà et est ouverte, ne rien faire
  if (window.socket && window.socket.readyState === WebSocket.OPEN) {
    console.log("WebSocket déjà connectée");
    return;
  }

  fetch("/user", { credentials: "include" })
    .then((res) => {
      if (res.ok) {
        const protocol = window.location.protocol === "https:" ? "wss" : "ws";
        const host = window.location.host;
        const socket = new WebSocket(`${protocol}://${host}/ws`);

        socket.onopen = () => {
          console.log("✅ WebSocket connectée");
        };

        socket.onclose = () => {
          console.log("❌ WebSocket fermée");
          window.socket = undefined;
        };

        socket.onerror = (e) => {
          console.error("⚠️ Erreur WebSocket :", e);
        };

        window.socket = socket;
      } else {
        console.log("Pas authentifié, socket non créée");
      }
    })
    .catch((err) => {
      console.error("Erreur lors de la vérification de l'auth :", err);
    });
}



async function checkAuthAndRedirect() {
  try {
    const res = await fetch("/user", { credentials: "include" });
    if (res.ok) {
      tryConnectWebSocketIfAuthenticated();
      window.router.navigate("/game");
    }
  } catch (err) {
    
  }
}


export async function verifyToken() {
    console.log("🔍 Vérification du token JWT...");
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      console.log("🔍 Token trouvé, vérification en cours...");
      const res = await fetch("/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Token invalide");

      const data = await res.json();
      console.log("✅ Utilisateur connecté :", data.user);
    } catch (err) {
      console.error("❌ Erreur vérification token :", err);
    }
  }

export class AuthPage {
  private pendingToken: string | null = null;

  constructor() {
    checkAuthAndRedirect();
    this.render();
    this.attachEvents();
    this.initializeGoogleAuth();
  }


  
  private render(): void {
    const app = document.getElementById("app")!;

    app.innerHTML = `
            <!-- Background avec effets (équivalent de votre CSS) -->
            <div class="min-h-screen bg-black text-white flex items-center justify-center p-8 relative overflow-x-hidden">

                <!-- Background animated gradients -->
                <div class="fixed inset-0 -z-10 animate-pulse">
                    <div class="absolute w-full h-full bg-gradient-radial from-blue-500/10 via-transparent to-transparent" style="background: radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%);"></div>
                    <div class="absolute w-full h-full bg-gradient-radial from-purple-500/10 via-transparent to-transparent" style="background: radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);"></div>
                    <div class="absolute w-full h-full bg-gradient-radial from-green-500/10 via-transparent to-transparent" style="background: radial-gradient(circle at 40% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%);"></div>
                </div>

                <!-- Container principal -->
                <div class="w-full max-w-md relative z-10">

                    <!-- Header -->
                    <div class="text-center mb-8">
                        <h1 class="font-mono text-5xl font-bold mb-2 tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                            transcendence<span class="inline-block w-0.5 h-8 bg-blue-500 ml-1 animate-pulse"></span>
                        </h1>
                        <p class="font-mono text-gray-500 opacity-80">
                            <span class="text-blue-500">></span> initialize session
                        </p>
                    </div>

                    <!-- Tab Navigation -->
                    <div class="mb-8" id="tab-navigation">
                        <div class="flex bg-gray-900 border border-gray-800 rounded-lg p-1">
                            <button class="tab-button flex-1 py-3 px-4 font-mono text-sm font-medium text-gray-400 rounded-md transition-all duration-200 hover:bg-gray-800 hover:text-white focus:outline-none"
                                    data-tab="signin" id="signin-tab">
                                $ sign-in
                            </button>
                            <button class="tab-button flex-1 py-3 px-4 font-mono text-sm font-medium text-gray-400 rounded-md transition-all duration-200 hover:bg-gray-800 hover:text-white focus:outline-none"
                                    data-tab="signup" id="signup-tab">
                                $ sign-up
                            </button>
                        </div>
                    </div>

                    <!-- 2FA Verification Tab -->
                    <div id="verify2fa" class="tab-content hidden">
                        <div class="bg-gray-900 border border-gray-800 rounded-xl p-10 mb-6 relative overflow-hidden backdrop-blur-sm">
                            <!-- Top gradient line -->
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #f59e0b, transparent);"></div>

                            <div class="text-center mb-6">
                                <div class="inline-flex items-center justify-center w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full mb-4">
                                    <svg class="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                                    </svg>
                                </div>
                                <h2 class="font-mono text-xl font-bold text-white mb-2">Two-Factor Authentication</h2>
                                <p class="font-mono text-sm text-gray-400">Check your email for the verification code</p>
                            </div>

                            <!-- Alerts -->
                            <div id="verify2fa-alert" class="hidden p-4 mb-6 border border-red-500 bg-red-500/10 text-red-400 rounded-lg font-mono text-sm"></div>
                            <div id="verify2fa-success" class="hidden p-4 mb-6 border border-green-500 bg-green-500/10 text-green-400 rounded-lg font-mono text-sm"></div>

                            <!-- OTP Input -->
                            <div class="mb-8">
                                <label class="block font-mono text-sm font-medium text-gray-400 mb-2">
                                    verification code
                                </label>
                                <input type="text"
                                       id="otp-input"
                                       placeholder="0000"
                                       maxlength="4"
                                       class="w-full px-5 py-4 border border-gray-800 rounded-lg font-mono text-center text-2xl tracking-widest bg-gray-800 text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-amber-500/30 focus:border-amber-500 focus:bg-gray-900">
                            </div>

                            <button id="verify2faBtn" class="group relative w-full py-4 px-6 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-none rounded-lg font-mono font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/30 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none overflow-hidden">
                                <span class="relative z-10">$ verify</span>
                                <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full"></div>
                            </button>

                            <button id="backToSigninBtn" class="w-full mt-4 py-3 px-6 bg-transparent text-gray-400 border border-gray-700 rounded-lg font-mono transition-all duration-200 hover:bg-gray-800 hover:text-white focus:outline-none">
                                $ back to sign-in
                            </button>
                        </div>
                    </div>

                    <!-- Sign In Tab -->
                    <div id="signin" class="tab-content">
                        <div class="bg-gray-900 border border-gray-800 rounded-xl p-10 mb-6 relative overflow-hidden backdrop-blur-sm">
                            <!-- Top gradient line -->
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>

                            <!-- Alerts -->
                            <div id="signin-alert" class="hidden p-4 mb-6 border border-red-500 bg-red-500/10 text-red-400 rounded-lg font-mono text-sm"></div>
                            <div id="signin-success" class="hidden p-4 mb-6 border border-green-500 bg-green-500/10 text-green-400 rounded-lg font-mono text-sm"></div>

                            <!-- Form -->
                            <div class="mb-5">
                                <label class="block font-mono text-sm font-medium text-gray-400 mb-2">
                                    login / email
                                </label>
                                <input type="text"
                                       id="signin-login"
                                       placeholder="username or user@domain.com"
                                       autocomplete="username"
                                       class="w-full px-5 py-4 border border-gray-800 rounded-lg font-mono bg-gray-800 text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-gray-900">
                            </div>

                            <div class="mb-8">
                                <label class="block font-mono text-sm font-medium text-gray-400 mb-2">
                                    password
                                </label>
                                <input type="password"
                                       id="signin-password"
                                       placeholder="••••••••"
                                       autocomplete="current-password"
                                       class="w-full px-5 py-4 border border-gray-800 rounded-lg font-mono bg-gray-800 text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-gray-900">
                            </div>

                            <button id="signinBtn" class="group relative w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none rounded-lg font-mono font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none overflow-hidden">
                                <span class="relative z-10">$ authenticate</span>
                                <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full"></div>
                            </button>
                        </div>

                        <!-- Divider -->
                        <div class="relative text-center my-8 text-gray-500 font-mono text-sm">
                            <div class="absolute inset-0 flex items-center">
                                <div class="w-full border-t border-gray-800"></div>
                            </div>
                            <span class="relative bg-black px-6">// </span>
                        </div>

                        <!-- Google Sign-In -->
                        <div class="flex justify-center mt-4">
                            <div class="g_id_signin"
                                 data-type="standard"
                                 data-size="large"
                                 data-theme="filled_black"
                                 data-text="continue_with"
                                 data-shape="rectangular"
                                 data-logo_alignment="left"
                                 data-width="100%">
                            </div>
                        </div>
                    </div>

                    <!-- Sign Up Tab -->
                    <div id="signup" class="tab-content hidden">
                        <div class="bg-gray-900 border border-gray-800 rounded-xl p-10 mb-6 relative overflow-hidden backdrop-blur-sm">
                            <!-- Top gradient line -->
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>

                            <!-- Alerts -->
                            <div id="signup-alert" class="hidden p-4 mb-6 border border-red-500 bg-red-500/10 text-red-400 rounded-lg font-mono text-sm"></div>
                            <div id="signup-success" class="hidden p-4 mb-6 border border-green-500 bg-green-500/10 text-green-400 rounded-lg font-mono text-sm"></div>

                            <!-- Form -->
                            <div class="mb-5">
                                <label class="block font-mono text-sm font-medium text-gray-400 mb-2">
                                    username
                                </label>
                                <input type="text"
                                       id="signup-login"
                                       placeholder="choose a username"
                                       autocomplete="username"
                                       class="w-full px-5 py-4 border border-gray-800 rounded-lg font-mono bg-gray-800 text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-gray-900">
                            </div>

                            <div class="mb-5">
                                <label class="block font-mono text-sm font-medium text-gray-400 mb-2">
                                    email
                                </label>
                                <input type="email"
                                       id="signup-email"
                                       placeholder="user@domain.com"
                                       autocomplete="email"
                                       class="w-full px-5 py-4 border border-gray-800 rounded-lg font-mono bg-gray-800 text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-gray-900">
                            </div>

                            <div class="mb-8">
                                <label class="block font-mono text-sm font-medium text-gray-400 mb-2">
                                    password
                                </label>
                                <input type="password"
                                       id="signup-password"
                                       placeholder="••••••••"
                                       autocomplete="new-password"
                                       class="w-full px-5 py-4 border border-gray-800 rounded-lg font-mono bg-gray-800 text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500 focus:bg-gray-900">
                            </div>

                            <button id="signupBtn" class="group relative w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white border-none rounded-lg font-mono font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none overflow-hidden">
                                <span class="relative z-10">$ create-account</span>
                                <div class="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full"></div>
                            </button>
                        </div>

                        <!-- Divider -->
                        <div class="relative text-center my-8 text-gray-500 font-mono text-sm">
                            <div class="absolute inset-0 flex items-center">
                                <div class="w-full border-t border-gray-800"></div>
                            </div>
                            <span class="relative bg-black px-6">//</span>
                        </div>

                        <!-- Google Sign-In -->
                        <div class="flex justify-center mt-4">
                            <div class="g_id_signin"
                                 data-type="standard"
                                 data-size="large"
                                 data-theme="filled_black"
                                 data-text="continue_with"
                                 data-shape="rectangular"
                                 data-logo_alignment="left"
                                 data-width="100%">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
  }

  private attachEvents(): void {
    // tab switch
    document.querySelectorAll(".tab-button").forEach((button) => {
      button.addEventListener("click", () => {
        const tabName = (button as HTMLElement).dataset.tab;
        this.switchTab(tabName!);
      });
    });

    //signin
    document.getElementById("signinBtn")!.addEventListener("click", () => {
      this.handleSignIn();
    });

    //signup
    document.getElementById("signupBtn")!.addEventListener("click", () => {
      this.handleSignUp();
    });

    // 2FA verification
    document.getElementById("verify2faBtn")!.addEventListener("click", () => {
      this.handleVerify2FA();
    });

    // Back to signin from 2FA
    document.getElementById("backToSigninBtn")!.addEventListener("click", () => {
      this.backToSignin();
    });

    // key navigation(pour passer dune case a lautre juste avec entree)
    this.setupKeyboardNavigation();

    // def tab
    this.switchTab("signin");
  }

  private switchTab(tabName: string): void {
    // Hide navigation for 2FA
    if (tabName === "verify2fa") {
      document.getElementById("tab-navigation")!.style.display = "none";
    } else {
      document.getElementById("tab-navigation")!.style.display = "block";
    }

    document.querySelectorAll(".tab-button").forEach((b) => {
      b.classList.remove(
        "bg-blue-500",
        "text-white",
        "shadow-lg",
        "shadow-blue-500/30",
      );
      b.classList.add("text-gray-400");
    });
    document
      .querySelectorAll(".tab-content")
      .forEach((c) => c.classList.add("hidden"));

    // Show the selected tab content
    document.getElementById(tabName)!.classList.remove("hidden");

    // Only highlight active button if not 2FA
    if (tabName !== "verify2fa") {
      const activeButton = document.querySelector(`[data-tab="${tabName}"]`)!;
      activeButton.classList.remove("text-gray-400");
      activeButton.classList.add(
        "bg-blue-500",
        "text-white",
        "shadow-lg",
        "shadow-blue-500/30",
      );
    }

    //change de tab = clear alertes
    this.hideAllAlerts();
  }

  private async handleSignIn(): Promise<void> {
    const login = (
      document.getElementById("signin-login") as HTMLInputElement
    ).value.trim();
    const password = (
      document.getElementById("signin-password") as HTMLInputElement
    ).value;
    const btn = document.getElementById("signinBtn") as HTMLButtonElement;

    this.hideAllAlerts();

    if (!login || !password) {
      this.showAlert("signin-alert", "$ error: missing credentials");
      return;
    }

    btn.textContent = "$ authenticating...";
    btn.disabled = true;

    try {
      const response = await fetch("/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "credentials": "include", // pour envoyer les cookies
        },
        body: JSON.stringify({
          givenLogin: login,
          password,
          auth_provider: "local", // pour l'authentification locale
        }),
      });

      const data = await response.json();

      if (response.ok) {
        btn.textContent = "$ success";
        btn.style.background = "#10b981";
        this.showAlert(
          "signin-success",
          `$ welcome back, ${data.login}!`,
          "success",
        );

        console.log("Authentication successful ✅", data);
        setTimeout(() => {
          window.router.navigate("/game");
        }, 1000);
      } else if (response.status === 400) {
        // 2FA required
        this.pendingToken = data.token;
        btn.textContent = "$ 2FA required";
        btn.style.background = "#f59e0b";
        
        setTimeout(() => {
          this.switchTab("verify2fa");
          this.resetButton(btn, "$ authenticate");
        }, 1000);
      } else {
        this.showAlert(
          "signin-alert",
          `$ ${data.error || "authentication failed"}`,
        );
        this.resetButton(btn, "$ authenticate");
      }
    } catch (error) {
      this.showAlert("signin-alert", "$ network error");
      this.resetButton(btn, "$ authenticate");
      console.error("Network error:", error);
    }
  }

  private async handleVerify2FA(): Promise<void> {
    const otp = (document.getElementById("otp-input") as HTMLInputElement).value.trim();
    const btn = document.getElementById("verify2faBtn") as HTMLButtonElement;
      console.log("Verifying 2FA with OTP:", otp, "and pending token:", this.pendingToken);

    this.hideAlert("verify2fa-alert");
    this.hideAlert("verify2fa-success");

    if (!otp) {
      this.showAlert("verify2fa-alert", "$ error: please enter verification code");
      return;
    }

    if (!this.pendingToken) {
      this.showAlert("verify2fa-alert", "$ error: session expired, please sign in again");
      setTimeout(() => this.backToSignin(), 2000);
      return;
    }

    btn.textContent = "$ verifying...";
    btn.disabled = true;

    try {
      const response = await fetch("/auth/verify2FA", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.pendingToken}`,
      },
      credentials: "include",
      body: JSON.stringify({
        otp: otp,
      }),
    });

      const data = await response.json();

      if (response.ok) {
        btn.textContent = "$ verified";
        btn.style.background = "#10b981";
        this.showAlert("verify2fa-success", "$ 2FA verification successful!", "success");

        console.log("2FA verification successful ✅", data);

        setTimeout(() => {
          window.router.navigate("/game");
        }, 1000);
      } else {
        this.showAlert("verify2fa-alert", `$ ${data.error || "verification failed"}`);
        this.resetButton(btn, "$ verify");
      }
    } catch (error) {
      this.showAlert("verify2fa-alert", "$ network error");
      this.resetButton(btn, "$ verify");
      console.error("2FA verification error:", error);
    }
  }

  private backToSignin(): void {
    this.pendingToken = null;
    (document.getElementById("otp-input") as HTMLInputElement).value = "";
    this.switchTab("signin");
  }

  //insciprtion
  private async handleSignUp(): Promise<void> {
    const login = (
      document.getElementById("signup-login") as HTMLInputElement
    ).value.trim();
    const email = (
      document.getElementById("signup-email") as HTMLInputElement
    ).value.trim();
    const password = (
      document.getElementById("signup-password") as HTMLInputElement
    ).value;
    const btn = document.getElementById("signupBtn") as HTMLButtonElement;

    this.hideAllAlerts();

    if (!login || !email || !password) {
      this.showAlert("signup-alert", "$ error: all fields required");
      return;
    }

    btn.textContent = "$ creating account...";
    btn.disabled = true;
   
    try {
      const response = await fetch("/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ login, email, password, auth_provider: "local" }),
      });

      const data = await response.json();

      if (response.ok) {
        btn.textContent = "$ account created";
        btn.style.background = "#10b981";
        this.showAlert(
          "signup-success",
          `$ account created for ${login}! switching to sign-in...`,
          "success",
        );

        console.log("Account created successfully ✅", data);

        // 2 sec = switch
        setTimeout(() => {
          this.switchTab("signin");
          (document.getElementById("signin-login") as HTMLInputElement).value =
            login;
        }, 2000);
      } else {
        this.showAlert(
          "signup-alert",
          `$ ${data.error || "registration failed"}`,
        );
        this.resetButton(btn, "$ create-account");
      }
    } catch (error) {
      this.showAlert("signup-alert", "$ network error");
      this.resetButton(btn, "$ create-account");
      console.error("Network error:", error);
    }
  }

  //google auth
  private initializeGoogleAuth(): void {
    // DOM pret = google
    setTimeout(() => {
      if ((window as any).google && (window as any).google.accounts) {
        (window as any).google.accounts.id.initialize({
          client_id:
            "1560847651-b31pkjflds74sb9s6g1s3enpo71bd5kn.apps.googleusercontent.com",
          callback: window.handleCredentialResponse,
        });

        const signinButton = document.querySelector("#signin .g_id_signin");
        const signupButton = document.querySelector("#signup .g_id_signin");

        if (signinButton) {
          (window as any).google.accounts.id.renderButton(signinButton, {
            type: "standard",
            size: "large",
            theme: "filled_black",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            width: "100%",
          });
        }

        if (signupButton) {
          (window as any).google.accounts.id.renderButton(signupButton, {
            type: "standard",
            size: "large",
            theme: "filled_black",
            text: "continue_with",
            shape: "rectangular",
            logo_alignment: "left",
            width: "100%",
          });
        }
      } else {
        // Google pas charge, recommance
        setTimeout(() => this.initializeGoogleAuth(), 500);
      }
    }, 100);

    //callback
    window.handleCredentialResponse = (response: any) => {
      const id_token = response.credential;
      const isSignup = !document
        .getElementById("signup")!
        .classList.contains("hidden");

      console.log("Google authentication:", isSignup ? "signup" : "signin");

      fetch("/auth/signup/google", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "credentials": "include", // pour envoyer les cookies
        },
        body: JSON.stringify({ token: id_token, auth_provider: "google" }),
      })
        .then((res) => res.json())
        .then((data) => {
          const alertId = isSignup ? "signup-success" : "signin-success";
          const message = isSignup
        ? `$ google account created for ${data.login}!`
        : `$ welcome back, ${data.login}!`;
          if (!data || data.error) {
        const alertIdErr = isSignup ? "signup-alert" : "signin-alert";
        this.showAlert(alertIdErr, `$ ${data?.error || "google authentication failed"}`);
        return;
          }
          this.showAlert(alertId, message, "success");
          console.log("Google authentication successful ✅", data);

          //go jeu quand c bon
          setTimeout(() => {
        window.router.navigate("/game");
          }, 1000);
        })
        .catch((err) => {
          const alertId = isSignup ? "signup-alert" : "signin-alert";
          this.showAlert(alertId, "$ google authentication failed");
          console.error("Google authentication error ❌", err);
        });
    };
  }

  //entree pour nav entre ligne mais si passwd alors essaye de se co
  private setupKeyboardNavigation(): void {
    document
      .getElementById("signin-login")!
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          document.getElementById("signin-password")!.focus();
        }
      });

    document
      .getElementById("signin-password")!
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          document.getElementById("signinBtn")!.click();
        }
      });

    document
      .getElementById("signup-login")!
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          document.getElementById("signup-email")!.focus();
        }
      });

    document
      .getElementById("signup-email")!
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          document.getElementById("signup-password")!.focus();
        }
      });

    document
      .getElementById("signup-password")!
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          document.getElementById("signupBtn")!.click();
        }
      });

    // 2FA navigation
    document
      .getElementById("otp-input")!
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          document.getElementById("verify2faBtn")!.click();
        }
      });

    // Auto-format OTP input (only numbers)
    document
      .getElementById("otp-input")!
      .addEventListener("input", (e) => {
        const input = e.target as HTMLInputElement;
        input.value = input.value.replace(/[^0-9]/g, '');
      });
  }

  private showAlert(id: string, message: string, type: string = "error"): void {
    const alert = document.getElementById(id)!;
    alert.textContent = message;
    alert.classList.remove("hidden");

    if (type === "success") {
      setTimeout(() => this.hideAlert(id), 3000);
    }
  }

  private hideAlert(id: string): void {
    document.getElementById(id)!.classList.add("hidden");
  }

  private hideAllAlerts(): void {
    const alertIds = [
      "signin-alert", "signin-success",
      "signup-alert", "signup-success", 
      "verify2fa-alert", "verify2fa-success"
    ];
    alertIds.forEach(id => this.hideAlert(id));
  }

  private resetButton(btn: HTMLButtonElement, originalText: string): void {
    btn.textContent = originalText;
    btn.style.background = "";
    btn.disabled = false;
  }
}