import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import InviaBrano from "./InviaBrano";

const mocks = vi.hoisted(() => ({
  session: vi.fn(), upload: vi.fn(), navigate: vi.fn(), error: vi.fn(), info: vi.fn(),
}));
vi.mock("@/i18n/I18nProvider", () => ({ useI18n: () => ({ locale: "it" }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("sonner", () => ({ toast: { error: mocks.error, info: mocks.info, success: vi.fn() } }));
vi.mock("@/supabaseClient", () => ({ supabase: {
  auth: { getSession: mocks.session },
} }));
vi.mock('@/lib/media-upload', () => ({ uploadSubmission: mocks.upload }));
vi.mock('@/lib/optimize-image', () => ({ optimizeImage: async (file: File) => file }));

beforeEach(() => {
  vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
  vi.stubGlobal("URL", class extends URL {
    static createObjectURL(file: File) { return `blob:preview/${file.name}`; }
    static revokeObjectURL = vi.fn();
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  mocks.session.mockResolvedValue({ data: { session: { user: { id: "user-1" } } }, error: null });
  mocks.upload.mockResolvedValue({ id: 'submission-1' });
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
    await waitFor(() => expect(container.querySelector("audio")?.getAttribute("src")).toBe("blob:preview/track.mp3"));
    expect(container.querySelector(".music-cover-image")?.getAttribute("src")).toBe("blob:preview/cover.png");
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(mocks.upload).toHaveBeenCalledWith('music', { title: 'My Track', artist: 'Artist', story: '' }, [expect.objectContaining({kind:'cover',file:expect.any(File)}),expect.objectContaining({kind:'audio',file:expect.any(File)})]));
    expect(await screen.findByText("Brano ricevuto")).toBeInTheDocument();
  });

  it("never reports success when R2 confirmation fails", async () => {
    mocks.upload.mockRejectedValueOnce(new Error("Database unavailable"));
    const { container } = render(<InviaBrano />);
    fillSubmission();
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(screen.queryByText("Brano ricevuto")).not.toBeInTheDocument();
    expect(mocks.error).toHaveBeenCalled();
  });

  it("requires login before uploading any files", async () => {
    mocks.session.mockResolvedValueOnce({ data: { session: null }, error: null });
    const { container } = render(<InviaBrano />);
    fillSubmission();
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/auth?redirect=%2Fsubmit%3Ftipo%3Dmusica"));
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});
