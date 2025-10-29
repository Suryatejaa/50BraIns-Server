# Install redis-cli
npm install -g redis-cli

# Test Railway Redis
redis-cli -u "redis://default:EOewwolfkpUhljWSgOpjBHTMIcWbPbqF@redis-production-97d6.up.railway.app:6379"

# Once connected, try:
> PING
PONG

> SET test "hello"
OK

> GET test
"hello"

> DEL test
(integer) 1

> QUIT
