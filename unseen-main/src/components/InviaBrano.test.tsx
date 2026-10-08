import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InviaBrano from "./InviaBrano";

const mocks = vi.hoisted(() => ({
  session: vi.fn(), upload: vi.fn(), navigate: vi.fn(), error: vi.fn(), info: vi.fn(), decode: vi.fn(), clip: vi.fn(),
}));
vi.mock("@/i18n/I18nProvider", () => ({ useI18n: () => ({ locale: "it" }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, info: mocks.info, success: vi.fn() } }));
vi.mock("@/supabaseClient", () => ({ supabase: {
  auth: { getSession: mocks.session },
} }));
vi.mock('@/lib/media-upload', () => ({ uploadSubmission: mocks.upload }));
vi.mock('@/lib/optimize-image', () => ({ optimizeImage: async (file: File) => file }));
vi.mock('@/lib/audio-clip', () => ({ MAX_CLIP_SECONDS: 40, decodeAudioFile: mocks.decode, renderAudioClip: mocks.clip, waveformPeaks: () => [0.2, 0.8, 0.5] }));

beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL(file: File) { return `blob:preview/${file.name}`; }
    static revokeObjectURL = vi.fn();
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  mocks.session.mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null });
  mocks.upload.mockResolvedValue({ id: 'submission-1' });
  mocks.decode.mockResolvedValue({ duration: 120, numberOfChannels: 2 });
  mocks.clip.mockImplementation(async () => new File(['clipped audio'], 'unseen-clip.wav', { type: 'audio/wav' }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.clearAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function fillSubmission() {
  fireEvent.change(screen.getByLabelText("Copertina del brano"), { target: { files: [new File(["cover"], "cover.png", { type: "image/png" })] } });
  fireEvent.change(screen.getByLabelText("File audio"), { target: { files: [new File(["audio"], "track.mp3", { type: "audio/mpeg" })] } });
  fireEvent.change(screen.getByRole("textbox", { name: /Titolo del brano/ }), { target: { value: "My Track" } });
  fireEvent.change(screen.getByRole("textbox", { name: /Nome d’arte/ }), { target: { value: "Artist" } });
  fireEvent.click(screen.getByRole("checkbox"));
}

describe("music submissions", () => {
  it("previews the selected cover and audio and submits both files through R2", async () => {
    const { container } = render(<InviaBrano />);
    fillSubmission();
    await waitFor(() => expect(container.querySelector(".music-track audio")?.getAttribute("src")).toBe("blob:preview/unseen-clip.wav"));
    expect(container.querySelector(".music-cover-image")?.getAttribute("src")).toBe("blob:preview/cover.png");
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith('music', { title: 'My Track', artist: 'Artist', instagram_username: '', youtube_url: '', instagram_reel_url: '', spotify_url: '' }, [expect.objectContaining({kind:'cover',file:expect.any(File)}),expect.objectContaining({kind:'audio',file:expect.objectContaining({name:'unseen-clip.wav',type:'audio/wav'})})]));
    expect(await screen.findByText("Brano ricevuto")).toBeInTheDocument();
  });

  it("never reports success when R2 confirmation fails", async () => {
    mocks.upload.mockRejectedValueOnce(new Error("Database unavailable"));
    const { container } = render(<InviaBrano />);
    fillSubmission();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Invia il brano' })).toBeEnabled());
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(screen.queryByText("Brano ricevuto")).not.toBeInTheDocument();
    expect(mocks.error).toHaveBeenCalled();
  });

  it("requires login before opening an audio file picker", async () => {
    mocks.session.mockResolvedValueOnce({ data: { session: null }, error: null });
    render(<InviaBrano />);
    await waitFor(() => expect(mocks.session).toHaveBeenCalled());
    expect(fireEvent.click(screen.getByLabelText("File audio"))).toBe(false);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/auth?redirect=%2Fsubmit%3Ftipo%3Dmusica"));
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('rebuilds the exact selected clip and persists normalized optional links instead of a story', async () => {
    const { container } = render(<InviaBrano />); fillSubmission();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Invia il brano' })).toBeEnabled());
    fireEvent.change(screen.getByLabelText('Inizio (secondi)'), { target: { value: '25.25' } });
    expect(screen.getByRole('button', { name: 'Invia il brano' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Fine (secondi)'), { target: { value: '60.25' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Username Instagram/ }), { target: { value: '@my.artist' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Video YouTube' }), { target: { value: 'https://youtu.be/dQw4w9WgXcQ?si=tracking' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Reel Instagram' }), { target: { value: 'https://www.instagram.com/reel/Test123/?igsh=tracking' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Brano su Spotify' }), { target: { value: 'https://open.spotify.com/intl-it/track/0123456789012345678901?si=tracking' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Invia il brano' })).toBeEnabled());
    expect(mocks.clip).toHaveBeenLastCalledWith(expect.objectContaining({duration:120}),25.25,60.25);
    expect(screen.queryByRole('textbox',{name:/storia/i})).not.toBeInTheDocument();
    expect(screen.getAllByRole('link',{name:/@my.artist/})[0]).toHaveAttribute('href','https://www.instagram.com/my.artist/');
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith('music',expect.objectContaining({instagram_username:'my.artist',youtube_url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',instagram_reel_url:'https://www.instagram.com/reel/Test123/',spotify_url:'https://open.spotify.com/track/0123456789012345678901'}),expect.any(Array)));
  });

  it('never uploads a whole file when decoding fails', async () => {
    mocks.decode.mockRejectedValueOnce(new Error('Unreadable audio'));
    const { container } = render(<InviaBrano />); fillSubmission();
    await screen.findByRole('alert');
    fireEvent.submit(container.querySelector('form')!);
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(screen.getByRole('button',{name:'Invia il brano'})).toBeDisabled();
  });

  it('blocks an invalid platform link and enables submission after it is corrected', async () => {
    const { container } = render(<InviaBrano />); fillSubmission();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Invia il brano' })).toBeEnabled());
    fireEvent.change(screen.getByRole('textbox', { name: 'Video YouTube' }), { target: { value: 'https://youtube.com.attacker.invalid/watch?v=dQw4w9WgXcQ' } });
    expect(screen.getByRole('button', { name: 'Invia il brano' })).toBeDisabled();
    fireEvent.submit(container.querySelector('form')!);
    expect(mocks.upload).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Video YouTube' }), { target: { value: 'https://youtu.be/dQw4w9WgXcQ' } });
    expect(screen.getByRole('button', { name: 'Invia il brano' })).toBeEnabled();
  });
});
