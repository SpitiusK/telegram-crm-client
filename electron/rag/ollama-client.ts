const DEFAULT_MODEL = 'nomic-embed-text'

interface EmbedResponse {
  embeddings: number[][]
}

interface TagsResponse {
  models: Array<{ name: string }>
}

interface PullResponse {
  status: string
}

export class OllamaEmbedder {
  private url: string
  private model: string

  constructor(url = 'http://localhost:11434', model = DEFAULT_MODEL) {
    this.url = url
    this.model = model
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.url}/api/tags`)
      return res.ok
    } catch {
      return false
    }
  }

  async ensureModel(): Promise<boolean> {
    try {
      const res = await fetch(`${this.url}/api/tags`)
      if (!res.ok) return false

      const data = (await res.json()) as TagsResponse
      const hasModel = data.models.some((m) => m.name === this.model || m.name.startsWith(`${this.model}:`))

      if (!hasModel) {
        console.warn(`[Ollama] Pulling model ${this.model}...`)
        const pullRes = await fetch(`${this.url}/api/pull`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: this.model, stream: false }),
        })
        if (!pullRes.ok) return false
        const pullData = (await pullRes.json()) as PullResponse
        return pullData.status === 'success'
      }

      return true
    } catch {
      return false
    }
  }

  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.url}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, input: text }),
    })

    if (!res.ok) {
      throw new Error(`Ollama embed failed: ${res.status} ${res.statusText}`)
    }

    const data = (await res.json()) as EmbedResponse
    const embedding = data.embeddings[0]
    if (!embedding) {
      throw new Error('Ollama returned empty embedding')
    }
    return embedding
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return []

    const res = await fetch(`${this.url}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, input: texts }),
    })

    if (!res.ok) {
      throw new Error(`Ollama embedBatch failed: ${res.status} ${res.statusText}`)
    }

    const data = (await res.json()) as EmbedResponse
    return data.embeddings
  }
}
