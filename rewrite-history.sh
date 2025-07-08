#!/bin/bash

# This script rewrites the entire Git history of the repository to change the author
# of all commits to "Firebase Studio AI".
#
# It uses 'git-filter-repo', which is the modern, recommended tool for
# rewriting history. It is significantly faster and safer than the older
# 'git filter-branch' command.
#
# --- PRE-REQUISITES ---
# You must install git-filter-repo first.
# On macOS: brew install git-filter-repo
# On other systems (with Python/pip): pip install git-filter-repo
# For more info: https://github.com/newren/git-filter-repo/
#
# WARNING: This is a destructive operation that rewrites history.
# It is recommended to back up your repository before running this script.
#
# --- USAGE ---
# 1. Make the script executable:
#    chmod +x rewrite-history.sh
#
# 2. Run the script:
#    ./rewrite-history.sh

# Define the new author details
CORRECT_NAME="Firebase Studio AI"
CORRECT_EMAIL="ai@firebase.studio"

# Run the history rewrite command. The --force flag is needed to run on
# an existing repository that is not a fresh clone.
git filter-repo --name "$CORRECT_NAME" --email "$CORRECT_EMAIL" --force

echo " "
echo "-------------------------------------"
echo "History rewrite complete using git-filter-repo."
echo " "
echo "To finalize these changes on GitHub, you must force push:"
echo "git push --force --tags origin 'refs/heads/*'"
echo "-------------------------------------"
