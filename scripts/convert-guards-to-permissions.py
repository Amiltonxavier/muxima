#!/usr/bin/env python3
"""
Convert `requireEventAccess` / `requireEventMutable` call sites in the oRPC
routers into the permission-aware guards of `shared/auth/authorization.ts`.

Why a script: the mapping "procedure -> capability" is a policy table, and
applying it by hand across ~90 call sites is exactly the kind of repetitive edit
where one missed site becomes a security hole. The procedure name is read from
the enclosing `protectedProcedure` definition, so the mapping cannot drift onto
the wrong procedure the way a text search-and-replace can.

Usage: python3 scripts/convert-guards-to-permissions.py
"""
import re
import sys
from pathlib import Path

ROUTERS = Path("packages/api/src/routers")

# procedure -> permission key. Reads use `requireEventPermission`, writes use
# `requireEventPermissionMutable` (the original guard name decides which).
PROCEDURES = {
    "budget.ts": {
        "getByEventId": "BUDGET_READ", "getLines": "BUDGET_READ",
        "getSummary": "BUDGET_READ", "updateTarget": "BUDGET_UPDATE",
        "getExpenseAnalytics": "BUDGET_READ", "getStats": "BUDGET_READ",
    },
    "checklist.ts": {
        "list": "CHECKLIST_READ", "create": "CHECKLIST_CREATE",
        "update": "CHECKLIST_UPDATE", "delete": "CHECKLIST_DELETE",
        "sync": "CHECKLIST_UPDATE", "getStats": "CHECKLIST_READ",
    },
    "dashboard.ts": {"getGuestChart": "DASHBOARD_READ", "getBudgetChart": "DASHBOARD_READ"},
    "dedications.ts": {
        "create": "DEDICATION_CREATE", "update": "DEDICATION_UPDATE",
        "setVisibility": "DEDICATION_SHARE", "addViewer": "DEDICATION_SHARE",
        "removeViewer": "DEDICATION_SHARE", "remove": "DEDICATION_DELETE",
    },
    "food-plan.ts": {
        "get": "FOOD_PLAN_READ", "setSupplier": "FOOD_PLAN_UPDATE",
        "updateNotes": "FOOD_PLAN_UPDATE", "addItem": "FOOD_PLAN_CREATE",
        "updateItem": "FOOD_PLAN_UPDATE", "deleteItem": "FOOD_PLAN_DELETE",
        "getStats": "FOOD_PLAN_READ",
    },
    "guests.ts": {
        "list": "GUEST_READ", "getById": "GUEST_READ", "create": "GUEST_CREATE",
        "update": "GUEST_UPDATE", "delete": "GUEST_DELETE",
        "addCompanion": "GUEST_CREATE", "removeCompanion": "GUEST_DELETE",
        "getTables": "TABLE_READ", "createTable": "TABLE_CREATE",
        "updateTable": "TABLE_UPDATE", "deleteTable": "TABLE_DELETE",
        "assignGuestToTable": "TABLE_UPDATE", "removeGuestFromTable": "TABLE_UPDATE",
        "updateCompanion": "GUEST_UPDATE", "getGuestStats": "GUEST_READ",
        "getTableStats": "TABLE_READ",
    },
    "inventory.ts": {
        "list": "INVENTORY_READ", "getById": "INVENTORY_READ",
        "getStats": "INVENTORY_READ", "create": "INVENTORY_CREATE",
        "update": "INVENTORY_UPDATE", "delete": "INVENTORY_DELETE",
        "addMovement": "INVENTORY_UPDATE", "getHistory": "INVENTORY_READ",
    },
    "invitations.ts": {
        "create": "INVITATION_CREATE", "generateCode": "INVITATION_CREATE",
        "list": "INVITATION_READ", "byGuest": "INVITATION_READ",
        "getById": "INVITATION_READ", "getStats": "INVITATION_READ",
        "getInvitationStats": "INVITATION_READ", "publish": "INVITATION_PUBLISH",
        "publishBatch": "INVITATION_PUBLISH", "unpublish": "INVITATION_PUBLISH",
        "respond": "INVITATION_RESPOND", "rsvpEligibility": "INVITATION_READ",
    },
    "suppliers.ts": {
        "list": "SUPPLIER_READ", "getById": "SUPPLIER_READ",
        "create": "SUPPLIER_CREATE", "update": "SUPPLIER_UPDATE",
        "changeStatus": "SUPPLIER_UPDATE", "delete": "SUPPLIER_DELETE",
        "addPayment": "SUPPLIER_UPDATE", "deletePayment": "SUPPLIER_UPDATE",
        "setInstallments": "SUPPLIER_UPDATE", "updateInstallment": "SUPPLIER_UPDATE",
        "deleteInstallment": "SUPPLIER_UPDATE", "getStats": "SUPPLIER_READ",
    },
    "tasks.ts": {
        "list": "TASK_READ", "getById": "TASK_READ", "create": "TASK_CREATE",
        "update": "TASK_UPDATE", "delete": "TASK_DELETE",
        "getSchedules": "SCHEDULE_READ", "createSchedule": "SCHEDULE_CREATE",
        "updateSchedule": "SCHEDULE_UPDATE", "deleteSchedule": "SCHEDULE_DELETE",
        "getStats": "TASK_READ", "getScheduleStats": "SCHEDULE_READ",
    },
}

