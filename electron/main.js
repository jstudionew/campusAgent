import { app, BrowserWindow, ipcMain, shell, dialog, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';
import { spawn, execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_PORT = 59201;
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow = null;
let splashWindow = null;
let backendProcess = null;
let backendLogStream = null;

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// User Data Directories & Config Paths
const userDataDir = app.getPath('userData');
const logsDir = path.join(userDataDir, 'logs');
const logFilePath = path.join(logsDir, 'backend.log');
const envFilePath = path.join(userDataDir, 'database.env');

function ensureDirectoriesAndConfig() {
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to create logs directory:', err);
  }

  // Create default database.env if it doesn't exist
  if (!fs.existsSync(envFilePath)) {
    const defaultEnvContent = `# ===================================================================
# CampusAgent Desktop Database Configuration
# ===================================================================
# This file configures the connection to your PostgreSQL database.
# Edit this file to connect to your local, LAN, or Cloud PostgreSQL server.
#
# Default local PostgreSQL connection:
DATABASE_URL=postgres://postgres:12345@localhost:5432/school_db

# Port for local backend service (Default: 59201)
PORT=59201

# Environment
NODE_ENV=production
JWT_SECRET=campusagent-production-desktop-secret-key-4029

# Enable Auto Database Creation (if connecting with postgres admin user)
SMS_AUTO_CREATE_DB=true
`;
    try {
      fs.writeFileSync(envFilePath, defaultEnvContent, 'utf-8');
      console.log(`Created default configuration at ${envFilePath}`);
    } catch (err) {
      console.error('Failed to create default config file:', err);
    }
  }
}

function parseEnvFile(filePath) {
  const result = {};
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim();
            result[key] = val;
          }
        }
      }
    }
  } catch (err) {
    console.error(`Error parsing env file ${filePath}:`, err);
  }
  return result;
}

function resolveAppIcon() {
  const candidates = [
    path.join(__dirname, '..', 'frontend', 'public', 'favicon.ico'),
    path.join(__dirname, '..', 'dist', 'favicon.ico'),
    path.join(process.resourcesPath, 'frontend', 'public', 'favicon.ico'),
    path.join(__dirname, '..', 'frontend', 'public', 'school_icon.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

function resolveBackendDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend');
  }
  return path.resolve(__dirname, '..', 'backend');
}

function killBackendProcess() {
  if (!backendProcess) return;
  const pid = backendProcess.pid;
  console.log(`Terminating backend process (PID: ${pid})...`);
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pid} /T /F`);
    } else {
      backendProcess.kill('SIGKILL');
    }
  } catch (err) {
    console.log(`Process ${pid} termination notice: ${err.message}`);
  }
  backendProcess = null;
  if (backendLogStream) {
    try { backendLogStream.end(); } catch (_) {}
    backendLogStream = null;
  }
}

function startBackend() {
  killBackendProcess();

  const backendDir = resolveBackendDir();
  const serverScript = path.join(backendDir, 'src', 'server.js');

  console.log(`Starting backend server from: ${serverScript}`);
  if (!fs.existsSync(serverScript)) {
    console.error(`Backend entry script not found: ${serverScript}`);
    return;
  }

  ensureDirectoriesAndConfig();
  const userEnv = parseEnvFile(envFilePath);

  try {
    backendLogStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    backendLogStream.write(`\n--- CampusAgent Backend Started [${new Date().toISOString()}] ---\n`);
  } catch (err) {
    console.error('Failed to create backend log stream:', err);
  }

  const env = {
    ...process.env,
    ...userEnv,
    PORT: String(userEnv.PORT || BACKEND_PORT),
    NODE_ENV: isDev ? 'development' : 'production',
    SMS_ENV_PATH: envFilePath,
    // Bundled Electron binary runs as Node runtime when ELECTRON_RUN_AS_NODE is 1
    ELECTRON_RUN_AS_NODE: '1',
  };

  // Use process.execPath (CampusAgent.exe or Electron binary) to run backend
  backendProcess = spawn(process.execPath, [serverScript], {
    cwd: backendDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  backendProcess.stdout.on('data', (data) => {
    const msg = data.toString();
    process.stdout.write(`[Backend] ${msg}`);
    if (backendLogStream) backendLogStream.write(`[STDOUT] ${msg}`);
  });

  backendProcess.stderr.on('data', (data) => {
    const msg = data.toString();
    process.stderr.write(`[Backend ERR] ${msg}`);
    if (backendLogStream) backendLogStream.write(`[STDERR] ${msg}`);
  });

  backendProcess.on('exit', (code, signal) => {
    console.log(`Backend process exited with code ${code}, signal ${signal}`);
    if (backendLogStream) {
      backendLogStream.write(`\n--- Backend Process Exited (code=${code}, signal=${signal}) ---\n`);
    }
  });
}

function checkBackendHealth(maxAttempts = 60, intervalMs = 500) {
  return new Promise((resolve) => {
    let attempts = 0;
    const url = `http://127.0.0.1:${BACKEND_PORT}/health`;

    const poll = () => {
      attempts++;
      const req = http.get(url, (res) => {
        if (res.statusCode === 200) {
          console.log(`Backend is healthy after ${attempts} checks.`);
          return resolve(true);
        }
        retry();
      });

      req.on('error', () => {
        retry();
      });

      req.setTimeout(1000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (attempts >= maxAttempts) {
        console.warn(`Backend health check timed out after ${attempts} attempts.`);
        return resolve(false);
      }
      setTimeout(poll, intervalMs);
    };

    poll();
  });
}

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 420,
    frame: false,
    transparent: false,
    backgroundColor: '#0b1437',
    resizable: false,
    center: true,
    alwaysOnTop: true,
    show: false,
    icon: resolveAppIcon(),
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });
}

