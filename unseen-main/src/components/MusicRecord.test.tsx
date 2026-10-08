import { useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MusicRecord from "./MusicRecord";
import { demoTracks, formatAudioTime, musicFileError } from "@/lib/music";
import { toast } from "sonner";

vi.mock("@/i18n/I18nProvider", () => ({ useI18n: () => ({ locale: "it" }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

function Duel() {
  const [activeId, setActiveId] = useState<string | null>(null);
  return <>{demoTracks.map((track) => <MusicRecord key={track.id} track={track} activeId={activeId} onActiveChange={(id) => setActiveId((previous) => id ?? (previous === track.id ? null : previous))} />)}</>;
}

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, "paused", { configurable: true, value: false });
    this.dispatchEvent(new Event("play"));
    return Promise.resolve();
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, "paused", { configurable: true, value: true });
    this.dispatchEvent(new Event("pause"));
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); });

describe("music playback", () => {
  it("shows the same paper sleeve for a cover-only preview without requesting audio", () => {
    const { container } = render(<MusicRecord track={{ ...demoTracks[0], audio_url: "" }} activeId={null} onActiveChange={vi.fn()} />);
    expect(container.querySelector(".music-sleeve img")).toHaveAttribute("src", demoTracks[0].cover_url);
    expect(container.querySelector("audio")).not.toHaveAttribute("src");
    screen.getAllByRole("button", { name: "Ascolta Afterhours — NOVA" }).forEach((button) => expect(button).toBeDisabled());
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it("reverses the existing sleeve extraction when paused, then reuses it on replay", async () => {
    const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
    const animations: { updatePlaybackRate: ReturnType<typeof vi.fn>; play: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> }[] = [];
    const animate = vi.fn((_frames: Keyframe[], _timing: KeyframeAnimationOptions) => {
      const animation = { updatePlaybackRate: vi.fn(), play: vi.fn(), cancel: vi.fn() };
      animations.push(animation);
      return animation;
    });
    Object.defineProperty(Element.prototype, "animate", { configurable: true, value: animate });
    try {
      const { unmount } = render(<Duel />);
      expect(animate).not.toHaveBeenCalled();
      fireEvent.click(screen.getAllByRole("button", { name: "Ascolta Afterhours — NOVA" })[0]);
      await waitFor(() => expect(animate).toHaveBeenCalledTimes(2));
      const path = animate.mock.calls[0][0];
      // A 94%-diameter LP clears the top opening before it crosses the front lip.
      const raised = path.find((frame) => Number(frame.zIndex) > 4)!;
      expect(parseFloat(String(raised.top)) + 47).toBeLessThan(0);
      expect(path.every((frame) => frame.left === "50%")).toBe(true);
      expect(path[path.length - 1].top).toBe("50%");
      animations.forEach((animation) => expect(animation.updatePlaybackRate).toHaveBeenLastCalledWith(1));
      fireEvent.click(screen.getAllByRole("button", { name: "Pausa Afterhours — NOVA" })[0]);
      animations.forEach((animation) => expect(animation.updatePlaybackRate).toHaveBeenLastCalledWith(-1));
      fireEvent.click(screen.getAllByRole("button", { name: "Ascolta Afterhours — NOVA" })[0]);
      await waitFor(() => animations.forEach((animation) => expect(animation.updatePlaybackRate).toHaveBeenLastCalledWith(1)));
      expect(animate).toHaveBeenCalledTimes(2);
      unmount();
      animations.forEach((animation) => expect(animation.cancel).toHaveBeenCalledTimes(1));
    } finally {
      cleanup();
      if (originalAnimate) Object.defineProperty(Element.prototype, "animate", originalAnimate);
      else Reflect.deleteProperty(Element.prototype, "animate");
    }
  });

  it("does not autoplay, plays one record at a time, and pauses rotation with audio", async () => {
    const { container, unmount } = render(<Duel />);
    const audio = Array.from(container.querySelectorAll("audio"));
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole("button", { name: "Ascolta Afterhours — NOVA" })[0]);
    await waitFor(() => expect(audio[0].paused).toBe(false));
    expect(container.querySelectorAll<HTMLElement>(".vinyl-record")[0].style.animationPlayState).toBe("running");
    fireEvent.click(screen.getAllByRole("button", { name: "Ascolta Neon Bloom — LYRA" })[0]);
    await waitFor(() => expect(audio[1].paused).toBe(false));
    expect(audio[0].paused).toBe(true);
    expect(container.querySelectorAll<HTMLElement>(".vinyl-record")[0].style.animationPlayState).toBe("paused");
    fireEvent.click(screen.getAllByRole("button", { name: "Pausa Neon Bloom — LYRA" })[0]);
    expect(audio[1].paused).toBe(true);
    fireEvent.click(screen.getAllByRole("button", { name: "Ascolta Afterhours — NOVA" })[0]);
    await waitFor(() => expect(audio[0].paused).toBe(false));
    unmount();
    expect(audio[0].paused).toBe(true);
  });

  it("stops rotation when playback ends and allows replay", async () => {
    const { container } = render(<Duel />);
    fireEvent.click(screen.getAllByRole("button", { name: "Ascolta Afterhours — NOVA" })[0]);
    await waitFor(() => expect(container.querySelector(".music-track")).toHaveClass("is-playing"));
    fireEvent.ended(container.querySelector("audio")!);
    expect(container.querySelector(".music-track")).not.toHaveClass("is-playing");
    expect(screen.getAllByRole("button", { name: "Ascolta Afterhours — NOVA" })[0]).toBeEnabled();
  });

  it("reports a failed play without rotating or leaving the controls disabled", async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error("Audio unavailable"));
    const { container } = render(<Duel />);
    fireEvent.click(screen.getAllByRole("button", { name: "Ascolta Afterhours — NOVA" })[0]);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(container.querySelector(".music-track")).not.toHaveClass("is-playing");
    expect(screen.getAllByRole("button", { name: "Ascolta Afterhours — NOVA" })[0]).toBeEnabled();
  });
});

