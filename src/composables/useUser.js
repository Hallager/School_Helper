import { ref, watch, computed } from 'vue';

const STORAGE_KEY = 'school_helper_user_data';

const TITLES = [
    'Superstjerne 🌟',
    'Megasej 🚀',
    'Talent 🏆',
    'Geni 🧠',
    'Vidunder 🌈',
    'Mester ⭐',
    'Legende 🥇',
    'Raket ⚡',
    'Solstråle ☀️',
    'Energi-bundt 🏵️'
];

export function useUser() {
    const data = ref(loadData());

    function loadData() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error('Failed to parse user data', e);
            }
        }
        return {
            users: [],
            lastActiveUserId: null
        };
    }

    function saveData() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.value));
    }

    // Watch for changes and save to localStorage
    watch(data, saveData, { deep: true });

    const users = computed(() => data.value.users);

    const currentUser = computed(() => {
        const user = data.value.users.find(u => u.id === data.value.lastActiveUserId);
        if (user && !user.title) {
            // Assign a title if missing (for older users)
            user.title = TITLES[Math.floor(Math.random() * TITLES.length)];
        }
        return user || null;
    });

    function addUser(name, avatar = '👤') {
        const newUser = {
            id: crypto.randomUUID(),
            name,
            avatar,
            title: TITLES[Math.floor(Math.random() * TITLES.length)],
            results: [],
            gameOrder: ['10er', 'getettal', 'hvilantal', 'balloon', 'toget', 'emojipuslespil', 'dyrefodring']
        };
        data.value.users.push(newUser);
        data.value.lastActiveUserId = newUser.id;
        return newUser;
    }

    function deleteUser(id) {
        const index = data.value.users.findIndex(u => u.id === id);
        if (index !== -1) {
            data.value.users.splice(index, 1);
            if (data.value.lastActiveUserId === id) {
                data.value.lastActiveUserId = data.value.users.length > 0 ? data.value.users[0].id : null;
            }
        }
    }

    function selectUser(id) {
        if (data.value.users.find(u => u.id === id)) {
            data.value.lastActiveUserId = id;
        }
    }

    function saveGameResult(gameName, score, metadata = {}) {
        if (!currentUser.value) return;

        const result = {
            game: gameName,
            score,
            timestamp: new Date().toISOString(),
            data: metadata
        };

        const userIndex = data.value.users.findIndex(u => u.id === currentUser.value.id);
        if (userIndex !== -1) {
            data.value.users[userIndex].results.push(result);
        }
    }

    function updateUser(id, updates) {
        const userIndex = data.value.users.findIndex(u => u.id === id);
        if (userIndex !== -1) {
            data.value.users[userIndex] = { ...data.value.users[userIndex], ...updates };
        }
    }

    return {
        users,
        currentUser,
        addUser,
        deleteUser,
        selectUser,
        updateUser,
        saveGameResult
    };
}
