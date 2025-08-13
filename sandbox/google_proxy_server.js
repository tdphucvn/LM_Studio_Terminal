import http from "http";
import https from "https";

const PORT = 3000;

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    const request = https.get("https://www.google.com", (googleRes) => {
      res.writeHead(googleRes.statusCode || 200, googleRes.headers);
      googleRes.pipe(res);
    });

    request.on("error", (err) => {
      res.writeHead(502, { "Content-Type": "text/plain" });
      res.end(`Upstream error: ${err.message}`);
    });

    req.pipe(request);
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

server.listen(PORT, () => {
  console.log(`Simple proxy server listening on http://localhost:${PORT}`);
});

