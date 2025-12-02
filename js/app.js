 /**
 * School Result Management System - Main Application Logic
 */

// If Electron is running, make ipcRenderer available for communication with main.js
const electron = (typeof require !== 'undefined') ? require('electron') : null;

const app = {
    // --- 1. INITIALIZATION ---
    init: () => {
        // Simple check to ensure core modules are available
        if (typeof DB === 'undefined' || typeof Utils === 'undefined') {
            alert('System Error: Essential files missing (database or utils).'); return;
        }
        DB.init();
        
        // Ensure Database Arrays Exist
        ['classes', 'subjects', 'students', 'results', 'settings'].forEach(table => {
            const data = DB.read(table);
            if (!data || (table !== 'settings' && !Array.isArray(data))) {
                DB.write(table, table === 'settings' ? {} : []);
            }
        });

        app.nav('dashboard');
    },

    // --- 2. NAVIGATION ---
    nav: (view) => {
        const container = document.getElementById('view-container');
        const title = document.getElementById('page-title');
        
        if(title) title.innerText = view.charAt(0).toUpperCase() + view.slice(1);
        
        if (app.views[view]) {
            container.innerHTML = app.views[view]();
            // Initialize specific pages
            if(view === 'students') app.handlers.initStudentsPage();
            if(view === 'settings') app.handlers.initSettingsPage();
            if(view === 'results') app.handlers.initResultsPage();
            if(view === 'reports') app.handlers.initReportsPage(); // <-- NEW INIT
        }
        // Auto-close menu on mobile
        if(window.innerWidth < 768) ui.toggleSidebar();
    },

    // --- 3. VIEWS ---
    views: {
        dashboard: () => `
            <div class="grid-2">
                <div class="card"><h3>Total Students</h3><p class="display-4">${DB.read('students').length}</p></div>
                <div class="card"><h3>Classes</h3><p class="display-4">${DB.read('classes').length}</p></div>
                <div class="card"><h3>Subjects</h3><p class="display-4">${DB.read('subjects').length}</p></div>
            </div>`,
        
        settings: () => `
            <div class="grid-2">
                <div class="card">
                    <h3>School Identity</h3>
                    <form onsubmit="app.handlers.saveSchoolDetails(event)">
                        <div class="form-group"><label>School Name</label><input type="text" id="set-name" class="form-control"></div>
                        <div class="form-group"><label>Address</label><input type="text" id="set-addr" class="form-control"></div>
                        <div class="form-group"><label>Motto</label><input type="text" id="set-motto" class="form-control" placeholder="e.g. Knowledge is Power"></div>
                        <div class="form-group"><label>School Logo</label><input type="file" id="set-logo" class="form-control" accept="image/*"></div>
                        <button class="btn btn-primary">Save Details</button>
                    </form>
                </div>
                <div class="card">
                    <h3>Manage Academic Data</h3>
                    <div class="form-group grid-2"><input type="text" id="new-class" class="form-control" placeholder="Class Name"><button onclick="app.handlers.addClass()" class="btn">Add Class</button></div><ul id="class-list"></ul>
                    <hr>
                    <div class="form-group grid-2"><input type="text" id="new-subject" class="form-control" placeholder="Subject Name"><button onclick="app.handlers.addSubject()" class="btn">Add Subject</button></div><ul id="subject-list"></ul>
                </div>
            </div>`,
        
        students: () => `
            <div class="card"><h3>Register Student</h3><form onsubmit="app.handlers.saveStudent(event)"><div class="grid-2">
            <input name="name" placeholder="Full Name" class="form-control" required><input name="admNo" placeholder="Admission No" class="form-control" required>
            <select name="className" id="std-class-select" class="form-control" required></select><input type="file" id="std-photo" class="form-control" accept="image/*">
            </div><button class="btn btn-primary">Save Student</button></form></div>
            <div class="card"><h3>Student List</h3><input id="search-std" class="form-control" placeholder="Search..." onkeyup="app.handlers.searchStudent()"><table id="student-table"><tbody></tbody></table></div>`,
        
        results: () => `
            <div class="card grid-2"><select id="res-class" class="form-control" onchange="app.handlers.loadResultSheet()"></select><select id="res-subject" class="form-control" onchange="app.handlers.loadResultSheet()"></select></div>
            <div id="result-area" class="card hidden"><table id="res-table"><thead><tr><th>Student</th><th>Test(40)</th><th>Exam(60)</th><th>Total</th><th>Grd</th></tr></thead><tbody></tbody></table><button class="btn btn-primary" onclick="app.handlers.saveResults()">Save & Calculate Positions</button></div>`,
        
        reports: () => `
            <div class="card no-print grid-2">
                <input id="rep-adm" class="form-control" placeholder="Enter Admission No">
                <button class="btn btn-primary" onclick="app.handlers.generateReport()">Generate Result Sheet</button>
                
                <select id="rep-class-select" class="form-control" style="grid-column: 1 / 3; margin-top: 10px;"></select>
                <button class="btn btn-danger" onclick="app.handlers.downloadClassPDF()" style="grid-column: 1 / 3;">
                    <i class="fas fa-file-pdf"></i> Download ALL Results as PDF
                </button>
                </div>
            <div id="report-output"></div>`
    },

    // --- 4. HANDLERS ---
    handlers: {
        // SETTINGS (No change)
        initSettingsPage: () => {
            const s = DB.read('settings');
            if(s.schoolName) { 
                document.getElementById('set-name').value = s.schoolName; 
                document.getElementById('set-addr').value = s.address; 
                document.getElementById('set-motto').value = s.motto || ''; 
            }
            app.handlers.renderList('classes', 'class-list'); 
            app.handlers.renderList('subjects', 'subject-list');
        },
        saveSchoolDetails: async (e) => {
            e.preventDefault(); 
            const file = document.getElementById('set-logo').files[0]; 
            let logo = null; if (file) logo = await Utils.fileToBase64(file);
            const s = DB.read('settings');
            DB.write('settings', { 
                ...s, 
                schoolName: document.getElementById('set-name').value, 
                address: document.getElementById('set-addr').value, 
                motto: document.getElementById('set-motto').value, 
                logo: logo || s.logo 
            });
            alert('Settings Saved!');
        },
        addClass: () => app.handlers.addItem('classes', 'new-class'), 
        addSubject: () => app.handlers.addItem('subjects', 'new-subject'),
        addItem: (t, id) => { const v = document.getElementById(id).value; if(!v)return; const l=DB.read(t); if(!l.includes(v)){l.push(v);DB.write(t,l);app.handlers.renderList(t, id==='new-class'?'class-list':'subject-list');document.getElementById(id).value='';}},
        renderList: (t, id) => { document.getElementById(id).innerHTML = DB.read(t).map(i => `<li>${i} <button onclick="app.handlers.deleteItem('${t}','${i}')">X</button></li>`).join(''); },
        deleteItem: (t, v) => { if(confirm('Delete?')){ DB.write(t, DB.read(t).filter(x=>x!==v)); app.handlers.initSettingsPage();}},

        // STUDENTS (No change)
        initStudentsPage: () => { document.getElementById('std-class-select').innerHTML = DB.read('classes').map(c => `<option>${c}</option>`).join(''); app.handlers.loadStudentTable(); },
        saveStudent: async (e) => { e.preventDefault(); const f = e.target; const file = document.getElementById('std-photo').files[0]; let photo = null; if(file) photo = await Utils.fileToBase64(file);
            DB.insert('students', { name: f.name.value, admNo: f.admNo.value, className: f.className.value, photo }); alert('Saved'); f.reset(); app.handlers.loadStudentTable(); },
        loadStudentTable: () => app.handlers.renderStudentRows(DB.read('students')),
        searchStudent: () => { const q = document.getElementById('search-std').value.toLowerCase(); app.handlers.renderStudentRows(DB.read('students').filter(s => s.name.toLowerCase().includes(q) || s.admNo.toLowerCase().includes(q))); },
        renderStudentRows: (d) => document.querySelector('#student-table tbody').innerHTML = d.map(s => `<tr><td>${s.photo?`<img src="${s.photo}" style="height:30px">`:''}</td><td>${s.name}</td><td>${s.className}</td><td><button onclick="app.handlers.deleteStudent('${s.id}')">X</button></td></tr>`).join(''),
        deleteStudent: (id) => { if(confirm('Delete?')) { DB.delete('students', id); app.handlers.loadStudentTable(); } },

        // RESULTS (Updated calc function)
        initResultsPage: () => { document.getElementById('res-class').innerHTML = `<option value="">Class</option>`+DB.read('classes').map(c=>`<option>${c}</option>`); document.getElementById('res-subject').innerHTML = `<option value="">Subject</option>`+DB.read('subjects').map(s=>`<option>${s}</option>`); },
        loadResultSheet: () => {
            const c=document.getElementById('res-class').value, s=document.getElementById('res-subject').value; if(!c||!s)return;
            const studs = DB.read('students').filter(st => st.className === c); const res = DB.read('results');
            document.getElementById('result-area').classList.remove('hidden');
            document.querySelector('#res-table tbody').innerHTML = studs.map(st => {
                const r = res.find(x => x.studentId === st.id) || { scores: {} }; const sc = r.scores[s] || { test:'', exam:'', total:0, grade:'-' };
                return `<tr data-id="${st.id}"><td>${st.name}</td><td><input type="number" class="ts" value="${sc.test}" oninput="app.handlers.calc(this)"></td><td><input type="number" class="es" value="${sc.exam}" oninput="app.handlers.calc(this)"></td><td class="tot">${sc.total}</td><td class="grd">${sc.grade}</td></tr>`;
            }).join('');
        },
        calc: (el) => { 
            // 1. First, validate and clamp the input score
            Utils.validateScoreInput(el); 
            
            // 2. Then proceed with the calculation
            const r = el.closest('tr'); 
            const t=Number(r.querySelector('.ts').value)||0, e=Number(r.querySelector('.es').value)||0; 
            
            // Check if Total (CA + EX) exceeds 100, which it shouldn't!
            if (t+e > 100) {
                 r.querySelector('.tot').innerText = 'ERR';
                 r.querySelector('.grd').innerText = 'TOO HIGH';
                 r.style.backgroundColor = 'var(--danger)';
                 return;
            }
            
            r.style.backgroundColor = '';
            r.querySelector('.tot').innerText = t+e; 
            r.querySelector('.grd').innerText = Utils.getGrade(t+e).grade; 
        },
        
        saveResults: () => {
            const className = document.getElementById('res-class').value;
            const subject = document.getElementById('res-subject').value;
            let allResults = DB.read('results');

            // 1. Update ONLY the selected subject scores
            document.querySelectorAll('#res-table tbody tr').forEach(row => {
                const studentId = row.dataset.id;
                let record = allResults.find(x => x.studentId === studentId && x.term === '1st Term');
                if(!record) { 
                    record = { id: Date.now() + Math.random(), studentId, className, term: '1st Term', scores: {} }; 
                    allResults.push(record); 
                }
                
                record.scores[subject] = { 
                    test: row.querySelector('.ts').value, 
                    exam: row.querySelector('.es').value, 
                    total: Number(row.querySelector('.tot').innerText), 
                    grade: row.querySelector('.grd').innerText 
                };
            });

            // 2. Save Basic Data First
            DB.write('results', allResults);

            // 3. Trigger Calculation Engine (Uses the new ResultsEngine)
            ResultsEngine.calculatePositions(className, '1st Term');
            
            alert('Results Saved & Positions Recalculated!');
        },

        // --- REPORTS & PDF DOWNLOAD (NEW & REFACTORED) ---
        initReportsPage: () => {
             // Populate the new class select dropdown
            document.getElementById('rep-class-select').innerHTML = 
                `<option value="">Select Class to Download</option>` +
                DB.read('classes').map(c => `<option>${c}</option>`).join('');

            // Set up IPC listeners for communication with main.js (only in Electron)
            if (electron) {
                const { ipcRenderer } = electron;
                
                ipcRenderer.on('print-to-pdf-success', (event, savePath) => {
                    alert(`Class Report PDF successfully saved to:\n${savePath}`);
                    document.getElementById('report-output').innerHTML = '';
                });

                ipcRenderer.on('print-to-pdf-error', (event, error) => {
                    alert(`PDF Generation FAILED: ${error}`);
                    document.getElementById('report-output').innerHTML = '';
                });
                
                ipcRenderer.on('print-to-pdf-cancel', () => {
                     document.getElementById('report-output').innerHTML = '';
                });
            }
        },
        
        generateReport: () => {
            const adm = document.getElementById('rep-adm').value;
            const student = DB.read('students').find(s => s.admNo === adm);
            if(!student) return alert('Student not found');
            
            const result = DB.read('results').find(r => r.studentId === student.id);
            if(!result) return alert('No results found for this student. Please enter scores first.');
            
            // Use the new helper function to get the HTML structure
            const html = app.handlers.getReportHTML(student, result);
            
            // Add the Print button and display the result
            document.getElementById('report-output').innerHTML = html + 
                `<br><button onclick="window.print()" class="btn btn-primary no-print" style="width:100%">PRINT RESULT SHEET</button>`;
        },

        getReportHTML: (student, result) => {
            const settings = DB.read('settings');
            const classCount = DB.read('students').filter(s => s.className === student.className).length;

            // 1. Build Subject Rows 
            let subjectRowsHTML = '';
            const subjects = Object.keys(result.scores); 
            
            subjects.forEach(subName => {
                 const s = result.scores[subName];
                 const gInfo = Utils.getGrade(s.total);
                 
                 subjectRowsHTML += `
                    <div class="rs-subject-row">
                        <div class="rs-box-input sub-name">${subName}</div> 
                        <div class="rs-box-input">${s.test}</div> 
                        <div class="rs-box-input">${s.exam}</div> 
                        <div class="rs-box-input">${s.total}</div> 
                        <div class="rs-box-input">${s.grade}</div> 
                        <div class="rs-box-input sub-name">${gInfo.remark}</div> 
                    </div>`;
            });

            // 2. Skills (Static)
            const buildSkills = (skills) => skills.map(k => `
                <div class="rs-skill-row">
                    <div class="rs-skill-name-box">${k}</div>
                    <input class="rs-skill-check-box" type="text">
                </div>`).join('');
            const affectiveHTML = buildSkills(['Punctuality', 'Neatness', 'Politeness', 'Honesty']);
            const psychomotiveHTML = buildSkills(['Handwriting', 'Fluency', 'Sports', 'Crafts']);

            // 3. Return the HTML structure
            return `
            <div class="result-sheet-v2">
                <div class="rs-header">
                    <div class="rs-logo-box">${settings.logo ? `<img src="${settings.logo}">` : ''}</div>
                    <div class="rs-school-text">
                        <div class="rs-school-name">${settings.schoolName || 'SCHOOL NAME'}</div>
                        <div class="rs-school-addr">${settings.address || 'Address'}</div>
                        <div class="rs-school-motto">"${settings.motto || ''}"</div>
                    </div>
                </div>

                <div class="rs-student-info">
                    <div class="rs-info-fields">
                        <div class="rs-input-row"><span class="rs-label-lg">FULL NAME:</span><div class="rs-input-field">${student.name}</div></div>
                        <div class="rs-input-row"><span>REG NO:</span><div class="rs-input-field">${student.admNo}</div> <span>CLASS:</span><div class="rs-input-field">${student.className}</div></div>
                        <div class="rs-input-row"><span>TERM:</span><div class="rs-input-field">1ST TERM</div> <span>SESSION:</span><div class="rs-input-field">2025/2026</div></div>
                    </div>
                    <div class="rs-photo-box">${student.photo ? `<img src="${student.photo}">` : ''}</div>
                </div>

                <div class="rs-body-grid">
                    <div class="rs-academic-panel">
                        <div class="rs-academic-header"><div>SUBJECTS</div><div>CA</div><div>EX</div><div>TOT</div><div>GR</div><div>REMARK</div></div>
                        <div class="rs-subject-rows-container">
                            ${subjectRowsHTML}
                        </div>
                        
                        <div class="rs-stats-footer">
                            <div class="rs-stat-item"><span class="rs-stat-label">TOTAL SCORE</span><div class="rs-stat-box">${result.grandTotal || 0}</div></div>
                            <div class="rs-stat-item"><span class="rs-stat-label">AVERAGE</span><div class="rs-stat-box">${result.average || 0}</div></div>
                            <div class="rs-stat-item"><span class="rs-stat-label">NO IN CLASS</span><div class="rs-stat-box">${classCount}</div></div>
                            <div class="rs-stat-item"><span class="rs-stat-label">POSITION</span><div class="rs-stat-box" style="color:#b71c1c">${result.position || 'N/A'}</div></div>
                             <div class="rs-stat-item"><span class="rs-stat-label">OBTAINABLE</span><div class="rs-stat-box">${subjects.length * 100}</div></div>
                        </div>
                    </div>

                    <div class="rs-skills-panel">
                        <div><div class="rs-skill-section-header">AFFECTIVE</div>${affectiveHTML}</div>
                        <div><div class="rs-skill-section-header">PSYCHOMOTIVE</div>${psychomotiveHTML}</div>
                        <div><div class="rs-skill-section-header">SIGNATURE</div><div class="rs-signature-box"></div></div>
                    </div>
                </div>

                <div class="rs-footer">
                    <div class="rs-footer-row">
                         <div class="rs-input-row" style="flex:1"><span>NEXT TERM BEGINS:</span><input class="rs-input-field" value="10th Jan 2025"></div>
                         <div class="rs-input-row" style="flex:1; margin-left:20px;"><span>NEXT TERM FEE:</span><input class="rs-input-field"></div>
                    </div>
                    <div class="rs-comment-block">
                        <div class="rs-comment-line">TEACHER'S COMMENT: <input class="rs-input-field" value="Satisfactory result."></div>
                        <div class="rs-comment-line">PRINCIPAL'S COMMENT: <input class="rs-input-field"></div>
                    </div>
                </div>
            </div>`;
        },

        downloadClassPDF: () => {
            if (!electron) return alert('PDF generation only works in the built Electron application.');

            const selectedClass = document.getElementById('rep-class-select').value;
            if (!selectedClass) {
                return alert('Please select a class first.');
            }
            
            // 1. Get data
            const students = DB.read('students').filter(s => s.className === selectedClass);
            if (students.length === 0) {
                return alert(`No students found in ${selectedClass}.`);
            }
            
            let allReportsHTML = '';

            // 2. Loop through each student and generate their report HTML
            students.forEach(student => {
                const result = DB.read('results').find(r => r.studentId === student.id);
                
                if (result) {
                    // Collects the HTML from the reusable function
                    allReportsHTML += app.handlers.getReportHTML(student, result);
                }
            });
            
            if (allReportsHTML.length < 100) { 
                 return alert(`No *calculated* results found for any student in ${selectedClass}.`);
            }

            // 3. Prepare final content to be sent to the main process
            const finalPDFContent = `
                <html>
                <head>
                    <meta charset="UTF-8">
                    <link rel="stylesheet" href="css/print.css"> 
                    <title>${selectedClass} Annual Result Report</title>
                </head>
                <body>
                    ${allReportsHTML}
                </body>
                </html>
            `;
            
            // 4. Send the request to main.js for PDF creation
            const { ipcRenderer } = electron;
            document.getElementById('report-output').innerHTML = '<p style="padding: 20px;">Generating PDF... Please wait (This may take a minute).</p>';
            ipcRenderer.send('print-to-pdf-request', finalPDFContent);
        }
    }
};

// Global UI Helper (No change)
const ui = { toggleSidebar: () => { document.getElementById('sidebar').classList.toggle('active'); } };
document.addEventListener('DOMContentLoaded', app.init);
