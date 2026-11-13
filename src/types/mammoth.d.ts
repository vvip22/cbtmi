declare module 'mammoth' {
  export interface MammothResult {
    value: string;
    messages: Array<{ type: string; message: string }>;
  }

  export namespace images {
    export function imgElement(
      elementCallback: (image: {
        read: (encoding: string) => Promise<string>;
        contentType: string;
      }) => Promise<{ src: string }>
    ): any;
  }

  export function convertToHtml(
    input: { arrayBuffer: ArrayBuffer } | { buffer: Buffer } | { path: string },
    options?: any
  ): Promise<MammothResult>;

  export function extractRawText(
    input: { arrayBuffer: ArrayBuffer } | { buffer: Buffer } | { path: string }
  ): Promise<MammothResult>;
}
