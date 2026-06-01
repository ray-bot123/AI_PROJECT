# Sinatra API

Small Sinatra app with a few endpoints for `curl` testing.

## Run

```sh
bundle install
bundle exec ruby app.rb
```

The server listens on `http://localhost:4567`.

This app uses WEBrick so it can run on Windows Ruby without native build tools.

## Test With curl

```sh
curl http://localhost:4567/
curl http://localhost:4567/health
curl http://localhost:4567/api/hello/Aki
curl -X POST http://localhost:4567/api/echo \
  -H "Content-Type: application/json" \
  -d '{"message":"hello from curl"}'
```
