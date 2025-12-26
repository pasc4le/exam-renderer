
document.addEventListener("alpine:init", () => {
    window.Alpine.data("cardManager", () => ({
        managerCards: [],
        managerSelectedTag: '',
        managerSelectedIds: [],
        selectAllManager: false,
        availableCardTags: [],

        async init() {
            await this.loadManagerCards();
        },

        async loadManagerCards() {
            try {
                const allCards = await getAllFromIndex('cards', 'due');

                // Extract tags
                const tags = new Set();
                allCards.forEach(c => {
                    if (c.tags) c.tags.forEach(t => tags.add(t));
                });
                this.availableCardTags = Array.from(tags).sort();

                if (this.managerSelectedTag) {
                    this.managerCards = allCards.filter(c => c.tags && c.tags.includes(this.managerSelectedTag));
                } else {
                    this.managerCards = allCards;
                }
            } catch (e) {
                console.error("Failed to load cards", e);
            }
        },

        toggleAllManager() {
            if (this.selectAllManager) {
                this.managerSelectedIds = this.managerCards.map(c => c.id);
            } else {
                this.managerSelectedIds = [];
            }
        },

        async deleteSelectedCards() {
            if (this.managerSelectedIds.length === 0) return;
            if (!confirm(`Are you sure you want to delete ${this.managerSelectedIds.length} cards?`)) return;

            try {
                const db = await openDB();
                const tx = db.transaction('cards', 'readwrite');
                const store = tx.objectStore('cards');

                this.managerSelectedIds.forEach(id => {
                    store.delete(id);
                });

                tx.oncomplete = () => {
                    this.loadManagerCards();
                    this.managerSelectedIds = [];
                    this.selectAllManager = false;
                };
            } catch (e) {
                console.error("Failed to delete selected cards", e);
                alert("Failed to delete selected cards");
            }
        },

        async deleteAllCards() {
            if (!confirm("Are you sure you want to DELETE ALL cards? This cannot be undone.")) return;
            try {
                await dbOp('readwrite', 'cards', (store) => store.clear());
                this.loadManagerCards();
                this.managerSelectedIds = [];
                this.selectAllManager = false;
            } catch (e) {
                console.error("Failed to delete all cards", e);
                alert("Failed to delete all cards");
            }
        }
    }));
});
