import { LMStudioClient } from "@lmstudio/sdk";
import { readFileSync, existsSync } from "fs";
import { createServer } from "http";
import { join } from "path";

// Load settings from settings.json
let SETTINGS;
try {
  SETTINGS = JSON.parse(readFileSync("settings.json", "utf8"));
} catch (error) {
  console.error("❌ Error loading settings.json:", error.message);
  process.exit(1);
}

const MODELS = SETTINGS.models;

class LLMServer {
  constructor() {
    this.client = new LMStudioClient();
    this.currentModel = null;
    this.currentModelKey = null;
    this.isInitialized = false;
  }

  async loadModel(modelKey) {
    console.log(`🔄 Loading model: ${modelKey}`);
    console.log(`🔄 MODELS: ${MODELS}`);

    const modelConfig = MODELS[modelKey];
    if (!modelConfig) {
      throw new Error(`Unknown model: ${modelKey}`);
    }

    // Unload current model if different
    if (this.currentModel && this.currentModelKey !== modelKey) {
      console.log(
        `🔄 Unloading current model: ${MODELS[this.currentModelKey].name}`
      );
      await this.unloadCurrentModel();
    }

    // Load new model if not already loaded
    if (!this.currentModel || this.currentModelKey !== modelKey) {
      console.log(`📦 Loading model: ${modelConfig.name}...`);
      this.currentModel = await this.client.llm.model(modelKey);
      this.currentModelKey = modelKey;
      console.log(`✅ ${modelConfig.name} loaded successfully`);
    }

    return modelConfig;
  }

  async unloadCurrentModel() {
    if (this.currentModel) {
      console.log(`🔄 Unloading model: ${MODELS[this.currentModelKey].name}`);

      try {
        // Use the SDK's unload method
        await this.currentModel.unload();

        // Clear the model reference
        this.currentModel = null;
        this.currentModelKey = null;

        console.log(`✅ Model unloaded successfully`);
        return true;
      } catch (error) {
        console.error(`❌ Error unloading model: ${error.message}`);
        return false;
      }
    }
    return false;
  }

  validateRequest(modelKey, hasImage, hasFile) {
    const modelConfig = MODELS[modelKey];
    if (!modelConfig) {
      throw new Error(`Unknown model: ${modelKey}`);
    }

    if (hasImage && !modelConfig.supportsImages) {
      throw new Error(
        `${modelConfig.name} does not support images. Use google/gemma-3-12b for image analysis.`
      );
    }

    if (hasFile && !modelConfig.supportsReasoning) {
      console.warn(
        `⚠️  Warning: ${modelConfig.name} has limited reasoning capabilities for file analysis.`
      );
    }

    return modelConfig;
  }

