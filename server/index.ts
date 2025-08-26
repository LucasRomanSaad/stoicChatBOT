import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { spawn } from "child_process";
import path from "path";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

function startRagService() {
  const ragPath = path.join(process.cwd(), 'rag');
  const ragPort = process.env.RAG_PORT || '8001';
  
  log('Starting Python RAG service...');
  
  const ragProcess = spawn('python', ['main.py'], {
    cwd: ragPath,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      RAG_PORT: ragPort
    }
  });

  ragProcess.stdout.on('data', (data) => {
    log(`[RAG] ${data.toString().trim()}`);
  });

  ragProcess.stderr.on('data', (data) => {
    log(`[RAG Error] ${data.toString().trim()}`);
  });

  ragProcess.on('close', (code) => {
    log(`RAG service exited with code ${code}`);
    if (code !== 0) {
      log('RAG service crashed, attempting restart in 5 seconds...');
      setTimeout(startRagService, 5000);
    }
  });

  ragProcess.on('error', (error) => {
    log(`Failed to start RAG service: ${error.message}`);
    log('Retrying RAG service startup in 5 seconds...');
    setTimeout(startRagService, 5000);
  });

  return ragProcess;
}

(async () => {
  // Start the RAG service first
  if (process.env.NODE_ENV === 'production') {
    startRagService();
    // Give RAG service time to start
    await new Promise(resolve => setTimeout(resolve, 3000));
  }

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

 
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
