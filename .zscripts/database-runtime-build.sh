#!/bin/bash

set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/home/z/my-project}"
BUILD_DIR="${BUILD_DIR:?BUILD_DIR is required}"
SOURCE_DB_DIR="$PROJECT_DIR/db"
TARGET_DB_DIR="$BUILD_DIR/db"
TARGET_DB_PATH="$TARGET_DB_DIR/custom.db"

mkdir -p "$TARGET_DB_DIR"

# Never copy the development/seed database into production builds.
# Always initialize a fresh schema with db:push.
echo "🗄️  Initializing fresh production database schema..."
(
    cd "$PROJECT_DIR"
    DATABASE_URL="file:$TARGET_DB_PATH" bun run db:push
)

if [ ! -f "$TARGET_DB_PATH" ]; then
    echo "❌ Database initialization command succeeded but $TARGET_DB_PATH was not created"
    exit 1
fi
