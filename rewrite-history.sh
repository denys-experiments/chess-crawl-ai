#!/bin/bash

# This script rewrites the entire Git history of the repository to change the author
# of all commits to "Firebase Studio AI".
#
# WARNING: This is a destructive operation that rewrites history.
# It is recommended to back up your repository before running this script.
#
# To run this script, first make it executable from your terminal:
# chmod +x rewrite-history.sh
#
# Then execute it:
# ./rewrite-history.sh

git filter-branch --env-filter '
CORRECT_NAME="Firebase Studio AI"
CORRECT_EMAIL="ai@firebase.studio"

export GIT_COMMITTER_NAME="$CORRECT_NAME"
export GIT_COMMITTER_EMAIL="$CORRECT_EMAIL"
export GIT_AUTHOR_NAME="$CORRECT_NAME"
export GIT_AUTHOR_EMAIL="$CORRECT_EMAIL"
' --tag-name-filter cat -- --branches --tags

echo " "
echo "-------------------------------------"
echo "History rewrite complete."
echo " "
echo "To finalize these changes on GitHub, you must force push:"
echo "git push --force --tags origin 'refs/heads/*'"
echo "-------------------------------------"
