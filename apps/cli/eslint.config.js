// Same rules as the other apps.
import { defineConfig } from 'eslint/config'
import expoConfig from 'eslint-config-expo/flat.js'

export default defineConfig([expoConfig, { ignores: ['dist/*'] }])
