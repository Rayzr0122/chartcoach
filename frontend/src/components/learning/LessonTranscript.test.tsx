import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import LessonTranscript from "./LessonTranscript";
afterEach(() => vi.unstubAllGlobals());
it("follows video time and seeks from searchable transcript lines", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("WEBVTT\n\n00:00.000 --> 00:02.000\nFirst line\n\n00:02.000 --> 00:05.000\nSecond line")));
  const onSeek = vi.fn();
  const props = { url: "/captions.vtt", duration: 5, position: 1, language: "English", disabled: false, onSeek };
  const { rerender } = render(<LessonTranscript {...props} />);
  expect(await screen.findByRole("button", { name: /First line/ })).toHaveAttribute("aria-current", "true");
  expect(screen.queryByRole("button", { name: /follow(ing)? video/i })).toBeNull();
  rerender(<LessonTranscript {...props} position={3} />);
  expect(screen.getByRole("button", { name: /Second line/ })).toHaveAttribute("aria-current", "true");
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "Second" } });
  expect(screen.queryByRole("button", { name: /First line/ })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Second line/ }));
  expect(onSeek).toHaveBeenCalledWith(2);
});

it("switches between Hindi and English transcript tracks", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string) =>
      Promise.resolve(
        new Response(
          input === "/captions.en.vtt"
            ? "WEBVTT\n\n00:00.000 --> 00:02.000\nWelcome back to another video"
            : "WEBVTT\n\n00:00.000 --> 00:02.000\nवेलकम बैक टू अनदर वीडियो",
        ),
      ),
    ),
  );
  render(
    <LessonTranscript
      url="/captions.hi.vtt"
      duration={2}
      position={1}
      language="Hindi"
      disabled={false}
      onSeek={vi.fn()}
      tracks={[
        { language: "hi", label: "हिन्दी", url: "/captions.hi.vtt" },
        { language: "en", label: "English", url: "/captions.en.vtt" },
      ]}
    />,
  );

  expect(await screen.findByRole("button", { name: /वेलकम बैक/ })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "English" }));
  expect(await screen.findByRole("button", { name: /Welcome back/ })).toBeVisible();
});
