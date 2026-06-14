// Type declarations for EdgeOne Pages runtime globals

interface KVNamespace {
  get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<any>
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: {
    expirationTtl?: number
    expiration?: number
    metadata?: Record<string, any>
  }): Promise<void>
  delete(key: string): Promise<void>
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    keys: { name: string; metadata?: any }[]
    list_complete: boolean
    cursor?: string
  }>
  getWithMetadata(key: string): Promise<{ value: any; metadata: any }>
}

declare global {
  // EdgeOne KV namespace binding - configured in EdgeOne console
  var GALLERY_KV: KVNamespace | undefined
}

export {}
