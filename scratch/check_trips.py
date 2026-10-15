import psycopg2

conn_str = "host=db.fhnttrinouhhkjmmvydr.supabase.co port=5432 dbname=postgres user=postgres password=Y3S1#sef@345 sslmode=require"
try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()
    cur.execute('SELECT "Id", "Name", "OwnerUserId", "TravellerEmail", "SubmittedToAdmin" FROM "Trips" ORDER BY "CreatedAt" DESC LIMIT 15;')
    rows = cur.fetchall()
    print("--- TRIPS IN DB ---")
    for r in rows:
        print(f"Id: {r[0]}, Name: {r[1]}, OwnerUserId: {r[2]}, TravellerEmail: {r[3]}, Submitted: {r[4]}")
        
    cur.execute('SELECT "Id", "Email", "Role", "DisplayName" FROM "UserAccounts" ORDER BY "CreatedAt" DESC LIMIT 10;')
    users = cur.fetchall()
    print("\n--- USER ACCOUNTS ---")
    for u in users:
        print(f"Id: {u[0]}, Email: {u[1]}, Role: {u[2]}, DisplayName: {u[3]}")
except Exception as e:
    print(f"Error: {e}")
