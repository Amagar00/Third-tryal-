 const DB = {
    // Initialize default data if empty
    init: () => {
        const defaults = {
            settings: { schoolName: "Demo High School", address: "123 Education Lane", motto: "Knowledge is Power", grading: [] },
            students: [],
            subjects: [],
            results: []
        };
        
        Object.keys(defaults).forEach(key => {
            if (!localStorage.getItem(key)) {
                localStorage.setItem(key, JSON.stringify(defaults[key]));
            }
        });
    },

    // Read Table
    read: (table) => {
        const data = localStorage.getItem(table);
        return data ? JSON.parse(data) : [];
    },

    // Write Table
    write: (table, data) => {
        localStorage.setItem(table, JSON.stringify(data));
    },

    // Add Item (Auto ID)
    insert: (table, item) => {
        const data = DB.read(table);
        item.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        item.timestamp = new Date().toISOString();
        data.push(item);
        DB.write(table, data);
        return item;
    },

    // Update Item
    update: (table, id, updates) => {
        let data = DB.read(table);
        const index = data.findIndex(i => i.id === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...updates };
            DB.write(table, data);
            return true;
        }
        return false;
    },

    // Delete Item
    delete: (table, id) => {
        let data = DB.read(table);
        const newData = data.filter(i => i.id !== id);
        DB.write(table, newData);
    }
};

DB.init(); // Run on load
