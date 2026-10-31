import { Profiler, useState } from "react";
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
  it('updates progress, time and seeking without rerendering the vinyl artwork', () => {
    const commits = vi.fn();
    const { container } = render(<Profiler id="record" onRender={commits}><MusicRecord track={demoTracks[0]} activeId={null} onActiveChange={vi.fn()} demoTransport /></Profiler>);
    const audio = container.querySelector('audio')!;
    Object.defineProperty(audio, 'duration', { configurable: true, value: 40 });
    fireEvent.loadedMetadata(audio);
    commits.mockClear();

    for (const time of [10.5, 10.75, 11.25]) {
      audio.currentTime = time;
      fireEvent.timeUpdate(audio);
    }
    const progress = container.querySelector<HTMLInputElement>('.music-progress')!;
    expect(progress.value).toBe('11.25');
    expect(progress.style.getPropertyValue('--music-progress')).toBe('28.125%');
    expect(container.querySelector('.music-time')).toHaveTextContent('0:11');
    expect(commits).not.toHaveBeenCalled();

    fireEvent.change(progress, { target: { value: '20.3' } });
    expect(audio.currentTime).toBe(20.3);
    fireEvent.click(screen.getByRole('button', { name: /\+5s: Afterhours/ }));
    expect(audio.currentTime).toBe(25.3);
    expect(progress.value).toBe('25.3');
    expect(container.querySelector('.music-time')).toHaveTextContent('0:25');
    expect(commits).not.toHaveBeenCalled();
  });

  it("shows the same paper sleeve for a cover-only preview without requesting audio", () => {
    const { container } = render(<MusicRecord track={{ ...demoTracks[0], audio_url: "" }} activeId={null} onActiveChange={vi.fn()} />);
    expect(container.querySelector(".music-sleeve img")).toHaveAttribute("src", demoTracks[0].cover_url);
    expect(container.querySelector("audio")).not.toHaveAttribute("src");
    screen.getAllByRole("button", { name: "Ascolta Afterhours — NOVA" }).forEach((button) => expect(button).toBeDisabled());
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it("prepares extraction at rest before the first play and preserves its position on pause and replay", async () => {
    const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
    const animations: { currentTime: number | null; updatePlaybackRate: ReturnType<typeof vi.fn>; play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> }[] = [];
    const animate = vi.fn((_frames: Keyframe[], _timing: KeyframeAnimationOptions) => {
      const animation = { currentTime: null, updatePlaybackRate: vi.fn(), play: vi.fn(), pause: vi.fn(), cancel: vi.fn() };
      animations.push(animation);
      return animation;
    });
    Object.defineProperty(Element.prototype, "animate", { configurable: true, value: animate });
    try {
      const { unmount } = render(<MusicRecord track={demoTracks[0]} activeId={demoTracks[0].id} onActiveChange={vi.fn()} />);
      expect(animate).toHaveBeenCalledTimes(3);
      animations.forEach((animation) => {
        expect(animation.pause).toHaveBeenCalled();
        expect(animation.currentTime).toBe(0);
        expect(animation.play).not.toHaveBeenCalled();
      });
      fireEvent.click(screen.getAllByRole("button", { name: "Ascolta Afterhours — NOVA" })[0]);
      await waitFor(() => expect(animate).toHaveBeenCalledTimes(3));
      const path = animate.mock.calls[0][0];
      const stacking = animate.mock.calls[1][0];
      // Include the shadow when checking clearance on narrow mobile sleeves.
      const withdrawn = path.find(frame => frame.offset === .5)!;
      const [, lift, gap] = String(withdrawn.transform).match(/translateY\(calc\(([-\d.]+)% - ([\d.]+)px\)\)/)!;
      for (const sleeveWidth of [100, 180, 320]) {
        const bottomWithShadow = (50 + Number(lift) * .94 + 47) * sleeveWidth / 100 - Number(gap) + 8 + 3 * 7;
        expect(bottomWithShadow).toBeLessThan(-8);
      }
      expect(stacking[0]).toMatchObject({ zIndex: 2, easing: "steps(1, end)" });
      expect(stacking.find(frame => frame.offset === .5)).toMatchObject({ zIndex: 6 });
      expect(path.every((frame) => frame.zIndex === undefined && frame.top === undefined && frame.left === undefined && frame.filter === undefined)).toBe(true);
      expect(path[path.length - 1].transform).toBe("translate(-50%, -50%) translateY(0%) rotate(0deg)");
      animations.forEach((animation) => expect(animation.updatePlaybackRate).toHaveBeenLastCalledWith(1));
      // Pause before the first frame must not leave pending playback running,
      // or play backwards from the far endpoint of an animation still at zero.
      const priorPauses = animations.map(animation => animation.pause.mock.calls.length);
      fireEvent.click(screen.getAllByRole("button", { name: "Pausa Afterhours — NOVA" })[0]);
      animations.forEach((animation, index) => {
        expect(animation.currentTime).toBe(0);
        expect(animation.pause).toHaveBeenCalledTimes(priorPauses[index] + 1);
        expect(animation.play).toHaveBeenCalledOnce();
        expect(animation.updatePlaybackRate).toHaveBeenLastCalledWith(1);
      });
      fireEvent.click(screen.getAllByRole("button", { name: "Ascolta Afterhours — NOVA" })[0]);
      await waitFor(() => expect(screen.getAllByRole("button", { name: "Pausa Afterhours — NOVA" })[0]).toBeEnabled());
      animations.forEach((animation) => { animation.currentTime = 400; });
      fireEvent.click(screen.getAllByRole("button", { name: "Pausa Afterhours — NOVA" })[0]);
      animations.forEach((animation) => expect(animation.updatePlaybackRate).toHaveBeenLastCalledWith(-1));
      fireEvent.click(screen.getAllByRole("button", { name: "Ascolta Afterhours — NOVA" })[0]);
      await waitFor(() => animations.forEach((animation) => expect(animation.updatePlaybackRate).toHaveBeenLastCalledWith(1)));
      expect(animate).toHaveBeenCalledTimes(3);
      animations.forEach((animation) => expect(animation.currentTime).toBe(400));
      unmount();
      animations.forEach((animation) => expect(animation.cancel).toHaveBeenCalledTimes(1));
    } finally {
      cleanup();
      if (originalAnimate) Object.defineProperty(Element.prototype, "animate", originalAnimate);
      else Reflect.deleteProperty(Element.prototype, "animate");
    }
  });

  it("starts the disc and social-link entrance on the first demo play event", async () => {
    const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
    const animations: { currentTime: number | null; updatePlaybackRate: ReturnType<typeof vi.fn>; play: ReturnType<typeof vi.fn>; pause: ReturnType<typeof vi.fn>; cancel: ReturnType<typeof vi.fn> }[] = [];
    const animate = vi.fn(() => {
      const animation = { currentTime: 0, updatePlaybackRate: vi.fn(), play: vi.fn(), pause: vi.fn(), cancel: vi.fn() };
      animations.push(animation);
      return animation;
    });
    Object.defineProperty(Element.prototype, "animate", { configurable: true, value: animate });
    try {
      const { container } = render(<MusicRecord track={demoTracks[0]} activeId={null} onActiveChange={vi.fn()} demoTransport onPrepareAudio={vi.fn()} />);
      fireEvent.click(screen.getAllByRole("button", { name: "Ascolta Afterhours — NOVA" })[0]);
      await waitFor(() => expect(container.querySelector(".music-demo-side-socials")).toBeInTheDocument());
      expect(animations).toHaveLength(3);
      animations.forEach((animation) => {
        expect(animation.updatePlaybackRate).toHaveBeenCalledWith(1);
        expect(animation.play).toHaveBeenCalledOnce();
      });
      expect(container.querySelectorAll(".music-demo-side-socials a").length).toBeGreaterThan(1);
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

describe("vinyl playback synchronization", () => {
  type Motion = {
    currentTime: number;
    updatePlaybackRate: ReturnType<typeof vi.fn>;
    play: ReturnType<typeof vi.fn>;
    pause: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
  };
  let animations: Motion[];
  let originalAnimate: PropertyDescriptor | undefined;

  beforeEach(() => {
    animations = [];
    originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: vi.fn(() => {
        const animation = { currentTime: 0, updatePlaybackRate: vi.fn(), play: vi.fn(), pause: vi.fn(), cancel: vi.fn() };
        animations.push(animation);
        return animation;
      }),
    });
  });

  afterEach(() => {
    if (originalAnimate) Object.defineProperty(Element.prototype, "animate", originalAnimate);
    else Reflect.deleteProperty(Element.prototype, "animate");
  });

  function mount(slot = 1) {
    return render(<MusicRecord track={demoTracks[0]} activeId={demoTracks[0].id} onActiveChange={vi.fn()} slot={slot} />);
  }

  it("ignores a queued pause notification after playback has already resumed", async () => {
    const { container } = mount();
    const button = container.querySelector<HTMLButtonElement>(".vinyl-button")!;
    const audio = container.querySelector("audio")!;
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeEnabled());
    animations.forEach(animation => { animation.currentTime = 600; });
    fireEvent.click(button);
    animations.forEach(animation => expect(animation.updatePlaybackRate).toHaveBeenLastCalledWith(-1));
    animations.forEach(animation => { animation.currentTime = 300; });
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeEnabled());

    // The old Pause task is delivered after the newer Play changed audio.paused.
    expect(audio.paused).toBe(false);
    fireEvent.pause(audio);
    expect(container.querySelector(".music-track")).toHaveClass("is-playing");
    expect(container.querySelector<HTMLElement>(".vinyl-record")!.style.animationPlayState).toBe("running");
    animations.forEach(animation => {
      expect(animation.updatePlaybackRate).toHaveBeenLastCalledWith(1);
      expect(animation.currentTime).toBe(300);
    });
  });

  it("starts extraction when play resolves even without a play notification", async () => {
    vi.mocked(HTMLMediaElement.prototype.play).mockImplementation(function (this: HTMLMediaElement) {
      Object.defineProperty(this, "paused", { configurable: true, value: false });
      return Promise.resolve();
    });
    const { container } = mount();
    fireEvent.click(container.querySelector(".vinyl-button")!);
    await waitFor(() => expect(container.querySelector(".music-track")).toHaveClass("is-playing"));
    animations.forEach(animation => {
      expect(animation.updatePlaybackRate).toHaveBeenLastCalledWith(1);
      expect(animation.play).toHaveBeenCalledOnce();
    });
  });

  it("does not restart extraction on repeated play or buffering recovery notifications", async () => {
    const { container } = mount();
    const button = container.querySelector<HTMLButtonElement>(".vinyl-button")!;
    const audio = container.querySelector("audio")!;
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeEnabled());
    animations.forEach(animation => { animation.currentTime = 1900; });
    fireEvent.play(audio);
    fireEvent.playing(audio);
    fireEvent.playing(audio);
    animations.forEach(animation => {
      expect(animation.currentTime).toBe(1900);
      expect(animation.play).toHaveBeenCalledOnce();
    });
  });

  it("ignores a queued play notification when the audio is already paused", async () => {
    const { container } = mount();
    const button = container.querySelector<HTMLButtonElement>(".vinyl-button")!;
    const audio = container.querySelector("audio")!;
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeEnabled());
    animations.forEach(animation => { animation.currentTime = 600; });
    fireEvent.click(button);
    expect(audio.paused).toBe(true);
    fireEvent.play(audio);
    fireEvent.playing(audio);
    expect(container.querySelector(".music-track")).not.toHaveClass("is-playing");
    animations.forEach(animation => expect(animation.updatePlaybackRate).toHaveBeenLastCalledWith(-1));
  });

  it("resumes extraction if the record position changes while audio is playing", async () => {
    const { container, rerender } = mount();
    const button = container.querySelector<HTMLButtonElement>(".vinyl-button")!;
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeEnabled());
    rerender(<MusicRecord track={demoTracks[0]} activeId={demoTracks[0].id} onActiveChange={vi.fn()} slot={2} />);
    expect(animations).toHaveLength(6);
    animations.slice(0, 3).forEach(animation => expect(animation.cancel).toHaveBeenCalledOnce());
    animations.slice(3).forEach(animation => {
      expect(animation.updatePlaybackRate).toHaveBeenLastCalledWith(1);
      expect(animation.play).toHaveBeenCalledOnce();
    });
    expect(container.querySelector("audio")!.paused).toBe(false);
  });
});

