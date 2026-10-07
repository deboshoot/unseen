import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMusicAnalyser } from "./useMusicAnalyser";

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("music analyser audio routing", () => {
  it("opens on Play, reuses the source on replay, and cleans up both tracks", () => {
    const graphs: { connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }[] = [];
    const analysers: { disconnect: ReturnType<typeof vi.fn> }[] = [];
    const context = {
      state: "suspended", destination: {}, resume: vi.fn(() => Promise.resolve()), close: vi.fn(() => Promise.resolve()),
      createMediaElementSource: vi.fn(() => { const source = { connect: vi.fn(), disconnect: vi.fn() }; graphs.push(source); return source; }),
      createAnalyser: vi.fn(() => { const analyser = { disconnect: vi.fn() }; analysers.push(analyser); return analyser; }),
    };
    const createContext = vi.fn(function () { return context; });
    vi.stubGlobal("AudioContext", createContext);
    const first = document.createElement("audio"); const second = document.createElement("audio");
    vi.spyOn(first, "pause").mockImplementation(() => {}); vi.spyOn(second, "pause").mockImplementation(() => {});
    const { result, unmount } = renderHook(useMusicAnalyser);
    expect(createContext).not.toHaveBeenCalled();
    act(() => result.current.prepareAudio(first));
    expect(result.current.signal?.audio).toBe(first);
    expect(graphs[0].connect).toHaveBeenCalledWith(context.destination);
    expect(graphs[0].connect).toHaveBeenCalledWith(analysers[0]);
    act(() => result.current.prepareAudio(second));
    expect(result.current.signal?.audio).toBe(second);
    act(() => result.current.prepareAudio(first));
    expect(createContext).toHaveBeenCalledTimes(1);
    expect(context.createMediaElementSource).toHaveBeenCalledTimes(2);
    expect(context.resume).toHaveBeenCalled();
    unmount();
    expect(context.close).toHaveBeenCalledTimes(1);
    expect(first.pause).toHaveBeenCalled(); expect(second.pause).toHaveBeenCalled();
    graphs.forEach((source) => expect(source.disconnect).toHaveBeenCalledTimes(1));
    analysers.forEach((analyser) => expect(analyser.disconnect).toHaveBeenCalledTimes(1));
  });

  it("leaves playback untouched when Web Audio is unavailable", () => {
    vi.stubGlobal("AudioContext", undefined);
    const { result } = renderHook(useMusicAnalyser);
    const audio = document.createElement("audio");
    act(() => result.current.prepareAudio(audio));
    expect(result.current.signal).toBeNull();
  });
});
