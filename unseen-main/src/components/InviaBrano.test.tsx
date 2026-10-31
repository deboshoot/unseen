import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  it.each([
    ['feat', '  Guest  ', 'Artist feat. Guest'],
    ['duet', '  Guest  ', 'Artist & Guest'],
    ['feat', '   ', 'Artist'],
  ])('previews and uploads %s credits with an optional second artist', async (kind, guest, credit) => {
    const { container } = render(<InviaBrano />);
    fillSubmission();
    fireEvent.change(screen.getByRole('combobox', { name: 'Tipo di collaborazione' }), { target: { value: kind } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome del secondo artista' }), { target: { value: guest } });
    const button = screen.getByRole('button', { name: 'Invia il brano' });
    await waitFor(() => expect(button).toBeEnabled());
    expect(container.querySelector('.music-track-info p')).toHaveTextContent(credit);
    expect(container.querySelector('form')!.checkValidity()).toBe(true);
    fireEvent.click(button);
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith('music', expect.objectContaining({ artist: credit }), expect.any(Array)));
    expect(await screen.findByText('Brano ricevuto')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Invia un altro brano' }));
    expect(screen.getByRole('textbox', { name: 'Nome del secondo artista' })).toHaveValue('');
    expect(screen.getByRole('combobox', { name: 'Tipo di collaborazione' })).toHaveValue('feat');
  });

  it('checks the combined credit against the upload limit and allows correction', async () => {
    const { container } = render(<InviaBrano />);
    fillSubmission();
    const guest = screen.getByRole('textbox', { name: 'Nome del secondo artista' });
    fireEvent.change(guest, { target: { value: 'G'.repeat(107) } });
    const button = screen.getByRole('button', { name: 'Invia il brano' });
    await waitFor(() => expect(button).toBeEnabled());
    // Artist (6) + " feat. " (7) + guest (108) exceeds the server's 120-character limit.
    fireEvent.change(guest, { target: { value: 'G'.repeat(108) } });
    expect(button).toBeDisabled();
    expect(guest).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('120 caratteri');
    fireEvent.submit(container.querySelector('form')!);
    expect(mocks.upload).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('combobox', { name: 'Tipo di collaborazione' }), { target: { value: 'duet' } });
    expect(button).toBeEnabled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    fireEvent.click(button);
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith('music', expect.objectContaining({ artist: `Artist & ${'G'.repeat(108)}` }), expect.any(Array)));
  });

  it.each([12.34567, 0.03456])('submits a short clip of %s seconds through the actual submit button', async duration => {
    mocks.decode.mockResolvedValueOnce({ duration, numberOfChannels: 2 });
    const { container } = render(<InviaBrano />);
    fillSubmission();
    const button = screen.getByRole('button', { name: 'Invia il brano' });
    await waitFor(() => expect(button).toBeEnabled());
    expect(container.querySelector('form')!.checkValidity()).toBe(true);
    fireEvent.click(button);
    await waitFor(() => expect(mocks.upload).toHaveBeenCalled());
  });

  it('submits after moving the excerpt to a fractional audio position', async () => {
    const { container } = render(<InviaBrano />);
    fillSubmission();
    const button = screen.getByRole('button', { name: 'Invia il brano' });
    await waitFor(() => expect(button).toBeEnabled());
    const waveform = container.querySelector('.audio-clip-waveform')!;
    Object.defineProperty(waveform, 'clientWidth', { value: 673 });
    fireEvent.wheel(waveform, { deltaX: 37 });
    await waitFor(() => expect(button).toBeEnabled());
    expect(container.querySelector('form')!.checkValidity()).toBe(true);
    fireEvent.click(button);
    await waitFor(() => expect(mocks.upload).toHaveBeenCalled());
  });

  it('accepts a WAV original over 30 MB without MIME and uploads only the prepared clip', async () => {
    const { container } = render(<InviaBrano />);
    fillSubmission();
    const original = new File(['master'], 'MASTER.WAW');
    Object.defineProperty(original, 'size', { value: 100 * 1024 * 1024 });
    fireEvent.change(screen.getByLabelText('File audio'), { target: { files: [original] } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Invia il brano' })).toBeEnabled());
    expect(mocks.decode).toHaveBeenLastCalledWith(original, expect.any(AbortSignal));
    expect(mocks.error).not.toHaveBeenCalled();
    fireEvent.submit(container.querySelector('form')!);
    await waitFor(() => expect(mocks.upload).toHaveBeenCalled());
    const files = mocks.upload.mock.calls[0][2];
    expect(files.find((file: { kind: string }) => file.kind === 'audio').file.name).toBe('unseen-clip.wav');
    expect(files.some((file: { file: File }) => file.file === original)).toBe(false);
  });
  it('distinguishes empty files, unsupported formats and oversized originals', () => {
    render(<InviaBrano />);
    const input = screen.getByLabelText('File audio');
    fireEvent.change(input, { target: { files: [new File([], 'empty.wav')] } });
    expect(mocks.error).toHaveBeenLastCalledWith('Il file è vuoto. Seleziona un altro file.');
    fireEvent.change(input, { target: { files: [new File(['pdf'], 'document.pdf', { type: 'application/pdf' })] } });
    expect(mocks.error).toHaveBeenLastCalledWith('Scegli un file MPA, MP3, MP4A/M4A o WAV valido.');
    const huge = new File(['wav'], 'huge.wav'); Object.defineProperty(huge, 'size', { value: 250 * 1024 * 1024 + 1 });
    fireEvent.change(input, { target: { files: [huge] } });
    expect(mocks.error).toHaveBeenLastCalledWith('Il file audio supera 250 MB. Esporta un file più piccolo e riprova.');
    expect(mocks.decode).not.toHaveBeenCalled();
  });
  it("previews the selected cover and audio and submits both files through R2", async () => {
    const { container } = render(<InviaBrano />);
    fillSubmission();
    await waitFor(() => expect(container.querySelector(".music-track audio")?.getAttribute("src")).toBe("blob:preview/unseen-clip.wav"));
    expect(container.querySelector(".music-cover-image")?.getAttribute("src")).toBe("blob:preview/cover.png");
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith('music', { title: 'My Track', artist: 'Artist', instagram_username: '', youtube_url: '', instagram_reel_url: '', spotify_url: '' }, [expect.objectContaining({kind:'cover',file:expect.any(File)}),expect.objectContaining({kind:'audio',file:expect.objectContaining({name:'unseen-clip.wav',type:'audio/wav'})})]));
    expect(await screen.findByText("Brano ricevuto")).toBeInTheDocument();
  });

  it('shows an animated, accessible elapsed-time indicator while a submission is pending', async () => {
    let finishUpload!: (result: { id: string }) => void;
    mocks.upload.mockImplementationOnce(() => new Promise(resolve => { finishUpload = resolve; }));
    const { container } = render(<InviaBrano />);
    fillSubmission();
    const button = screen.getByRole('button', { name: 'Invia il brano' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);

    await waitFor(() => expect(mocks.upload).toHaveBeenCalled());
    expect(screen.getByRole('status')).toHaveTextContent('Stiamo inviando il tuo brano');
    expect(screen.getByRole('timer', { name: 'Tempo trascorso: 0 secondi' })).toHaveTextContent('00:00');
    expect(container.querySelector('.music-submit-progress-ring')).toBeInTheDocument();
    expect(button).toBeDisabled();

    await act(async () => {
      await new Promise(resolve => window.setTimeout(resolve, 1050));
    });
    expect(screen.getByRole('timer', { name: 'Tempo trascorso: 1 secondo' })).toHaveTextContent('00:01');

    await act(async () => finishUpload({ id: 'submission-1' }));
    expect(await screen.findByText('Brano ricevuto')).toBeInTheDocument();
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
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
    fireEvent.click(screen.getByText('Regola i secondi esatti'));
    fireEvent.change(screen.getByLabelText('Inizio (secondi)'), { target: { value: '25.25' } });
    expect(screen.getByRole('button', { name: 'Invia il brano' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Fine (secondi)'), { target: { value: '60.25' } });
    fireEvent.change(screen.getByRole('textbox', { name: /Username Instagram/ }), { target: { value: '@my.artist' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Video YouTube' }), { target: { value: 'https://youtu.be/dQw4w9WgXcQ?si=tracking' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Reel Instagram' }), { target: { value: 'https://www.instagram.com/reel/Test123/?igsh=tracking' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Brano su Spotify' }), { target: { value: 'https://open.spotify.com/intl-it/track/0123456789012345678901?si=tracking' } });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Invia il brano' })).toBeEnabled());
    expect(mocks.clip).toHaveBeenLastCalledWith(expect.objectContaining({duration:120}),25.25,60.25,expect.any(AbortSignal));
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
