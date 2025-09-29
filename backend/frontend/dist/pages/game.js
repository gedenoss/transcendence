import { tryConnectWebSocketIfAuthenticated } from "./auth.js";
import { verifyToken } from "./auth.js";
export class GamePage {
    constructor() {
        this.currentSection = "tournament";
        this.currentUser = null;
        this.friendsList = [];
        this.remoteSocket = null;
        this.isGameActive = false;
        this.hasGameEnded = false;
        verifyToken();
        this.render();
        this.attachEvents();
        this.handleBrowserNavigation();
        window.gamePageInstance = this;
        window.handleRemoteGameMessage = (data) => {
            if (data && data.isRemote) {
                this.handleRemoteGameMessage(data);
            }
        };
        window.enableGameMode = () => {
            this.enableGameMode();
        };
        window.disableGameMode = () => {
            this.disableGameMode();
        };
        window.startGame = () => {
            this.startGame("local");
        };
        window.startGameAI = () => {
            this.startGame("ai");
        };
        window.renderControlsScreen = (playerSide) => {
            this.renderControlsScreen(playerSide);
        };
        window.addEventListener("beforeunload", async (event) => {
            try {
                navigator.sendBeacon("/logout", JSON.stringify({}));
                document.cookie =
                    "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                document.cookie =
                    "refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                console.log("🚪 Déconnexion automatique lors de la fermeture");
            }
            catch (error) {
                console.error("Erreur lors de la déconnexion:", error);
            }
            this.cleanup();
        });
        this.isGameActive = false;
        const currentPath = window.location.pathname;
        let targetSection = "tournament";
        if (currentPath.startsWith("/game/")) {
            const section = currentPath.replace("/game/", "");
            if (["tournament", "dashboard", "profile"].includes(section)) {
                targetSection = section;
            }
        }
        this.showSectionWithoutPush(targetSection);
    }
    enableGameMode() {
        this.isGameActive = true;
        this.updateUIForGameMode(true);
    }
    disableGameMode() {
        this.isGameActive = false;
        this.updateUIForGameMode(false);
    }
    updateUIForGameMode(isActive) {
        const navButtons = document.querySelectorAll(".nav-btn");
        navButtons.forEach((btn) => {
            const button = btn;
            if (isActive) {
                button.disabled = true;
                button.classList.add("opacity-50", "cursor-not-allowed", "pointer-events-none");
                button.title = "Navigation disabled during match";
            }
            else {
                button.disabled = false;
                button.classList.remove("opacity-50", "cursor-not-allowed", "pointer-events-none");
                button.title = "";
            }
        });
        const gameButtons = ["local-game-btn", "ai-game-btn", "remote-game-btn"];
        gameButtons.forEach((id) => {
            const button = document.getElementById(id);
            if (button) {
                if (isActive) {
                    button.disabled = true;
                    button.classList.add("opacity-50", "cursor-not-allowed", "pointer-events-none");
                    button.innerHTML = button.innerHTML.replace("$ ", " [LOCKED] ");
                }
                else {
                    button.disabled = false;
                    button.classList.remove("opacity-50", "cursor-not-allowed", "pointer-events-none");
                    button.innerHTML = button.innerHTML.replace(" [LOCKED] ", "$ ");
                }
            }
        });
        const tournamentBtn = document.getElementById("tournament");
        if (tournamentBtn) {
            if (isActive) {
                tournamentBtn.disabled = true;
                tournamentBtn.classList.add("opacity-50", "cursor-not-allowed");
                tournamentBtn.textContent = "$ [LOCKED] tournament in progress";
            }
            else {
                tournamentBtn.disabled = false;
                tournamentBtn.classList.remove("opacity-50", "cursor-not-allowed");
                tournamentBtn.textContent = "$ initialize-tournament";
            }
        }
        const logoutBtn = document.getElementById("logout-btn");
        if (logoutBtn) {
            if (isActive) {
                logoutBtn.classList.add("opacity-50", "cursor-not-allowed", "pointer-events-none");
                logoutBtn.title = "Logout disabled during match";
            }
            else {
                logoutBtn.classList.remove("opacity-50", "cursor-not-allowed", "pointer-events-none");
                logoutBtn.title = "";
            }
        }
    }
    static forceExitGameMode() {
        const gamePageInstance = window.gamePageInstance;
        if (gamePageInstance) {
            window.gamePageInstance?.disableGameMode();
        }
    }
    async loadDashboardData() {
        try {
            await this.loadUserStats();
            await this.loadMatchHistory();
            await this.loadPerformanceData();
        }
        catch (error) {
            console.error("Error loading dashboard data:", error);
        }
    }
    async loadUserStats() {
        try {
            const response = await fetch("/stats", { credentials: "include" });
            const data = await response.json();
            if (!response.ok)
                throw new Error(data.error);
            const stats = data;
            this.updateStatsCards(stats);
        }
        catch (error) {
            console.error(error);
        }
    }
    updateStatsCards(stats) {
        const totalGamesCard = document.querySelector(".grid .bg-gray-900:nth-child(1) .text-3xl.font-mono.font-bold.text-blue-400");
        if (totalGamesCard) {
            totalGamesCard.textContent = stats.totalGames.toString();
        }
        const victoriesCard = document.querySelector(".grid .bg-gray-900:nth-child(2) .text-3xl.font-mono.font-bold.text-green-400");
        if (victoriesCard) {
            victoriesCard.textContent = stats.totalWins.toString();
        }
        const winRateCard = document.querySelector(".grid .bg-gray-900:nth-child(3) .text-3xl.font-mono.font-bold.text-amber-400");
        if (winRateCard) {
            winRateCard.textContent = `${stats.winRate}%`;
        }
        const rankingCard = document.querySelector(".grid .bg-gray-900:nth-child(4) .text-3xl.font-mono.font-bold.text-purple-400");
        if (rankingCard) {
            rankingCard.textContent = stats.ranking ? `#${stats.ranking}` : "#--";
        }
        const streakCard = document.querySelector(".space-y-4 .text-3xl.font-bold.text-green-400");
        if (streakCard) {
            streakCard.textContent = stats.currentStreak.toString();
        }
    }
    async loadMatchHistory() {
        try {
            const response = await fetch("/match-history?limit=5", {
                credentials: "include",
            });
            const data = await response.json();
            if (!response.ok)
                throw new Error(data.error);
            const matches = data;
            const tbody = document.querySelector("#section-dashboard tbody");
            if (!tbody)
                return;
            if (matches.length === 0) {
                tbody.innerHTML = `
          <tr>
            <td colspan="6" class="py-8 text-center text-gray-500 font-mono">
              No matches played yet
            </td>
          </tr>
        `;
                return;
            }
            tbody.innerHTML = matches
                .map((match) => `
        <tr class="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
          <td class="py-3 px-4 text-white">${this.escapeHtml(match.opponent)}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-1 rounded text-xs ${this.getResultClass(match.result)}">
              ${match.result}
            </span>
          </td>
          <td class="py-3 px-4 text-gray-300">${match.score1 || 0} - ${match.score2 || 0}</td>
          <td class="py-3 px-4">
            <span class="px-2 py-1 rounded text-xs ${this.getModeClass(match.mode)}">
              ${(match.mode || "normal").toUpperCase()}
            </span>
          </td>
          <td class="py-3 px-4 text-gray-400">${this.formatDate(match.formatted_date)}</td>
          <td class="py-3 px-4 text-gray-500">${this.formatDuration(match.duration)}</td>
        </tr>
      `)
                .join("");
        }
        catch (error) {
            this.showMatchHistoryError();
        }
    }
    getResultClass(result) {
        switch (result) {
            case "WIN":
                return "bg-green-500/20 text-green-400 border border-green-500/30";
            case "LOSS":
                return "bg-red-500/20 text-red-400 border border-red-500/30";
            case "DRAW":
                return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
            default:
                return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
        }
    }
    getModeClass(mode) {
        switch (mode?.toLowerCase()) {
            case "remote":
                return "bg-pink-500/20 text-pink-400 border border-pink-500/30";
            case "ia":
                return "bg-purple-500/20 text-purple-400 border border-purple-500/30";
            case "local":
                return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
            case "tournament":
                return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
            default:
                return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
        }
    }
    formatDate(dateString) {
        if (!dateString)
            return "--";
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1)
            return "Today";
        if (diffDays === 2)
            return "Yesterday";
        if (diffDays <= 7)
            return `${diffDays - 1} days ago`;
        return date.toLocaleDateString();
    }
    formatDuration(seconds) {
        if (!seconds)
            return "--";
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}m ${secs}s`;
    }
    escapeHtml(text) {
        if (!text)
            return "";
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
    showMatchHistoryError() {
        const tbody = document.querySelector("#section-dashboard tbody");
        if (tbody) {
            tbody.innerHTML = `
        <tr>
          <td colspan="6" class="py-8 text-center text-red-400 font-mono">
            $ error: failed to load match history
          </td>
        </tr>
      `;
        }
    }
    async loadPerformanceData() {
        try {
            const response = await fetch("/match-history?limit=20", {
                credentials: "include",
            });
            if (!response.ok)
                throw new Error("Failed to fetch");
            const matches = await response.json();
            if (matches.length > 0) {
                this.updateAdvancedChart(matches);
            }
            else {
                this.showNoData();
            }
        }
        catch (error) {
            this.showNoData();
        }
    }
    updateAdvancedChart(matches) {
        const svg = document.getElementById("performance-chart");
        const placeholder = document.getElementById("chart-placeholder");
        if (!svg || !placeholder)
            return;
        placeholder.style.display = "none";
        let cumulativeScore = 50;
        const dataPoints = [];
        const reversedMatches = matches.reverse();
        let totalWins = 0;
        reversedMatches.forEach((match, index) => {
            if (match.result === "WIN") {
                totalWins++;
                cumulativeScore = Math.min(100, cumulativeScore + 8);
            }
            else if (match.result === "LOSS") {
                cumulativeScore = Math.max(0, cumulativeScore - 5);
            }
            else {
                cumulativeScore = Math.max(0, cumulativeScore - 1);
            }
            const winRate = (totalWins / (index + 1)) * 100;
            const x = 10 + (index * 80) / Math.max(matches.length - 1, 1);
            const y = 85 - cumulativeScore * 0.7;
            dataPoints.push({ x, y, result: match.result, winRate });
        });
        let svgContent = `
    <!-- Grille de fond -->
    <defs>
      <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#374151" stroke-width="0.5" opacity="0.3"/>
      </pattern>
      <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
        <stop offset="50%" style="stop-color:#8b5cf6;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#10b981;stop-opacity:1" />
      </linearGradient>
      <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:0.3" />
        <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0.05" />
      </linearGradient>
    </defs>

    <!-- Grille de fond -->
    <rect width="100" height="100" fill="url(#grid)" opacity="0.5"/>

    <!-- Lignes de référence -->
    <line x1="10" y1="22" x2="90" y2="22" stroke="#10b981" stroke-width="0.5" stroke-dasharray="2,2" opacity="0.6"/>

    <line x1="10" y1="50" x2="90" y2="50" stroke="#f59e0b" stroke-width="0.5" stroke-dasharray="2,2" opacity="0.6"/>

    <line x1="10" y1="78" x2="90" y2="78" stroke="#ef4444" stroke-width="0.5" stroke-dasharray="2,2" opacity="0.6"/>
  `;
        if (dataPoints.length > 1) {
            const areaPath = `M ${dataPoints[0].x},85 ` +
                dataPoints.map((p) => `L ${p.x},${p.y}`).join(" ") +
                ` L ${dataPoints[dataPoints.length - 1].x},85 Z`;
            svgContent += `<path d="${areaPath}" fill="url(#areaGradient)" opacity="0.4"/>`;
        }
        if (dataPoints.length > 1) {
            const pathData = dataPoints
                .map((point, index) => {
                return `${index === 0 ? "M" : "L"} ${point.x},${point.y}`;
            })
                .join(" ");
            svgContent += `<path d="${pathData}" fill="none" stroke="url(#lineGradient)" stroke-width="2" stroke-linecap="round"/>`;
        }
        svg.innerHTML = svgContent;
    }
    showNoData() {
        const placeholder = document.getElementById("chart-placeholder");
        const svg = document.getElementById("performance-chart");
        if (placeholder && svg) {
            placeholder.style.display = "flex";
            svg.innerHTML = `
      <defs>
        <pattern id="emptyGrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#374151" stroke-width="0.5" opacity="0.2"/>
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#emptyGrid)"/>
    `;
            placeholder.innerHTML = `
      <div class="text-center text-gray-600">
        <div class="font-mono text-sm opacity-75">--WAITING FOR DATA--</div>
        <p class="font-mono text-xs mt-1 opacity-50">Performance analytics will appear here</p>
      </div>
    `;
        }
    }
    extractSeedFromUrl(url) {
        if (!url || !url.includes("seed="))
            return "coco";
        const match = url.match(/seed=([^&]*)/);
        return match ? decodeURIComponent(match[1]) : "coco";
    }
    rebuildUrlWithSeed(originalUrl, newSeed) {
        if (!originalUrl || !originalUrl.includes("seed="))
            return originalUrl;
        return originalUrl.replace(/seed=([^&]*)/, `seed=${encodeURIComponent(newSeed)}`);
    }
    static async createMatch(mode, score1, score2, duration, player1, player2) {
        try {
            let result = null;
            if (GamePage.currentTournamentId && GamePage.tournamentMatchData) {
                if (GamePage.shouldRecordTournamentMatch) {
                    console.log("🏆 USER PARTICIPATING - Recording tournament match...");
                    const response = await fetch("/match", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                            mode: "tournament",
                            score1: score1,
                            score2: score2,
                            duration: duration,
                            player1: GamePage.tournamentMatchData.player_1,
                            player2: GamePage.tournamentMatchData.player_2,
                        }),
                    });
                    const data = await response.json();
                    if (!response.ok)
                        throw new Error(data.error);
                    console.log("✅ Tournament match recorded:", data);
                    GamePage.currentMatchId = data.id;
                    GamePage.showProfileAlert("profile-success", data.message, "success");
                    await GamePage.updateTournamentWithWinner(score1, score2);
                    result = data.id;
                }
                else {
                    console.log("👥 GUEST vs GUEST - No match recording...");
                    await GamePage.updateTournamentWithWinner(score1, score2);
                    result = null;
                }
            }
            else {
                console.log("🎮 NORMAL MATCH - Recording without player names...");
                console.log("Mode:", mode, "Score1:", score1, "Score2:", score2, "Duration:", duration, "Player1:", player1, "Player2:", player2);
                const response = await fetch("/match", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        mode: mode,
                        score1: score1,
                        score2: score2,
                        duration: duration,
                        player1: player1,
                        player2: player2,
                    }),
                });
                const data = await response.json();
                if (!response.ok)
                    throw new Error(data.error);
                console.log("✅ Normal match recorded:", data);
                GamePage.currentMatchId = data.id;
                result = data.id;
            }
            return result;
        }
        catch (error) {
            console.error("❌ Error in createMatch:", error);
            GamePage.showProfileAlert("profile-alert", String(error));
            const gamePageInstance = window.gamePageInstance;
            if (gamePageInstance) {
                gamePageInstance.disableGameMode();
            }
            return null;
        }
    }
    async loadUserProfile() {
        try {
            const res = await fetch("/user", {
                method: "GET",
                credentials: "include",
            });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error);
            tryConnectWebSocketIfAuthenticated();
            this.currentUser = data.user || data;
            const user = this.currentUser;
            const usernameInput = document.getElementById("profile-username");
            const emailInput = document.getElementById("profile-email");
            const aliasInput = document.getElementById("profile-alias");
            const avatarImg = document.getElementById("user-avatar");
            const avatarSeedInput = document.getElementById("profile-avatar-seed");
            const twoFAToggle = document.getElementById("profile-2fa");
            if (usernameInput)
                usernameInput.value = user.login || "";
            if (emailInput)
                emailInput.value = user.email || "";
            if (aliasInput)
                aliasInput.value = user.alias || user.login || "";
            if (avatarImg && user.avatarUrl)
                avatarImg.src = user.avatarUrl;
            if (avatarSeedInput && user.avatarUrl) {
                avatarSeedInput.value = this.extractSeedFromUrl(user.avatarUrl);
            }
            if (twoFAToggle)
                twoFAToggle.checked = !!user.secure_auth;
            if (data.auth_provider === "google") {
                this.disableGoogleOnlyFields();
            }
            this.update2FAStatus(data.secure_auth || false);
            this.updateProfileDisplay();
            this.updateAuthBadge(data.auth_provider || "local");
            this.loadFriends();
        }
        catch (err) {
            window.router.navigate("/auth");
        }
    }
    disableGoogleOnlyFields() {
        const usernameInput = document.getElementById("profile-username");
        const emailInput = document.getElementById("profile-email");
        if (usernameInput) {
            usernameInput.disabled = true;
            usernameInput.classList.add("opacity-50", "cursor-not-allowed");
            usernameInput.title = "Username cannot be changed for Google accounts";
        }
        if (emailInput) {
            emailInput.disabled = true;
            emailInput.classList.add("opacity-50", "cursor-not-allowed");
            emailInput.title = "Email cannot be changed for Google accounts";
        }
        const saveBasicBtn = document.getElementById("save-basic-btn");
        if (saveBasicBtn) {
            saveBasicBtn.textContent = "save";
        }
        const passwordSection = document.querySelector(".bg-gray-900:has(#profile-new-password)");
        if (passwordSection) {
            passwordSection.classList.add("hidden");
        }
        const securitySection = document.querySelector(".bg-gray-900:has(#profile-2fa)");
        if (securitySection) {
            securitySection.classList.add("hidden");
        }
    }
    updateAuthBadge(authProvider) {
        const authBadge = document.getElementById("auth-provider-badge");
        if (authBadge) {
            authBadge.textContent = `${authProvider} auth`;
        }
    }
    update2FAStatus(isEnabled) {
        const statusElement = document.getElementById("2fa-status");
        const toggleStatusElement = document.getElementById("2fa-toggle-status");
        if (statusElement) {
            statusElement.textContent = isEnabled ? "enabled" : "disabled";
            statusElement.className = `font-mono text-sm ${isEnabled ? "text-green-400" : "text-gray-400"}`;
        }
        if (toggleStatusElement) {
            toggleStatusElement.textContent = isEnabled ? "enabled" : "disabled";
            toggleStatusElement.className = `font-mono text-sm mr-3 ${isEnabled ? "text-green-400" : "text-gray-400"}`;
        }
    }
    updateProfileDisplay() {
        if (!this.currentUser)
            return;
        const displayName = document.getElementById("profile-display-name");
        const displayEmail = document.getElementById("profile-display-email");
        if (displayName)
            displayName.textContent = this.currentUser.public_login;
        if (displayEmail)
            displayEmail.textContent = this.currentUser.email;
    }
    async loadFriends() {
        try {
            const response = await fetch("/friends", {
                credentials: "include",
            });
            const data = await response.json();
            if (response.ok) {
                this.friendsList = data || [];
                this.renderFriendsSection();
            }
            else {
                GamePage.showProfileAlert("profile-alert", data.error instanceof Error
                    ? data.error.message
                    : "$ error: failed to load friends");
                this.friendsList = [];
                this.renderFriendsSection();
            }
        }
        catch (error) {
            GamePage.showProfileAlert("profile-alert", error instanceof Error
                ? error.message
                : "$ error: failed to load friends");
            this.friendsList = [];
            this.renderFriendsSection();
        }
    }
    async addFriend(username) {
        if (!username.trim()) {
            GamePage.showProfileAlert("profile-alert", "Username is required");
            return;
        }
        try {
            const response = await fetch("/user", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ friend: username.trim() }),
            });
            const data = await response.json();
            if (response.ok) {
                GamePage.showProfileAlert("profile-success", data.message, "success");
                await this.loadFriends();
                const input = document.getElementById("add-friend-input");
                if (input)
                    input.value = "";
            }
            else {
                GamePage.showProfileAlert("profile-alert", data.error || "Failed to add friend");
            }
        }
        catch (error) {
            GamePage.showProfileAlert("profile-alert", "Network error");
            console.error("Add friend error:", error);
        }
    }
    async removeFriend(username) {
        if (!confirm(`Remove ${username} from your friends?`)) {
            return;
        }
        try {
            const response = await fetch("/friends/remove", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ friend: username }),
            });
            const data = await response.json();
            if (response.ok) {
                GamePage.showProfileAlert("profile-success", data.message, "success");
                await this.loadFriends();
            }
            else {
                GamePage.showProfileAlert("profile-alert", data.error || "Failed to remove friend");
            }
        }
        catch (error) {
            GamePage.showProfileAlert("profile-alert", "Network error");
            console.error("Remove friend error:", error);
        }
    }
    renderFriendsSection() {
        const container = document.getElementById("friends-list-container");
        if (!container)
            return;
        if (this.friendsList.length === 0) {
            container.innerHTML = `
        <div class="text-center py-4 text-gray-500 font-mono">
          <div class="text-lg mb-1">[EMPTY]</div>
          <p class="text-xs">No friends yet</p>
        </div>
      `;
            return;
        }
        container.innerHTML = this.friendsList
            .map((friend) => {
            const winRate = friend.games_played > 0
                ? Math.round((friend.games_won / friend.games_played) * 100)
                : 0;
            return `
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="relative">
                  <img
                    src="${friend.avatarUrl}"
                    alt="${friend.public_login}"
                    class="w-12 h-12 rounded-full border-2 border-gray-600"
                    onerror="this.src='https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${friend.public_login}'"
                  >
                  <!-- Indicateur de statut en ligne -->
                  <div class="absolute -bottom-1 -right-1 w-4 h-4 ${friend.online ? "bg-green-500" : "bg-gray-500"} rounded-full border-2 border-gray-800"></div>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <div class="font-mono font-bold text-white text-sm">${friend.public_login}</div>
                  </div>
                  <div class="font-mono text-xs text-gray-400">
                    ${friend.games_played === 0
                ? "No matches"
                : `${winRate}% win rate • ${friend.games_played} games`}
                  </div>
                </div>
              </div>
              <button
                class="text-red-400 hover:text-red-300 p-2 hover:bg-gray-700 rounded text-sm transition-colors"
                onclick="if(window.gamePageInstance) window.gamePageInstance.removeFriend('${friend.public_login}')"
                title="Remove friend"
              >
                ×
              </button>
            </div>
          </div>
        `;
        })
            .join("");
    }
    render() {
        const app = document.getElementById("app");
        app.innerHTML = `
            <!-- Background avec effets -->
            <div class="min-h-screen bg-black text-white relative overflow-x-hidden">

            <!-- Alerts TOUJOURS visibles en haut de la fenêtre -->
            <div id="profile-alert" class="hidden fixed top-16 left-1/2 transform -translate-x-1/2 z-[9999] p-4 border border-red-500 bg-red-500/10 text-red-400 rounded-lg font-mono text-sm max-w-md backdrop-blur-sm shadow-xl"></div>
            <div id="profile-success" class="hidden fixed top-16 left-1/2 transform -translate-x-1/2 z-[9999] p-4 border border-green-500 bg-green-500/10 text-green-400 rounded-lg font-mono text-sm max-w-md backdrop-blur-sm shadow-xl"></div>

                <!-- Background gradients -->
                <div class="fixed inset-0 -z-10 animate-pulse">
                    <div class="absolute w-full h-full" style="background: radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%);"></div>
                    <div class="absolute w-full h-full" style="background: radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%);"></div>
                    <div class="absolute w-full h-full" style="background: radial-gradient(circle at 40% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%);"></div>
                </div>

                <!-- Header -->
                <header class="bg-gray-900 border-b border-gray-800 p-6 relative overflow-hidden backdrop-blur-sm">
                    <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>

                    <div class="flex justify-between items-center max-w-6xl mx-auto">
                        <h1 class="font-mono text-3xl font-bold bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                            transcendence<span class="inline-block w-0.5 h-8 bg-blue-500 ml-1 animate-pulse"></span>
                        </h1>

                        <!-- Navigation -->
                        <div class="flex bg-gray-800 border border-gray-700 rounded-lg p-1 -ml-32">
                            <button class="nav-btn py-3 px-5 font-mono text-sm font-medium text-gray-400 rounded-md transition-all duration-200 hover:bg-gray-700 hover:text-white focus:outline-none whitespace-nowrap"
                                    data-section="tournament">
                                $ match
                            </button>
                            <button class="nav-btn py-3 px-5 font-mono text-sm font-medium text-gray-400 rounded-md transition-all duration-200 hover:bg-gray-700 hover:text-white focus:outline-none whitespace-nowrap"
                                    data-section="dashboard">
                                $ dashboard
                            </button>
                            <button class="nav-btn py-3 px-5 font-mono text-sm font-medium text-gray-400 rounded-md transition-all duration-200 hover:bg-gray-700 hover:text-white focus:outline-none whitespace-nowrap"
                                    data-section="profile">
                                $ profile
                            </button>
                        </div>

                        <button id="logout-btn" class="font-mono text-sm text-gray-400 hover:text-red-400 transition-colors duration-200">
                            $ logout
                        </button>
                    </div>
                </header>

                <!-- Container principal -->
                <div class="w-full max-w-6xl mx-auto p-8 relative z-10">

                    <!-- Section Tournament -->
                    <div id="section-tournament" class="section hidden">
                        <div class="text-center mb-8">
                            <h2 class="font-mono text-4xl font-bold mb-2 tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                                match.system
                            </h2>
                            <p class="font-mono text-gray-500 opacity-80">
                                <span class="text-blue-500">></span> manage competitions
                            </p>
                        </div>

                        <!-- Pong Canvas -->
                        <div class="bg-gray-900 border border-gray-800 rounded-xl p-8 mb-8 relative overflow-hidden backdrop-blur-sm">
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>

                            <div id="game-canvas" class="w-full h-[500px] bg-black border border-gray-700 rounded-lg flex items-center justify-center relative">
                                <div class="text-center text-gray-500">
                                    <div class="text-6xl mb-4 font-mono">[PONG]</div>
                                    <p class="font-mono">pong.exe ready</p>
                                    <p class="font-mono text-sm text-gray-600 mt-2">select mode to initialize</p>
                                </div>
                            </div>

                            <!-- Game Controls -->
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                                <button id="local-game-btn" class="group p-6 bg-gray-800 border border-gray-700 rounded-lg font-mono transition-all duration-200 hover:border-blue-500 hover:bg-gray-800/80">
                                    <div class="text-2xl mb-2 font-mono">[LOCAL]</div>
                                    <div class="font-bold text-white">$ local-match</div>
                                    <div class="text-sm text-gray-400">same.keyboard</div>
                                </button>

                                <button id="ai-game-btn" class="group p-6 bg-gray-800 border border-gray-700 rounded-lg font-mono transition-all duration-200 hover:border-purple-500 hover:bg-gray-800/80">
                                    <div class="text-2xl mb-2 font-mono">[AI]</div>
                                    <div class="font-bold text-white">$ ai-opponent</div>
                                    <div class="text-sm text-gray-400">bot.challenge</div>
                                </button>

                                <button id="remote-game-btn" class="group p-6 bg-gray-800 border border-gray-700 rounded-lg font-mono transition-all duration-200 hover:border-green-500 hover:bg-gray-800/80">
                                    <div class="text-2xl mb-2 font-mono">[REMOTE]</div>
                                    <div class="font-bold text-white">$ remote-match</div>
                                    <div class="text-sm text-gray-400">online.opponent</div>
                                </button>
                            </div>
                        </div>

                        <!-- Tournament Management -->
                                                <div class="grid grid-cols-1 gap-6">
                                                    <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                                                        <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>
                                                        <h3 class="font-mono font-bold text-lg mb-4 text-yellow-400">$ create-tournament</h3>
                                                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                            <input type="text" placeholder="tournament_name"
                                                                   class="px-4 py-3 border border-gray-700 rounded-lg font-mono bg-gray-800 text-white placeholder-gray-500 transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500">
                                                            <select class="px-4 py-3 border border-gray-700 rounded-lg font-mono bg-gray-800 text-white focus:outline-none focus:ring-3 focus:ring-blue-500/30 focus:border-blue-500">
                                                                <option>4.players</option>
                                                                <option>8.players</option>
                                                            </select>
                                                            <button id="tournament" class="py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-mono font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30">
                                                                $ initialize-tournament
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                    </div>
                    <!-- Section Dashboard -->
                    <div id="section-dashboard" class="section hidden">
                        <div class="text-center mb-8">
                            <h2 class="font-mono text-4xl font-bold mb-2 tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                                data.statistics
                            </h2>
                            <p class="font-mono text-gray-500 opacity-80">
                                <span class="text-blue-500">></span> performance analytics
                            </p>
                        </div>

                        <!-- Stats Cards Grid -->
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <!-- Total Games -->
                            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                                <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>
                                <div class="text-center">
                                    <div class="text-3xl font-mono font-bold text-blue-400 mb-2">--</div>
                                    <div class="text-sm font-mono text-gray-400">TOTAL GAMES</div>
                                    <div class="text-xs font-mono text-gray-600 mt-1">matches.exe</div>
                                </div>
                            </div>

                            <!-- Wins -->
                            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                                <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #10b981, transparent);"></div>
                                <div class="text-center">
                                    <div class="text-3xl font-mono font-bold text-green-400 mb-2">--</div>
                                    <div class="text-sm font-mono text-gray-400">VICTORIES</div>
                                    <div class="text-xs font-mono text-gray-600 mt-1">win.count</div>
                                </div>
                            </div>

                            <!-- Win Rate -->
                            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                                <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #f59e0b, transparent);"></div>
                                <div class="text-center">
                                    <div class="text-3xl font-mono font-bold text-amber-400 mb-2">--%</div>
                                    <div class="text-sm font-mono text-gray-400">WIN RATE</div>
                                    <div class="text-xs font-mono text-gray-600 mt-1">efficiency</div>
                                </div>
                            </div>

                            <!-- Ranking -->
                            <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                                <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #8b5cf6, transparent);"></div>
                                <div class="text-center">
                                    <div class="text-3xl font-mono font-bold text-purple-400 mb-2">#--</div>
                                    <div class="text-sm font-mono text-gray-400">RANKING</div>
                                    <div class="text-xs font-mono text-gray-600 mt-1">leaderboard</div>
                                </div>
                            </div>
                        </div>

                        <!-- Performance Overview -->
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                            <!-- Performance Trend -->
                            <div class="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                                <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>
                                <h3 class="font-mono font-bold text-lg text-blue-400 mb-4">$ performance --trend</h3>

                                <!-- Chart Area -->
                                <div class="h-48 bg-black border border-gray-700 rounded-lg p-4 relative">
                                    <!-- Grid Lines -->
                                    <div class="absolute inset-0 p-4">
                                        <div class="w-full h-full relative">
                                            <!-- Horizontal grid lines -->
                                            <div class="absolute w-full border-t border-gray-700 opacity-30" style="top: 20%;"></div>
                                            <div class="absolute w-full border-t border-gray-700 opacity-30" style="top: 40%;"></div>
                                            <div class="absolute w-full border-t border-gray-700 opacity-30" style="top: 60%;"></div>
                                            <div class="absolute w-full border-t border-gray-700 opacity-30" style="top: 80%;"></div>

                                            <!-- Vertical grid lines -->
                                            <div class="absolute h-full border-l border-gray-700 opacity-30" style="left: 14%;"></div>
                                            <div class="absolute h-full border-l border-gray-700 opacity-30" style="left: 28%;"></div>
                                            <div class="absolute h-full border-l border-gray-700 opacity-30" style="left: 42%;"></div>
                                            <div class="absolute h-full border-l border-gray-700 opacity-30" style="left: 56%;"></div>
                                            <div class="absolute h-full border-l border-gray-700 opacity-30" style="left: 70%;"></div>
                                            <div class="absolute h-full border-l border-gray-700 opacity-30" style="left: 84%;"></div>
                                        </div>
                                    </div>

                                    <!-- SVG vide pour être rempli plus tard -->
                                    <svg id="performance-chart" class="w-full h-full absolute inset-0 p-4" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <!-- Sera rempli par JavaScript -->
                                    </svg>

                                    <!-- Message d'attente -->
                                    <div id="chart-placeholder" class="absolute inset-0 flex items-center justify-center">
                                        <div class="text-center text-gray-600">
                                        </div>
                                    </div>

                                    <!-- Labels -->
                                    <div class="absolute top-2 right-4 font-mono text-xs text-blue-400">performance</div>
                                </div>
                            </div>

                            <!-- Quick Stats -->
                            <div class="space-y-4">
                                <!-- Win Streak -->
                                <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                                    <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #10b981, transparent);"></div>
                                    <div class="flex items-center justify-between">
                                        <div>
                                            <div class="font-mono text-sm text-gray-400">CURRENT STREAK</div>
                                            <div class="font-mono text-3xl font-bold text-green-400">--</div>
                                        </div>
                                        <div class="text-green-400 opacity-60">
                                            <svg class="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                                                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                                            </svg>
                                        </div>
                                    </div>
                                    <div class="font-mono text-xs text-gray-600 mt-2">wins.consecutive</div>
                                </div>
                            </div>
                        </div>

                        <!-- Recent Matches -->
                        <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #8b5cf6, transparent);"></div>
                            <h3 class="font-mono font-bold text-lg text-purple-400 mb-6">$ match-history --recent</h3>

                            <div class="overflow-x-auto">
                                <table class="w-full font-mono text-sm">
                                    <thead>
                                        <tr class="border-b border-gray-700">
                                            <th class="text-left py-3 px-4 text-gray-400">OPPONENT</th>
                                            <th class="text-left py-3 px-4 text-gray-400">RESULT</th>
                                            <th class="text-left py-3 px-4 text-gray-400">SCORE</th>
                                            <th class="text-left py-3 px-4 text-gray-400">MODE</th>
                                            <th class="text-left py-3 px-4 text-gray-400">DATE</th>
                                            <th class="text-left py-3 px-4 text-gray-400">DURATION</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td colspan="6" class="py-8 text-center text-gray-500 font-mono">
                                                <div class="text-lg">[LOADING...]</div>
                                                <p class="text-xs mt-1">Fetching match history...</p>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Section Profile AMÉLIORÉE -->
                    <div id="section-profile" class="section hidden">
                      <div class="text-center mb-8">
                        <h2 class="font-mono text-4xl font-bold mb-2 tracking-tight bg-gradient-to-br from-white to-gray-400 bg-clip-text text-transparent">
                          data.config
                        </h2>
                        <p class="font-mono text-gray-500 opacity-80">
                          <span class="text-blue-500">></span> account settings
                        </p>
                      </div>
                      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        <!-- Left Column - Avatar, Info & Friends -->
                        <div class="lg:col-span-1 space-y-6">

                          <!-- User Info Card -->
                          <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>

                            <div class="text-center">
                              <div class="relative inline-block mb-4">
                                <div class="w-24 h-24 bg-gray-800 border-2 border-gray-700 rounded-full mx-auto flex items-center justify-center overflow-hidden">
                                  <img id="user-avatar"
                                       alt="User Avatar"
                                       class="w-full h-full object-cover"
                                       onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                  <span class="text-4xl font-mono text-gray-500 hidden">[USER]</span>
                                </div>
                              </div>

                              <h3 id="profile-display-name" class="font-mono text-xl font-bold text-white mb-1">Loading...</h3>
                              <p id="profile-display-email" class="font-mono text-sm text-gray-400 mb-4">Loading...</p>

                              <!-- Status Badges -->
                              <div class="flex justify-center gap-2">
                                <span id="auth-provider-badge" class="px-3 py-1 bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-mono rounded-full">
                                  local auth
                                </span>
                                <span class="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-mono rounded-full">
                                  2FA <span id="2fa-status">loading...</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          <!-- Friends Management Card -->
                          <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #8b5cf6, transparent);"></div>

                            <h3 class="font-mono font-bold text-lg text-purple-400 mb-4">$ friends --manage</h3>

                            <!-- Add Friend -->
                            <div class="mb-4">
                              <div class="flex gap-2">
                                <input
                                  type="text"
                                  id="add-friend-input"
                                  placeholder="username"
                                  class="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded font-mono text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                >
                                <button
                                  id="add-friend-btn"
                                  class="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-mono text-sm rounded transition-colors"
                                >
                                  add
                                </button>
                              </div>
                            </div>

                            <!-- Friends List -->
                            <div>
                              <h4 class="font-mono text-white font-medium mb-3 text-sm">Your Friends</h4>
                              <div id="friends-list-container" class="max-h-60 overflow-y-auto">
                                <!-- Friends will be rendered here -->
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Right Column - Edit Forms -->
                        <div class="lg:col-span-2 space-y-6">

                          <!-- Basic Information -->
                          <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>

                            <div class="flex items-center justify-between mb-6">
                              <h3 class="font-mono font-bold text-lg text-blue-400">$ edit --basic-info</h3>
                              <button id="save-basic-btn" class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-mono text-sm rounded-lg transition-colors">
                                save
                              </button>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label class="block font-mono text-sm text-gray-400 mb-2">username</label>
                                <input type="text"
                                       id="profile-username"
                                       class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                              </div>
                              <div>
                                <label class="block font-mono text-sm text-gray-400 mb-2">email</label>
                                <input type="email"
                                       id="profile-email"
                                       class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                              </div>
                              <div>
                                <label class="block font-mono text-sm text-gray-400 mb-2">alias</label>
                                <input type="text"
                                      id="profile-alias"
                                      placeholder="your gaming alias"
                                      class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                                <p class="font-mono text-xs text-gray-500 mt-1">display name for tournaments</p>
                              </div>
                              <div>
                                <label class="block font-mono text-sm text-gray-400 mb-2">avatar seed</label>
                                <input type="text"
                                      id="profile-avatar-seed"
                                      placeholder="coco"
                                      class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                              </div>
                            </div>
                          </div>

                          <!-- Password Change -->
                          <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #f59e0b, transparent);"></div>

                            <div class="flex items-center justify-between mb-6">
                              <h3 class="font-mono font-bold text-lg text-amber-400">$ change --password</h3>
                              <button id="save-password-btn" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-mono text-sm rounded-lg transition-colors">
                                update
                              </button>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label class="block font-mono text-sm text-gray-400 mb-2">new password</label>
                                <input type="password"
                                       id="profile-new-password"
                                       placeholder="••••••••"
                                       class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                                <p class="font-mono text-xs text-gray-500 mt-1">min 8 chars, uppercase, lowercase, number, special char</p>
                              </div>
                              <div>
                                <label class="block font-mono text-sm text-gray-400 mb-2">confirm password</label>
                                <input type="password"
                                       id="profile-confirm-password"
                                       placeholder="••••••••"
                                       class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
                              </div>
                            </div>
                          </div>

                          <!-- Security Settings -->
                          <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #10b981, transparent);"></div>

                            <h3 class="font-mono font-bold text-lg text-green-400 mb-6">$ security --config</h3>

                            <div class="flex items-center justify-between p-4 bg-gray-800 rounded-lg mb-4">
                              <div>
                                <h4 class="font-mono text-white font-medium mb-1">Two-Factor Authentication</h4>
                                <p class="font-mono text-sm text-gray-400">Add an extra layer of security to your account</p>
                              </div>
                              <div class="flex items-center">
                                <span id="2fa-toggle-status" class="font-mono text-sm text-gray-400 mr-3">disabled</span>
                                <label class="relative inline-flex items-center cursor-pointer">
                                  <input type="checkbox"
                                         id="profile-2fa"
                                         class="sr-only peer">
                                  <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                </label>
                              </div>
                            </div>

                            <button id="save-security-btn" class="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-mono rounded-lg transition-colors">
                              $ apply security settings
                            </button>
                          </div>

                          <!-- GDPR Compliance -->
                          <div class="bg-gray-900 border border-gray-800 rounded-xl p-6 relative overflow-hidden backdrop-blur-sm">
                            <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #f50bf5ff, transparent);"></div>

                            <h3 class="font-mono font-bold text-lg text-pink-400 mb-6">$ data --management</h3>

                            <!-- Anonymization Section -->
                            <div class="p-4 bg-gray-800 rounded-lg mb-4">
                              <h4 class="font-mono text-white font-medium mb-2">Data Anonymization</h4>
                              <p class="font-mono text-sm text-gray-400 mb-4">Replace your personal data with anonymous values while keeping your account active</p>
                              <button id="anonymize-account-btn" class="w-full px-4 py-3 bg-pink-500 hover:bg-pink-600 text-white font-mono rounded-lg transition-colors">
                                $ anonymize account
                              </button>
                            </div>

                            <!-- Account Deletion Section -->
                            <div class="p-4 bg-gray-800 rounded-lg mb-4">
                              <h4 class="font-mono text-red-400 font-medium mb-2">Account Deletion</h4>
                              <p class="font-mono text-sm text-gray-400 mb-4">Permanently delete your account and all associated data (irreversible)</p>
                              <button id="delete-account-btn" class="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-mono rounded-lg transition-colors">
                                $ delete account
                              </button>
                            </div>
                          </div>
                          <!-- PRIVACY et CONTACT LINKS EN BAS -->
                                <div class="text-center pb-8 space-x-4">
                                  <button id="privacy-link" class="font-mono text-sm text-gray-600 hover:text-indigo-400 transition-colors duration-200">
                                    privacy
                                  </button>
                                  <span class="text-gray-800">•</span>
                                  <button id="contact-link" class="font-mono text-sm text-gray-600 hover:text-green-400 transition-colors duration-200">
                                    contact
                                  </button>
                                </div>

                              </div>
  `;
        this.loadUserProfile();
    }
    attachEvents() {
        document.querySelectorAll(".nav-btn").forEach((btn) => {
            btn.addEventListener("click", (e) => {
                const section = e.target.dataset.section;
                this.showSection(section);
            });
        });
        document.getElementById("logout-btn").addEventListener("click", () => {
            this.handleLogout();
        });
        document.getElementById("local-game-btn").addEventListener("click", () => {
            this.startGame("local");
        });
        document.getElementById("ai-game-btn").addEventListener("click", () => {
            this.startGame("ai");
        });
        document
            .getElementById("remote-game-btn")
            .addEventListener("click", () => {
            this.startGame("remote");
        });
        document.getElementById("tournament")?.addEventListener("click", () => {
            this.showTournamentPopup();
        });
        document
            .getElementById("anonymize-account-btn")
            ?.addEventListener("click", () => {
            this.anonymizeAccount();
        });
        document
            .getElementById("delete-account-btn")
            ?.addEventListener("click", () => {
            this.deleteAccount();
        });
        document.getElementById("contact-link")?.addEventListener("click", () => {
            import("./privacy.js").then(({ showContactPopup }) => {
                showContactPopup();
            });
        });
        document.getElementById("privacy-link")?.addEventListener("click", () => {
            import("./privacy.js").then(({ showPrivacyPopup }) => {
                showPrivacyPopup();
            });
        });
        this.attachProfileEvents();
    }
    attachProfileEvents() {
        document
            .getElementById("profile-avatar-seed")
            ?.addEventListener("input", (e) => {
            const seed = e.target.value;
            if (this.currentUser?.avatarUrl) {
                const newUrl = this.rebuildUrlWithSeed(this.currentUser.avatarUrl, seed);
                const preview = document.getElementById("user-avatar");
                if (preview) {
                    preview.src = newUrl;
                }
            }
        });
        document
            .getElementById("avatar-edit-btn")
            ?.addEventListener("click", () => {
            document.getElementById("profile-avatar-url")?.focus();
        });
        document.getElementById("profile-2fa")?.addEventListener("change", (e) => {
            const isEnabled = e.target.checked;
            const statusElement = document.getElementById("2fa-toggle-status");
            if (statusElement) {
                statusElement.textContent = isEnabled ? "enabled" : "disabled";
                statusElement.className = `font-mono text-sm mr-3 ${isEnabled ? "text-green-400" : "text-gray-400"}`;
            }
        });
        document.getElementById("save-basic-btn")?.addEventListener("click", () => {
            this.saveBasicInfo();
        });
        document
            .getElementById("save-password-btn")
            ?.addEventListener("click", () => {
            this.savePassword();
        });
        document
            .getElementById("save-security-btn")
            ?.addEventListener("click", () => {
            this.saveSecurity();
        });
        document.getElementById("add-friend-btn")?.addEventListener("click", () => {
            const input = document.getElementById("add-friend-input");
            if (input) {
                this.addFriend(input.value);
            }
        });
        document
            .getElementById("add-friend-input")
            ?.addEventListener("keypress", (e) => {
            if (e.key === "Enter") {
                const input = e.target;
                this.addFriend(input.value);
            }
        });
    }
    async saveBasicInfo() {
        if (!this.currentUser)
            return;
        const username = document.getElementById("profile-username").value.trim();
        const email = document.getElementById("profile-email").value.trim();
        const alias = document.getElementById("profile-alias").value.trim();
        const avatarSeed = document.getElementById("profile-avatar-seed").value.trim();
        const avatarUrl = avatarSeed
            ? this.rebuildUrlWithSeed(this.currentUser.avatarUrl, avatarSeed)
            : this.currentUser.avatarUrl;
        const btn = document.getElementById("save-basic-btn");
        this.hideProfileAlerts();
        if (!username || !email) {
            GamePage.showProfileAlert("profile-alert", "$ error: username and email are required");
            return;
        }
        btn.textContent = "saving...";
        btn.disabled = true;
        try {
            const updateData = {};
            if (username !== this.currentUser.login)
                updateData.login = username;
            if (email !== this.currentUser.email)
                updateData.email = email;
            if (alias !== (this.currentUser.alias || this.currentUser.login))
                updateData.alias = alias;
            if (avatarUrl !== this.currentUser.avatarUrl)
                updateData.avatarUrl = avatarUrl;
            if (Object.keys(updateData).length === 0) {
                GamePage.showProfileAlert("profile-alert", "$ no changes to save");
                btn.textContent = "save";
                btn.disabled = false;
                return;
            }
            const response = await fetch("/user", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(updateData),
            });
            const data = await response.json();
            if (response.ok) {
                GamePage.showProfileAlert("profile-success", data.message, "success");
                Object.assign(this.currentUser, updateData);
                this.updateProfileDisplay();
                btn.textContent = "saved ✓";
                btn.style.backgroundColor = "#10b981";
                setTimeout(() => {
                    btn.textContent = "save";
                    btn.style.backgroundColor = "";
                    btn.disabled = false;
                }, 2000);
            }
            else {
                GamePage.showProfileAlert("profile-alert", `$ ${data.error || "update failed"}`);
                btn.textContent = "save";
                btn.disabled = false;
            }
        }
        catch (error) {
            GamePage.showProfileAlert("profile-alert", "$ network error");
            btn.textContent = "save";
            btn.disabled = false;
        }
    }
    async savePassword() {
        const newPassword = document.getElementById("profile-new-password").value;
        const confirmPassword = document.getElementById("profile-confirm-password").value;
        const btn = document.getElementById("save-password-btn");
        this.hideProfileAlerts();
        if (!newPassword || !confirmPassword) {
            GamePage.showProfileAlert("profile-alert", "$ error: both password fields are required");
            return;
        }
        if (newPassword !== confirmPassword) {
            GamePage.showProfileAlert("profile-alert", "$ error: passwords do not match");
            return;
        }
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            GamePage.showProfileAlert("profile-alert", "$ error: password must be at least 8 characters with uppercase, lowercase, number and special character");
            return;
        }
        btn.textContent = "updating...";
        btn.disabled = true;
        try {
            const response = await fetch("/user", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ password: newPassword }),
            });
            const data = await response.json();
            if (response.ok) {
                GamePage.showProfileAlert("profile-success", data.message, "success");
                document.getElementById("profile-new-password").value = "";
                document.getElementById("profile-confirm-password").value = "";
                btn.textContent = "updated ✓";
                btn.style.backgroundColor = "#10b981";
                setTimeout(() => {
                    btn.textContent = "update";
                    btn.style.backgroundColor = "";
                    btn.disabled = false;
                }, 2000);
            }
            else {
                GamePage.showProfileAlert("profile-alert", `$ ${data.error || "password update failed"}`);
                btn.textContent = "update";
                btn.disabled = false;
            }
        }
        catch (error) {
            GamePage.showProfileAlert("profile-alert", "$ network error");
            btn.textContent = "update";
            btn.disabled = false;
            console.error("Password update error:", error);
        }
    }
    async saveSecurity() {
        const isEnabled = document.getElementById("profile-2fa").checked;
        const btn = document.getElementById("save-security-btn");
        this.hideProfileAlerts();
        btn.textContent = "$ applying...";
        btn.disabled = true;
        try {
            const response = await fetch("/user", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ secure_auth: isEnabled }),
            });
            const data = await response.json();
            if (response.ok) {
                GamePage.showProfileAlert("profile-success", data.message, "success");
                if (this.currentUser) {
                    this.currentUser.secure_auth = isEnabled;
                }
                this.update2FAStatus(isEnabled);
                btn.textContent = "$ applied ✓";
                btn.style.backgroundColor = "#10b981";
                setTimeout(() => {
                    btn.textContent = "$ apply security settings";
                    btn.style.backgroundColor = "";
                    btn.disabled = false;
                }, 2000);
            }
            else {
                GamePage.showProfileAlert("profile-alert", `$ ${data.error || "2FA update failed"}`);
                if (this.currentUser) {
                    document.getElementById("profile-2fa").checked =
                        this.currentUser.secure_auth;
                    const statusElement = document.getElementById("2fa-toggle-status");
                    if (statusElement) {
                        statusElement.textContent = this.currentUser.secure_auth
                            ? "enabled"
                            : "disabled";
                        statusElement.className = `font-mono text-sm mr-3 ${this.currentUser.secure_auth ? "text-green-400" : "text-gray-400"}`;
                    }
                }
                btn.textContent = "$ apply security settings";
                btn.disabled = false;
            }
        }
        catch (error) {
            GamePage.showProfileAlert("profile-alert", "$ network error");
            btn.textContent = "$ apply security settings";
            btn.disabled = false;
            console.error("2FA update error:", error);
        }
    }
    static showProfileAlert(id, message, type = "error") {
        const alert = document.getElementById(id);
        if (alert) {
            alert.textContent = message;
            alert.classList.remove("hidden");
            alert.style.transform = "translate(-50%, -20px)";
            alert.style.opacity = "-0";
            setTimeout(() => {
                alert.style.transform = "translate(-50%, 0)";
                alert.style.opacity = "1";
                alert.style.transition = "all 0.3s ease-out";
            }, 10);
            setTimeout(() => GamePage.hideProfileAlert(id), 2000);
        }
    }
    static hideProfileAlert(id) {
        const alert = document.getElementById(id);
        if (alert && !alert.classList.contains("hidden")) {
            alert.style.transform = "translate(-50%, -20px)";
            alert.style.opacity = "0";
            setTimeout(() => {
                alert.classList.add("hidden");
                alert.style.transform = "";
                alert.style.opacity = "";
                alert.style.transition = "";
            }, 300);
        }
    }
    hideProfileAlerts() {
        GamePage.hideProfileAlert("profile-alert");
        GamePage.hideProfileAlert("profile-success");
    }
    handleBrowserNavigation() {
        window.addEventListener("popstate", (event) => {
            const path = window.location.pathname;
            if (path === "/") {
                window.router.navigate("/");
                return;
            }
            if (path.startsWith("/game")) {
                if (path === "/game") {
                    this.showSectionWithoutPush("tournament");
                }
                else if (path.startsWith("/game/")) {
                    const section = path.replace("/game/", "");
                    if (["tournament", "dashboard", "profile"].includes(section)) {
                        this.showSectionWithoutPush(section);
                    }
                    else {
                        this.showSectionWithoutPush("tournament");
                    }
                }
            }
        });
        const currentPath = window.location.pathname;
        if (currentPath.startsWith("/game/")) {
            const section = currentPath.replace("/game/", "");
            if (["tournament", "dashboard", "profile"].includes(section)) {
                this.currentSection = section;
            }
        }
        else if (currentPath === "/game") {
            this.currentSection = "tournament";
        }
    }
    showSectionWithoutPush(sectionName) {
        document.querySelectorAll(".section").forEach((section) => {
            section.classList.add("hidden");
        });
        document.querySelectorAll(".nav-btn").forEach((btn) => {
            btn.classList.remove("bg-blue-500", "text-white");
            btn.classList.add("text-gray-400");
        });
        document
            .getElementById(`section-${sectionName}`)
            .classList.remove("hidden");
        const activeBtn = document.querySelector(`[data-section="${sectionName}"]`);
        activeBtn.classList.remove("text-gray-400");
        activeBtn.classList.add("bg-blue-500", "text-white");
        this.currentSection = sectionName;
        console.log(`Section active (browser nav): ${sectionName}`);
        if (sectionName === "dashboard") {
            this.loadDashboardData();
        }
        else if (sectionName === "profile") {
            this.loadUserProfile();
        }
    }
    showSection(sectionName) {
        if (this.isGameActive) {
            GamePage.showProfileAlert("profile-alert", "$ error: navigation locked during match");
            return;
        }
        if (this.currentSection === sectionName) {
            return;
        }
        document.querySelectorAll(".section").forEach((section) => {
            section.classList.add("hidden");
        });
        document.querySelectorAll(".nav-btn").forEach((btn) => {
            btn.classList.remove("bg-blue-500", "text-white");
            btn.classList.add("text-gray-400");
        });
        document
            .getElementById(`section-${sectionName}`)
            .classList.remove("hidden");
        const activeBtn = document.querySelector(`[data-section="${sectionName}"]`);
        activeBtn.classList.remove("text-gray-400");
        activeBtn.classList.add("bg-blue-500", "text-white");
        const newUrl = `/game/${sectionName}`;
        if (window.location.pathname !== newUrl) {
            window.history.pushState({ section: sectionName }, "", newUrl);
        }
        this.currentSection = sectionName;
        if (sectionName === "profile") {
            this.loadUserProfile();
        }
        if (sectionName === "dashboard") {
            this.loadDashboardData();
        }
    }
    startGame(mode) {
        this.disableGameMode();
        const canvasDiv = document.getElementById("game-canvas");
        let controlsHTML = "";
        if (mode === "local") {
            controlsHTML = `
        <div class="text-center text-gray-500">
          <div class="text-6xl mb-4 font-mono">[PONG]</div>
          <p class="font-mono mb-6">pong.exe ready</p>
          <p class="font-mono text-blue-400 mb-8">local mode initialized</p>

          <!-- Contrôles Local -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md mx-auto mb-6">
            <h3 class="font-mono text-white font-bold mb-4">$ controls --local</h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div class="text-left">
                <div class="font-mono text-blue-400 font-bold mb-2">PLAYER 1</div>
                <div class="font-mono text-gray-300">W - move up</div>
                <div class="font-mono text-gray-300">S - move down</div>
              </div>
              <div class="text-left">
                <div class="font-mono text-purple-400 font-bold mb-2">PLAYER 2</div>
                <div class="font-mono text-gray-300">I - move up</div>
                <div class="font-mono text-gray-300">K - move down</div>
              </div>
            </div>
          </div>

          <button id="start-local-game" class="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-mono font-bold rounded-lg transition-colors">
            $ start-game
          </button>
        </div>
      `;
        }
        else if (mode === "ai") {
            controlsHTML = `
        <div class="text-center text-gray-500">
          <div class="text-6xl mb-4 font-mono">[PONG]</div>
          <p class="font-mono mb-6">pong.exe ready</p>
          <p class="font-mono text-purple-400 mb-8">ai mode initialized</p>

          <!-- Contrôles AI -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md mx-auto mb-6">
            <h3 class="font-mono text-white font-bold mb-4">$ controls --ai</h3>
            <div class="text-center">
              <div class="font-mono text-blue-400 font-bold mb-3">PLAYER vs AI</div>
              <div class="font-mono text-gray-300 mb-2">🖱️ Mouse - control paddle</div>
              <div class="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded">
                <div class="font-mono text-purple-400 text-sm">AI opponent active</div>
              </div>
            </div>
          </div>

          <button id="start-ai-game" class="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-mono font-bold rounded-lg transition-colors">
            $ start-game
          </button>
        </div>
      `;
        }
        else if (mode === "remote") {
            controlsHTML = `
    <div class="text-center text-gray-500">
      <div class="text-6xl mb-4 font-mono">[PONG]</div>
      <p class="font-mono mb-6">pong.exe ready</p>
      <p class="font-mono text-green-400 mb-8">remote mode selected ᯤ</p>
      <div class="space-y-4">
        <button id="join-room" class="w-full px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white font-mono font-bold rounded-lg transition-colors">
          $--join queue
        </button>
        <button id="leave-queue" class="w-full px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-mono font-bold rounded-lg transition-colors hidden">
          $--leave queue
        </button>
      </div>
    </div>
  `;
        }
        canvasDiv.innerHTML = controlsHTML;
        if (mode == "local" || mode == "ai") {
            const startButton = document.getElementById(`start-${mode}-game`);
            if (startButton) {
                startButton.addEventListener("click", () => {
                    this.launchGame(mode);
                });
            }
        }
        else if (mode === "remote") {
            const joinRoomBtn = document.getElementById("join-room");
            const leaveQueueBtn = document.getElementById("leave-queue");
            if (joinRoomBtn) {
                joinRoomBtn.addEventListener("click", () => {
                    console.log('🖱️ Bouton "join room" cliqué');
                    this.enableGameMode();
                    this.connectToRemoteMatchmaking();
                });
            }
            if (leaveQueueBtn) {
                leaveQueueBtn.addEventListener("click", () => {
                    this.disableGameMode();
                    this.leaveQueue();
                });
            }
        }
    }
    connectToRemoteMatchmaking() {
        console.log("🔄 connectToRemoteMatchmaking appelée");
        console.log("📊 État WebSocket actuel:", this.remoteSocket?.readyState);
        if (this.remoteSocket && this.remoteSocket.readyState === WebSocket.OPEN) {
            console.log("⚠️ WebSocket déjà connectée, ignorer");
            return;
        }
        if (this.remoteSocket &&
            this.remoteSocket.readyState === WebSocket.CONNECTING) {
            console.log("⚠️ WebSocket en cours de connexion, ignorer");
            return;
        }
        if (this.remoteSocket) {
            console.log("🔄 Fermeture WebSocket existante");
            this.remoteSocket.close();
        }
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws/remote`;
        try {
            this.remoteSocket = new WebSocket(wsUrl);
            this.remoteSocket.onopen = () => {
                console.log("✅ Connecté au matchmaking remote");
                GamePage.showProfileAlert("profile-success", "$ searching for opponent...", "success");
                this.updateQueueButtons(true);
            };
            this.remoteSocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("📩 Message reçu:", data);
                    this.handleRemoteMessage(data);
                }
                catch (error) {
                    console.error("Erreur parsing message WebSocket:", error);
                }
            };
            this.remoteSocket.onclose = () => {
                console.log("❌ Connexion WebSocket fermée");
                this.remoteSocket = null;
                this.updateQueueButtons(false);
            };
            this.remoteSocket.onerror = (error) => {
                console.error("❌ Erreur WebSocket:", error);
                GamePage.showProfileAlert("profile-alert", "$ connection failed - try again");
                this.updateQueueButtons(false);
            };
        }
        catch (error) {
            console.error("❌ Erreur création WebSocket:", error);
            GamePage.showProfileAlert("profile-alert", "$ connection error - check network");
        }
    }
    updateQueueButtons(inQueue) {
        const joinBtn = document.getElementById("join-room");
        const leaveBtn = document.getElementById("leave-queue");
        if (joinBtn && leaveBtn) {
            if (inQueue) {
                joinBtn.classList.add("hidden");
                leaveBtn.classList.remove("hidden");
            }
            else {
                joinBtn.classList.remove("hidden");
                leaveBtn.classList.add("hidden");
            }
        }
    }
    leaveQueue() {
        if (this.remoteSocket && this.remoteSocket.readyState === WebSocket.OPEN) {
            console.log('🚪 Quitter la file d\'attente');
            this.remoteSocket.close();
            this.disableGameMode();
            GamePage.showProfileAlert("profile-success", "$ left queue", "success");
        }
    }
    handleRemoteMessage(data) {
        console.log("📩 Message reçu du serveur remote:", data.type);
        switch (data.type) {
            case "waiting":
                console.log("⏳ En attente d'un adversaire...");
                GamePage.showProfileAlert("profile-success", "$ waiting for opponent...", "success");
                break;
            case "match_found":
                console.log("🎮 Match trouvé!", data);
                const canvasDiv = document.getElementById("game-canvas");
                canvasDiv.innerHTML = `
          <div class="text-center text-gray-500">
            <div class="text-6xl mb-4 font-mono">[PONG]</div>
            <p class="font-mono mb-6">pong.exe ready</p>
            <p class="font-mono text-green-400 mb-8">🎯 match found! initializing...</p>
            <div class="flex justify-center space-x-1">
              <div class="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
              <div class="w-2 h-2 bg-green-500 rounded-full animate-bounce" style="animation-delay: 0.1s;"></div>
              <div class="w-2 h-2 bg-green-500 rounded-full animate-bounce" style="animation-delay: 0.2s;"></div>
            </div>
          </div>
        `;
                setTimeout(() => {
                    this.connectToRemoteGame(data.roomId, data.opponentId);
                }, 500);
                break;
            case "error":
                console.error("❌ Erreur serveur:", data.message);
                GamePage.showProfileAlert("profile-alert", `$ error: ${data.message}`);
                break;
            default:
                console.log("Message non géré:", data);
        }
    }
    async connectToRemoteGame(roomId, opponentId) {
        if (this.remoteSocket) {
            this.remoteSocket.close();
            this.remoteSocket = null;
        }
        console.log(`🔗 Connexion au jeu remote - Room: ${roomId}`);
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/ws/remote/game?roomId=${roomId}`;
        try {
            const gameSocket = new WebSocket(wsUrl);
            gameSocket.onopen = () => {
                console.log("✅ Connecté au jeu remote");
                GamePage.showProfileAlert("profile-success", "$ connected to game room", "success");
            };
            gameSocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === "game_init") {
                        window.gameSocket = gameSocket;
                        window.gameInitData = data;
                        this.launchGame("remote");
                    }
                }
                catch (error) {
                    console.error("Erreur parsing message:", error);
                }
            };
        }
        catch (error) {
            console.error("❌ Erreur création WebSocket jeu:", error);
            GamePage.showProfileAlert("profile-alert", "$ failed to connect to game room");
        }
    }
    renderControlsScreen(playerSide) {
        const canvasDiv = document.getElementById("game-canvas");
        const isLeftPlayer = playerSide === "left";
        const isRightPlayer = playerSide === "right";
        const leftPlayerLabel = isLeftPlayer ? "YOU" : "OPPONENT";
        const rightPlayerLabel = isRightPlayer ? "YOU" : "OPPONENT";
        const leftPlayerBorder = isLeftPlayer
            ? "border-green-500"
            : "border-blue-500";
        const rightPlayerBorder = isRightPlayer
            ? "border-green-500"
            : "border-red-500";
        const leftPlayerBg = isLeftPlayer ? "bg-green-500/20" : "bg-blue-500/20";
        const rightPlayerBg = isRightPlayer ? "bg-green-500/20" : "bg-red-500/20";
        const leftPlayerText = isLeftPlayer ? "text-green-400" : "text-blue-400";
        const rightPlayerText = isRightPlayer ? "text-green-400" : "text-red-400";
        canvasDiv.innerHTML = `
    <!-- 🆕 Canvas caché pour le jeu -->
    <canvas id="renderCanvas" class="w-full h-full absolute inset-0 opacity-0 pointer-events-none" tabindex="0"></canvas>
    
    <!-- Interface de contrôles par-dessus -->
    <div id="controls-overlay" class="w-full h-[500px] bg-gray-900 border border-gray-700 rounded-lg p-8 relative overflow-hidden backdrop-blur-sm">
      <div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>

      <div class="text-white h-full flex flex-col justify-center">
        <div class="text-center max-w-2xl mx-auto">

          <!-- Match title -->
          <h1 class="font-mono text-3xl font-bold text-green-400 mb-8">remote match ready</h1>

          <!-- Players cards avec contrôles -->
          <div class="grid grid-cols-3 items-center gap-6 mb-8">

            <!-- Left Player -->
            <div class="bg-gray-800 ${leftPlayerBorder} border rounded-lg p-6 ${isLeftPlayer ? "ring-2 ring-green-500/50" : ""}">
              <div class="w-16 h-16 ${leftPlayerBg} ${leftPlayerBorder} border rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="font-mono text-lg font-bold ${leftPlayerText}">L</span>
              </div>
              <h3 class="font-mono text-lg font-bold ${leftPlayerText} mb-3">${leftPlayerLabel}</h3>
              <div class="space-y-2">
                <div class="font-mono text-sm text-gray-300">W - move up</div>
                <div class="font-mono text-sm text-gray-300">S - move down</div>
              </div>
              ${isLeftPlayer ? '<div class="mt-3 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-xs font-mono text-green-400">Your side</div>' : ""}
            </div>

            <!-- VS -->
            <div class="text-center">
              <div class="font-mono text-3xl font-bold text-white mb-2">VS</div>
              <div class="w-16 h-1 bg-gradient-to-r from-blue-500 to-red-500 mx-auto"></div>
            </div>

            <!-- Right Player -->
            <div class="bg-gray-800 ${rightPlayerBorder} border rounded-lg p-6 ${isRightPlayer ? "ring-2 ring-green-500/50" : ""}">
              <div class="w-16 h-16 ${rightPlayerBg} ${rightPlayerBorder} border rounded-full flex items-center justify-center mx-auto mb-4">
                <span class="font-mono text-lg font-bold ${rightPlayerText}">R</span>
              </div>
              <h3 class="font-mono text-lg font-bold ${rightPlayerText} mb-3">${rightPlayerLabel}</h3>
              <div class="space-y-2">
                <div class="font-mono text-sm text-gray-300">I - move up</div>
                <div class="font-mono text-sm text-gray-300">K - move down</div>
              </div>
              ${isRightPlayer ? '<div class="mt-3 px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-xs font-mono text-green-400">Your side</div>' : ""}
            </div>

          </div>

          <!-- Loading bar -->
          <div class="max-w-md mx-auto">
            <div class="font-mono text-green-400 text-sm mb-3">initializing connection...</div>
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-2">
              <div id="loading-bar" class="h-2 bg-gradient-to-r from-green-500 to-green-400 rounded transition-all duration-100" style="width: 0%"></div>
            </div>
            <div class="font-mono text-gray-400 text-xs mt-2" id="loading-text">preparing match...</div>
          </div>

        </div>
      </div>
    </div>
  `;
        this.startLoadingAnimation();
    }
    startLoadingAnimation() {
        let progress = 0;
        const loadingBar = document.getElementById("loading-bar");
        const loadingText = document.getElementById("loading-text");
        const loadingMessages = [
            "preparing match...",
            "syncing players...",
            "establishing connection...",
            "loading game assets...",
            "finalizing setup...",
        ];
        const updateProgress = () => {
            progress += 2;
            loadingBar.style.width = `${progress}%`;
            if (progress === 20)
                loadingText.textContent = loadingMessages[1];
            else if (progress === 40)
                loadingText.textContent = loadingMessages[2];
            else if (progress === 60)
                loadingText.textContent = loadingMessages[3];
            else if (progress === 80)
                loadingText.textContent = loadingMessages[4];
            else if (progress >= 100) {
                loadingText.textContent = "starting match...";
                setTimeout(() => {
                    console.log("🎮 Animation terminée, transition vers le jeu");
                    const overlay = document.getElementById("controls-overlay");
                    const canvas = document.getElementById("renderCanvas");
                    if (overlay && canvas) {
                        overlay.style.transition = "opacity 0.5s ease-out";
                        overlay.style.opacity = "0";
                        overlay.style.pointerEvents = "none";
                        canvas.style.transition = "opacity 0.5s ease-in";
                        canvas.style.opacity = "1";
                        canvas.style.pointerEvents = "auto";
                        canvas.classList.remove("opacity-0", "pointer-events-none");
                        canvas.classList.add("opacity-100");
                        setTimeout(() => {
                            if (overlay && overlay.parentNode) {
                                overlay.parentNode.removeChild(overlay);
                            }
                        }, 500);
                    }
                    if (window.remotePongGameInstance && window.remotePongGameInstance.createGameScene) {
                        console.log("🎯 Démarrage de createGameScene");
                        window.remotePongGameInstance.createGameScene();
                    }
                    else {
                        console.error("❌ remotePongGameInstance non disponible");
                    }
                }, 500);
                return;
            }
            setTimeout(updateProgress, 60);
        };
        updateProgress();
    }
    handleRemoteGameMessage(data) {
        console.log("🎮 Message remote reçu:", data.type);
        switch (data.type) {
            case "game_ended":
                this.hasGameEnded = true;
                if (window.gameSocket) {
                    window.gameSocket.close();
                    window.gameSocket = null;
                }
                GamePage.showProfileAlert("profile-success", "$ game ended", "success");
                const gameCanvasDiv = document.getElementById("game-canvas");
                const currentGame = window.remotePongGameInstance;
                console.log("currentGame", currentGame);
                const player1Name = currentGame?.player1Name || "Player 1";
                const player2Name = currentGame?.player2Name || "Player 2";
                const scoreLeft = currentGame?.scoreLeft || 0;
                const scoreRight = currentGame?.scoreRight || 0;
                gameCanvasDiv.innerHTML = `
            <div class="w-full h-full flex items-center justify-center bg-black border border-gray-700 rounded-lg">
              <div class="text-center text-white p-8">
                <div class="text-6xl mb-6 text-green-400"></div>
                <h2 class="font-mono text-3xl font-bold text-green-400 mb-6">GAME OVER</h2>

                <div class="mb-8 space-y-4">
                  <div class="flex justify-between items-center bg-gray-800 p-4 rounded-lg">
                    <div class="text-left">
                      <div class="text-lg font-bold text-blue-400">${player1Name}</div>
                      <div class="text-sm text-gray-400">Left Side</div>
                    </div>
                    <div class="text-4xl font-bold text-blue-400">${scoreLeft}</div>
                  </div>

                  <div class="flex justify-between items-center bg-gray-800 p-4 rounded-lg">
                    <div class="text-left">
                      <div class="text-lg font-bold text-red-400">${player2Name}</div>
                      <div class="text-sm text-gray-400">Right Side</div>
                    </div>
                    <div class="text-4xl font-bold text-red-400">${scoreRight}</div>
                  </div>
                </div>

                <div class="mb-6">
                  <div class="text-xl font-bold text-yellow-400">
                    ${scoreLeft > scoreRight
                    ? ` ${player1Name} Wins!`
                    : scoreRight > scoreLeft
                        ? ` ${player2Name} Wins!`
                        : " It's a Tie!"}
                  </div>
                </div>

                <div class="space-y-4">
                  <button id="back-to-menu-game-ended" class="w-full px-6 py-3 bg-green-500 hover:bg-green-600 text-white font-mono font-bold rounded-lg transition-colors">
                    $ back to menu
                  </button>
                </div>
              </div>
            </div>
          `;
                document
                    .getElementById("back-to-menu-game-ended")
                    ?.addEventListener("click", () => {
                    this.startGame("remote");
                });
                this.disableGameMode();
                break;
            case "player_disconnected":
                if (this.hasGameEnded) {
                    break;
                }
                console.log("❌ Joueur déconnecté:", data.playerId);
                GamePage.showProfileAlert("profile-alert", "$ opponent disconnected !!!!!");
                this.disableGameMode();
                const canvasDiv = document.getElementById("game-canvas");
                canvasDiv.innerHTML = `
          <div class="w-full h-full flex items-center justify-center bg-black border border-gray-700 rounded-lg">
            <div class="text-center text-white p-8">
              <div class="text-6xl mb-6 text-red-400">⚠️</div>
              <h2 class="font-mono text-2xl font-bold text-red-400 mb-4">CONNECTION LOST</h2>
              <p class="font-mono text-gray-400 mb-8">Your opponent has disconnected</p>

              <div class="space-y-4">
                <button id="back-to-menu" class="w-full px-6 py-3 bg-green-500 hover:bg-600 text-white font-mono font-bold rounded-lg transition-colors">
                  $ back to menu
                </button>
              </div>
            </div>
          </div>
        `;
                document
                    .getElementById("back-to-menu")
                    ?.addEventListener("click", () => {
                    this.startGame("remote");
                });
                if (typeof window.disposeGame === "function") {
                    window.disposeGame();
                }
                if (window.gameSocket) {
                    window.gameSocket.close();
                    window.gameSocket = null;
                }
                break;
            default:
                console.log("Message remote non géré:", data);
        }
    }
    async launchGame(mode) {
        this.hasGameEnded = false;
        if (typeof window.disposeGame === "function") {
            window.disposeGame();
        }
        this.hasGameEnded = false;
        this.enableGameMode();
        if (typeof window.disposeGame === "function") {
            window.disposeGame();
        }
        const canvasDiv = document.getElementById("game-canvas");
        canvasDiv.innerHTML = `<canvas id="renderCanvas" class="w-full h-full" tabindex="0"></canvas>`;
        const oldScript = document.getElementById("pong-script");
        if (oldScript)
            oldScript.remove();
        let scriptSrc = "../../pong/pong.js";
        if (mode === "ai")
            scriptSrc = "../../pong/pov.js";
        if (mode === "remote")
            scriptSrc = "../../pong/remote-pong.js";
        window.gameMode = mode;
        const script = document.createElement("script");
        script.id = "pong-script";
        script.src = scriptSrc + "?t=" + Date.now();
        script.async = false;
        console.log(`Game ${mode} started`);
        if (mode === "remote") {
            script.onload = () => {
                console.log("✅ remote-pong.js chargé");
            };
        }
        canvasDiv.appendChild(script);
        if (GamePage.currentTournamentId) {
            console.log("🏆 Tournament game launched:", {
                tournamentId: GamePage.currentTournamentId,
                shouldRecord: GamePage.shouldRecordTournamentMatch,
                matchData: GamePage.tournamentMatchData,
            });
        }
    }
    showTournamentPopup() {
        const nameInput = document.querySelector('input[placeholder="tournament_name"]');
        const playersSelect = document.querySelector("select");
        if (!nameInput || !playersSelect) {
            GamePage.showProfileAlert("profile-alert", "$ error: form elements not found");
            return;
        }
        const tournamentName = nameInput.value.trim();
        const maxPlayersText = playersSelect.value;
        const maxPlayers = parseInt(maxPlayersText.split(".")[0]);
        if (!tournamentName) {
            GamePage.showProfileAlert("profile-alert", "$ error: tournament name required");
            return;
        }
        this.createTournamentPopup(tournamentName, maxPlayers);
    }
    createTournamentPopup(tournamentName, maxPlayers) {
        const existingPopup = document.getElementById("tournament-popup");
        if (existingPopup) {
            existingPopup.remove();
        }
        let aliasFields = "";
        for (let i = 1; i <= maxPlayers; i++) {
            const isCurrentUser = i === 1;
            const placeholder = isCurrentUser
                ? this.currentUser?.alias || this.currentUser?.login || "Your alias"
                : `Player ${i}`;
            const value = isCurrentUser
                ? this.currentUser?.alias || this.currentUser?.login || ""
                : "";
            aliasFields += `
        <div class="mb-4">
          <label class="block font-mono text-sm text-gray-400 mb-2">
            Player ${i} ${isCurrentUser ? "(You)" : ""}
          </label>
          <input
            type="text"
            id="player-${i}-alias"
            value="${value}"
            placeholder="${placeholder}"
            ${isCurrentUser ? "readonly" : ""}
            class="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isCurrentUser ? "opacity-75 cursor-not-allowed" : ""}"
          >
        </div>
      `;
        }
        const popup = document.createElement("div");
        popup.id = "tournament-popup";
        popup.className =
            "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]";
        popup.innerHTML = `
      <div class="bg-gray-900 border border-gray-700 rounded-xl p-8 max-w-md w-full mx-4 relative">
        <!-- Header -->
        <div class="flex justify-between items-center mb-6">
          <h3 class="font-mono text-xl font-bold text-yellow-400">$ setup-tournament</h3>
          <button id="close-popup" class="text-gray-400 hover:text-white text-2xl">&times;</button>
        </div>

        <!-- Tournament Info -->
        <div class="mb-6 p-4 bg-gray-800 rounded-lg">
          <div class="font-mono text-white font-bold">${tournamentName}</div>
          <div class="font-mono text-gray-400 text-sm">${maxPlayers} players tournament</div>
        </div>

        <!-- Alias Fields -->
        <div class="mb-6 max-h-64 overflow-y-auto">
          ${aliasFields}
        </div>

        <!-- Buttons -->
        <div class="flex gap-4">
          <button id="cancel-tournament" class="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-mono rounded-lg transition-colors">
            $ cancel
          </button>
          <button id="create-tournament" class="flex-1 px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-mono font-bold rounded-lg transition-colors">
            $ create
          </button>
        </div>
      </div>
    `;
        document.body.appendChild(popup);
        document.getElementById("close-popup")?.addEventListener("click", () => {
            popup.remove();
        });
        document
            .getElementById("cancel-tournament")
            ?.addEventListener("click", () => {
            popup.remove();
        });
        document
            .getElementById("create-tournament")
            ?.addEventListener("click", () => {
            this.handleCreateTournamentFromPopup(tournamentName, maxPlayers);
            popup.remove();
        });
        popup.addEventListener("click", (e) => {
            if (e.target === popup) {
                popup.remove();
            }
        });
    }
    async handleCreateTournamentFromPopup(tournamentName, maxPlayers) {
        const players = [];
        for (let i = 1; i <= maxPlayers; i++) {
            const aliasInput = document.getElementById(`player-${i}-alias`);
            if (aliasInput) {
                const alias = aliasInput.value.trim();
                if (!alias) {
                    GamePage.showProfileAlert("profile-alert", `$ error: Player ${i} alias is required`);
                    return;
                }
                players.push(alias);
            }
        }
        try {
            console.log(` creating tournament: ${tournamentName} with players:`, players);
            this.enableGameMode();
            const response = await fetch("/tournament", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    name: tournamentName,
                    max_players: maxPlayers,
                    players: players,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                GamePage.showProfileAlert("profile-alert", data.error);
                return;
            }
            GamePage.currentTournamentId = data.id;
            GamePage.shouldRecordTournamentMatch = data.player_id !== -1;
            GamePage.tournamentMatchData = {
                player_1: data.player_1,
                player_2: data.player_2,
                status: data.status,
            };
            console.log(" Tournament state initialized:", {
                id: GamePage.currentTournamentId,
                shouldRecord: GamePage.shouldRecordTournamentMatch,
                playerParticipating: data.player_id !== -1,
                matchData: GamePage.tournamentMatchData,
            });
            const nameInput = document.querySelector('input[placeholder="tournament_name"]');
            if (nameInput)
                nameInput.value = "";
            this.showTournamentRules(tournamentName, players, data);
        }
        catch (error) {
            GamePage.showProfileAlert("profile-alert", typeof error === "object" && error !== null && "message" in error
                ? error.message
                : String(error));
        }
    }
    showTournamentRules(tournamentName, players, tournamentData) {
        const canvasDiv = document.getElementById("game-canvas");
        canvasDiv.innerHTML = `
		<div class="w-full h-[500px] bg-gray-900 border border-gray-700 rounded-lg p-8 relative overflow-hidden backdrop-blur-sm">
		<div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>

		<div class="text-center text-white h-full flex flex-col justify-center">

			<!-- Tournament header -->
			<div class="mb-10">
			<h2 class="font-mono text-3xl font-bold text-yellow-400 mb-4">${tournamentName}</h2>
			<p class="font-mono text-lg text-gray-400">${players.length} players • elimination tournament</p>
			</div>

			<!-- Current match card -->
			<div class="bg-gray-800 border border-gray-700 rounded-lg p-8 mb-12 max-w-lg mx-auto">
			<h3 class="font-mono text-yellow-400 font-bold mb-6 text-xl text-center">current match</h3>
			<div class="flex items-center justify-center gap-8">
				<div class="text-center">
				<div class="font-mono text-2xl font-bold text-blue-400">${tournamentData.player_1}</div>
				<div class="font-mono text-sm text-gray-400">player 1</div>
				</div>
				<div class="font-mono text-2xl text-gray-500">vs</div>
				<div class="text-center">
				<div class="font-mono text-2xl font-bold text-red-400">${tournamentData.player_2}</div>
				<div class="font-mono text-sm text-gray-400">player 2</div>
				</div>
			</div>
			</div>

			<!-- Start button -->
			<button id="start-tournament"
					class="px-12 py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-mono font-bold text-lg rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-yellow-500/30 max-w-sm mx-auto">
			$ start match
			</button>

		</div>
		</div>
	`;
        document
            .getElementById("start-tournament")
            ?.addEventListener("click", () => {
            this.showTournamentPreMatch(tournamentData);
        });
    }
    showTournamentPreMatch(tournamentData) {
        const canvasDiv = document.getElementById("game-canvas");
        canvasDiv.innerHTML = `
		<div class="w-full h-[500px] bg-gray-900 border border-gray-700 rounded-lg p-6 relative overflow-hidden backdrop-blur-sm">
		<div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>

		<div class="text-white h-full flex items-center justify-center">
			<div class="text-center max-w-3xl w-full">

			<!-- Match title -->
			<h1 class="font-mono text-3xl font-bold text-yellow-400 mb-8">match ready</h1>

			<!-- Players cards -->
			<div class="grid grid-cols-3 items-center gap-6 mb-8">

				<!-- Player 1 -->
				<div class="bg-gray-800 border border-blue-500 rounded-lg p-4">
				<div class="w-16 h-16 bg-blue-500/20 border border-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
					<span class="font-mono text-lg font-bold text-blue-400">P1</span>
				</div>
				<h3 class="font-mono text-lg font-bold text-blue-400 mb-2">${tournamentData.player_1}</h3>
				<div class="font-mono text-xs text-gray-400">W / S</div>
				</div>

				<!-- VS -->
				<div class="text-center">
				<div class="font-mono text-3xl font-bold text-white mb-2">VS</div>
				<div class="w-16 h-1 bg-gradient-to-r from-blue-500 to-red-500 mx-auto"></div>
				</div>

				<!-- Player 2 -->
				<div class="bg-gray-800 border border-red-500 rounded-lg p-4">
				<div class="w-16 h-16 bg-red-500/20 border border-red-500 rounded-full flex items-center justify-center mx-auto mb-3">
					<span class="font-mono text-lg font-bold text-red-400">P2</span>
				</div>
				<h3 class="font-mono text-lg font-bold text-red-400 mb-2">${tournamentData.player_2}</h3>
				<div class="font-mono text-xs text-gray-400">I / K</div>
				</div>

			</div>

			<!-- Match info -->
			<div class="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6 max-w-sm mx-auto">
				<div class="grid grid-cols-2 gap-4 text-center font-mono text-sm">
				<div>
					<div class="text-yellow-400 font-bold">target</div>
					<div class="text-white text-lg">7 points</div>
				</div>
				<div>
					<div class="text-yellow-400 font-bold">status</div>
					<div class="text-white text-lg">
					${tournamentData.player_id !== -1 ? "playing" : "spectating"}
					</div>
				</div>
				</div>
			</div>

			<!-- Ready button -->
			<div id="start-button-container">
				<button id="ready-to-fight"
						class="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-mono font-bold rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/30">
				$ ready to fight
				</button>
			</div>

			</div>
		</div>
		</div>
	`;
        document.getElementById("ready-to-fight")?.addEventListener("click", () => {
            this.startMatchCountdown(tournamentData);
        });
    }
    startMatchCountdown(tournamentData) {
        const canvasDiv = document.getElementById("game-canvas");
        let countdown = 3;
        const updateCountdown = () => {
            if (countdown > 0) {
                canvasDiv.innerHTML = `
			<div class="w-full h-[500px] bg-gray-900 border border-gray-700 rounded-lg relative overflow-hidden backdrop-blur-sm flex items-center justify-center">
			<div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #3b82f6, transparent);"></div>

			<div class="text-center">
				<div class="font-mono text-9xl font-bold text-yellow-400 mb-6">${countdown}</div>
				<div class="font-mono text-2xl text-gray-400">get ready...</div>
			</div>
			</div>
		`;
                countdown--;
                setTimeout(updateCountdown, 1000);
            }
            else {
                canvasDiv.innerHTML = `
			<div class="w-full h-[500px] bg-gray-900 border border-gray-700 rounded-lg relative overflow-hidden backdrop-blur-sm flex items-center justify-center">
			<div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #10b981, transparent);"></div>

			<div class="text-center">
				<div class="font-mono text-8xl font-bold text-green-400">FIGHT!</div>
			</div>
			</div>
		`;
                setTimeout(() => {
                    this.launchGame("tournament");
                }, 1000);
            }
        };
        updateCountdown();
    }
    static showNextTournamentMatch(tournamentData) {
        const canvasDiv = document.getElementById("game-canvas");
        if (!canvasDiv)
            return;
        canvasDiv.innerHTML = `
		<div class="w-full h-[500px] bg-gray-900 border border-gray-700 rounded-lg p-8 relative overflow-hidden backdrop-blur-sm">
		<div class="absolute top-0 left-0 right-0 h-px opacity-50" style="background: linear-gradient(90deg, transparent, #10b981, transparent);"></div>

		<div class="text-white h-full flex flex-col justify-center">

			<div class="text-center max-w-2xl mx-auto">

			<!-- Result notification -->
			<div class="bg-green-500/10 border border-green-500 rounded-lg p-6 mb-12">
				<div class="font-mono text-green-400 font-bold text-xl">match completed</div>
			</div>

			<!-- Next match info -->
			<div class="mb-12">
				<h2 class="font-mono text-3xl font-bold text-blue-400 mb-8">next match</h2>
				<div class="bg-gray-800 border border-gray-700 rounded-lg p-8">
				<div class="flex items-center justify-center gap-8">
					<div class="text-center">
					<div class="font-mono text-2xl font-bold text-blue-400">${tournamentData.player_1}</div>
					<div class="font-mono text-sm text-gray-400">player 1</div>
					</div>
					<div class="font-mono text-2xl text-gray-500">vs</div>
					<div class="text-center">
					<div class="font-mono text-2xl font-bold text-red-400">${tournamentData.player_2}</div>
					<div class="font-mono text-sm text-gray-400">player 2</div>
					</div>
				</div>
				</div>
			</div>

			<!-- Continue button -->
			<button id="start-next-match"
					class="px-12 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-mono font-bold text-lg rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/30">
				$ continue tournament
			</button>

			</div>
		</div>
		</div>
	`;
        document
            .getElementById("start-next-match")
            ?.addEventListener("click", () => {
            const gamePageInstance = window.gamePageInstance;
            if (gamePageInstance) {
                gamePageInstance.showTournamentPreMatch(tournamentData);
            }
        });
    }
    static async updateTournamentWithWinner(score1, score2) {
        if (!GamePage.currentTournamentId || !GamePage.tournamentMatchData)
            return;
        try {
            const winner = score1 > score2
                ? GamePage.tournamentMatchData.player_1
                : GamePage.tournamentMatchData.player_2;
            console.log(`🏆 Match finished: ${GamePage.tournamentMatchData.player_1} (${score1}) vs ${GamePage.tournamentMatchData.player_2} (${score2})`);
            console.log(`🏆 Winner: ${winner}`);
            const response = await fetch(`/tournament/${GamePage.currentTournamentId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    winner: winner,
                }),
            });
            const data = await response.json();
            if (response.ok) {
                console.log("Tournament updated:", data);
                if (data.status === "in progress") {
                    GamePage.tournamentMatchData = {
                        player_1: data.player_1,
                        player_2: data.player_2,
                        status: data.status,
                    };
                    GamePage.shouldRecordTournamentMatch = data.player_id !== -1;
                    GamePage.showProfileAlert("profile-success", ` ${winner} wins! Next match: ${data.player_1} vs ${data.player_2}`, "success");
                    setTimeout(() => {
                        GamePage.showNextTournamentMatch(data);
                    }, 3000);
                }
                else if (data.status === "finished") {
                    GamePage.showProfileAlert("profile-success", ` TOURNAMENT CHAMPION: ${data.player_1}! `, "success");
                    setTimeout(() => {
                        GamePage.resetTournamentState();
                    }, 3000);
                }
            }
        }
        catch (error) {
            console.error("Error updating tournament:", error);
            GamePage.showProfileAlert("profile-alert", "Failed to update tournament");
        }
    }
    static resetTournamentState() {
        GamePage.currentTournamentId = null;
        GamePage.shouldRecordTournamentMatch = false;
        GamePage.tournamentMatchData = null;
        const gamePageInstance = window.gamePageInstance;
        if (gamePageInstance) {
            gamePageInstance.resetToGameMenu();
        }
    }
    resetToGameMenu() {
        if (typeof window.disposeGame === "function") {
            window.disposeGame();
        }
        this.disableGameMode();
        this.cleanup();
        this.resetGameInterface();
    }
    resetGameInterface() {
        const canvasDiv = document.getElementById("game-canvas");
        canvasDiv.innerHTML = `
      <div class="w-full h-[500px] bg-black border border-gray-700 rounded-lg flex items-center justify-center relative">
        <div class="text-center text-gray-500">
          <div class="text-6xl mb-4 font-mono animate-pulse"></div>
          <div class="text-3xl mb-4 font-mono text-yellow-400">TOURNAMENT COMPLETED!</div>
          <p class="font-mono text-lg mb-8">Congratulations to all participants</p>

          <div class="space-y-4">
            <button id="back-to-games-btn" class="block mx-auto px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-mono font-bold rounded-lg transition-colors">
              $ back to games menu
            </button>
          </div>
        </div>
      </div>
    `;
        document
            .getElementById("back-to-games-btn")
            ?.addEventListener("click", () => {
            this.showBackToGameMenu();
        });
        setTimeout(() => {
            this.showBackToGameMenu();
        }, 15000);
    }
    showBackToGameMenu() {
        const canvasDiv = document.getElementById("game-canvas");
        canvasDiv.innerHTML = `
      <div class="w-full h-[500px] bg-black border border-gray-700 rounded-lg flex items-center justify-center relative">
        <div class="text-center text-gray-500">
          <div class="text-6xl mb-4 font-mono">[PONG]</div>
          <p class="font-mono">pong.exe ready</p>
          <p class="font-mono text-sm text-gray-600 mt-2">select mode to initialize</p>
        </div>
      </div>
    `;
        const nameInput = document.querySelector('input[placeholder="tournament_name"]');
        if (nameInput) {
            nameInput.value = "";
        }
        GamePage.showProfileAlert("profile-success", " Tournament completed! Ready for new games", "success");
    }
    async anonymizeAccount() {
        const confirmed = await this.showConfirmationPopup("anonymize", "$ data --anonymize", "This will anonymize your public display:", [
            '• Public username → "user_[id]_[random]"',
            '• Alias → "user_[id]_[random]"',
            "",
            "Your login and other data remain unchanged.",
            "This action cannot be undone.",
        ], "ANONYMIZE", "amber");
        if (!confirmed) {
            GamePage.showProfileAlert("profile-alert", "$ anonymization cancelled");
            return;
        }
        const btn = document.getElementById("anonymize-account-btn");
        if (!btn)
            return;
        btn.textContent = "$ anonymizing...";
        btn.disabled = true;
        this.hideProfileAlerts();
        try {
            const response = await fetch("/anonymize", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({}),
            });
            const data = await response.json();
            if (response.ok) {
                GamePage.showProfileAlert("profile-success", data.message || "$ account anonymized successfully", "success");
                setTimeout(() => {
                    this.loadUserProfile();
                }, 2000);
            }
            else {
                GamePage.showProfileAlert("profile-alert", `$ ${data.error || "anonymization failed"}`);
            }
        }
        catch (error) {
            GamePage.showProfileAlert("profile-alert", "$ network error");
            console.error("Anonymization error:", error);
        }
        finally {
            btn.textContent = "$ anonymize account";
            btn.disabled = false;
        }
    }
    async deleteAccount() {
        const confirmed = await this.showConfirmationPopup("delete", "$ account --delete", "DANGER - This will mark your account as deleted:", [
            '• Username → "deleted_user"',
            "• Email → removed",
            "• Avatar → removed",
            "• Password → removed",
            "• Stats → reset to 0",
            "• Friends → removed",
            "",
            "This action is IRREVERSIBLE.",
            "You will be immediately logged out.",
        ], "DELETE FOREVER", "red");
        if (!confirmed) {
            GamePage.showProfileAlert("profile-alert", "$ account deletion cancelled");
            return;
        }
        const btn = document.getElementById("delete-account-btn");
        if (!btn)
            return;
        btn.textContent = "$ deleting...";
        btn.disabled = true;
        this.hideProfileAlerts();
        try {
            const response = await fetch("/delete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({}),
            });
            const data = await response.json();
            if (response.ok) {
                GamePage.showProfileAlert("profile-success", data.message || "$ account deleted successfully", "success");
                this.cleanup();
                if (window.socket) {
                    window.socket.close();
                }
                setTimeout(() => {
                    window.router.navigate("/");
                }, 2000);
            }
            else {
                GamePage.showProfileAlert("profile-alert", `$ ${data.error || "deletion failed"}`);
            }
        }
        catch (error) {
            GamePage.showProfileAlert("profile-alert", "$ network error");
            console.error("Account deletion error:", error);
        }
        finally {
            btn.textContent = "$ delete account";
            btn.disabled = false;
        }
        try {
            await fetch("/auth/signout", {
                method: "GET",
                credentials: "include",
            });
        }
        catch (err) {
            console.log("Logout call failed, but account deleted");
        }
    }
    showConfirmationPopup(type, title, description, bulletPoints, confirmText, color) {
        return new Promise((resolve) => {
            const existingPopup = document.getElementById("confirmation-popup");
            if (existingPopup) {
                existingPopup.remove();
            }
            const colorClasses = {
                amber: {
                    border: "border-amber-500",
                    gradient: "from-amber-500",
                    text: "text-amber-400",
                    button: "bg-amber-500 hover:bg-amber-600",
                    glow: "shadow-amber-500/30",
                },
                red: {
                    border: "border-red-500",
                    gradient: "from-red-500",
                    text: "text-red-400",
                    button: "bg-red-600 hover:bg-red-700",
                    glow: "shadow-red-500/30",
                },
            };
            const colors = colorClasses[color];
            const popup = document.createElement("div");
            popup.id = "confirmation-popup";
            popup.className =
                "fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[10001] backdrop-blur-sm";
            popup.innerHTML = `
      <div class="bg-gray-900 ${colors.border} border-2 rounded-xl p-8 max-w-lg w-full mx-4 relative overflow-hidden backdrop-blur-sm animate-pulse-slow">
        <!-- Header avec gradient -->
        <div class="absolute top-0 left-0 right-0 h-px opacity-60" style="background: linear-gradient(90deg, transparent, #f59e0b, transparent);"></div>

        <!-- Icon et titre -->
        <div class="text-center mb-6">
          <h3 class="font-mono text-2xl font-bold ${colors.text} mb-2">${title}</h3>
          <div class="w-16 h-1 bg-gradient-to-r ${colors.gradient} to-transparent mx-auto"></div>
        </div>

        <!-- Description -->
        <div class="mb-6">
          <p class="font-mono text-white text-center mb-4">${description}</p>

          <!-- Liste des conséquences -->
          <div class="bg-gray-800 border border-gray-700 rounded-lg p-4 font-mono text-sm">
            ${bulletPoints
                .map((point) => point === ""
                ? '<div class="h-2"></div>'
                : `<div class="text-gray-300 mb-1 ${point.startsWith("⚠️") ? colors.text : ""}">${point}</div>`)
                .join("")}
          </div>
        </div>

        <!-- Input de confirmation -->
        <div class="mb-6">
          <label class="block font-mono text-gray-400 text-sm mb-2">
            Type "${confirmText}" to confirm:
          </label>
          <input
            type="text"
            id="confirmation-input"
            class="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg font-mono text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-${color}-500 focus:border-${color}-500"
            placeholder="${confirmText}"
            autocomplete="off"
          >
        </div>

        <!-- Buttons -->
        <div class="flex gap-4">
          <button id="cancel-confirmation" class="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-mono rounded-lg transition-all duration-200">
            $ cancel
          </button>
          <button id="confirm-action" disabled class="flex-1 px-6 py-3 ${colors.button} text-white font-mono font-bold rounded-lg transition-all duration-200 opacity-50 cursor-not-allowed">
            $ confirm
          </button>
        </div>
      </div>
    `;
            document.body.appendChild(popup);
            const input = document.getElementById("confirmation-input");
            const confirmBtn = document.getElementById("confirm-action");
            const cancelBtn = document.getElementById("cancel-confirmation");
            setTimeout(() => input.focus(), 100);
            const validateInput = () => {
                const isValid = input.value.trim() === confirmText;
                if (isValid) {
                    confirmBtn.disabled = false;
                    confirmBtn.classList.remove("opacity-50", "cursor-not-allowed");
                    confirmBtn.classList.add("hover:shadow-lg", colors.glow);
                }
                else {
                    confirmBtn.disabled = true;
                    confirmBtn.classList.add("opacity-50", "cursor-not-allowed");
                    confirmBtn.classList.remove("hover:shadow-lg", colors.glow);
                }
            };
            input.addEventListener("input", validateInput);
            input.addEventListener("keypress", (e) => {
                if (e.key === "Enter" && !confirmBtn.disabled) {
                    popup.remove();
                    resolve(true);
                }
            });
            confirmBtn.addEventListener("click", () => {
                if (!confirmBtn.disabled) {
                    popup.remove();
                    resolve(true);
                }
            });
            cancelBtn.addEventListener("click", () => {
                popup.remove();
                resolve(false);
            });
            const handleEscape = (e) => {
                if (e.key === "Escape") {
                    popup.remove();
                    document.removeEventListener("keydown", handleEscape);
                    resolve(false);
                }
            };
            document.addEventListener("keydown", handleEscape);
            popup.addEventListener("click", (e) => {
                if (e.target === popup) {
                    popup.remove();
                    resolve(false);
                }
            });
        });
    }
    async handleLogout() {
        if (confirm("$ logout: Are you sure you want to exit?")) {
            try {
                const res = await fetch("/auth/signout", {
                    method: "GET",
                    credentials: "include",
                });
            }
            catch (err) {
                GamePage.showProfileAlert("profile-alert", err instanceof Error ? err.message : "$ error: failed to logout");
            }
            if (window.socket) {
                window.socket.close();
            }
            setTimeout(() => {
                window.router.navigate("/");
            }, 500);
        }
    }
    cleanup() {
        if (this.remoteSocket) {
            this.remoteSocket.close();
            this.remoteSocket = null;
            console.log("🧹 WebSocket remote nettoyée");
        }
    }
}
GamePage.currentMatchId = null;
GamePage.currentTournamentId = null;
GamePage.shouldRecordTournamentMatch = false;
GamePage.tournamentMatchData = null;
window.GamePage = GamePage;
//# sourceMappingURL=game.js.map