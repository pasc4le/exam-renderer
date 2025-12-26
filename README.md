# Exam Renderer

A lightweight, modern web application for loading, rendering, and taking exams from JSON files. This project runs entirely in the browser using [Alpine.js](https://alpinejs.dev/) and [Tailwind CSS](https://tailwindcss.com/).

## Features

- **📄 Dynamic JSON Loading**: Import custom exams easily via JSON files.
- **📝 Interactive Questions**: Supports Multiple Choice Questions (Radio buttons) and Open Text answers.
- **✅ Real-time Validation**: Instant feedback with correct answers and Markdown-supported explanations.
- **💾 Local Persistence**: Uses IndexedDB to save your exam library and results locally—no backend required.
- **📊 Usage Statistics**: Track your progress over time with interactive charts by category/tag.
- **📱 Responsive Design**: Beautiful, mobile-friendly interface styled with Tailwind CSS.

## Quick Start

### Running Locally

Since this is a client-side application relying on CDNs, you can run it directly:

1.  **Clone the repository**:
    ```bash
    git clone <repository_url>
    cd exam-renderer
    ```

2.  **Open the application**:
    - You can simply open `index.html` in your web browser.
    - *Recommended*: Use a local development server to avoid strict browser file-system restrictions (CORS).
      ```bash
      # If you have Node.js installed:
      npx serve .
      ```

## Exam Data Structure

The application renders exams based on a specific JSON schema. See `schema.json` for the full definition.

**Basic Example:**

```json
{
  "exam_title": "Introduction to Physics",
  "tags": ["Science", "Physics"],
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "prompt": "What is the force required to accelerate a 1kg mass at 1m/s²?",
      "options": [
        { "key": "a", "value": "1 Newton" },
        { "key": "b", "value": "1 Joule" }
      ],
      "answer": {
        "solution": "a",
        "explanation": "According to Newton's Second Law: F = ma."
      }
    }
  ]
}
```

## AI Exam Generator

Use our custom **[Gemini Gem](https://gemini.google.com/gem/1ZT-sGhyED-9UmzWMnikxqlZhjYy-ixZV?usp=sharing)** to easily generate exams in the correct JSON format. Just describe your topic, providing text or learning objectives, and it will output the ready-to-use JSON.

## Tech Stack

- **[Alpine.js](https://alpinejs.dev/)**: Lightweight JavaScript framework for behavior.
- **[Tailwind CSS](https://tailwindcss.com/)**: Utility-first CSS framework for design.
- **[Chart.js](https://www.chartjs.org/)**: For rendering progress statistics.
- **[Markdown-it](https://github.com/markdown-it/markdown-it)**: For rendering rich text content in questions/answers.
- **IndexedDB**: Browser-native database for offline data persistence.

## Deployment

The project includes a `middleware.js` for Vercel Edge functions to add security headers (HSTS, X-Frame-Options, etc.). It is ready to be deployed on Vercel with zero configuration.
