import { AxiosError, AxiosHeaders } from "axios";
import { clearGlobalErrorPresenter, setGlobalErrorPresenter } from "../errors";
import { peekAppError, toAppError } from "../http";

describe("http error formatting", () => {
  const presenter = jest.fn();

  beforeEach(() => {
    presenter.mockReset();
    setGlobalErrorPresenter(presenter);
  });

  afterEach(() => {
    clearGlobalErrorPresenter();
  });

  function createServerError(message = "Backend offline") {
    return new AxiosError(
      message,
      "ERR_BAD_RESPONSE",
      {
        headers: new AxiosHeaders(),
      } as never,
      undefined,
      {
        status: 500,
        statusText: "Internal Server Error",
        headers: {},
        config: { headers: new AxiosHeaders() } as never,
        data: { message },
      },
    );
  }

  it("formats render-safe app errors without presenting the global modal", () => {
    const appError = peekAppError(createServerError("LXP unavailable"));

    expect(appError.title).toBe("Request Failed");
    expect(appError.message).toBe("LXP unavailable");
    expect(appError.shouldShowModal).toBe(true);
    expect(presenter).not.toHaveBeenCalled();
  });

  it("continues presenting the global modal for imperative error handling", () => {
    const appError = toAppError(createServerError("Live request failed"));

    expect(appError.message).toBe("Live request failed");
    expect(presenter).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Request Failed",
        message: "Live request failed",
      }),
    );
  });
});