  async processRequest(
    modelKey,
    prompt,
    imagePath = null,
    filePaths = [],
    mode = null
  ) {
    // Load the requested model
    const modelConfig = await this.loadModel(modelKey);
    const hasAnyFile = Array.isArray(filePaths) && filePaths.length > 0;
    this.validateRequest(modelKey, !!imagePath, hasAnyFile);

    if (!this.currentModel) {
      throw new Error(`Failed to load model: ${modelKey}`);
    }

    // Prepare message content
    let messageContent = prompt || "";
    let images = [];

    // Add file contents if provided (support multiple files)
    if (hasAnyFile) {
      console.log(`📂 Files provided: ${filePaths.length}`);
      let combinedContent = "";
      for (const rawPath of filePaths) {
        if (!rawPath) continue;
        const resolvedFilePath = rawPath.startsWith("/")
          ? rawPath
          : join(process.cwd(), rawPath);
        console.log(`📂 Resolved file path: ${resolvedFilePath}`);

        if (!existsSync(resolvedFilePath)) {
          throw new Error(`File not found: ${resolvedFilePath}`);
        }

        try {
          const fileContent = readFileSync(resolvedFilePath, "utf8");
          combinedContent += `\n\n=== File: ${resolvedFilePath} ===\n\n${fileContent}\n`;
          console.log(
            `✅ Loaded file (${resolvedFilePath}) - ${fileContent.length} characters`
          );
        } catch (error) {
          throw new Error(
            `Error reading file (${resolvedFilePath}): ${error.message}`
          );
        }
      }
      if (combinedContent.trim().length > 0) {
        messageContent = `${combinedContent}\n\n${messageContent}`.trim();
      }
    }

    // Add image if provided
    if (imagePath) {
      console.log(`📂 Image path: ${imagePath}`);

      // Resolve absolute path if needed
      const resolvedImagePath = imagePath.startsWith("/")
        ? imagePath
        : join(process.cwd(), imagePath);
      console.log(`📂 Resolved image path: ${resolvedImagePath}`);

      if (!existsSync(resolvedImagePath)) {
        throw new Error(`Image file not found: ${resolvedImagePath}`);
      }

      try {
        console.log(`🖼️  Preparing image: ${resolvedImagePath}`);
        const image = await this.client.files.prepareImage(resolvedImagePath);
        images.push(image);
        console.log(`✅ Image prepared successfully`);
      } catch (error) {
        console.error(`❌ Error preparing image: ${error.message}`);
        throw new Error(`Error preparing image: ${error.message}`);
      }
    }

    // If running in issue JSON mode, build a strict instruction to return JSON only
    if (mode === "issue_json") {
      if (images.length === 0) {
        throw new Error(
          "issue_json mode requires an image. Provide an image path."
        );
      }

      const jsonSchemaInstruction = `You are a vision assistant. Analyze the provided image/screenshot and produce a concise JSON object describing the issue/question shown.\n\nRules:\n- Output JSON ONLY. No markdown, no explanations.\n- Keep strings short and factual.\n- Use null where information is not visible.\n- If the image contains a question and multiple-choice answers, extract them.\n\nJSON schema (keys and types):\n{\n  "title": string,                      // short title for the issue/question\n  "summary": string,                    // 1-2 sentence summary\n  "question": string|null,              // explicit question if present on the image\n  "answer_options": string[]|null,      // array of answer options if present (raw text)\n  "category": string,                   // one of: ui_bug, error_message, form_issue, data_issue, accessibility, configuration, instruction, other\n  "severity": string,                   // one of: low, medium, high, critical\n  "observations": string[],             // bullet-style observations you can directly see\n  "extracted_text": string[]|null,      // key text snippets/OCR if clearly readable\n  "probable_root_cause": string|null,   // your best guess, plain language\n  "suggested_next_prompt": string,      // a single prompt we can pass to a text-only reasoning model to solve or proceed\n  "confidence": number                   // 0.0 - 1.0 overall confidence\n}\n\nIf the user added extra prompt/context, consider it, but still output JSON only.`;

      // Prepend instruction before user text so models follow schema
      messageContent =
        `${jsonSchemaInstruction}\n\nUser context (optional):\n${messageContent}`.trim();
    }

    // If running structured reasoning mode, build a clear, sectioned markdown instruction
    if (mode === "reasoning_structured") {
      const structuredInstruction = `You are a precise reasoning assistant. Produce a clear, concise, and well-structured markdown answer.\n\nRules:\n- Use the following sections and headings exactly once each: \n  1. # Title\n  2. ## Problem\n  3. ## Key Facts\n  4. ## Constraints and Assumptions\n  5. ## Reasoning\n  6. ## Solution\n  7. ## Next Actions\n- Keep each section focused and avoid repetition.\n- Prefer bullet points in Key Facts and Next Actions.\n- Do NOT use tables. Use bullet lists only; no markdown table syntax.\n- Provide short, direct sentences.\n- End with a bold one-line final answer summary: **Final Answer: ...**\n\nIf the input includes JSON (e.g., an issue report), extract and cite relevant fields in Key Facts. If something is unknown, omit it rather than guessing.`;

      messageContent =
        `${structuredInstruction}\n\nUser input:\n${messageContent}`.trim();
    }

    console.log(
      `📤 Sending request with ${images.length} image(s) and ${messageContent.length} characters of text`
    );

    // Send request
    const prediction = await this.currentModel.respond([
      { role: "user", content: messageContent, images: images },
    ]);

    const contentText =
      prediction.content ||
      prediction.nonReasoningContent ||
      "No content available";

    // Try to parse JSON when in issue_json mode
    let parsedJson = null;
    if (mode === "issue_json" && typeof contentText === "string") {
      try {
        parsedJson = JSON.parse(contentText);
      } catch (e) {
        // Try to salvage JSON if model added extra text
        try {
          const firstBrace = contentText.indexOf("{");
          const lastBrace = contentText.lastIndexOf("}");
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const maybeJson = contentText.slice(firstBrace, lastBrace + 1);
            parsedJson = JSON.parse(maybeJson);
          }
        } catch (_) {
          parsedJson = null;
        }
      }
    }

