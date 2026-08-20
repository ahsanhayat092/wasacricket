import { describe, it, expect } from "vitest";
import { normalizeImageUrl } from "./image-utils";

describe("normalizeImageUrl", () => {
  it("converts Google Drive file/d/ID/view links to direct CDN links", () => {
    const driveUrl = "https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J/view?usp=sharing";
    expect(normalizeImageUrl(driveUrl)).toBe("https://lh3.googleusercontent.com/d/1A2B3C4D5E6F7G8H9I0J");
  });

  it("converts Google Drive file/d/ID/view without query params", () => {
    const driveUrl = "https://drive.google.com/file/d/1X9_yZ-88AaBbCc/view";
    expect(normalizeImageUrl(driveUrl)).toBe("https://lh3.googleusercontent.com/d/1X9_yZ-88AaBbCc");
  });

  it("converts Google Drive open?id=ID links", () => {
    const driveUrl = "https://drive.google.com/open?id=1AbCdEfGhIjKlMnOp";
    expect(normalizeImageUrl(driveUrl)).toBe("https://lh3.googleusercontent.com/d/1AbCdEfGhIjKlMnOp");
  });

  it("converts Google Drive uc?id=ID links", () => {
    const driveUrl = "https://drive.google.com/uc?export=view&id=1AbCdEfGhIjKlMnOp";
    expect(normalizeImageUrl(driveUrl)).toBe("https://lh3.googleusercontent.com/d/1AbCdEfGhIjKlMnOp");
  });

  it("converts Dropbox links to direct raw stream", () => {
    const dropboxUrl = "https://www.dropbox.com/s/sample123/player.png?dl=0";
    expect(normalizeImageUrl(dropboxUrl)).toBe("https://www.dropbox.com/s/sample123/player.png?raw=1");
  });

  it("passes standard direct image URLs unchanged", () => {
    const standardUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb.jpg";
    expect(normalizeImageUrl(standardUrl)).toBe(standardUrl);
  });

  it("handles empty or null gracefully", () => {
    expect(normalizeImageUrl(null)).toBeNull();
    expect(normalizeImageUrl("")).toBeNull();
    expect(normalizeImageUrl("   ")).toBeNull();
  });
});
