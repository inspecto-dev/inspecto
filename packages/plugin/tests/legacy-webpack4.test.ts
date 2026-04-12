import { beforeEach, describe, expect, it, vi } from 'vitest'

const startServer = vi.fn(async () => 5678)
const resolveClientModule = vi.fn(() => '/virtual/inspecto-client.js')

vi.mock('../src/server/index.js', () => ({
  startServer,
}))

vi.mock('../src/server', () => ({
  startServer,
}))

vi.mock('../src/injectors/utils.js', () => ({
  resolveClientModule,
}))

vi.mock('../src/injectors/webpack.js', () => ({
  getWebpackHtmlScript: vi.fn(() => 'window.__INSPECTO__=true;'),
}))

class SyncHook {
  handler?: (...args: any[]) => void

  tap(_name: string, handler: (...args: any[]) => void) {
    this.handler = handler
  }

  call(...args: any[]) {
    this.handler?.(...args)
  }
}

class AsyncHook {
  handler?: (...args: any[]) => Promise<void>

  tapPromise(_name: string, handler: (...args: any[]) => Promise<void>) {
    this.handler = handler
  }

  async promise(...args: any[]) {
    await this.handler?.(...args)
  }
}

describe('InspectoWebpack4Plugin', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('starts the Inspecto server during beforeCompile in dev mode', async () => {
    const afterEnvironment = new SyncHook()
    const beforeCompile = new AsyncHook()
    const compilation = new SyncHook()
    const compiler = {
      hooks: {
        afterEnvironment,
        beforeCompile,
        compilation,
      },
      options: {
        module: { rules: [] as any[] },
        plugins: [],
      },
    }

    const { webpack4Plugin } = await import('../src/legacy/webpack4/index.ts')

    webpack4Plugin().apply(compiler)
    await beforeCompile.promise()

    expect(startServer).toHaveBeenCalledTimes(1)
  })
})
