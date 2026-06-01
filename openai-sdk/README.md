# OpenAI SDK Image Generation Demo

This project demonstrates image generation with the official OpenAI Node SDK.

## Setup

Install dependencies:

```bash
npm install
```

Set your API key:

```bash
$env:OPENAI_API_KEY="your_api_key_here"
```

On macOS or Linux:

```bash
export OPENAI_API_KEY="your_api_key_here"
```

## Generate an Image Directly

This calls the Image API with a GPT Image model and writes `generated/image.png`.

```bash
npm run generate:image -- "A watercolor postcard of Mount Fuji at sunrise"
```

Optional environment overrides:

```bash
$env:IMAGE_MODEL="gpt-image-2"
$env:IMAGE_SIZE="1024x1024"
$env:IMAGE_QUALITY="medium"
```

## Generate an Image Through a Model Tool Call

This calls the Responses API with a mainline model and gives it the `image_generation` tool. It writes `generated/responses-image.png`.

```bash
npm run generate:image-tool -- "A friendly robot barista making matcha"
```

Optional environment override:

```bash
$env:RESPONSES_MODEL="gpt-5.5"
```

The OpenAI docs describe two supported paths for image generation: the Image API for direct one-shot image creation, and the Responses API when you want a model to use image generation as a tool inside a broader interaction.
