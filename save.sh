#!/bin/bash

# This script simplifies saving your work to GitHub.
# It will stage all your changes, ask you for a commit message,
# and then push the changes to your remote repository.

echo "✅ Staging all changes for commit..."
git add .

# Use the first argument as the commit message, or ask the user if it's not provided
if [ -n "$1" ]; then
  commit_message="$1"
else
  echo "💬 Please enter a commit message (and press Enter):"
  read commit_message
fi

# Check if the commit message is empty
if [ -z "$commit_message" ]; then
  echo "❌ Commit message cannot be empty. Aborting."
  exit 1
fi

echo "📦 Committing with message: '$commit_message'..."
git commit -m "$commit_message"

echo "🚀 Pushing changes to GitHub..."
git push

echo "✨ All done! Your work is saved on GitHub."