    return {
      content: contentText,
      json: parsedJson,
      model: modelConfig.name,
      modelKey: modelKey,
      stats: prediction.stats || {},
      mode: mode || null,
    };
  }

  createServer() {
    return createServer(async (req, res) => {
      // Enable CORS
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.method === "GET") {
        // Status endpoint
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "running",
            currentModel: this.currentModelKey
              ? MODELS[this.currentModelKey].name
              : null,
            availableModels: Object.keys(MODELS),
          })
        );
        return;
      }

      if (req.method !== "POST") {
        res.writeHead(405, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Method not allowed. Use POST." }));
        return;
      }

      try {
        // Parse request body
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });

        req.on("end", async () => {
          try {
            const requestData = JSON.parse(body);
            const { model, prompt, image, file, files, action, mode } =
              requestData;

            // Handle special actions
            if (action === "unload") {
              const unloaded = await this.unloadCurrentModel();
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  message: unloaded
                    ? "Model unloaded successfully"
                    : "No model was loaded",
                  currentModel: null,
                })
              );
              return;
            }

            if (action === "load") {
              if (!model) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    error: "Model key required for load action",
                  })
                );
                return;
              }

              await this.loadModel(model);
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  message: `Model ${MODELS[model].name} loaded successfully`,
                  currentModel: model,
                })
              );
              return;
            }

            const filesArray = Array.isArray(files)
              ? files
              : file
              ? [file]
              : [];

            if (!prompt && !image && filesArray.length === 0) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error:
                    "At least one input is required (prompt, image, or files)",
                })
              );
              return;
            }

            // Use currently loaded model if no model specified
            const modelToUse = model || this.currentModelKey;

            if (!modelToUse) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error:
                    "No model specified and no model currently loaded. Please load a model first.",
                })
              );
              return;
            }

            // Process the request
            const result = await this.processRequest(
              modelToUse,
              prompt,
              image,
              filesArray,
              mode || null
            );

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result));
          } catch (error) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    });
  }

  async start(
    port = SETTINGS.port || 3000,
    defaultModel = SETTINGS.defaultModel || "google/gemma-3-12b"
  ) {
    try {
      // Load default model
      await this.loadModel(defaultModel);
      this.isInitialized = true;
    } catch (error) {
      console.error("❌ Error initializing server:", error.message);
      throw error;
    }

    const server = this.createServer();

    server.listen(port, () => {
      console.log(`🌐 Server running on http://localhost:${port}`);
      console.log(`📦 Current model: ${MODELS[this.currentModelKey].name}`);
      console.log("\n📋 Available Models:");
      for (const [key, config] of Object.entries(MODELS)) {
        console.log(`  • ${key} (${config.name})`);
        console.log(`    ${config.description}`);
      }
      console.log("\n📡 API Endpoints:");
      console.log(`   GET  / - Server status and current model`);
      console.log(`   POST / - Process requests`);
      console.log(
        `   POST / - {"action": "load", "model": "model-key"} - Load specific model`
      );
      console.log(`   POST / - {"action": "unload"} - Unload current model`);
      console.log("\n📡 Example request:");
      console.log(`   {
     "model": "google/gemma-3-12b",
     "prompt": "Your question here",
     "image": "/path/to/image.png",  // optional
     "files": ["/path/to/file1.txt", "/path/to/file2.md"]  // optional, can also use legacy 'file'
   }`);
    });

    // Handle graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n🔄 Received ${signal}, shutting down server...`);

      try {
        // Unload the current model
        await this.unloadCurrentModel();

        // Close the server
        server.close(() => {
          console.log("✅ Server stopped");
          process.exit(0);
        });

        // Force exit after 5 seconds if graceful shutdown fails
        setTimeout(() => {
          console.log("⚠️  Force shutting down...");
          process.exit(1);
        }, 5000);
      } catch (error) {
        console.error("❌ Error during shutdown:", error.message);
        process.exit(1);
      }
    };

    // Handle different shutdown signals
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGQUIT", () => shutdown("SIGQUIT"));

    return server;
  }
}

// Get default model from command line argument (overrides settings)
const defaultModel =
  process.argv[2] || SETTINGS.defaultModel || "google/gemma-3-12b";

// Start the server
const server = new LLMServer();
server.start(SETTINGS.port || 3000, defaultModel).catch(console.error);