describe("submission file boundaries", () => {
  it("accepts audio and covers, and rejects wrong types, empty files, and oversized uploads", () => {
    expect(musicFileError(new File(["audio"], "track.mp3", { type: "audio/mpeg" }), "audio")).toBeNull();
    expect(musicFileError(new File(["audio"], "track.mpa", { type: "audio/mpa" }), "audio")).toBeNull();
    expect(musicFileError(new File(["audio"], "track.mpa", { type: "application/octet-stream" }), "audio")).toBeNull();
    expect(musicFileError(new File(["audio"], "track.m4a", { type: "audio/mp4" }), "audio")).toBeNull();
    expect(musicFileError(new File(["audio"], "track.mp4a", { type: "audio/mp4a-latm" }), "audio")).toBeNull();
    expect(musicFileError(new File(["image"], "cover.webp", { type: "image/webp" }), "cover")).toBeNull();
    expect(musicFileError(new File(["script"], "track.mp3", { type: "text/javascript" }), "audio")).toBe("format");
    expect(musicFileError(new File([], "track.wav", { type: "audio/wav" }), "audio")).toBe("size");
    const tooLarge = new File(["image"], "cover.png", { type: "image/png" });
    Object.defineProperty(tooLarge, "size", { value: 5 * 1024 * 1024 + 1 });
    expect(musicFileError(tooLarge, "cover")).toBe("size");
    const longAudio = new File(["audio"], "track.wav", { type: "audio/wav" });
    Object.defineProperty(longAudio, "size", { value: 30 * 1024 * 1024 + 1 });
    expect(musicFileError(longAudio, "audio")).toBe("size");
    expect(formatAudioTime(Infinity)).toBe("0:00");
    expect(formatAudioTime(65.7)).toBe("1:05");
  });
});