describe("submission file boundaries", () => {
  it("accepts audio and covers, and rejects wrong types, empty files, and oversized uploads", () => {
    expect(musicFileError(new File(["audio"], "track.mp3", { type: "audio/mpeg" }), "audio")).toBeNull();
    expect(musicFileError(new File(["audio"], "track.mpa", { type: "audio/mpa" }), "audio")).toBeNull();
    expect(musicFileError(new File(["audio"], "track.mpa", { type: "application/octet-stream" }), "audio")).toBeNull();
    expect(musicFileError(new File(["audio"], "track.m4a", { type: "audio/mp4" }), "audio")).toBeNull();
    expect(musicFileError(new File(["audio"], "track.m4a", { type: "audio/x-m4a" }), "audio")).toBeNull();
    expect(musicFileError(new File(["audio"], "track.m4a", { type: "audio/m4a" }), "audio")).toBeNull();
    expect(musicFileError(new File(["audio"], "track.mp4a", { type: "audio/mp4a-latm" }), "audio")).toBeNull();
    expect(musicFileError(new File(["image"], "cover.webp", { type: "image/webp" }), "cover")).toBeNull();
    expect(musicFileError(new File(["script"], "track.mp3", { type: "text/javascript" }), "audio")).toBe("format");
    expect(musicFileError(new File([], "track.wav", { type: "audio/wav" }), "audio")).toBe("empty");
    const tooLarge = new File(["image"], "cover.png", { type: "image/png" });
    Object.defineProperty(tooLarge, "size", { value: 5 * 1024 * 1024 + 1 });
    expect(musicFileError(tooLarge, "cover")).toBe("size");
    const longAudio = new File(["audio"], "track.wav", { type: "audio/wav" });
    Object.defineProperty(longAudio, "size", { value: 250 * 1024 * 1024 + 1 });
    expect(musicFileError(longAudio, "audio")).toBe("size");
    expect(formatAudioTime(Infinity)).toBe("0:00");
    expect(formatAudioTime(65.7)).toBe("1:05");
  });
});
