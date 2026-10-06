-- Persistent RBAC: Role / Permission / RolePermission.
--
-- `EventMember.role` (MemberRole enum) is PRESERVED — no membership is deleted,
-- downgraded or re-labelled by this migration. A nullable `roleId` FK is added
-- and back-filled from the enum value, so authorization can resolve
-- `EventMember → Role → RolePermission → Permission` without changing a single
-- existing membership. The enum column remains the fallback and the source for
-- the seed's upsert.

-- ── Role ────────────────────────────────────────────────────────��───────────
CREATE TABLE "role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "role_name_key" ON "role"("name");

-- ── Permission ──────────────────────────────────────────────────────────────
CREATE TABLE "permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "permission_key_key" ON "permission"("key");
CREATE UNIQUE INDEX "permission_resource_action_key" ON "permission"("resource", "action");
CREATE INDEX "permission_resource_idx" ON "permission"("resource");

-- ── RolePermission ──────────────────────────────────────────────────────────
CREATE TABLE "role_permission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "role_permission_roleId_permissionId_key"
    ON "role_permission"("roleId", "permissionId");
CREATE INDEX "role_permission_roleId_idx" ON "role_permission"("roleId");
CREATE INDEX "role_permission_permissionId_idx" ON "role_permission"("permissionId");

-- ── EventMember.roleId ───────────────────────────────────────────────────────
ALTER TABLE "event_member" ADD COLUMN "roleId" TEXT;

CREATE INDEX "event_member_roleId_idx" ON "event_member"("roleId");

ALTER TABLE "event_member"
    ADD CONSTRAINT "event_member_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "role"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ── Back-fill: seed the five official roles, then link every membership ──────
INSERT INTO "role" ("id", "name", "description", "createdAt", "updatedAt") VALUES
    (gen_random_uuid()::text, 'OWNER',   'Proprietário do evento — acesso total, incluindo eliminação do evento e gestão de membros.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'PARTNER', 'Parceiro — gestão ampla do evento, sem alterar a propriedade.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'ADMIN',   'Administrador — gestão operacional e de membros, sem alterar a propriedade do evento.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'EDITOR',  'Editor — leitura e criação/edição operacional.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid()::text, 'VIEWER',  'Visualizador — apenas leitura.', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

UPDATE "event_member" AS em
SET "roleId" = r."id"
FROM "role" AS r
WHERE r."name" = em."role"::text;