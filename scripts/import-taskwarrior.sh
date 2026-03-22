#!/usr/bin/env bash
# Import taskwarrior tasks into Mycelio projects/tasks tables
# Usage: ./scripts/import-taskwarrior.sh

set -euo pipefail

API_BASE="http://localhost:3001/api"

# Color map for projects
declare -A COLORS=(
  [career]="#bf00ff"
  [buildclub]="#39ff14"
  [relevance]="#00f0ff"
  [ecosystem]="#f0ff00"
  [mycelio]="#ff00e5"
  [empire]="#ff6b35"
  [kira-ops]="#00f0ff"
)

# Map taskwarrior status to Mycelio task status
map_status() {
  case "$1" in
    pending)   echo "todo" ;;
    completed) echo "done" ;;
    deleted)   echo "done" ;;
    recurring) echo "todo" ;;
    waiting)   echo "blocked" ;;
    *)         echo "todo" ;;
  esac
}

# Map taskwarrior priority to Mycelio priority (0-4)
map_priority() {
  case "$1" in
    H) echo 3 ;;
    M) echo 2 ;;
    L) echo 1 ;;
    *) echo 0 ;;
  esac
}

import_tasks() {
  local rc_file="$1"
  local assignee="$2"
  local tag_prefix="$3"

  echo "Importing from $rc_file (assignee: $assignee)..."

  # Export tasks as JSON
  local tasks_json
  tasks_json=$(task rc:"$rc_file" export 2>/dev/null)

  # Get unique projects
  local project_names
  project_names=$(echo "$tasks_json" | python3 -c "
import sys, json
tasks = json.load(sys.stdin)
projects = set()
for t in tasks:
    projects.add(t.get('project', 'uncategorized'))
for p in sorted(projects):
    print(p)
")

  # Create projects
  declare -A PROJECT_IDS
  for project_name in $project_names; do
    local color="${COLORS[$project_name]:-#00f0ff}"
    local display_name="${project_name}"

    # Check if project already exists
    local existing
    existing=$(curl -s "$API_BASE/projects?q=$display_name" | python3 -c "
import sys, json
d = json.load(sys.stdin)
for p in d.get('data', []):
    if p['name'].lower() == '$display_name'.lower():
        print(p['id'])
        break
" 2>/dev/null)

    if [ -n "$existing" ]; then
      echo "  Project '$display_name' already exists: $existing"
      PROJECT_IDS[$project_name]="$existing"
    else
      local result
      result=$(curl -s -X POST "$API_BASE/projects" \
        -H "Content-Type: application/json" \
        -d "{\"name\":\"$display_name\",\"color\":\"$color\",\"tags\":[\"$tag_prefix\",\"taskwarrior-import\"],\"status\":\"active\"}")

      local project_id
      project_id=$(echo "$result" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
      PROJECT_IDS[$project_name]="$project_id"
      echo "  Created project '$display_name': $project_id"
    fi
  done

  # Create tasks
  echo "$tasks_json" | python3 -c "
import sys, json, subprocess

tasks = json.load(sys.stdin)
project_ids = dict()
$(for k in "${!PROJECT_IDS[@]}"; do echo "project_ids['$k'] = '${PROJECT_IDS[$k]}'"; done)

status_map = {
    'pending': 'todo',
    'completed': 'done',
    'deleted': 'done',
    'recurring': 'todo',
    'waiting': 'blocked',
}

priority_map = {'H': 3, 'M': 2, 'L': 1}

for t in tasks:
    project = t.get('project', 'uncategorized')
    project_id = project_ids.get(project)
    if not project_id:
        continue

    title = t.get('description', 'Untitled').replace('\"', '\\\\\"')
    status = status_map.get(t.get('status', 'pending'), 'todo')
    priority = priority_map.get(t.get('priority', ''), 0)
    tags = t.get('tags', [])
    tags.append('$tag_prefix')

    # Parse dates
    due_date = ''
    if 'due' in t and t['due']:
        d = t['due']
        due_date = f'{d[:4]}-{d[4:6]}-{d[6:8]}'

    start_date = ''
    if 'entry' in t and t['entry']:
        d = t['entry']
        start_date = f'{d[:4]}-{d[4:6]}-{d[6:8]}'

    payload = {
        'title': t.get('description', 'Untitled'),
        'status': status,
        'priority': priority,
        'assignee': '$assignee',
        'tags': tags,
    }
    if due_date:
        payload['dueDate'] = due_date
    if start_date:
        payload['startDate'] = start_date
    if t.get('annotations'):
        payload['description'] = '\\n'.join([a.get('description', '') for a in t['annotations']])

    import urllib.request
    req = urllib.request.Request(
        f'$API_BASE/projects/{project_id}/tasks',
        data=json.dumps(payload).encode(),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    try:
        resp = urllib.request.urlopen(req)
        result = json.loads(resp.read())
        print(f'  Created task: {title[:50]}... [{status}]')
    except Exception as e:
        print(f'  ERROR creating task: {title[:50]}... - {e}')
"
}

echo "=== Importing Andrew's tasks ==="
import_tasks "/root/.taskrc-andrew" "Andrew" "atask"

echo ""
echo "=== Importing Kira's tasks ==="
import_tasks "/root/.taskrc-kira" "Kira" "ktask"

echo ""
echo "=== Import complete ==="
curl -s "$API_BASE/projects" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Total projects: {len(d[\"data\"])}')
for p in d['data']:
    print(f'  {p[\"name\"]} ({p[\"status\"]}) - {p[\"color\"]}')
"
