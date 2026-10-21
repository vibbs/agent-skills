export const up = (pgm) => {
  pgm.createTable("orgs", {
    id: "id",
    name: { type: "text", notNull: true },
  });
  pgm.createTable("tasks", {
    id: "id",
    org_id: { type: "integer", notNull: true, references: "orgs" },
    board_id: { type: "integer", notNull: true },
    title: { type: "text", notNull: true },
    done: { type: "boolean", notNull: true, default: false },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("tasks", ["org_id", "created_at"]);
};

export const down = (pgm) => {
  pgm.dropTable("tasks");
  pgm.dropTable("orgs");
};
