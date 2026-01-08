import { defineConfig, drivers } from '@adonisjs/core/hash'

const hashConfig = defineConfig({
  default: 'argon',

  list: {
    argon: drivers.argon2({
      variant: 'id',
      iterations: 3,
      memory: 65536,
      parallelism: 4,
    }),
  },
})

export default hashConfig

declare module '@adonisjs/core/types' {
  export interface HashersList extends InferHashers<typeof hashConfig> {}
}
