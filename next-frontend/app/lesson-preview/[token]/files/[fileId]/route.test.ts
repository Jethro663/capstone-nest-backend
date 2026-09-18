import { TextDecoder, TextEncoder } from 'node:util';
import {
  ReadableStream,
  TextDecoderStream,
  TextEncoderStream,
  TransformStream,
  WritableStream,
} from 'node:stream/web';

Object.assign(globalThis, {
  TextDecoder,
  TextEncoder,
  TextDecoderStream,
  TextEncoderStream,
  ReadableStream,
  TransformStream,
  WritableStream,
  structuredClone: <T>(value: T) => JSON.parse(JSON.stringify(value)) as T,
});

const {
  Headers: EdgeHeaders,
  Request: EdgeRequest,
  Response: EdgeResponse,
} = jest.requireActual(
  'next/dist/compiled/@edge-runtime/primitives',
) as typeof globalThis;

Object.assign(globalThis, {
  Headers: EdgeHeaders,
  Request: EdgeRequest,
  Response: EdgeResponse,
});

const { GET } = jest.requireActual('./route') as typeof import('./route');

describe('lesson preview file proxy', () => {
  afterEach(() => jest.restoreAllMocks());

  it('proxies the scoped backend file without caching or exposing a signed URL', async () => {
    const backendResponse = new EdgeResponse('image-bytes', {
      status: 200,
      headers: {
        'content-type': 'image/png',
        'content-disposition': 'inline; filename="diagram.png"',
      },
    });
    const fetchSpy = jest.fn().mockResolvedValue(backendResponse);
    globalThis.fetch = fetchSpy as typeof fetch;

    const response = await GET(new EdgeRequest('https://nexora.test/preview'), {
      params: Promise.resolve({ token: 'secure-token', fileId: 'file-1' }),
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/lessons/preview/secure-token/files/file-1',
      ),
      expect.objectContaining({ cache: 'no-store' }),
    );
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('content-type')).toBe('image/png');
    await expect(response.text()).resolves.toBe('image-bytes');
  });
});
