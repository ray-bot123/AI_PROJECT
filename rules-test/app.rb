require "json"
require "sinatra/base"

class App < Sinatra::Base
  set :bind, "0.0.0.0"
  set :port, 4567
  set :server, :webrick

  before do
    content_type :json
  end

  get "/" do
    {
      message: "Sinatra API is running",
      endpoints: ["/health", "/api/hello/:name", "/api/echo"]
    }.to_json
  end

  get "/health" do
    { status: "ok" }.to_json
  end

  get "/api/hello/:name" do
    { message: "Hello, #{params[:name]}!" }.to_json
  end

  post "/api/echo" do
    payload = request.body.read
    body = payload.empty? ? {} : JSON.parse(payload)

    { received: body }.to_json
  rescue JSON::ParserError
    status 400
    { error: "Invalid JSON" }.to_json
  end

  run! if app_file == $PROGRAM_NAME
end
