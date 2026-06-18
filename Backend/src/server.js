require("dotenv").config();

const app = require("./app");

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log("Press Ctrl+C to stop");
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\nPort ${PORT} is already in use. Another backend is still running.\n` +
        `Stop it first, then run npm start again.\n` +
        `Windows: netstat -ano | findstr :${PORT}  then  taskkill /PID <pid> /F\n`
    );
  } else {
    console.error("Server failed to start:", err.message);
  }
  process.exit(1);
});