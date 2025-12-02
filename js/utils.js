// js/utils.js

const Utils = {
    // --- CALCULATION HELPERS ---
    getGrade: (score) => {
        const settings = DB.read('settings');
        // Default grading if not set
        const grades = settings.grading.length ? settings.grading : [
            { min: 70, max: 100, grade: 'A', remark: 'Excellent' },
            { min: 60, max: 69, grade: 'B', remark: 'Very Good' },
            { min: 50, max: 59, grade: 'C', remark: 'Good' },
            { min: 45, max: 49, grade: 'D', remark: 'Fair' },
            { min: 40, max: 44, grade: 'E', remark: 'Pass' },
            { min: 0, max: 39, grade: 'F', remark: 'Fail' }
        ];

        const s = parseFloat(score);
        const g = grades.find(r => s >= r.min && s <= r.max);
        return g ? g : { grade: '?', remark: 'N/A' };
    },

    // Converts a number to its ordinal string (e.g., 1 -> 1st, 2 -> 2nd)
    ordinal: (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    },
    
    // --- FILE/IMAGE HELPERS ---
    // Convert Image to Base64 (for student passport)
    fileToBase64: (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    },

    // --- INPUT VALIDATION HELPERS ---
    // Limits the input field value to be between 0 and 100
    validateScoreInput: (inputElement) => {
        let value = inputElement.value;
        // 1. Remove non-digit characters
        value = value.replace(/[^0-9.]/g, ''); 

        // 2. Ensure only one decimal point
        const parts = value.split('.');
        if (parts.length > 2) {
            value = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // 3. Convert to a number and clamp between 0 and 100
        let score = parseFloat(value);

        if (isNaN(score) || score < 0) {
            score = 0;
        } else if (score > 100) {
            score = 100;
        }
        
        // Update the input field directly
        inputElement.value = score;
        return score; // Return the cleaned score
    }
};
