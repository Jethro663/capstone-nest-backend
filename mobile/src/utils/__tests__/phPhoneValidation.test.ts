import { analyzePhPhone, formatPhPhoneInput, detectPhTelecomCarrier } from "../phPhoneValidation";

describe("phPhoneValidation", () => {
  describe("analyzePhPhone", () => {
    it("returns INVALID_PREFIX when typing invalid starting digits like '4'", () => {
      const res = analyzePhPhone("4");
      expect(res.isValid).toBe(false);
      expect(res.status).toBe("INVALID_PREFIX");
      expect(res.message).toContain("Invalid PH number");
    });

    it("returns INVALID_PREFIX for non-+63 international prefix like '+1415'", () => {
      const res = analyzePhPhone("+14151234567");
      expect(res.isValid).toBe(false);
      expect(res.status).toBe("INVALID_PREFIX");
      expect(res.message).toContain("must use +63");
    });

    it("handles incomplete 09 local inputs", () => {
      const res = analyzePhPhone("0917");
      expect(res.isValid).toBe(false);
      expect(res.status).toBe("INCOMPLETE");
      expect(res.telecomCarrier).toBe("Globe / TM");
      expect(res.message).toContain("4/11 digits");
    });

    it("validates complete 09 local number (11 digits) and detects carrier", () => {
      const res = analyzePhPhone("09171234567");
      expect(res.isValid).toBe(true);
      expect(res.status).toBe("VALID");
      expect(res.telecomCarrier).toBe("Globe / TM");
      expect(res.normalizedE164).toBe("+639171234567");
      expect(res.normalizedLocal).toBe("09171234567");
    });

    it("validates Smart / TNT prefix (0918)", () => {
      const res = analyzePhPhone("09189876543");
      expect(res.isValid).toBe(true);
      expect(res.status).toBe("VALID");
      expect(res.telecomCarrier).toBe("Smart / TNT / Sun");
      expect(res.normalizedE164).toBe("+639189876543");
    });

    it("validates DITO prefix (0991)", () => {
      const res = analyzePhPhone("09911234567");
      expect(res.isValid).toBe(true);
      expect(res.status).toBe("VALID");
      expect(res.telecomCarrier).toBe("DITO");
      expect(res.normalizedE164).toBe("+639911234567");
    });

    it("validates complete +63 international format input", () => {
      const res = analyzePhPhone("+639171234567");
      expect(res.isValid).toBe(true);
      expect(res.status).toBe("VALID");
      expect(res.telecomCarrier).toBe("Globe / TM");
      expect(res.normalizedE164).toBe("+639171234567");
    });

    it("strips out formatting characters like spaces or hyphens", () => {
      const res = analyzePhPhone("0917-123-4567");
      expect(res.isValid).toBe(true);
      expect(res.status).toBe("VALID");
      expect(res.normalizedE164).toBe("+639171234567");
    });

    it("returns EXCEEDS_LENGTH when input exceeds 11 digits", () => {
      const res = analyzePhPhone("091712345678");
      expect(res.isValid).toBe(false);
      expect(res.status).toBe("EXCEEDS_LENGTH");
    });
  });

  describe("formatPhPhoneInput", () => {
    it("formats local number as 09XX XXX XXXX", () => {
      expect(formatPhPhoneInput("09171234567", "local")).toBe("0917 123 4567");
    });

    it("formats international number as +63 9XX XXX XXXX", () => {
      expect(formatPhPhoneInput("09171234567", "international")).toBe("+63 917 123 4567");
    });
  });

  describe("detectPhTelecomCarrier", () => {
    it("identifies Globe / TM", () => {
      expect(detectPhTelecomCarrier("09171234567")).toBe("Globe / TM");
    });

    it("identifies Smart / TNT / Sun", () => {
      expect(detectPhTelecomCarrier("09191234567")).toBe("Smart / TNT / Sun");
    });

    it("identifies DITO", () => {
      expect(detectPhTelecomCarrier("09921234567")).toBe("DITO");
    });
  });
});
