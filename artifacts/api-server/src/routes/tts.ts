/**
 * TTS file serving — public endpoint so Twilio can fetch audio for media messages.
 * Files are written by tts-service.ts and auto-expire after 2 hours.
 */

import { Router, type IRouter } from "express";
import path from "path";
import fs from "fs";
import { getTtsDir } from "../tts-service.js";

const router: IRouter = Router();

router.get("/tts/:filename", (req, res): void => {
  const { filename } = req.params as { filename: string };
  if (!/^[\w-]+\.mp3$/.test(filename)) {
    res.status(400).send("Invalid filename");
    return;
  }
  const filepath = path.join(getTtsDir(), filename);
  if (!fs.existsSync(filepath)) {
    res.status(404).send("Not found or expired");
    return;
  }
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "public, max-age=7200");
  res.sendFile(filepath);
});

export default router;
