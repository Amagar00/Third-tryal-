// js/resultsEngine.js

// The ResultsEngine is responsible for calculating totals, averages, and positions.
const ResultsEngine = {
    // Calculates total, average, and assigns positions for an entire class.
    calculatePositions: (className, term) => {
        const allResults = DB.read('results');
        
        // 1. Filter by class and term
        let classResults = allResults.filter(r => r.className === className && r.term === term);

        if(classResults.length === 0) return [];

        // 2. Calculate Grand Totals and Averages
        classResults = classResults.map(studentResult => {
            let total = 0;
            let count = 0;
            Object.values(studentResult.scores).forEach(scoreObj => {
                total += (parseFloat(scoreObj.total) || 0);
                count++;
            });
            studentResult.grandTotal = total;
            studentResult.average = count > 0 ? (total / count).toFixed(2) : 0;
            return studentResult;
        });

        // 3. Sort by Grand Total (Descending)
        classResults.sort((a, b) => b.grandTotal - a.grandTotal);

        // 4. Assign Positions (Handling Ties)
        for (let i = 0; i < classResults.length; i++) {
            if (i > 0 && classResults[i].grandTotal === classResults[i - 1].grandTotal) {
                classResults[i].position = classResults[i - 1].position; // Tie
            } else {
                classResults[i].position = i + 1;
            }
            
            // Update the main DB immediately with the calculated totals and position
            DB.update('results', classResults[i].id, { 
                grandTotal: classResults[i].grandTotal,
                average: classResults[i].average,
                // Uses the Utils.ordinal helper from js/utils.js
                position: Utils.ordinal(classResults[i].position) 
            });
        }

        return classResults;
    }
};
