# Replicate Image Generator

A simple image generation web application using Next.js, Shadcn UI, Replicate, and Firebase. Generate images based on prompts using a specified Replicate model and view previously generated images.

Forked from [vercel-labs/ai-sdk-image-generator](https://github.com/vercel-labs/ai-sdk-image-generator).

## Features

- Generate images using a configured Replicate model.
- Simple password-based authentication (single user).
- Store generated images in Google Cloud Storage.
- Store image metadata (prompt, URL, timestamp) in Firestore.
- View a gallery of previously generated images.
- Responsive UI built with Shadcn UI.
- Configurable via environment variables.

## Getting Started

### Prerequisites

- Node.js (v18 or later recommended)
- npm, yarn, or pnpm
- A Replicate account and API token.
- A Firebase project with Firestore and Cloud Storage enabled.

### Installation & Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/ArthurVerrez/replicate-image-generator.git
    cd replicate-image-generator
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    yarn install
    # or
    pnpm install
    ```

3.  **Set up environment variables:**

    - Copy the example environment file:
      ```bash
      cp .env.example .env
      ```
    - Edit `.env` and fill in the required values. See the [Environment Variables](#environment-variables) section below for details.

4.  **Run the development server:**

    ```bash
    npm run dev
    # or
    yarn dev
    # or
    pnpm dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Copy `.env.example` to `.env` and provide the following values:

- **Replicate Configuration:**
  - `REPLICATE_API_TOKEN`: Your API token from Replicate.
  - `NEXT_PUBLIC_REPLICATE_MODEL_ID`: The Replicate model identifier (e.g., `owner/model-name:version`).
- **Firebase Admin SDK Configuration (Server-side):**

  - `FIREBASE_SERVICE_ACCOUNT_JSON`: Your Firebase service account key JSON, encoded in **Base64**.
  - **How to generate Base64:** Download your service account key file, then run this Node.js command in your terminal (replace `path/to/your-key.json`):
    ```bash
    node -e "console.log(require('fs').readFileSync('path/to/your-key.json').toString('base64'))"
    ```
  - `FIREBASE_ADMIN_STORAGE_BUCKET`: Your Firebase Storage bucket name (e.g., `your-project-id.appspot.com`).

- **Firebase Client SDK Configuration (Client-side):**
  - `NEXT_PUBLIC_FIREBASE_API_KEY`: Your Firebase project's Web API Key.
  - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Your Firebase project's Auth Domain.
  - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Your Firebase project ID.
  - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: Your Firebase Storage bucket name.
  - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase Messaging Sender ID.
  - `NEXT_PUBLIC_FIREBASE_APP_ID`: Your Firebase Web App ID.
- **Firebase Storage & Firestore Configuration (API Routes):**
  - `FIREBASE_STORAGE_BUCKET_NAME`: Your Firebase Storage bucket name (can be the same as above).
  - `FIRESTORE_IMAGES_COLLECTION`: The name for the Firestore collection to store image metadata (e.g., `images`).
  - `STORAGE_FILE_PATH_PREFIX`: The prefix for storing images in the bucket (e.g., `generated-images/`).
- **Application Configuration:**
  - `NEXT_PUBLIC_APP_NAME`: The name displayed in the UI (e.g., `My Image Gen`).
  - `NEXT_PUBLIC_PROMPT_SUBJECT`: The default subject token used in prompt suggestions (e.g., `photograph of SUBJECT`).
- **Authentication Configuration:**
  - `AUTH_EMAIL`: The email address used for login.
  - `AUTH_PASSWORD`: The password used for login.
  - `AUTH_TOKEN_VALUE`: A secret string used for the authentication cookie (generate a secure random string).

## Deployment

This application is ready to be deployed on platforms like Vercel.

1.  Push your code to a Git repository (e.g., GitHub, GitLab).
2.  Import the project into Vercel.
3.  Configure the environment variables listed above in the Vercel project settings.
4.  Deploy!

## Built With

- [Next.js](https://nextjs.org/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Replicate](https://replicate.com/)
- [Firebase (Authentication, Firestore, Cloud Storage)](https://firebase.google.com/)
- [Vercel AI SDK](https://sdk.vercel.ai/)

## Acknowledgments

- Forked from [vercel-labs/ai-sdk-image-generator](https://github.com/vercel-labs/ai-sdk-image-generator)
