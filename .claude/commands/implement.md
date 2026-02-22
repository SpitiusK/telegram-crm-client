Implement a feature from TASKLIST-v2.md. The user will specify which task.

Workflow:
1. Read TASKLIST-v2.md to understand the task
2. Use researcher agent to analyze existing code related to the task
3. Use architect agent if new IPC/types/schema needed
4. Implement with implementer agent
5. Run typecheck, fix errors
6. Update TASKLIST-v2.md marking task as done
7. Show summary of changes

$ARGUMENTS
