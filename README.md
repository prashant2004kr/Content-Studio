<p align="center">
  <img src="public/logo.png" alt="Content Studio Logo" width="340">
</p>

# Content Studio — MongoDB CMS

A starter content management system implementing the core requirements from the project brief: user accounts, role-aware permissions, content creation/editing, categories, tags, drafts and publishing, search, revision history, and a responsive browser frontend.

## Technology
- **Frontend:** HTML, CSS, vanilla JavaScript
- **Backend:** Node.js and Express REST APIs
- **Database:** MongoDB with Mongoose
- **Authentication:** bcrypt password hashing and JWT
- **Search:** MongoDB text index
- **Content history:** stores up to 20 prior versions per article

## Requirements
- Node.js 18 or newer
- MongoDB Community Server running locally, or a MongoDB Atlas connection string

## Run locally
1. Extract the ZIP and open the project directory in a terminal.
2. Install packages:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and set `MONGODB_URI` and a strong `JWT_SECRET`.
4. Start MongoDB if you use a local database.
5. Run:
   ```bash
   npm start
   ```
6. Open `http://localhost:3000`.

The **first account registered** receives the `admin` role. Later public registrations receive the `author` role. For a real deployment, disable public registration or add an admin-controlled invitation process.

## Main features
- Register and log in
- Passwords hashed with bcrypt
- First-user admin role; author/editor/admin permission checks in the API
- Create, edit, delete, save draft, and publish content
- Category and tag assignment
- Search published content by title, body, excerpt, and tags
- Draft and own-content filters in the signed-in workspace
- Revision history and restoration by saving an older revision as a new version
- Pagination parameters supported by the content API
- Basic authentication rate limit and request validation

## API reference

All endpoints return JSON. Protected endpoints accept `Authorization: Bearer <token>`.

### Authentication
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in and receive JWT |
| GET | `/api/auth/me` | Get current account |

Example registration:
```json
{ "name": "Alex", "email": "alex@example.com", "password": "a-strong-password" }
```

### Content
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/content` | List published content; supports `q`, `category`, `tag`, `page`, `limit` |
| GET | `/api/content?status=draft` | Authenticated author's drafts |
| GET | `/api/content?mine=true&status=published` | Authenticated author's published content |
| GET | `/api/content/:idOrSlug` | Read content by ID or slug |
| POST | `/api/content` | Create a draft or published item |
| PUT | `/api/content/:id` | Update content and preserve a revision |
| DELETE | `/api/content/:id` | Delete own content; admin can delete any |
| GET | `/api/content/:id/revisions` | List previous revisions |

Example content body:
```json
{
  "title": "Getting started with MongoDB",
  "excerpt": "A short introduction",
  "body": "Your article text...",
  "category": null,
  "tags": ["mongodb", "tutorial"],
  "status": "draft"
}
```

### Categories
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/categories` | List categories |
| POST | `/api/categories` | Create category (admin/editor) |
| DELETE | `/api/categories/:id` | Delete category (admin/editor) |

## MongoDB collections
- `users`: name, email, password hash, role
- `categories`: name, slug
- `contents`: title, slug, body, excerpt, category, tags, status, author, publish date, revision history

Indexes are defined for text search, status/date listing, and category/status filtering.

## Important security and deployment notes
This is an educational project starter, not a production-ready CMS.
- Set a long, unique `JWT_SECRET`; never commit `.env`.
- Use HTTPS in deployment.
- Add CSRF protection if switching to cookie-based authentication. This starter sends the JWT in the Authorization header and stores it in browser local storage for simplicity; local storage is vulnerable if an XSS flaw is introduced.
- Add email verification, password reset, admin-controlled roles, audit logs, and stronger input sanitization before production use.
- Public registration gives the first user admin access; use a controlled deployment process for the first account.
- Uploaded media / GridFS is not implemented in this starter. Add a validated upload route and GridFS or object storage if media management is required.
- Configure MongoDB backups, least-privilege database credentials, monitoring, and TLS for production.

## Suggested test checklist
1. Register the first account and verify its role is `admin`.
2. Create a category via `POST /api/categories` with a token.
3. Create a draft and confirm it does not appear in the public library.
4. Publish content and verify it appears in the public library.
5. Search by a title term or tag.
6. Edit content, open History, and restore a prior revision.
7. Verify an author cannot edit another author's content.
8. Test invalid login, missing title/body, duplicate category, and unknown IDs.
