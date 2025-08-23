#!/bin/bash

# Build the application if dist folder doesn't exist
if [ ! -d "dist" ]; then
  echo "Building application..."
  npm run build
fi

# Start the preview server
echo "Starting server on port ${PORT:-3000}..."
npx vite preview --port ${PORT:-3000} --host 0.0.0.0