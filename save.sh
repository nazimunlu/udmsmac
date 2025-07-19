#!/bin/bash

# This script simplifies saving your work to GitHub.
# It will stage all your changes, ask you for a commit message,
# and then push the changes to your remote repository.

echo "✅ Staging all changes for commit..."
git add .

# Ask the user for a commit message
echo "💬 Please enter a commit message (and press Enter):"
read commit_message

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