PROC_RE = re.compile(r"^\t([A-Za-z0-9_]+):\s*(?:protected|public)Procedure")
CALL_RE = re.compile(r"^(\t+)await requireEvent(Access|Mutable)\(")


def split_args(call: str) -> tuple[str, str]:
    """Return (userId, eventId) from a guard call, ignoring its closing paren."""
    inner = call[call.index("(") + 1: call.rindex(")")]
    parts, depth, current = [], 0, ""
    for ch in inner:
        if ch in "([{":
            depth += 1
        elif ch in ")]}":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append(current.strip())
            current = ""
        else:
            current += ch
    if current.strip():
        parts.append(current.strip())
    return parts[0], parts[1]


def convert(path: Path, mapping: dict[str, str]) -> tuple[int, list[str]]:
    lines = path.read_text().split("\n")
    out, i, current, done = [], 0, None, 0
    unmapped: list[str] = []

    while i < len(lines):
        line = lines[i]
        if m := PROC_RE.match(line):
            current = m.group(1)

        m = CALL_RE.match(line)
        if not m:
            out.append(line)
            i += 1
            continue

        indent, kind = m.group(1), m.group(2)
        # Collect the whole call: `getEventIdForResource(...)` style second
        # arguments make some of these span several lines.
        block, j = [line], i
        while not block[-1].rstrip().endswith(");"):
            j += 1
            if j >= len(lines):
                raise SystemExit(f"{path}: unterminated guard at line {i + 1}")
            block.append(lines[j])

        call = "\n".join(block)
        permission = mapping.get(current)
        if permission is None:
            unmapped.append(f"{path.name}:{i + 1} [{current}]")
            out.extend(block)
            i = j + 1
            continue

        _, event_id = split_args(call.replace("\n", " "))
        guard = "requireEventPermissionMutable" if kind == "Mutable" else "requireEventPermission"
        out += [
            f"{indent}await {guard}(",
            f"{indent}\tcontext.session.user.id,",
            f"{indent}\t{event_id},",
            f"{indent}\tPERMISSIONS.{permission},",
            f"{indent});",
        ]
        done += 1
        i = j + 1

    path.write_text("\n".join(out))
    return done, unmapped


def rewrite_imports(path: Path) -> None:
    """Point the guard imports at `authorization`, keeping other named imports."""
    source = path.read_text()
    m = re.search(r'import \{([^}]*)\} from "\.\./shared/auth/event-access";', source, re.S)
    if not m:
        return

    carried = [n.strip().rstrip(",") for n in m.group(1).split("\n") if n.strip()]
    # Everything outside the old import block, so the `needed` scan below cannot
    # match the import statement itself.
    body = source[:m.start()] + source[m.end():]

    needed = [n for n in ("requireEventAccess", "requireEventMutable", "requireEventRole")
              if re.search(rf"\b{n}\b", body)]
    names = carried + ["requireEventPermission", "requireEventPermissionMutable", *needed]
    block = "import {\n" + "".join(f"\t{n},\n" for n in dict.fromkeys(names)) + '} from "../shared/auth/authorization";'

    # Splice the new import in exactly where the old one was.
    source = source[:m.start()] + block + source[m.end():]

    if 'from "@muxima/permissions"' not in source:
        lines = source.split("\n")
        at = 0
        for i, line in enumerate(lines):
            if m2 := re.match(r'^import .* from "([^"]+)";$', line):
                at = i if m2.group(1) > "@muxima/permissions" else at or i + 1
        lines.insert(at, 'import { PERMISSIONS } from "@muxima/permissions";')
        source = "\n".join(lines)

    path.write_text(source)


def main() -> int:
    total, unmapped = 0, []
    for name, mapping in PROCEDURES.items():
        path = ROUTERS / name
        done, missed = convert(path, mapping)
        rewrite_imports(path)
        total += done
        unmapped += missed
        print(f"{name}: {done} guards")

    print(f"\ntotal: {total} guards converted")
    if unmapped:
        print("\nUNMAPPED (needs a human decision):")
        print("\n".join(unmapped))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())