import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync, writeFileSync } from "fs";

// Get the directory of the current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    imagePath: null,
    filePaths: [],
    prompt: null,
    model: "google/gemma-3-12b",
    serverUrl: "http://localhost:3000",
    outputFile: null,
    modelExplicitlySet: false,
    issueJson: false,
    jsonOutput: null,
    structured: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--image":
      case "-i":
        if (i + 1 < args.length) {
          options.imagePath = args[++i];
        } else {
          console.error("❌ Error: -i/--image requires a file path");
          process.exit(1);
        }
        break;
      case "--file":
      case "-f":
        if (i + 1 < args.length) {
          const value = args[++i];
          // Support comma-separated list in a single flag
          const parts = value
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
          options.filePaths.push(...parts);
        } else {
          console.error(
            "❌ Error: -f/--file requires a file path or comma-separated list"
          );
          process.exit(1);
        }
        break;
      case "--prompt":
      case "-p":
        if (i + 1 < args.length) {
          options.prompt = args[++i];
        } else {
          console.error("❌ Error: -p/--prompt requires text");
          process.exit(1);
        }
        break;
      case "--model":
      case "-m":
        if (i + 1 < args.length) {
          options.model = args[++i];
          options.modelExplicitlySet = true;
        } else {
          console.error("❌ Error: -m/--model requires a model name");
          process.exit(1);
        }
        break;
      case "--server":
      case "-s":
        if (i + 1 < args.length) {
          options.serverUrl = args[++i];
        } else {
          console.error("❌ Error: -s/--server requires a URL");
          process.exit(1);
        }
        break;
      case "--unload":
      case "-u":
        options.action = "unload";
        break;
      case "--load":
      case "-l":
        options.action = "load";
        break;
      case "--output":
      case "-o":
        if (i + 1 < args.length) {
          options.outputFile = args[++i];
        } else {
          console.error("❌ Error: -o/--output requires a file path");
          process.exit(1);
        }
        break;
      case "--issue-json":
      case "-J":
        options.issueJson = true;
        break;
      case "--json-output":
      case "-O":
        if (i + 1 < args.length) {
          options.jsonOutput = args[++i];
        } else {
          console.error("❌ Error: -O/--json-output requires a file path");
          process.exit(1);
        }
        break;
      case "--structured":
      case "-R":
        options.structured = true;
        break;
      case "--help":
      case "-h":
        showHelp();
        process.exit(0);
      default:
        // Only set as prompt if we haven't already set image, file, or prompt
        // and this doesn't look like a file path
        if (
          !options.imagePath &&
          options.filePaths.length === 0 &&
          !options.prompt
        ) {
          // Check if this looks like a file path (contains / or .)
          if (arg.includes("/") || arg.includes("\\") || arg.includes(".")) {
            // This looks like a file path, but we don't know if it's an image or text file
            // Let's assume it's an image if it has image extensions
            const imageExtensions = [
              ".png",
              ".jpg",
              ".jpeg",
              ".gif",
              ".bmp",
              ".webp",
            ];
            const isImage = imageExtensions.some((ext) =>
              arg.toLowerCase().endsWith(ext)
            );

            if (isImage) {
              options.imagePath = arg;
            } else {
              options.filePaths.push(arg);
            }
          } else {
            // This looks like a prompt
            options.prompt = arg;
          }
        }
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Usage: node client.js [options] [prompt]

Options:
  -i, --image <path>     Path to the image file
  -f, --file <path>      Path(s) to text file(s). Repeat flag or use comma-separated list
  -p, --prompt <text>    Custom prompt for the LLM
  -m, --model <name>     LLM model to use (default: "google/gemma-3-12b")
  -s, --server <url>     Server URL (default: "http://localhost:3000")
  -o, --output <path>    Save output to markdown file
  -J, --issue-json       Generate a strict JSON issue report from an image (Gemma)
  -O, --json-output <p>  Save the JSON to a file (use with -J)
  -R, --structured       Ask for a clean, sectioned markdown reasoning output (OpenAI)
  -u, --unload          Unload current model
  -l, --load            Load specific model (use with -m)
  -h, --help            Show this help message

Available Models:
  - google/gemma-3-12b  (supports images, limited reasoning)
  - openai/gpt-oss-20b      (excellent reasoning, no image support)

Examples:
  # Text conversation with OpenAI GPT OSS 20B (better reasoning)
  node client.js -m openai/gpt-oss-20b -p "Explain quantum computing"
  
  # Image analysis with Gemma
  node client.js -m google/gemma-3-12b -i image.png -p "What do you see?"
  
  # File analysis with OpenAI GPT OSS 20B
  node client.js -m openai/gpt-oss-20b -f document.txt -p "Summarize this"
  
  # Combined analysis
  node client.js -m google/gemma-3-12b -i screenshot.png -f context.txt -p "Analyze with context"
  
  # Multiple files
  node client.js -m openai/gpt-oss-20b -f notes.md -f spec.txt -p "Summarize"
  node client.js -m openai/gpt-oss-20b -f notes.md,spec.txt -p "Summarize"
  
  # Save output to markdown file
  node client.js -i image.png -p "What do you see?" -o outputs/analysis.md
  
  # Generate an issue JSON from a screenshot and save it
  node client.js -m google/gemma-3-12b -i screenshot.png -J -O outputs/issue.json
  
  # Model management
  node client.js -u                    # Unload current model
  node client.js -l -m openai/gpt-oss-20b  # Load OpenAI GPT OSS 20B model
