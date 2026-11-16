// Gera as versões otimizadas da foto de perfil usadas pelo site.
//
//   npm run images                        -> usa assets/perfil4.png
//   npm run images -- caminho/da/foto.png -> usa outra foto
//
// Os arquivos gerados (src/assets/profile-*.webp) devem ser commitados: o
// build do site não depende do sharp, apenas este script.
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = path.resolve(root, process.argv[2] ?? 'assets/perfil4.png')
const outDir = path.join(root, 'src/assets')
const widths = [320, 480, 640, 960]

let sharp
try {
  ;({ default: sharp } = await import('sharp'))
} catch {
  console.error('O pacote "sharp" não está instalado. Rode "npm install" e tente de novo.')
  process.exit(1)
}

console.log(`Origem: ${path.relative(root, source)}`)

for (const width of widths) {
  const file = path.join(outDir, `profile-${width}.webp`)
  const info = await sharp(source)
    .rotate() // respeita a orientação EXIF da câmera
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 80, effort: 6 })
    .toFile(file)

  const kb = (info.size / 1024).toFixed(1)
  console.log(`  ${path.relative(root, file)}  ${info.width}x${info.height}  ${kb} kB`)
}
