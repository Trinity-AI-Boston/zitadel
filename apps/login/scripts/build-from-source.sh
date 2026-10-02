#!/bin/sh
set -eu

# Run from the repository root. Generate one complete binding format at a time
# so buf does not start many protoc workers concurrently on small build hosts.
(
  cd packages/zitadel-proto
  for format in es cjs types; do
    case "$format" in
      es) options='["target=js","json_types=true","import_extension=js"]' ;;
      cjs) options='["target=js","json_types=true","import_extension=js","js_import_style=legacy_commonjs"]' ;;
      types) options='["target=dts","json_types=true","import_extension=js"]' ;;
    esac
    template='{"version":"v2","managed":{"enabled":true},"plugins":[{"local":"protoc-gen-es","strategy":"all","out":"'"$format"'","include_imports":true,"opt":'"$options"'}]}'
    pnpm exec buf generate ../../proto --template "$template"
  done
)
pnpm --filter @zitadel/client run build
touch apps/login/.env
pnpm --filter @zitadel/login run build
