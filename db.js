// --- IndexedDB Helper ---
const DB_NAME = 'ExamRendererDB';
const DB_VERSION = 2;

const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("IndexedDB error:", event.target.errorCode);
            reject("IndexedDB error: " + event.target.errorCode);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('exams')) {
                const examsStore = db.createObjectStore('exams', { keyPath: 'id' });
                examsStore.createIndex('lastOpened', 'lastOpened', { unique: false });
            }
            if (!db.objectStoreNames.contains('results')) {
                const resultsStore = db.createObjectStore('results', { keyPath: 'id', autoIncrement: true });
                resultsStore.createIndex('examId', 'examId', { unique: false });
                resultsStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
            if (!db.objectStoreNames.contains('cards')) {
                const cardsStore = db.createObjectStore('cards', { keyPath: 'id' });
                cardsStore.createIndex('due', 'due', { unique: false });
                cardsStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
            }
        };

        request.onsuccess = (event) => resolve(event.target.result);
    });
};

const dbOp = async (mode, storeName, callback) => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([storeName], mode);
            const store = tx.objectStore(storeName);

            tx.oncomplete = () => {
                // Transaction complete
            };

            tx.onerror = (e) => reject(e);

            // Execute the callback which should return a request (or we just use the transaction)
            // We expect callback to perform an action and return the request if needed, 
            // but often we just wait for transaction completion or specific request success.
            // For simplicity, let's assume callback returns the request we want to await.
            const request = callback(store);

            if (request) {
                request.onsuccess = (e) => resolve(e.target.result);
                request.onerror = (e) => reject(e);
            } else {
                // If no request returned, resolve on transaction complete (covered by tx.oncomplete implicitly if logic was here)
                // But for this helper, let's stick to returning a request.
            }
        });
    } catch (err) {
        console.error("DB Op failed", err);
        throw err;
    }
};

const getAllFromIndex = async (storeName, indexName) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll();

        request.onsuccess = (event) => {
            // sort desc
            const res = event.target.result;
            // Sorting in reverse chronological order (newest first)
            resolve(res.sort((a, b) => b[indexName] - a[indexName]));
        };
        request.onerror = reject;
    });
};
