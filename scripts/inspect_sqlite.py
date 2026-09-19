import sqlite3
conn = sqlite3.connect('prisma/dev.db')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
print("Tables:", tables)
for t in tables:
    tname = t[0]
    if tname != '_prisma_migrations':
        c.execute(f"SELECT COUNT(*) FROM \"{tname}\"")
        cnt = c.fetchone()[0]
        print(f"Table {tname}: {cnt} rows")
        c.execute(f"SELECT * FROM \"{tname}\" LIMIT 20")
        rows = c.fetchall()
        for r in rows:
            print("  ", r)
