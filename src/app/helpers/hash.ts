import { createHash } from "crypto";
export const sha256 = (buffer: Buffer): string =>
  createHash("sha256").update(buffer).digest("hex");