function createMainWindow() {
  const iconPath = resolveAppIcon();

  mainWindow = new BrowserWindow({
    title: 'CampusAgent - School Management System',
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    icon: iconPath,
    backgroundColor: '#0b1437',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Allows packaged file:// to query local http://127.0.0.1:59201
    },
  });

  setupMenu();

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (isDev && devUrl) {
    console.log(`Loading Dev Server URL: ${devUrl}`);
    mainWindow.loadURL(devUrl);
  } else {
    const distIndexPath = path.join(__dirname, '..', 'dist', 'index.html');
    console.log(`Loading packaged frontend: ${distIndexPath}`);
    mainWindow.loadFile(distIndexPath);
  }

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          },
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow) mainWindow.webContents.reloadIgnoringCache();
          },
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) mainWindow.webContents.toggleDevTools();
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Database & Settings',
      submenu: [
        {
          label: 'Configure Database (.env)...',
          click: async () => {
            ensureDirectoriesAndConfig();
            try {
              await shell.openPath(envFilePath);
            } catch (err) {
              dialog.showErrorBox('Error', `Could not open config file: ${err.message}`);
            }
          },
        },
        {
          label: 'Open Configuration Folder',
          click: async () => {
            ensureDirectoriesAndConfig();
            try {
              await shell.openPath(userDataDir);
            } catch (err) {
              dialog.showErrorBox('Error', `Could not open configuration folder: ${err.message}`);
            }
          },
        },
        {
          label: 'View Backend Logs',
          click: async () => {
            ensureDirectoriesAndConfig();
            try {
              if (!fs.existsSync(logFilePath)) {
                fs.writeFileSync(logFilePath, '', 'utf-8');
              }
              await shell.openPath(logFilePath);
            } catch (err) {
              dialog.showErrorBox('Error', `Could not open log file: ${err.message}`);
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Restart Backend Server',
          click: async () => {
            startBackend();
            const healthy = await checkBackendHealth(20, 500);
            if (healthy) {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Backend Restarted',
                message: 'CampusAgent backend server has successfully restarted.',
              });
              if (mainWindow) mainWindow.reload();
            } else {
              dialog.showMessageBox(mainWindow, {
                type: 'warning',
                title: 'Backend Warning',
                message: 'Backend restarted, but database might still be connecting. Check backend logs if issues persist.',
              });
            }
          },
        },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About CampusAgent',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About CampusAgent',
              message: 'CampusAgent School Management System',
              detail: 'Version 1.0.0\nDeveloped by J-Studio (https://www.jstudio.tech)\n\nA comprehensive school management and automation desktop application.',
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('open-config-folder', async () => {
  ensureDirectoriesAndConfig();
  return shell.openPath(userDataDir);
});

ipcMain.handle('open-env-file', async () => {
  ensureDirectoriesAndConfig();
  return shell.openPath(envFilePath);
});

ipcMain.handle('open-log-file', async () => {
  ensureDirectoriesAndConfig();
  return shell.openPath(logFilePath);
});

ipcMain.handle('open-external', async (_, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    return shell.openExternal(url);
  }
});

ipcMain.handle('restart-backend', async () => {
  startBackend();
  return checkBackendHealth(20, 500);
});

ipcMain.handle('get-db-status', async () => {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${BACKEND_PORT}/api/health`, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (_) {
          resolve({ status: 'ok', raw: data });
        }
      });
    });
    req.on('error', (err) => resolve({ status: 'error', message: err.message }));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve({ status: 'timeout' });
    });
  });
});

// App Lifecycle
app.whenReady().then(async () => {
  ensureDirectoriesAndConfig();
  createSplashWindow();

  // In production or if dev server isn't explicitly handling backend, start backend child process
  if (!process.env.VITE_DEV_SERVER_URL || !isDev) {
    startBackend();
  }

  const healthy = await checkBackendHealth(40, 500);
  if (!healthy && !isDev) {
    dialog.showMessageBoxSync(splashWindow, {
      type: 'warning',
      title: 'Database / Server Notice',
      message: 'CampusAgent backend is taking longer than expected to start.',
      detail: 'The app will now open. If you cannot connect, verify PostgreSQL is running or click Database > Configure Database to update your connection settings.',
    });
  }

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  killBackendProcess();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  killBackendProcess();
});