`);
}

async function sendRequest(serverUrl, requestData) {
  try {
    const response = await fetch(serverUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      throw new Error(
        "Server not running. Start the server with: node server.js"
      );
    }
    throw error;
  }
}

function showProgress() {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;

  const interval = setInterval(() => {
    process.stdout.write(`\r${frames[i]} Sending request to server...`);
    i = (i + 1) % frames.length;
  }, 80);

  return () => {
    clearInterval(interval);
    process.stdout.write("\r" + " ".repeat(50) + "\r"); // Clear the line
  };
}

async function main() {
  try {
    const options = parseArguments();

    // Validate that we have some input (unless it's an action)
    if (
      !options.action &&
      !options.imagePath &&
      options.filePaths.length === 0 &&
      !options.prompt
    ) {
      console.error(
        "❌ Error: At least one input is required (image, file, prompt, or action)"
      );
      console.log("Use --help for usage information");
      process.exit(1);
    }

    // Validate file paths if provided
    if (options.filePaths && options.filePaths.length > 0) {
      for (const fp of options.filePaths) {
        if (!existsSync(fp)) {
          console.error(`❌ Error: File not found: ${fp}`);
          process.exit(1);
        }
      }
    }

    if (options.imagePath && !existsSync(options.imagePath)) {
      console.error(`❌ Error: Image file not found: ${options.imagePath}`);
      process.exit(1);
    }

    // Prepare request data
    const requestData = {
      prompt: options.prompt,
      image: options.imagePath,
      files: options.filePaths,
      action: options.action,
    };

    if (options.issueJson) {
      requestData.mode = "issue_json";
    }
    if (options.structured) {
      requestData.mode = "reasoning_structured";
    }

    // Only include model if explicitly specified by user
    if (options.modelExplicitlySet) {
      requestData.model = options.model;
    }

    // Show progress indicator
    const stopProgress = showProgress();

    // Send request to server
    const result = await sendRequest(options.serverUrl, requestData);

    // Stop progress indicator and show result
    stopProgress();

    // Display result
    if (result.content) {
      // If in issue-json mode and server parsed JSON, prefer printing compact JSON
      if (options.issueJson && result.json) {
        const jsonString = JSON.stringify(result.json, null, 2);
        console.log(jsonString);
      } else {
        console.log(result.content);
      }
      console.log(`\n--- Generated by ${result.model} ---`);

      // Save to markdown file if requested
      if (options.outputFile) {
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const markdownContent = generateMarkdown(result, options, timestamp);

          // Ensure the output directory exists
          const outputDir = dirname(options.outputFile);
          if (!existsSync(outputDir)) {
            const { mkdirSync } = await import("fs");
            mkdirSync(outputDir, { recursive: true });
          }

          writeFileSync(options.outputFile, markdownContent, "utf8");
          console.log(`\n📄 Output saved to: ${options.outputFile}`);
        } catch (error) {
          console.error(`❌ Error saving output: ${error.message}`);
        }
      }

      // Save JSON output if requested
      if (options.jsonOutput && options.issueJson) {
        try {
          // Ensure the output directory exists
          const outputDir = dirname(options.jsonOutput);
          if (!existsSync(outputDir)) {
            const { mkdirSync } = await import("fs");
            mkdirSync(outputDir, { recursive: true });
          }

          let jsonObject = result.json;
          if (!jsonObject && typeof result.content === "string") {
            // Try to parse in client as a fallback
            try {
              jsonObject = JSON.parse(result.content);
            } catch (_) {
              const firstBrace = result.content.indexOf("{");
              const lastBrace = result.content.lastIndexOf("}");
              if (
                firstBrace !== -1 &&
                lastBrace !== -1 &&
                lastBrace > firstBrace
              ) {
                const maybeJson = result.content.slice(
                  firstBrace,
                  lastBrace + 1
                );
                try {
                  jsonObject = JSON.parse(maybeJson);
                } catch (_) {}
              }
            }
          }

          if (!jsonObject) {
            throw new Error(
              "Model did not return valid JSON. Try rerunning with a clearer screenshot."
            );
          }

          writeFileSync(
            options.jsonOutput,
            JSON.stringify(jsonObject, null, 2),
            "utf8"
          );
          console.log(`\n🧾 JSON saved to: ${options.jsonOutput}`);
        } catch (error) {
          console.error(`❌ Error saving JSON: ${error.message}`);
        }
      }
    } else if (result.message) {
      console.log(result.message);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

function generateMarkdown(result, options, timestamp) {
  const { prompt, imagePath, filePaths, model } = options;

  let markdown = `# LLM Analysis Report\n\n`;
  markdown += `**Generated:** ${new Date().toLocaleString()}\n`;
  markdown += `**Model:** ${result.model}\n`;
  markdown += `**Timestamp:** ${timestamp}\n\n`;

  // Input section
  markdown += `## Input\n\n`;

  if (prompt) {
    markdown += `**Prompt:** ${prompt}\n\n`;
  }

  if (imagePath) {
    markdown += `**Image:** \`${imagePath}\`\n\n`;
  }

  if (filePaths && filePaths.length > 0) {
    markdown +=
      `**Files:**` +
      "\n\n" +
      filePaths.map((p) => `- \`${p}\``).join("\n") +
      "\n\n";
  }

  // Output section
  markdown += `## Analysis\n\n`;
  markdown += `${result.content}\n\n`;

  // Footer
  markdown += `---\n`;
  markdown += `*Generated by ${result.model}*\n`;

  return markdown;
}

// Run the client
main();
