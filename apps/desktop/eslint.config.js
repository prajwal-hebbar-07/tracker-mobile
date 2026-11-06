// Same rules as the mobile app and core.
import { defineConfig } from 'eslint/config'
import expoConfig from 'eslint-config-expo/flat.js'

export default defineConfig([expoConfig, { ignores: ['dist/*', 'src-tauri/*'] }])
