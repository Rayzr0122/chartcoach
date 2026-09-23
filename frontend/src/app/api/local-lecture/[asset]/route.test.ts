import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { GET } from "./route";

const mediaDirectory = path.join(process.cwd(), ".local-media");
const englishCaptions = path.join(mediaDirectory, "lecture.en.srt");
let originalEnglishCaptions: Buffer | undefined;

afterEach(async () => {
  vi.unstubAllEnvs();
  if (originalEnglishCaptions) await writeFile(englishCaptions, originalEnglishCaptions);
  else await rm(englishCaptions, { force: true });
  originalEnglishCaptions = undefined;
});

it("serves the local English captions as WebVTT", async () => {
  vi.stubEnv("NODE_ENV", "development");
  await mkdir(mediaDirectory, { recursive: true });
  originalEnglishCaptions = await readFile(englishCaptions).catch(() => undefined);
  await writeFile(englishCaptions, "1\n00:00:00,000 --> 00:00:01,000\nWelcome back\n");

  const response = await GET(new Request("http://localhost/api/local-lecture/captions.en.vtt"), {
    params: Promise.resolve({ asset: "captions.en.vtt" }),
  });

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/vtt");
  expect(await response.text()).toContain("00:00:00.000 --> 00:00:01.000\nWelcome back");
});
