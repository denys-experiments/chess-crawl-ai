#!/bin/bash

# This script rewrites the Git history using the built-in 'git filter-branch' command.
# It is an older method but does not require any external dependencies like Python.
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

# The --env-filter option rewrites the author and committer information for each commit.
# The --tag-name-filter cat command ensures tags are also rewritten.
# The -- --all flag ensures all branches and tags are processed.
git filter-branch --env-filter '
    export GIT_COMMITTER_NAME="'"$CORRECT_NAME"'"
    export GIT_COMMITTER_EMAIL="'"$CORRECT_EMAIL"'"
    export GIT_AUTHOR_NAME="'"$CORRECT_NAME"'"
    export GIT_AUTHOR_EMAIL="'"$CORRECT_EMAIL"'"
' --tag-name-filter cat -- --all

echo " "
echo "-------------------------------------"
echo "History rewrite complete using git-filter-branch."
echo " "
echo "To finalize these changes on GitHub, you must force push:"
echo "git push --force --tags origin 'refs/heads/*'"
echo "-------------------------------------"
