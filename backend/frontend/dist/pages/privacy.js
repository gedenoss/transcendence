export function showPrivacyPopup() {
    const existing = document.getElementById("privacy-popup");
    if (existing)
        existing.remove();
    const popup = document.createElement("div");
    popup.id = "privacy-popup";
    popup.className = "fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999]";
    popup.innerHTML = `
    <div class="bg-gray-900 border border-gray-700 rounded-lg max-w-2xl w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h2 class="font-mono text-lg font-bold text-indigo-400">Privacy Policy</h2>
        <button id="close-popup" class="text-gray-400 hover:text-white text-xl">&times;</button>
      </div>
      
      <div class="space-y-3 font-mono text-sm text-gray-300">
        <div><strong class="text-white">Data we collect:</strong> Username, email, game scores, friends list</div>
        <div><strong class="text-white">Cookies:</strong> Only for login and preferences, no tracking</div>
        <div><strong class="text-white">Your rights:</strong> View, edit, or delete your data anytime in profile</div>
        <div><strong class="text-white">Security:</strong> All data encrypted, passwords hashed</div>
      </div>
      
      <button id="close-popup-btn" class="mt-4 w-full py-2 bg-indigo-500 text-white rounded hover:bg-indigo-600 transition-colors font-mono text-sm">
        Close
      </button>
    </div>
  `;
    document.body.appendChild(popup);
    const closePopup = () => popup.remove();
    document.getElementById("close-popup")?.addEventListener("click", closePopup);
    document.getElementById("close-popup-btn")?.addEventListener("click", closePopup);
    popup.addEventListener("click", (e) => e.target === popup && closePopup());
}
export function showContactPopup() {
    const existing = document.getElementById("contact-popup");
    if (existing)
        existing.remove();
    const popup = document.createElement("div");
    popup.id = "contact-popup";
    popup.className = "fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999]";
    popup.innerHTML = `
    <div class="bg-gray-900 border border-gray-700 rounded-lg max-w-md w-full mx-4 p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="font-mono text-lg font-bold text-green-400">Contact</h2>
        <button id="close-contact-popup" class="text-gray-400 hover:text-white text-xl">&times;</button>
      </div>
      
      <div class="text-center font-mono text-white space-y-4">
        <!-- Container pour l'image -->
        <div id="image-container" class="flex justify-center">
          <div class="w-32 h-32 border-2 border-green-500 rounded-lg flex items-center justify-center text-4xl">
            error loading image
          </div>
        </div>
        
        <p class="text-lg">42 intra : anaouali gbouguer ocussy</p>
      </div>
      
      <button id="close-contact-btn" class="mt-6 w-full py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors font-mono text-sm">
        Close
      </button>
    </div>
  `;
    document.body.appendChild(popup);
    const imageContainer = document.getElementById("image-container");
    if (imageContainer) {
        const contactImage = document.createElement("img");
        contactImage.src = "/image.jpg";
        contactImage.alt = "Contact";
        contactImage.className = "w-48 h-auto border-2 border-green-500 rounded-lg object-cover";
        contactImage.style.maxWidth = "192px";
        contactImage.style.maxHeight = "300px";
        contactImage.onload = function () {
            console.log("✅ Image loaded successfully!");
            imageContainer.innerHTML = "";
            imageContainer.appendChild(contactImage);
        };
        contactImage.onerror = function () {
            console.log("❌ Image failed to load from:", contactImage.src);
        };
    }
    const closePopup = () => popup.remove();
    document.getElementById("close-contact-popup")?.addEventListener("click", closePopup);
    document.getElementById("close-contact-btn")?.addEventListener("click", closePopup);
    popup.addEventListener("click", (e) => e.target === popup && closePopup());
}
//# sourceMappingURL=privacy.js.map