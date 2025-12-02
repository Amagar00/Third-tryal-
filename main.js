 const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Note: electron-pdf is required in the main process
const pdf = require('electron-pdf');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 1000, 
    height: 800, 
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false 
    }
  });

  mainWindow.loadFile('index.html');
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});


// ==========================================================
// IPC HANDLER FOR PDF GENERATION (Listens for request from app.js)
// ==========================================================

ipcMain.on('print-to-pdf-request', async (event, htmlContent) => {
    let tempWin = null;
    try {
        // Create a hidden browser window to load the HTML content
        tempWin = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } });
        
        // Load the HTML content directly using a data URL
        tempWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
        
        tempWin.webContents.on('did-finish-load', async () => {
            // Prompt the user for a save location
            const savePath = dialog.showSaveDialogSync(null, { // Use 'null' instead of 'tempWin' for simplicity
                title: 'Save Class Result PDF',
                defaultPath: `Class_Results_${Date.now()}.pdf`,
                filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
            });

            if (savePath) {
                // Print the loaded HTML content to PDF
                const data = await tempWin.webContents.printToPDF({});
                
                // Save the PDF data to the file system
                fs.writeFileSync(savePath, data);

                // Send success confirmation back to the renderer process
                event.sender.send('print-to-pdf-success', savePath);
            } else {
                event.sender.send('print-to-pdf-cancel');
            }
            
            tempWin.close();
        });
    } catch (error) {
        console.error("PDF Generation Error:", error);
        if (tempWin) tempWin.close();
        event.sender.send('print-to-pdf-error', error.message);
    }
});
