#!/bin/bash

# This script simplifies saving your work to GitHub.
# It will stage all your changes, use an automated commit message,
# and then push the changes to your remote repository.

echo "✅ Staging all changes for commit..."
git add .

# Use the first argument as the commit message, or use a default message
if [ -n "$1" ]; then
  commit_message="$1"
else
  commit_message="Automated commit by Gemini CLI"
fi

echo "📦 Committing with message: '$commit_message'..."
git commit -m "$commit_message"

echo "🚀 Pushing changes to GitHub..."
git push

echo "✨ All done! Your work is saved on GitHub."
