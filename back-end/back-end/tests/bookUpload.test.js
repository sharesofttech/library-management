const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const upload = require("../utils/bookUpload");

test("image endpoint accepts PNG content and rejects fake images and oversized uploads", async () => {
  const app = express();
  app.post("/upload", upload, (req, res) => res.json({ extension: req.file?.extension }));
  const server = await new Promise((resolve) => { const running = app.listen(0, "127.0.0.1", () => resolve(running)); });
  try {
    const send = async (buffer, filename) => {
      const form = new FormData();
      form.append("bookImg", new Blob([buffer], { type: "image/png" }), filename);
      return fetch(`http://127.0.0.1:${server.address().port}/upload`, { method: "POST", body: form });
    };
    const valid = await send(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aL1sAAAAASUVORK5CYII=", "base64"), "cover.png");
    assert.equal(valid.status, 200);
    assert.equal((await valid.json()).extension, "png");
    assert.equal((await send(Buffer.from("<script>alert(1)</script>"), "fake.png")).status, 400);
    assert.equal((await send(Buffer.alloc(5 * 1024 * 1024 + 1), "large.png")).status, 400);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});
