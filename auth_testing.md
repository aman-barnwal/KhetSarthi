# Auth Testing Playbook

Step 1: MongoDB Verification
```
mongosh
use <database_name>
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})
```
Verify: bcrypt hash starts with `$2b$`, indexes exist on users.email (unique), login_attempts.identifier, password_reset_tokens.expires_at (TTL).

Step 2: API Testing
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"laelvarine@gmail.com","password":"KrishiAdmin@2026"}'
cat cookies.txt
curl -b cookies.txt http://localhost:8001/api/auth/me
```
Login should return the user object and set `access_token` + `refresh_token` cookies. The `/me` call should return the same user using those cookies.
